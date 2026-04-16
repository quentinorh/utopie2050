import { Controller } from "@hotwired/stimulus"

// WebGL distortion shader that warps the hero SVG with mouse + flow noise.
//
// IMPORTANT: this canvas sits ON TOP of a fully-visible hero SVG and
// is transparent everywhere except inside a localized lens centred on
// the cursor. The lens shows a distorted version of the same SVG,
// blended in with feathered alpha — outside the lens the underlying
// live SVG simply shows through with zero shader cost.
//
// Pipeline:
//   1. The sibling SVG (rendered live by hero_controller) is serialised
//      into an Image at a *fixed small resolution* (~640px long edge),
//      then uploaded as a GL texture. Snapshot rate ≈ 5 fps so we don't
//      thrash the GPU re-uploading large bitmaps each frame.
//   2. A fullscreen quad samples that texture with UVs displaced by a
//      sum-of-sines flow field (slow breathing) and a radial cursor
//      lens. The fragment alpha is the lens itself, so anything
//      outside the cursor's reach blends to fully transparent.
//   3. Standard SRC_ALPHA / ONE_MINUS_SRC_ALPHA blending composites
//      the lens cleanly over the live SVG behind us.
//   4. RAF loop is paused when the tab is hidden.
//
// Why a fixed snapshot size: the distortion masks low-resolution
// source dramatically — uploading a 4K SVG every 200ms was the
// dominant cost. At 640×360 the upload is ~900 KB instead of ~33 MB.
export default class extends Controller {
  static targets = ["canvas"]
  static values = {
    source: String,
    snapshotFps: { type: Number, default: 5 },
    snapshotMaxEdge: { type: Number, default: 640 }
  }

  connect() {
    this.canvas = this.hasCanvasTarget ? this.canvasTarget : this._createCanvas()
    // alpha:true so the canvas itself can be transparent — the SVG
    // behind us shows through everywhere the shader doesn't draw.
    this.gl = this.canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance"
    })

    if (!this.gl) {
      this._fallback()
      return
    }

    this.sourceEl = this.sourceValue
      ? document.querySelector(this.sourceValue)
      : this.element.previousElementSibling?.querySelector("svg")

    if (!this.sourceEl) {
      this._fallback()
      return
    }

    this._reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    this._supportsImageBitmap = typeof createImageBitmap === "function"

    // Pointer state — `tx/ty` is the latest event position, `x/y` the
    // smoothed value the shader actually sees. Strength fades in once
    // the user has interacted, then never resets while the controller
    // is live (avoids edge-case pointerleave flicker).
    this._pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, strength: 0, target: 0 }
    this._lastFrame = performance.now()
    this._lastSnapshot = 0
    this._t = 0
    this._snapshotInterval = 1000 / this.snapshotFpsValue
    this._snapshotInFlight = false

    this._initShaders()
    this._initBuffers()
    this._initTexture()
    this._resize()
    this._bindEvents()

    this._scheduleSnapshot(true)

    if (!document.hidden) {
      this._raf = requestAnimationFrame(this._tick)
    }
  }

  disconnect() {
    cancelAnimationFrame(this._raf)
    window.removeEventListener("resize", this._onResize)
    window.removeEventListener("pointermove", this._onPointerMove)
    window.removeEventListener("blur", this._onBlur)
    document.removeEventListener("visibilitychange", this._onVisibility)

    if (this._currentBitmap?.close) {
      this._currentBitmap.close()
      this._currentBitmap = null
    }
    if (this._snapshotImage) {
      this._snapshotImage.onload = null
      this._snapshotImage.onerror = null
      this._snapshotImage = null
    }
    if (this._snapshotUrl) {
      URL.revokeObjectURL(this._snapshotUrl)
      this._snapshotUrl = null
    }
    if (this.gl) {
      const gl = this.gl
      gl.deleteTexture(this.texture)
      gl.deleteBuffer(this.quadBuffer)
      gl.deleteProgram(this.program)
    }
  }

  // --- setup -------------------------------------------------------

  _createCanvas() {
    const c = document.createElement("canvas")
    c.className = "hero-distortion__canvas"
    this.element.appendChild(c)
    return c
  }

  _fallback() {
    this.element.classList.add("is-fallback")
    if (this.sourceEl) {
      // Promote the source SVG to visible so the page still has a hero.
      const sourceParent = this.sourceEl.closest(".hero-source")
      if (sourceParent) sourceParent.style.opacity = "1"
    }
  }

  _initShaders() {
    const gl = this.gl

    const vsSrc = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        // Flip Y so WebGL origin matches the image's top-left origin.
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `

    // mediump on the fragment shader — plenty of precision for soft
    // distortion math and a notable perf win on mobile GPUs.
    const fsSrc = `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D uTex;
      uniform vec2 uMouse;
      uniform float uMouseStrength;
      uniform float uTime;
      uniform vec2 uAspect; // (canvasW/canvasH, 1.0)

      // Cheap pseudo-noise — sum of three rotated sines. Enough to
      // feel organic without pulling in a full simplex implementation.
      float pseudoNoise(vec2 p, float t) {
        return (
          sin(p.x * 3.1 + t * 0.6) +
          sin(p.y * 2.7 - t * 0.7) +
          sin((p.x + p.y) * 2.3 + t * 0.4)
        ) * 0.3333;
      }

      void main() {
        vec2 uv = vUv;

        // Cursor lens — radial push outward + slight perpendicular
        // swirl. Aspect-corrected so the lens is round on widescreen.
        vec2 d = (uv - uMouse) * uAspect;
        float dist = length(d);
        float reach = 0.42;
        float lens = smoothstep(reach, 0.0, dist);
        // Square the falloff to keep the centre punchy and the
        // outskirts soft — feels more like a fluid lens.
        lens *= lens;

        // Cheap exit: outside the lens we contribute nothing — the
        // live SVG behind the canvas shows through unchanged.
        if (lens * uMouseStrength < 0.002) {
          discard;
        }

        vec2 dir = d / max(dist, 1e-4);
        vec2 perp = vec2(-dir.y, dir.x);
        // Push outward + slight rotational swirl. Strong displacement
        // so the lens really *does* something inside its reach.
        vec2 lensOffset = (dir * 0.18 + perp * 0.07) * lens * uMouseStrength;
        // Convert displacement back from aspect space.
        lensOffset /= uAspect;

        // Subtle organic flow inside the lens so refraction shimmers.
        vec2 flow = vec2(
          pseudoNoise(uv * 1.4, uTime),
          pseudoNoise(uv.yx * 1.6 + 17.3, uTime * 1.1)
        ) * 0.012 * lens;

        vec3 col = texture2D(uTex, uv + flow + lensOffset).rgb;

        // Subtle brighten right at the cursor so the interaction
        // reads even on a low-contrast region of the SVG.
        col += vec3(0.08) * lens * uMouseStrength;

        // Alpha *is* the lens — the canvas blends with the live SVG
        // behind us, fading out to zero by the lens edge.
        float alpha = lens * uMouseStrength;

        gl_FragColor = vec4(col, alpha);
      }
    `

    const vs = this._compile(gl.VERTEX_SHADER, vsSrc)
    const fs = this._compile(gl.FRAGMENT_SHADER, fsSrc)
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("hero-distortion link error", gl.getProgramInfoLog(prog))
      this._fallback()
      return
    }
    gl.deleteShader(vs)
    gl.deleteShader(fs)

    this.program = prog
    this.aPos = gl.getAttribLocation(prog, "aPos")
    this.uTex = gl.getUniformLocation(prog, "uTex")
    this.uMouse = gl.getUniformLocation(prog, "uMouse")
    this.uMouseStrength = gl.getUniformLocation(prog, "uMouseStrength")
    this.uTime = gl.getUniformLocation(prog, "uTime")
    this.uAspect = gl.getUniformLocation(prog, "uAspect")
  }

  _compile(type, src) {
    const gl = this.gl
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("hero-distortion compile error", gl.getShaderInfoLog(sh))
    }
    return sh
  }

  _initBuffers() {
    const gl = this.gl
    this.quadBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )
  }

  _initTexture() {
    const gl = this.gl
    this.texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    // Bootstrap — a slightly textured pixel so the first paint isn't
    // an empty void if the snapshot pipeline lags by one frame.
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([18, 20, 50, 255])
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  }

  _bindEvents() {
    this._onResize = () => this._resize()
    this._onPointerMove = (e) => {
      const rect = this.canvas.getBoundingClientRect()
      // Allow pointer to drive the lens even when the cursor is over
      // a sibling element of the hero (e.g. the title) — we don't
      // require the cursor to be inside the canvas bounds, just on
      // the page.
      this._pointer.tx = (e.clientX - rect.left) / rect.width
      this._pointer.ty = (e.clientY - rect.top) / rect.height
      // Once activated, leave strength fade-in alone — never reset.
      this._pointer.target = 1
    }
    this._onBlur = () => {
      // Soften the lens when the window loses focus; keeps the hero
      // gentle while the user is in another tab/app.
      this._pointer.target = 0.35
    }
    this._onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(this._raf)
        this._raf = null
      } else if (!this._raf) {
        this._lastFrame = performance.now()
        this._raf = requestAnimationFrame(this._tick)
      }
    }

    window.addEventListener("resize", this._onResize, { passive: true })
    window.addEventListener("pointermove", this._onPointerMove, { passive: true })
    window.addEventListener("blur", this._onBlur, { passive: true })
    document.addEventListener("visibilitychange", this._onVisibility)
  }

  _resize() {
    const rect = this.element.getBoundingClientRect()
    // Cap WebGL DPR at 1.25 — the distortion masks the resolution
    // drop and we get a meaningful fillrate saving on 2× retina.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`
    if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    this._heroAspect = this.canvas.width / Math.max(1, this.canvas.height)
  }

  // --- snapshot pipeline -------------------------------------------

  _scheduleSnapshot(immediate = false) {
    if (this._snapshotInFlight) return
    if (document.hidden) return
    this._snapshotInFlight = true

    const run = () => {
      try {
        this._snapshotSvg()
      } catch (err) {
        console.warn("hero-distortion snapshot failed", err)
        this._snapshotInFlight = false
      }
    }

    if (immediate) run()
    else setTimeout(run, 0) // yield to the browser before serialising
  }

  _snapshotSvg() {
    const svg = this.sourceEl
    if (!svg || !svg.isConnected) {
      this._snapshotInFlight = false
      return
    }

    const rect = this.element.getBoundingClientRect()
    const aspect = rect.width / Math.max(1, rect.height)

    // Lock the snapshot's long edge so texture upload cost is bounded
    // regardless of viewport size. This is the single biggest perf
    // win in the controller.
    let w, h
    if (aspect >= 1) {
      w = this.snapshotMaxEdgeValue
      h = Math.max(1, Math.round(w / aspect))
    } else {
      h = this.snapshotMaxEdgeValue
      w = Math.max(1, Math.round(h * aspect))
    }

    const clone = svg.cloneNode(true)
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    clone.setAttribute("width", w)
    clone.setAttribute("height", h)

    // The display copy of the SVG carries a dissolve mask on its
    // curve group during the entry reveal — but the texture sampled
    // by the lens shader needs the FULL pattern, otherwise the lens
    // blends a near-empty image and the distortion looks like nothing
    // is happening. Strip mask refs from the snapshot only.
    clone.querySelectorAll("[mask]").forEach((el) => {
      el.removeAttribute("mask")
    })

    const xml = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" })

    // Prefer createImageBitmap — it decodes off the main thread when
    // supported, and the resulting bitmap is a much faster source for
    // texImage2D than an HTMLImageElement.
    if (this._supportsImageBitmap) {
      createImageBitmap(blob)
        .then((bitmap) => this._uploadTexture(bitmap, true))
        .catch((err) => {
          console.warn("hero-distortion bitmap decode failed", err)
          this._snapshotInFlight = false
        })
      return
    }

    // Fallback path for browsers without createImageBitmap.
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.decoding = "async"
    img.onload = () => {
      this._uploadTexture(img, false)
      URL.revokeObjectURL(url)
      this._snapshotImage = null
      this._snapshotUrl = null
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      this._snapshotImage = null
      this._snapshotUrl = null
      this._snapshotInFlight = false
    }
    img.src = url
    this._snapshotImage = img
    this._snapshotUrl = url
  }

  _uploadTexture(source, isBitmap) {
    if (!this.gl) {
      if (isBitmap && source.close) source.close()
      this._snapshotInFlight = false
      return
    }
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    } catch (err) {
      console.warn("hero-distortion texImage2D failed", err)
    }
    if (isBitmap && source.close) source.close()
    if (this._currentBitmap?.close) this._currentBitmap.close()
    this._currentBitmap = isBitmap ? source : null
    this._snapshotInFlight = false
  }

  // --- loop --------------------------------------------------------

  _tick = (now) => {
    const dt = Math.min(0.05, (now - this._lastFrame) / 1000)
    this._lastFrame = now
    this._t += dt

    if (now - this._lastSnapshot >= this._snapshotInterval) {
      this._lastSnapshot = now
      this._scheduleSnapshot(false)
    }

    // Smooth pointer toward target — buttery, slightly-lagging follow
    // that reads as fluid rather than snappy.
    const ease = 1 - Math.pow(0.0008, Math.max(dt, 0.0001))
    this._pointer.x += (this._pointer.tx - this._pointer.x) * ease
    this._pointer.y += (this._pointer.ty - this._pointer.y) * ease

    // Strength fades toward `target`. Faster ramp than the position
    // smoothing so the lens activates quickly on first interaction.
    const strengthEase = Math.min(1, dt * 5)
    const baseTarget = this._reducedMotion ? 0 : this._pointer.target
    this._pointer.strength += (baseTarget - this._pointer.strength) * strengthEase

    this._draw()
    this._raf = requestAnimationFrame(this._tick)
  }

  _draw() {
    const gl = this.gl
    if (!gl) return

    // Standard alpha compositing — the lens fades into the SVG
    // behind us via SRC_ALPHA / ONE_MINUS_SRC_ALPHA.
    gl.enable(gl.BLEND)
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    // Clear to fully transparent so untouched regions reveal the
    // live SVG underneath.
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(this.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.enableVertexAttribArray(this.aPos)
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.uniform1i(this.uTex, 0)
    gl.uniform2f(this.uMouse, this._pointer.x, this._pointer.y)
    gl.uniform1f(this.uMouseStrength, this._pointer.strength)
    gl.uniform1f(this.uTime, this._t)
    gl.uniform2f(this.uAspect, this._heroAspect || 1, 1)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }
}

import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

export default class extends Controller {
  static targets = ["svg"]

  connect() {
    this.generatePattern()
    this.startRipple()
  }

  disconnect() {
    if (this._raf) cancelAnimationFrame(this._raf)
    if (this._gl) {
      this._gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }

  generatePattern() {
    const hue = Math.floor(Math.random() * 360)
    const modes = ['x4', 'x8', 'x16']
    const mode = modes[Math.floor(Math.random() * modes.length)]
    const rows = Math.floor(Math.random() * 3) + 1
    const columns = Math.floor(Math.random() * 3) + 1
    const smoothing = (Math.floor(Math.random() * 70) + 25) / 100
    const sliderA = Math.random()
    const sliderB = Math.random()

    const W = 250, H = 350
    const w = W / columns, h = H / rows

    const c1 = [(w * sliderA * smoothing).toFixed(2), (h * smoothing).toFixed(2)]
    const c2 = [(w * smoothing).toFixed(2), (h * (1 - (1 - sliderA) * smoothing)).toFixed(2)]
    const c3 = [(w * sliderB * smoothing).toFixed(2), (h * (1 - (1 - sliderB) * smoothing)).toFixed(2)]

    const d = `M 0,${h} C ${c1[0]},${c1[1]} ${c3[0]},${c3[1]} ${c2[0]},${c2[1]}`

    const transforms = this.getTransforms(mode)
    this._uid = Math.random().toString(36).slice(2, 8)

    const baseHex = this.hslToHex(hue, 100, 65)
    const t1 = this.hslToHex((hue + 60) % 360, 100, 65)
    const t2 = this.hslToHex((hue + 180) % 360, 100, 65)
    const t3 = this.hslToHex((hue + 300) % 360, 100, 65)
    const bg = `hsl(${hue}, 50%, 13%)`

    let paths = ''
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        transforms.forEach((tf, i) => {
          const gx = (W / columns) * c + w / 2
          const gy = (H / rows) * r + h / 2
          const gi = (Math.floor(i / 4) % 3) + 1
          paths += `<path d="${d}" transform="translate(${gx},${gy}) ${tf}" fill="url(#ag${gi}-${this._uid})" stroke="none"/>`
        })
      }
    }

    this._svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 8}" height="${H * 8}">
      <defs>
        <linearGradient id="ag1-${this._uid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${baseHex}"/><stop offset="100%" stop-color="${t1}"/>
        </linearGradient>
        <linearGradient id="ag2-${this._uid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${baseHex}"/><stop offset="100%" stop-color="${t2}"/>
        </linearGradient>
        <linearGradient id="ag3-${this._uid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${baseHex}"/><stop offset="100%" stop-color="${t3}"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="${bg}"/>
      ${paths}
    </svg>`
  }

  startRipple() {
    // Rasterize SVG to an image, then render through a WebGL ripple shader
    const blob = new Blob([this._svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      this._setupWebGL(img)
    }
    img.src = url
  }

  _setupWebGL(sourceImg) {
    const canvas = document.createElement('canvas')
    canvas.className = 'auth-bg__svg'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.opacity = '0'
    this.svgTarget.innerHTML = ''
    this.svgTarget.appendChild(canvas)

    // Size canvas to fill container
    const rect = this.svgTarget.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio, 2)
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false })
    if (!gl) {
      // Fallback: just show the SVG static with CSS animation
      this._fallbackStatic(sourceImg)
      return
    }
    this._gl = gl

    // --- Shaders ---
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `
    // Ripple shader inspired by ShaderToy ldBXDD — concentric waves from center
    const fsSource = `
      precision mediump float;
      varying vec2 v_uv;
      uniform sampler2D u_texture;
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        vec2 uv = v_uv;
        vec2 center = vec2(0.5, 0.5);
        vec2 delta = uv - center;
        float dist = length(delta);
        vec2 dir = delta / max(dist, 0.001);

        // Soft concentric ripple — subtle displacement
        float wave = cos(dist * 18.0 - u_time * 1.8) * 0.004;
        // Second harmonic for organic feel
        wave += cos(dist * 12.0 + u_time * 1.2) * 0.002;

        vec2 displaced = uv + dir * wave;
        gl_FragColor = texture2D(u_texture, displaced);
      }
    `

    const vs = this._compileShader(gl, gl.VERTEX_SHADER, vsSource)
    const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, fsSource)
    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.useProgram(program)

    // Fullscreen quad
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    // Texture from SVG image
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImg)

    const uTime = gl.getUniformLocation(program, 'u_time')
    const uRes = gl.getUniformLocation(program, 'u_resolution')
    gl.uniform2f(uRes, canvas.width, canvas.height)

    // Fade in
    gsap.to(canvas, { opacity: 1, duration: 2.5, ease: "power2.out" })

    // Render loop
    const start = performance.now()
    const render = () => {
      const t = (performance.now() - start) / 1000
      gl.uniform1f(uTime, t)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      this._raf = requestAnimationFrame(render)
    }
    this._raf = requestAnimationFrame(render)
  }

  _compileShader(gl, type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return shader
  }

  _fallbackStatic(img) {
    // No WebGL — show SVG with CSS filter animation
    this.svgTarget.innerHTML = ''
    const svgEl = document.createElement('div')
    svgEl.innerHTML = this._svgMarkup
    const svg = svgEl.firstElementChild
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice')
    svg.setAttribute('class', 'auth-bg__svg')
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    this.svgTarget.appendChild(svg)

    gsap.fromTo(this.svgTarget, { opacity: 0 }, { opacity: 1, duration: 2.5, ease: "power2.out" })
    gsap.to(svg, { scale: 1.1, duration: 10, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 50%" })
    gsap.to(svg, { rotation: 5, duration: 14, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 50%" })
  }

  getTransforms(mode) {
    const base = [
      'scale(1,1) translate(-125,-175)',
      'scale(-1,1) translate(-125,-175)',
      'scale(1,-1) translate(-125,-175)',
      'scale(-1,-1) translate(-125,-175)'
    ]
    const rot90 = base.map(t => `rotate(90) ${t}`)
    const rot45 = base.map(t => `rotate(45) ${t}`)
    const rot135 = base.map(t => `rotate(135) ${t}`)

    if (mode === 'x8') return [...base, ...rot90]
    if (mode === 'x16') return [...base, ...rot90, ...rot45, ...rot135]
    return base
  }

  hslToHex(h, s, l) {
    l /= 100
    const a = s * Math.min(l, 1 - l) / 100
    const f = n => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }
}

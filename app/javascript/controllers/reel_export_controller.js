import { Controller } from "@hotwired/stimulus"

const HME_URL = "https://cdn.jsdelivr.net/npm/h264-mp4-encoder@1.0.12/embuild/dist/h264-mp4-encoder.web.js"

function loadHME() {
  if (window.HME) return Promise.resolve(window.HME)
  return new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = HME_URL
    s.onload = () => resolve(window.HME)
    s.onerror = () => reject(new Error("Failed to load h264-mp4-encoder"))
    document.head.appendChild(s)
  })
}

// cubic-bezier(0.625, 0.05, 0, 1) — same as svg_animation_controller
function coverEase(t) {
  const x1 = 0.625, y1 = 0.05, x2 = 0, y2 = 1
  let guess = t
  for (let i = 0; i < 8; i++) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    const currentX = ((ax * guess + bx) * guess + cx) * guess
    const currentSlope = (3 * ax * guess + 2 * bx) * guess + cx
    if (currentSlope === 0) break
    guess -= (currentX - t) / currentSlope
  }
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  return ((ay * guess + by) * guess + cy) * guess
}

// Overshoot easing — used for the dynamic title/username reveal.
function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function lerp(a, b, t) { return a + (b - a) * t }

const W = 1080
const H = 1920
const FPS = 60
// Phase 1 (cover): 0 → SVG_MORPH_END (SVG only) → COVER_END (title/username reveal)
// Phase 2 (scroll): COVER_END → TEXT_END
// Phase 3 (outro):  TEXT_END → DURATION
const SVG_MORPH_END = 3.0
const COVER_END = 5.0
const TEXT_END = 15.0
const DURATION = 17
const TOTAL_FRAMES = FPS * DURATION
const DARK = "#12142C"

export default class extends Controller {
  static values = { postId: Number }

  async exportReel(event) {
    const btn = event.currentTarget
    const originalText = btn.textContent
    btn.textContent = "Export..."
    btn.disabled = true

    try {
      const resp = await fetch(`/admin/posts/${this.postIdValue}/reel_data`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()

      const canvas = document.createElement("canvas")
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext("2d")

      const accent = `hsl(${data.hue}, 80%, 70%)`
      const usernameBg = `hsl(${(data.hue + 120) % 360}, 80%, 70%)`
      const svgBg = `hsl(${data.hue}, 50%, 13%)`

      // Pre-render SVG morph frames — stretched over SVG_MORPH_END (3s).
      // 120 frames ≈ 1 new morph image every 2 video frames at 60fps,
      // smooth enough for the gradual path interpolation without the memory
      // cost of rendering a full 180-frame sequence.
      btn.textContent = "SVG 0%"
      const svgFrames = await this._preRenderSvgFrames(data, 120, btn)

      // Initialize H.264 encoder (pure WASM, no WebCodecs needed)
      btn.textContent = "Encodeur..."
      const HME = await loadHME()
      const encoder = await HME.createH264MP4Encoder()
      encoder.width = W
      encoder.height = H
      encoder.frameRate = FPS
      encoder.quantizationParameter = 18 // quality: 10=best, 51=worst
      encoder.initialize()

      // Render + encode every frame
      for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
        this._renderFrame(ctx, data, svgFrames, accent, usernameBg, svgBg, frame)
        encoder.addFrameRgba(ctx.getImageData(0, 0, W, H).data)

        if (frame % 15 === 0) {
          btn.textContent = `Export ${Math.round(frame / TOTAL_FRAMES * 100)}%`
          await new Promise(r => setTimeout(r, 0))
        }
      }

      btn.textContent = "Finalisation..."
      encoder.finalize()

      const mp4Data = encoder.FS.readFile(encoder.outputFilename)
      encoder.delete()

      // Download
      const blob = new Blob([mp4Data], { type: "video/mp4" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${data.title.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").replace(/\s+/g, "_")}_reel.mp4`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Reel export failed:", err)
      alert("Export échoué : " + err.message)
    } finally {
      btn.textContent = originalText
      btn.disabled = false
    }
  }

  // ── Render a single frame to canvas ──
  _renderFrame(ctx, data, svgFrames, accent, usernameBg, svgBg, frame) {
    const t = frame / FPS

    if (t < COVER_END) {
      this._drawCover(ctx, data, svgFrames, accent, usernameBg, svgBg, t)
    } else if (t < TEXT_END) {
      const fadeT = Math.min((t - COVER_END) / 0.3, 1)
      if (fadeT < 1) {
        this._drawCover(ctx, data, svgFrames, accent, usernameBg, svgBg, COVER_END)
        ctx.fillStyle = `hsla(${data.hue}, 50%, 13%, ${fadeT})`
        ctx.fillRect(0, 0, W, H)
      }
      this._drawText(ctx, data, t, fadeT, svgBg)
    } else {
      this._drawBlink(ctx, data, accent, t)
    }
  }

  // ── Pre-render SVG morph frames ──
  async _preRenderSvgFrames(data, frameCount, btn) {
    const settings = data.pattern_settings
    if (!settings || !data.cover) return []

    const parser = new DOMParser()
    const target1 = parseFloat(settings.firstSliderControl)
    const target2 = parseFloat(settings.secondSliderControl)
    const targetSmoothing = parseFloat(settings.smoothing)

    const start1 = target1 + (target1 > 50 ? -50 : 50)
    const start2 = target2 + (target2 > 50 ? -50 : 50)
    const startSmoothing = Math.max(5, targetSmoothing + (targetSmoothing > 50 ? -35 : 35))

    const frames = []
    for (let i = 0; i < frameCount; i++) {
      const progress = coverEase(i / (frameCount - 1))
      const f1 = lerp(start1, target1, progress)
      const f2 = lerp(start2, target2, progress)
      const sm = lerp(startSmoothing, targetSmoothing, progress)

      const doc = parser.parseFromString(data.cover, "image/svg+xml")
      const svg = doc.documentElement

      svg.setAttribute("viewBox", "0 0 250 350")
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice")
      svg.setAttribute("width", String(W))
      svg.setAttribute("height", String(H))

      this._regeneratePaths(svg, {
        firstSliderControl: f1,
        secondSliderControl: f2,
        smoothing: sm,
        rows: parseInt(settings.rows) || 1,
        columns: parseInt(settings.columns) || 1,
        symmetryMode: settings.symmetryMode || "x4"
      })

      const svgStr = new XMLSerializer().serializeToString(svg)
      const blob = new Blob([svgStr], { type: "image/svg+xml" })
      const url = URL.createObjectURL(blob)

      const img = new Image()
      img.width = W
      img.height = H
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = url
      })
      URL.revokeObjectURL(url)
      frames.push(img)

      if (i % 15 === 0 && btn) {
        btn.textContent = `SVG ${Math.round(i / frameCount * 100)}%`
        await new Promise(r => setTimeout(r, 0))
      }
    }
    return frames
  }

  // ── Reused from svg_animation_controller._regeneratePaths ──
  _regeneratePaths(svg, params) {
    const { firstSliderControl, secondSliderControl, smoothing, rows, columns, symmetryMode } = params

    const totalWidth = 250
    const totalHeight = 350
    const width = totalWidth / columns
    const height = totalHeight / rows

    const startPoint = [0, height]
    const x = firstSliderControl / 100
    const y = 1 - firstSliderControl / 100
    const x3 = secondSliderControl / 100
    const y3 = 1 - secondSliderControl / 100
    const sm = smoothing / 100

    const control1 = [(width * x * sm).toFixed(2), (height * sm).toFixed(2)]
    const control2 = [(width * sm).toFixed(2), (height * (1 - y * sm)).toFixed(2)]
    const control3 = [(width * x3 * sm).toFixed(2), (height * (1 - y3 * sm)).toFixed(2)]

    const basePath = `M ${startPoint[0]},${startPoint[1]} C ${control1[0]},${control1[1]} ${control3[0]},${control3[1]} ${control2[0]},${control2[1]}`

    let transforms = []
    switch (symmetryMode) {
      case "x4":
        transforms = [
          "scale(1,1) translate(-125,-175)", "scale(-1,1) translate(-125,-175)",
          "scale(1,-1) translate(-125,-175)", "scale(-1,-1) translate(-125,-175)"
        ]; break
      case "x8":
        transforms = [
          "scale(1,1) translate(-125,-175)", "scale(-1,1) translate(-125,-175)",
          "scale(1,-1) translate(-125,-175)", "scale(-1,-1) translate(-125,-175)",
          "rotate(90) scale(1,1) translate(-125,-175)", "rotate(90) scale(-1,1) translate(-125,-175)",
          "rotate(90) scale(1,-1) translate(-125,-175)", "rotate(90) scale(-1,-1) translate(-125,-175)"
        ]; break
      case "x16":
        transforms = [
          "scale(1,1) translate(-125,-175)", "scale(-1,1) translate(-125,-175)",
          "scale(1,-1) translate(-125,-175)", "scale(-1,-1) translate(-125,-175)",
          "rotate(90) scale(1,1) translate(-125,-175)", "rotate(90) scale(-1,1) translate(-125,-175)",
          "rotate(90) scale(1,-1) translate(-125,-175)", "rotate(90) scale(-1,-1) translate(-125,-175)",
          "rotate(45) scale(1,1) translate(-125,-175)", "rotate(45) scale(-1,1) translate(-125,-175)",
          "rotate(45) scale(1,-1) translate(-125,-175)", "rotate(45) scale(-1,-1) translate(-125,-175)",
          "rotate(135) scale(1,1) translate(-125,-175)", "rotate(135) scale(-1,1) translate(-125,-175)",
          "rotate(135) scale(1,-1) translate(-125,-175)", "rotate(135) scale(-1,-1) translate(-125,-175)"
        ]; break
      default:
        transforms = ["scale(1,1) translate(-200,-300)"]
    }

    const spacingX = totalWidth / columns
    const spacingY = totalHeight / rows
    const offsetX = (totalWidth - spacingX * columns) / 2
    const offsetY = (totalHeight - spacingY * rows) / 2

    const allPaths = Array.from(svg.querySelectorAll("path"))
    let pathIndex = 0
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        transforms.forEach((baseTransform) => {
          if (pathIndex < allPaths.length) {
            const gridTransform = `translate(${offsetX + spacingX * col + width / 2}, ${offsetY + spacingY * row + height / 2})`
            allPaths[pathIndex].setAttribute("d", basePath)
            allPaths[pathIndex].setAttribute("transform", `${gridTransform} ${baseTransform}`)
            pathIndex++
          }
        })
      }
    }
  }

  // ── Phase 1: Cover ──
  //   Step A (0 → SVG_MORPH_END): SVG morph, full frame, no radial reveal.
  //   Step B (SVG_MORPH_END → COVER_END): title + username dynamic reveal.
  _drawCover(ctx, data, svgFrames, accent, usernameBg, svgBg, t) {
    ctx.fillStyle = DARK
    ctx.fillRect(0, 0, W, H)

    // SVG morph plays across the whole of Step A (and freezes on the final
    // frame during Step B). No radial clip — SVG fills the frame immediately.
    if (svgFrames.length > 0) {
      const morphT = Math.min(t, SVG_MORPH_END) / SVG_MORPH_END
      const frameIdx = Math.min(
        Math.floor(morphT * (svgFrames.length - 1)),
        svgFrames.length - 1
      )
      ctx.drawImage(svgFrames[frameIdx], 0, 0, W, H)
    } else {
      ctx.fillStyle = svgBg
      ctx.fillRect(0, 0, W, H)
    }

    // Title + username only appear in Step B.
    if (t < SVG_MORPH_END) return

    // Title typography (matches .cover-title-text: color #12142C on accent bg)
    const titleFontSize = 72
    const titleLineHeight = titleFontSize * 1.3
    const titlePad = 10
    const leftX = 80
    const maxWidth = W - 160

    ctx.font = `bold ${titleFontSize}px Apfel, sans-serif`
    ctx.textBaseline = "top"
    const words = data.title.split(/\s+/)
    const lines = this._wrapText(ctx, words, maxWidth)
    const blockHeight = lines.length * titleLineHeight

    // Username typography (matches .cover-username: color #000 on triade bg)
    const userFontSize = 36
    const userPadX = 10
    const userPadY = 6
    const userBoxH = userFontSize + userPadY * 2
    const gapUserTitle = 24
    const bottomMargin = 260

    // Title block is bottom-anchored; username sits ABOVE the title block.
    const titleStartY = H - bottomMargin - blockHeight
    const userY = titleStartY - userBoxH - gapUserTitle

    // Reveal phase clock — 0 at SVG_MORPH_END, 1 at COVER_END.
    const revealT = t - SVG_MORPH_END
    const slideDistance = 80 // px of upward slide (from below) with overshoot

    // — Username (appears first) —
    const userDuration = 0.5
    const userProgress = Math.max(0, Math.min(1, revealT / userDuration))
    if (userProgress > 0) {
      const easedU = easeOutBack(userProgress)
      const yOffset = (1 - easedU) * slideDistance
      ctx.globalAlpha = Math.min(1, userProgress * 1.5)
      ctx.font = `bold ${userFontSize}px Apfel, sans-serif`
      const uText = `@${data.username}`.toUpperCase()
      const uWidth = ctx.measureText(uText).width

      ctx.fillStyle = usernameBg
      ctx.fillRect(leftX - userPadX, userY + yOffset, uWidth + userPadX * 2, userBoxH)
      ctx.fillStyle = DARK
      ctx.fillText(uText, leftX, userY + userPadY + yOffset)
      ctx.globalAlpha = 1
    }

    // — Title (whole block slides in with overshoot, all at once) —
    ctx.font = `bold ${titleFontSize}px Apfel, sans-serif`
    const titleStart = 0.25 // slight delay after username starts
    const titleDuration = 0.55
    const titleT = revealT - titleStart
    const titleProgress = Math.max(0, Math.min(1, titleT / titleDuration))

    if (titleProgress > 0) {
      const easedTitle = easeOutBack(titleProgress)
      const yOffset = (1 - easedTitle) * slideDistance
      ctx.globalAlpha = Math.min(1, titleProgress * 1.6)

      lines.forEach((line, lineIdx) => {
        const lineWidth = ctx.measureText(line).width
        const baseY = titleStartY + lineIdx * titleLineHeight + yOffset

        ctx.fillStyle = accent
        ctx.fillRect(leftX - titlePad, baseY - titlePad / 2, lineWidth + titlePad * 2, titleFontSize + titlePad)

        ctx.fillStyle = DARK
        ctx.fillText(line, leftX, baseY)
      })

      ctx.globalAlpha = 1
    }
  }

  // ── Phase 2: Text scene (COVER_END → TEXT_END) ──
  _drawText(ctx, data, t, fadeT, svgBg) {
    if (fadeT >= 1) {
      ctx.fillStyle = svgBg
      ctx.fillRect(0, 0, W, H)
    }

    if (!data.body) return

    const fontSize = 126
    ctx.font = `400 ${fontSize}px Apfel, sans-serif`
    ctx.textBaseline = "top"
    ctx.fillStyle = "#FFFFFF"

    const maxWidth = W - 160
    const words = data.body.split(/\s+/)
    const lines = this._wrapText(ctx, words, maxWidth)
    const lineHeight = fontSize * 1.2

    // Fixed scroll speed in px/s — independent of text length.
    // Text starts just off the bottom edge and scrolls upward through the
    // visible area. Only what traverses during the phase is shown (the rest
    // is clipped by the top/bottom gradient masks); the goal is readability.
    const SCROLL_PX_PER_SEC = 135
    const scrollElapsed = t - COVER_END
    const scrollY = H - scrollElapsed * SCROLL_PX_PER_SEC

    ctx.save()
    ctx.globalAlpha = Math.min(fadeT, 1)

    lines.forEach((line, i) => {
      const y = scrollY + i * lineHeight
      if (y > -lineHeight && y < H + lineHeight) {
        ctx.fillStyle = "#FFFFFF"
        ctx.fillText(line, 80, y)
      }
    })

    // Gradient masks use the cover background color (svgBg / hsla hue-tinted).
    // Accentuated: taller band + mid-stop keeps the fade opaque much longer
    // before going transparent, producing a stronger "tunnel" effect.
    const gradH = 560
    const solid = `hsla(${data.hue}, 50%, 13%, 1)`
    const mid = `hsla(${data.hue}, 50%, 13%, 0.88)`
    const fade = `hsla(${data.hue}, 50%, 13%, 0)`

    const topGrad = ctx.createLinearGradient(0, 0, 0, gradH)
    topGrad.addColorStop(0, solid)
    topGrad.addColorStop(0.55, mid)
    topGrad.addColorStop(1, fade)
    ctx.fillStyle = topGrad
    ctx.fillRect(0, 0, W, gradH)

    const botGrad = ctx.createLinearGradient(0, H - gradH, 0, H)
    botGrad.addColorStop(0, fade)
    botGrad.addColorStop(0.45, mid)
    botGrad.addColorStop(1, solid)
    ctx.fillStyle = botGrad
    ctx.fillRect(0, H - gradH, W, gradH)

    ctx.restore()
  }

  // ── Phase 3: Branded outro (TEXT_END → DURATION) ──
  // Blinks by inverting both the page background and the box/text colors
  // each cycle. Both texts ("Lire la suite" and "SP2050.org") share the
  // same cover-title treatment: coloured box + contrasting text.
  _drawBlink(ctx, data, accent, t) {
    // Single, slow inversion: stay in the default state, flash inverted once
    // for ~0.8s around the middle of the phase, then return to default.
    const blinkT = t - TEXT_END
    const flashStart = 0.5
    const flashEnd = 1.3
    const inverted = blinkT >= flashStart && blinkT < flashEnd

    // On inverted cycles: page bg, box bg and text color all swap.
    const pageBg = inverted ? accent : DARK
    const boxBg = inverted ? DARK : accent
    const textColor = inverted ? accent : DARK

    ctx.fillStyle = pageBg
    ctx.fillRect(0, 0, W, H)

    // Whole outro text block is tilted around the center of the canvas.
    const tiltRad = (-3 * Math.PI) / 180
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.rotate(tiltRad)
    ctx.translate(-W / 2, -H / 2)

    ctx.textAlign = "center"
    ctx.textBaseline = "alphabetic"

    // "Lire la suite" — cover title style (box + contrasting text)
    const lireSize = 72
    ctx.font = `bold ${lireSize}px Apfel, sans-serif`
    const lireText = "Lire la suite"
    const lireWidth = ctx.measureText(lireText).width
    const lirePadX = 16
    const lirePadY = 10
    const lireBaselineY = H / 2 - 110
    const lireBoxX = W / 2 - lireWidth / 2 - lirePadX
    const lireBoxY = lireBaselineY - lireSize + lirePadY
    const lireBoxW = lireWidth + lirePadX * 2
    const lireBoxH = lireSize + lirePadY

    ctx.fillStyle = boxBg
    ctx.fillRect(lireBoxX, lireBoxY, lireBoxW, lireBoxH)
    ctx.fillStyle = textColor
    ctx.fillText(lireText, W / 2, lireBaselineY)

    // "SP2050.org" — same treatment, 3× bigger
    const spSize = 144
    ctx.font = `bold ${spSize}px Apfel, sans-serif`
    const spText = "SP2050.org"
    const spWidth = ctx.measureText(spText).width
    const spPadX = 20
    const spPadY = 16
    const spBaselineY = H / 2 + 110
    const spBoxX = W / 2 - spWidth / 2 - spPadX
    const spBoxY = spBaselineY - spSize + spPadY
    const spBoxW = spWidth + spPadX * 2
    const spBoxH = spSize + spPadY

    ctx.fillStyle = boxBg
    ctx.fillRect(spBoxX, spBoxY, spBoxW, spBoxH)
    ctx.fillStyle = textColor
    ctx.fillText(spText, W / 2, spBaselineY)

    ctx.restore()

    ctx.textAlign = "start"
    ctx.textBaseline = "top"
  }

  _wrapText(ctx, words, maxWidth) {
    const lines = []
    let currentLine = ""

    words.forEach((word) => {
      const testLine = currentLine ? currentLine + " " + word : word
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })
    if (currentLine) lines.push(currentLine)
    return lines
  }
}

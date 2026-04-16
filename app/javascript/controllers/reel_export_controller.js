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

function lerp(a, b, t) { return a + (b - a) * t }

const W = 1080
const H = 1920
const FPS = 60
const DURATION = 6
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
      const svgBg = `hsl(${data.hue}, 50%, 13%)`

      // Pre-render SVG morph frames (1.5s × 60fps = 90 frames)
      btn.textContent = "SVG 0%"
      const svgFrames = await this._preRenderSvgFrames(data, 90, btn)

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
        this._renderFrame(ctx, data, svgFrames, accent, svgBg, frame)
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
  _renderFrame(ctx, data, svgFrames, accent, svgBg, frame) {
    const t = frame / FPS

    if (t < 2.0) {
      this._drawCover(ctx, data, svgFrames, accent, svgBg, t)
    } else if (t < 4.0) {
      const fadeT = Math.min((t - 2.0) / 0.3, 1)
      if (fadeT < 1) {
        this._drawCover(ctx, data, svgFrames, accent, svgBg, 2.0)
        ctx.fillStyle = `rgba(18, 20, 44, ${fadeT})`
        ctx.fillRect(0, 0, W, H)
      }
      this._drawText(ctx, data, t, fadeT)
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

  // ── Phase 1: Cover (0–2.0s) ──
  _drawCover(ctx, data, svgFrames, accent, svgBg, t) {
    ctx.fillStyle = DARK
    ctx.fillRect(0, 0, W, H)

    const clipProgress = t < 1.5 ? coverEase(t / 1.5) : 1
    const maxRadius = Math.hypot(W, H) / 2
    const radius = clipProgress * maxRadius

    ctx.save()
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, radius, 0, Math.PI * 2)
    ctx.clip()

    if (svgFrames.length > 0) {
      const frameIdx = Math.min(Math.floor((Math.min(t, 1.5) / 1.5) * (svgFrames.length - 1)), svgFrames.length - 1)
      ctx.drawImage(svgFrames[frameIdx], 0, 0, W, H)
    } else {
      ctx.fillStyle = svgBg
      ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()

    if (t >= 0.3) {
      const words = data.title.split(/\s+/)
      const fontSize = 72
      ctx.font = `bold ${fontSize}px Apfel, sans-serif`
      ctx.textBaseline = "top"

      const maxWidth = W - 160
      const lines = this._wrapText(ctx, words, maxWidth)

      const lineHeight = fontSize * 1.3
      const blockHeight = lines.length * lineHeight
      const startY = H / 2 - blockHeight / 2 + 200

      const wordDelay = 0.08
      let wordIndex = 0

      lines.forEach((line, lineIdx) => {
        const lineWords = line.split(/\s+/)
        let lineX = 80

        lineWords.forEach((word) => {
          const wordT = (t - 0.3 - wordIndex * wordDelay)
          const wordProgress = Math.max(0, Math.min(1, wordT / 0.3))

          if (wordProgress > 0) {
            const easedProgress = coverEase(wordProgress)
            const wordWidth = ctx.measureText(word).width
            const pad = 10

            ctx.globalAlpha = easedProgress
            ctx.fillStyle = accent
            ctx.fillRect(lineX - pad, startY + lineIdx * lineHeight - pad / 2, wordWidth + pad * 2, fontSize + pad)

            ctx.fillStyle = "#FFFFFF"
            ctx.fillText(word, lineX, startY + lineIdx * lineHeight)
            ctx.globalAlpha = 1
          }

          lineX += ctx.measureText(word + " ").width
          wordIndex++
        })
      })

      const usernameT = t - 0.4
      const usernameProgress = Math.max(0, Math.min(1, usernameT / 0.4))
      if (usernameProgress > 0) {
        const easedU = coverEase(usernameProgress)
        ctx.globalAlpha = easedU
        ctx.font = `500 36px Apfel, sans-serif`
        const uText = `@${data.username}`
        const uWidth = ctx.measureText(uText).width
        const uY = startY + lines.length * lineHeight + 20

        ctx.fillStyle = accent
        ctx.fillRect(80 - 8, uY - 4, uWidth + 16, 44)
        ctx.fillStyle = "#FFFFFF"
        ctx.fillText(uText, 80, uY)
        ctx.globalAlpha = 1
      }
    }
  }

  // ── Phase 3: Text scene (2.0–4.0s) ──
  _drawText(ctx, data, t, fadeT) {
    if (fadeT >= 1) {
      ctx.fillStyle = DARK
      ctx.fillRect(0, 0, W, H)
    }

    if (!data.body) return

    const fontSize = 42
    ctx.font = `400 ${fontSize}px Apfel, sans-serif`
    ctx.textBaseline = "top"
    ctx.fillStyle = "#FFFFFF"

    const maxWidth = W - 160
    const words = data.body.split(/\s+/)
    const lines = this._wrapText(ctx, words, maxWidth)
    const lineHeight = fontSize * 1.6

    const scrollProgress = (t - 2.0) / 2.0
    const totalTextHeight = lines.length * lineHeight
    const scrollRange = Math.max(0, totalTextHeight - H + 400)
    const scrollY = -scrollProgress * scrollRange + 300

    ctx.save()
    ctx.globalAlpha = Math.min(fadeT, 1)

    lines.forEach((line, i) => {
      const y = scrollY + i * lineHeight
      if (y > -lineHeight && y < H + lineHeight) {
        ctx.fillStyle = "#FFFFFF"
        ctx.fillText(line, 80, y)
      }
    })

    const gradH = 200
    const topGrad = ctx.createLinearGradient(0, 0, 0, gradH)
    topGrad.addColorStop(0, DARK)
    topGrad.addColorStop(1, "rgba(18, 20, 44, 0)")
    ctx.fillStyle = topGrad
    ctx.fillRect(0, 0, W, gradH)

    const botGrad = ctx.createLinearGradient(0, H - gradH, 0, H)
    botGrad.addColorStop(0, "rgba(18, 20, 44, 0)")
    botGrad.addColorStop(1, DARK)
    ctx.fillStyle = botGrad
    ctx.fillRect(0, H - gradH, W, gradH)

    ctx.restore()
  }

  // ── Phase 4: Branded blink (4.0–6.0s) ──
  _drawBlink(ctx, data, accent, t) {
    const blinkT = t - 4.0
    const cycle = Math.floor(blinkT / 0.35)
    const isAccent = cycle % 2 === 0

    ctx.fillStyle = isAccent ? accent : DARK
    ctx.fillRect(0, 0, W, H)

    const textColor = isAccent ? DARK : accent

    ctx.font = `bold 64px Apfel, sans-serif`
    ctx.fillStyle = textColor
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("Lire la suite", W / 2, H / 2 - 50)

    ctx.font = `500 48px Apfel, sans-serif`
    ctx.fillText("SP2050.org", W / 2, H / 2 + 50)

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

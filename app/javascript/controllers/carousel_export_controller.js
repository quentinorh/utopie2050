import { Controller } from "@hotwired/stimulus"
import {
  drawCoverSlide,
  ensureApfelCoverFontsLoaded,
  loadCoverSvgAsRasterImage,
  wrapCoverLines
} from "utils/cover_slide_canvas"

function lerp(a, b, t) {
  return a + (b - a) * t
}

function hslToRgbBytes(h, sPct, lPct) {
  const s = sPct / 100
  const l = lPct / 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
  }
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4))
  }
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
]

const CAROUSEL_W = 1080
const CAROUSEL_H = 1350

const DARK = "#12142C"
const REEL_SVG_BG_HSL_S = 50
const REEL_SVG_BG_HSL_L = 13

const EXCERPT_FONT_PX = 48
const EXCERPT_LINE_HEIGHT_MULT = 1.28
const REEL_TEXT_GRAD_BAND_HEIGHT_PX = 440
const CAROUSEL_EXCERPT_BOTTOM_GRAD_PX = REEL_TEXT_GRAD_BAND_HEIGHT_PX / 2
const REEL_TEXT_GRAD_DITHER = 0.04
const EXCERPT_MAX_CHARS = 900

// Bandeau d'en-tête extrait — aligné sur reel phase 2, mis à l'échelle 1350 px.
const REEL_H_REF = 1920
const CAROUSEL_SCALE = CAROUSEL_H / REEL_H_REF
const EXCERPT_HEADER_HEIGHT_PX = Math.round(400 * CAROUSEL_SCALE)
const EXCERPT_HEADER_FONT_PX = Math.round(40 * CAROUSEL_SCALE)
const EXCERPT_HEADER_LINE_HEIGHT_MULT = 1.3
const EXCERPT_HEADER_FONT_FAMILY = '"Roboto Mono", monospace'
const EXCERPT_HEADER_ALPHA = 0.6
const EXCERPT_TEXT_LIFT_PX = 50
const EXCERPT_TEXT_TOP_PAD = 12

const COVER_SIDE_INSET_PX = 72

const OUTRO_TILT_DEG = -3
const OUTRO_LIRE_PX = 60
const OUTRO_LIRE_PAD_X = 16
const OUTRO_LIRE_PAD_Y = 10
const OUTRO_LIRE_BASELINE_OFFSET_Y = -56
const OUTRO_SP_PX = 120
const OUTRO_SP_PAD_X = 20
const OUTRO_SP_PAD_Y = 14
const OUTRO_SP_BASELINE_OFFSET_Y = 56

export default class extends Controller {
  static values = { postId: Number }

  async exportCarousel(event) {
    const btn = event.currentTarget
    const originalText = btn.textContent
    btn.textContent = "Export…"
    btn.disabled = true

    try {
      const resp = await fetch(`/admin/posts/${this.postIdValue}/reel_data`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()

      const accent = `hsl(${data.hue}, 80%, 70%)`
      const svgBg = `hsl(${data.hue}, ${REEL_SVG_BG_HSL_S}%, ${REEL_SVG_BG_HSL_L}%)`

      await this._ensureExtraCarouselFontsLoaded()

      btn.textContent = "Image 1/3…"
      const svgImg = await loadCoverSvgAsRasterImage(data.cover, data.pattern_settings, CAROUSEL_W, CAROUSEL_H)
      const canvas = document.createElement("canvas")
      canvas.width = CAROUSEL_W
      canvas.height = CAROUSEL_H
      const ctx = canvas.getContext("2d")

      const safeTitle = data.title.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").replace(/\s+/g, "_")

      drawCoverSlide(ctx, data, svgImg, CAROUSEL_W, CAROUSEL_H)
      await this._downloadPng(canvas, `${safeTitle}_carousel_1_couverture.png`)

      btn.textContent = "Image 2/3…"
      this._drawExcerptSlide(ctx, data, svgBg)
      await this._downloadPng(canvas, `${safeTitle}_carousel_2_extrait.png`)

      btn.textContent = "Image 3/3…"
      this._drawCtaSlide(ctx, accent)
      await this._downloadPng(canvas, `${safeTitle}_carousel_3_cta.png`)
    } catch (err) {
      console.error("Carousel export failed:", err)
      alert("Export carrousel échoué : " + err.message)
    } finally {
      btn.textContent = originalText
      btn.disabled = false
    }
  }

  async _ensureExtraCarouselFontsLoaded() {
    if (!document.fonts?.load) return
    await Promise.all([
      ensureApfelCoverFontsLoaded(CAROUSEL_W),
      document.fonts.load(`400 ${EXCERPT_FONT_PX}px Apfel, sans-serif`),
      document.fonts.load(`400 ${OUTRO_LIRE_PX}px Apfel, sans-serif`),
      document.fonts.load(`400 ${OUTRO_SP_PX}px Apfel, sans-serif`),
      document.fonts.load(`400 ${EXCERPT_HEADER_FONT_PX}px ${EXCERPT_HEADER_FONT_FAMILY}`)
    ])
  }

  _plainBody(body) {
    if (!body) return ""
    const d = document.createElement("div")
    d.innerHTML = body.replace(/<br\s*\/?>/gi, "\n")
    let text = d.textContent || d.innerText || ""
    text = text.replace(/\r\n?/g, "\n")
    text = text.replace(/[^\S\n]+/g, " ")
    text = text.replace(/ +(\n|$)/g, "$1")
    return text.trim()
  }

  _wrapExcerptLines(ctx, text, maxWidth) {
    const lines = []
    text.split("\n").forEach((paragraph) => {
      const trimmed = paragraph.trim()
      if (trimmed) {
        const words = trimmed.split(/\s+/)
        lines.push(...wrapCoverLines(ctx, words, maxWidth))
      } else {
        lines.push("")
      }
    })
    return lines
  }

  _excerptText(data) {
    let t = this._plainBody(data.body)
    if (!t) return "Un futur à lire sur SP2050."
    if (t.length > EXCERPT_MAX_CHARS) {
      const cut = t.slice(0, EXCERPT_MAX_CHARS)
      const lastSpace = cut.lastIndexOf(" ")
      t = (lastSpace > EXCERPT_MAX_CHARS * 0.7 ? cut.slice(0, lastSpace) : cut) + "…"
    }
    return t
  }

  async _downloadPng(canvas, filename) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("toBlob a échoué"))
            return
          }
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = filename
          a.click()
          URL.revokeObjectURL(url)
          setTimeout(resolve, 120)
        },
        "image/png",
        1.0
      )
    })
  }

  _compositeExcerptGradientBands(ctx, hue, topY = 0) {
    const W = CAROUSEL_W
    const H = CAROUSEL_H
    const bottomGradH = CAROUSEL_EXCERPT_BOTTOM_GRAD_PX
    const ga = ctx.globalAlpha
    const { r: br, g: bg, b: bb } = hslToRgbBytes(hue, REEL_SVG_BG_HSL_S, REEL_SVG_BG_HSL_L)
    const alphaBot = (u) =>
      u <= 0.45 ? lerp(0, 0.88, u / 0.45) : lerp(0.88, 1, (u - 0.45) / 0.55)
    const DITHER = REEL_TEXT_GRAD_DITHER

    if (topY > 0) {
      ctx.fillStyle = `hsl(${hue}, ${REEL_SVG_BG_HSL_S}%, ${REEL_SVG_BG_HSL_L}%)`
      ctx.fillRect(0, 0, W, topY)
    }

    const img = ctx.getImageData(0, H - bottomGradH, W, bottomGradH)
    const d = img.data
    const denom = bottomGradH > 1 ? bottomGradH - 1 : 1
    for (let y = 0; y < bottomGradH; y++) {
      const u = y / denom
      let a = alphaBot(u)
      for (let x = 0; x < W; x++) {
        const di = (BAYER4[y & 3][x & 3] / 15 - 0.5) * DITHER
        const am = Math.min(1, Math.max(0, a + di)) * ga
        const inv = 1 - am
        const i = (y * W + x) * 4
        d[i] = br * am + d[i] * inv
        d[i + 1] = bg * am + d[i + 1] * inv
        d[i + 2] = bb * am + d[i + 2] * inv
      }
    }
    ctx.putImageData(img, 0, H - bottomGradH)
  }

  _drawExcerptHeader(ctx, data) {
    const fontPx = EXCERPT_HEADER_FONT_PX
    const lineHeight = fontPx * EXCERPT_HEADER_LINE_HEIGHT_MULT
    const blockHeight = lineHeight * 2
    const blockTop = (EXCERPT_HEADER_HEIGHT_PX - blockHeight) / 2 + 15
    const titleLine = `${data.title || ""}`.toUpperCase()
    const authorLine = `${data.username || ""}`.toUpperCase()

    ctx.save()
    ctx.globalAlpha = EXCERPT_HEADER_ALPHA
    ctx.font = `400 ${fontPx}px ${EXCERPT_HEADER_FONT_FAMILY}`
    ctx.textBaseline = "top"
    ctx.fillStyle = "#FFFFFF"
    ctx.fillText(titleLine, COVER_SIDE_INSET_PX, blockTop)
    ctx.fillText(authorLine, COVER_SIDE_INSET_PX, blockTop + lineHeight)
    ctx.restore()
  }

  _drawExcerptSlide(ctx, data, svgBg) {
    ctx.fillStyle = svgBg
    ctx.fillRect(0, 0, CAROUSEL_W, CAROUSEL_H)

    const excerpt = this._excerptText(data)
    const fontSize = EXCERPT_FONT_PX
    ctx.font = `400 ${fontSize}px Apfel, sans-serif`
    ctx.textBaseline = "top"
    ctx.fillStyle = "#FFFFFF"

    const maxWidth = CAROUSEL_W - COVER_SIDE_INSET_PX * 2
    const lines = this._wrapExcerptLines(ctx, excerpt, maxWidth)
    const lineHeight = fontSize * EXCERPT_LINE_HEIGHT_MULT
    const blockHeight = lines.length * lineHeight
    const contentTop = EXCERPT_HEADER_HEIGHT_PX
    const contentBottom = CAROUSEL_H - CAROUSEL_EXCERPT_BOTTOM_GRAD_PX
    const minTextY = contentTop + EXCERPT_TEXT_TOP_PAD
    const centeredY = contentTop + Math.max(EXCERPT_TEXT_TOP_PAD, (contentBottom - contentTop - blockHeight) / 2)
    const startY = Math.max(minTextY, centeredY - EXCERPT_TEXT_LIFT_PX)

    lines.forEach((line, i) => {
      const y = startY + i * lineHeight
      if (y >= minTextY) {
        ctx.fillText(line, COVER_SIDE_INSET_PX, y)
      }
    })

    this._compositeExcerptGradientBands(ctx, data.hue, EXCERPT_HEADER_HEIGHT_PX)
    this._drawExcerptHeader(ctx, data)
  }

  _drawCtaSlide(ctx, accent) {
    const pageBg = DARK
    const boxBg = accent
    const textColor = DARK

    ctx.fillStyle = pageBg
    ctx.fillRect(0, 0, CAROUSEL_W, CAROUSEL_H)

    const tiltRad = (OUTRO_TILT_DEG * Math.PI) / 180
    ctx.save()
    ctx.translate(CAROUSEL_W / 2, CAROUSEL_H / 2)
    ctx.rotate(tiltRad)
    ctx.translate(-CAROUSEL_W / 2, -CAROUSEL_H / 2)

    ctx.textAlign = "center"
    ctx.textBaseline = "alphabetic"

    const lireSize = OUTRO_LIRE_PX
    ctx.font = `400 ${lireSize}px Apfel, sans-serif`
    const lireText = "Lire la suite"
    const lireWidth = ctx.measureText(lireText).width
    const lireBaselineY = CAROUSEL_H / 2 + OUTRO_LIRE_BASELINE_OFFSET_Y
    const lireBoxX = CAROUSEL_W / 2 - lireWidth / 2 - OUTRO_LIRE_PAD_X
    const lireBoxY = lireBaselineY - lireSize + OUTRO_LIRE_PAD_Y
    const lireBoxW = lireWidth + OUTRO_LIRE_PAD_X * 2
    const lireBoxH = lireSize + OUTRO_LIRE_PAD_Y

    ctx.fillStyle = boxBg
    ctx.fillRect(lireBoxX, lireBoxY, lireBoxW, lireBoxH)
    ctx.fillStyle = textColor
    ctx.fillText(lireText, CAROUSEL_W / 2, lireBaselineY)

    const spSize = OUTRO_SP_PX
    ctx.font = `400 ${spSize}px Apfel, sans-serif`
    const spText = "SP2050.org"
    const spWidth = ctx.measureText(spText).width
    const spBaselineY = CAROUSEL_H / 2 + OUTRO_SP_BASELINE_OFFSET_Y
    const spBoxX = CAROUSEL_W / 2 - spWidth / 2 - OUTRO_SP_PAD_X
    const spBoxY = spBaselineY - spSize + OUTRO_SP_PAD_Y
    const spBoxW = spWidth + OUTRO_SP_PAD_X * 2
    const spBoxH = spSize + OUTRO_SP_PAD_Y

    ctx.fillStyle = boxBg
    ctx.fillRect(spBoxX, spBoxY, spBoxW, spBoxH)
    ctx.fillStyle = textColor
    ctx.fillText(spText, CAROUSEL_W / 2, spBaselineY)

    ctx.restore()
    ctx.textAlign = "start"
    ctx.textBaseline = "top"
  }
}

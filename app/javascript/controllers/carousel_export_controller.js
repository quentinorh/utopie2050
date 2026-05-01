import { Controller } from "@hotwired/stimulus"

function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

/** Letter-spacing canvas (équivalent CSS `letter-spacing` sur le pseudo). */
function measureTextWithLetterSpacing(ctx, text, letterSpacingPx) {
  if (!text.length) return 0
  let w = 0
  for (let i = 0; i < text.length; i++) {
    w += ctx.measureText(text[i]).width
    if (i < text.length - 1) w += letterSpacingPx
  }
  return w
}

function fillTextWithLetterSpacing(ctx, text, x, y, letterSpacingPx) {
  let xPos = x
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], xPos, y)
    xPos += ctx.measureText(text[i]).width + (i < text.length - 1 ? letterSpacingPx : 0)
  }
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
const COVER_USERNAME_COLOR = "#000000"
const REEL_SVG_BG_HSL_S = 50
const REEL_SVG_BG_HSL_L = 13

const COVER_TITLE_PX = 112
/** Aligné sur .cover-title-text : line-height 100 % */
const COVER_TITLE_LINE_HEIGHT_MULT = 1.0
const COVER_TITLE_PAD_PX = 10
const COVER_TITLE_VPAD_EXTRA_PX = 10
/** Descente fine du texte dans le bloc titre (centrage optique). */
const COVER_TITLE_TEXT_OPTICAL_NUDGE_MULT = 0.04
const COVER_TITLE_BG_EXTRA_RIGHT_PX = 8
const COVER_SIDE_INSET_PX = 72
const COVER_USERNAME_REF_PX = 14
const COVER_USER_PX = 38
const COVER_USER_PAD_X = Math.round((7 * COVER_USER_PX) / COVER_USERNAME_REF_PX)
const COVER_USER_PAD_Y = Math.round((3 * COVER_USER_PX) / COVER_USERNAME_REF_PX)
const COVER_USER_LINE_HEIGHT_MULT = 1.12
const COVER_USER_TEXT_OPTICAL_NUDGE_MULT = 0.072
const COVER_GAP_USER_TITLE_PX = 42
const COVER_BOTTOM_MARGIN_PX = 56
const COVER_REVEAL_SLIDE_PX = 64

const EXCERPT_FONT_PX = 48
const EXCERPT_LINE_HEIGHT_MULT = 1.28
const REEL_TEXT_GRAD_BAND_HEIGHT_PX = 440
/** Bande basse seule pour l’extrait carrousel : moitié de la hauteur d’origine ; pas de bande haute. */
const CAROUSEL_EXCERPT_BOTTOM_GRAD_PX = REEL_TEXT_GRAD_BAND_HEIGHT_PX / 2
const REEL_TEXT_GRAD_DITHER = 0.04
const EXCERPT_MAX_CHARS = 900

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
      const usernameBg = `hsl(${(data.hue + 120) % 360}, 80%, 70%)`
      const svgBg = `hsl(${data.hue}, ${REEL_SVG_BG_HSL_S}%, ${REEL_SVG_BG_HSL_L}%)`

      await this._ensureApfelCoverFontsLoaded()

      btn.textContent = "Image 1/3…"
      const svgImg = await this._finalSvgImage(data)
      const canvas = document.createElement("canvas")
      canvas.width = CAROUSEL_W
      canvas.height = CAROUSEL_H
      const ctx = canvas.getContext("2d")

      const safeTitle = data.title.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").replace(/\s+/g, "_")

      this._drawCoverSlide(ctx, data, svgImg, accent, usernameBg, svgBg)
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

  async _ensureApfelCoverFontsLoaded() {
    if (!document.fonts?.load) return
    await Promise.all([
      document.fonts.load(`400 ${COVER_TITLE_PX}px Apfel, sans-serif`),
      document.fonts.load(`700 ${COVER_USER_PX}px Apfel, sans-serif`),
      document.fonts.load(`400 ${EXCERPT_FONT_PX}px Apfel, sans-serif`),
      document.fonts.load(`400 ${OUTRO_LIRE_PX}px Apfel, sans-serif`),
      document.fonts.load(`400 ${OUTRO_SP_PX}px Apfel, sans-serif`)
    ])
  }

  _plainBody(body) {
    if (!body) return ""
    const d = document.createElement("div")
    d.innerHTML = body
    return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim()
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

  async _finalSvgImage(data) {
    const settings = data.pattern_settings
    if (!settings || !data.cover) return null

    const parser = new DOMParser()
    const target1 = parseFloat(settings.firstSliderControl)
    const target2 = parseFloat(settings.secondSliderControl)
    const targetSmoothing = parseFloat(settings.smoothing)

    const doc = parser.parseFromString(data.cover, "image/svg+xml")
    const svg = doc.documentElement
    svg.setAttribute("viewBox", "0 0 250 350")
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice")
    svg.setAttribute("width", String(CAROUSEL_W))
    svg.setAttribute("height", String(CAROUSEL_H))

    this._regeneratePaths(svg, {
      firstSliderControl: target1,
      secondSliderControl: target2,
      smoothing: targetSmoothing,
      rows: parseInt(settings.rows) || 1,
      columns: parseInt(settings.columns) || 1,
      symmetryMode: settings.symmetryMode || "x4"
    })

    const svgStr = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgStr], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.width = CAROUSEL_W
    img.height = CAROUSEL_H
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    URL.revokeObjectURL(url)
    return img
  }

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

  _drawCoverSlide(ctx, data, svgImg, accent, usernameBg, svgBg) {
    ctx.fillStyle = DARK
    ctx.fillRect(0, 0, CAROUSEL_W, CAROUSEL_H)

    if (svgImg) {
      ctx.drawImage(svgImg, 0, 0, CAROUSEL_W, CAROUSEL_H)
    } else {
      ctx.fillStyle = svgBg
      ctx.fillRect(0, 0, CAROUSEL_W, CAROUSEL_H)
    }

    const titleFontSize = COVER_TITLE_PX
    const titleLineHeight = titleFontSize * COVER_TITLE_LINE_HEIGHT_MULT
    const titlePad = COVER_TITLE_PAD_PX
    const titleVPadExtra = COVER_TITLE_VPAD_EXTRA_PX
    const inset = COVER_SIDE_INSET_PX
    const leftX = inset
    const maxWidth = CAROUSEL_W - inset * 2

    ctx.font = `400 ${titleFontSize}px Apfel, sans-serif`
    ctx.textBaseline = "top"
    const words = data.title.split(/\s+/)
    const lines = this._wrapText(ctx, words, maxWidth)
    const titleTextNudge = Math.round(titleFontSize * COVER_TITLE_TEXT_OPTICAL_NUDGE_MULT)
    const titlePillOverhangBottom = titlePad / 2 + titleVPadExtra + titleTextNudge
    const blockHeight = lines.length * titleLineHeight + titlePillOverhangBottom

    const userFontSize = COVER_USER_PX
    const userPadX = COVER_USER_PAD_X
    const userPadY = COVER_USER_PAD_Y
    const userBoxH = Math.ceil(userFontSize * COVER_USER_LINE_HEIGHT_MULT) + userPadY * 2
    const gapUserTitle = COVER_GAP_USER_TITLE_PX
    const userLetterSp = (0.67 * userFontSize) / COVER_USERNAME_REF_PX
    const coverOuterPad = Math.max(titlePad, userPadX)
    const coverBlockLeft = leftX - coverOuterPad

    const titleStartY = CAROUSEL_H - COVER_BOTTOM_MARGIN_PX - blockHeight
    const userY = titleStartY - userBoxH - gapUserTitle

    const easedU = easeOutBack(1)
    const yOffsetUser = (1 - easedU) * COVER_REVEAL_SLIDE_PX
    ctx.font = `700 ${userFontSize}px Apfel, sans-serif`
    const uText = `${data.username}`.toUpperCase()
    const uWidth = measureTextWithLetterSpacing(ctx, uText, userLetterSp)
    const userBarW = (leftX + uWidth + userPadX) - coverBlockLeft
    ctx.fillStyle = usernameBg
    ctx.fillRect(coverBlockLeft, userY + yOffsetUser, userBarW, userBoxH)
    ctx.fillStyle = COVER_USERNAME_COLOR
    ctx.textBaseline = "middle"
    const userTextCenterY =
      userY + userBoxH / 2 + yOffsetUser + Math.round(userFontSize * COVER_USER_TEXT_OPTICAL_NUDGE_MULT)
    fillTextWithLetterSpacing(ctx, uText, leftX, userTextCenterY, userLetterSp)
    ctx.textBaseline = "top"

    ctx.font = `400 ${titleFontSize}px Apfel, sans-serif`
    const easedTitle = easeOutBack(1)
    const yOffsetTitle = (1 - easedTitle) * COVER_REVEAL_SLIDE_PX
    let maxLineWidth = 0
    lines.forEach((line) => {
      maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width)
    })
    const titleBlockTop = titleStartY - titlePad / 2 - titleVPadExtra + yOffsetTitle
    const titleBlockH =
      (lines.length - 1) * titleLineHeight +
      titleFontSize +
      titlePad +
      titleVPadExtra * 2 +
      titleTextNudge
    const titleBlockW =
      (leftX + maxLineWidth + titlePad) - coverBlockLeft + COVER_TITLE_BG_EXTRA_RIGHT_PX

    ctx.fillStyle = accent
    ctx.fillRect(coverBlockLeft, titleBlockTop, titleBlockW, titleBlockH)

    ctx.fillStyle = DARK
    lines.forEach((line, lineIdx) => {
      const baseY = titleStartY + lineIdx * titleLineHeight + yOffsetTitle
      ctx.fillText(line, leftX, baseY + titleTextNudge)
    })
  }

  /** Dégradé bas uniquement (extrait carrousel), hauteur réduite de moitié. */
  _compositeExcerptBottomGradient(ctx, hue) {
    const W = CAROUSEL_W
    const H = CAROUSEL_H
    const gradH = CAROUSEL_EXCERPT_BOTTOM_GRAD_PX
    const ga = ctx.globalAlpha
    const { r: br, g: bg, b: bb } = hslToRgbBytes(hue, REEL_SVG_BG_HSL_S, REEL_SVG_BG_HSL_L)
    const alphaBot = (u) =>
      u <= 0.45 ? lerp(0, 0.88, u / 0.45) : lerp(0.88, 1, (u - 0.45) / 0.55)
    const DITHER = REEL_TEXT_GRAD_DITHER

    const img = ctx.getImageData(0, H - gradH, W, gradH)
    const d = img.data
    const denom = gradH > 1 ? gradH - 1 : 1
    for (let y = 0; y < gradH; y++) {
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
    ctx.putImageData(img, 0, H - gradH)
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
    const words = excerpt.split(/\s+/)
    const lines = this._wrapText(ctx, words, maxWidth)
    const lineHeight = fontSize * EXCERPT_LINE_HEIGHT_MULT
    const blockHeight = lines.length * lineHeight
    const startY = Math.max(64, (CAROUSEL_H - blockHeight) / 2)

    lines.forEach((line, i) => {
      ctx.fillText(line, COVER_SIDE_INSET_PX, startY + i * lineHeight)
    })

    this._compositeExcerptBottomGradient(ctx, data.hue)
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

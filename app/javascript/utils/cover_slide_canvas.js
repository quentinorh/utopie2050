/**
 * Rendu canvas de la couverture (motif SVG + bloc titre / auteur), aligné sur
 * carousel_export_controller.js et les styles .cover-title-text / .cover-username.
 */
import { patternSmoothingFactorFromSlider } from "utils/pattern_smoothing"

function easeOutBack(t) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** Letter-spacing canvas (équivalent CSS `letter-spacing` sur le pseudo). */
export function measureTextWithLetterSpacing(ctx, text, letterSpacingPx) {
  if (!text.length) return 0
  let w = 0
  for (let i = 0; i < text.length; i++) {
    w += ctx.measureText(text[i]).width
    if (i < text.length - 1) w += letterSpacingPx
  }
  return w
}

export function fillTextWithLetterSpacing(ctx, text, x, y, letterSpacingPx) {
  let xPos = x
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], xPos, y)
    xPos += ctx.measureText(text[i]).width + (i < text.length - 1 ? letterSpacingPx : 0)
  }
}

const DARK = "#12142C"
const COVER_USERNAME_COLOR = "#000000"
const REEL_SVG_BG_HSL_S = 50
const REEL_SVG_BG_HSL_L = 13

const COVER_TITLE_PX = 112
const COVER_TITLE_LINE_HEIGHT_MULT = 1.0
const COVER_TITLE_PAD_PX = 10
const COVER_TITLE_VPAD_EXTRA_PX = 10
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

const REF_W = 1080
const REF_H = 1350

export function wrapCoverLines(ctx, words, maxWidth) {
  const lines = []
  let currentLine = ""

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word
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

export function regenerateCoverPaths(svg, params) {
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
  const sm = patternSmoothingFactorFromSlider(smoothing)

  const control1 = [(width * x * sm).toFixed(2), (height * sm).toFixed(2)]
  const control2 = [(width * sm).toFixed(2), (height * (1 - y * sm)).toFixed(2)]
  const control3 = [(width * x3 * sm).toFixed(2), (height * (1 - y3 * sm)).toFixed(2)]

  const basePath = `M ${startPoint[0]},${startPoint[1]} C ${control1[0]},${control1[1]} ${control3[0]},${control3[1]} ${control2[0]},${control2[1]}`

  let transforms = []
  switch (symmetryMode) {
    case "x4":
      transforms = [
        "scale(1,1) translate(-125,-175)",
        "scale(-1,1) translate(-125,-175)",
        "scale(1,-1) translate(-125,-175)",
        "scale(-1,-1) translate(-125,-175)"
      ]
      break
    case "x8":
      transforms = [
        "scale(1,1) translate(-125,-175)",
        "scale(-1,1) translate(-125,-175)",
        "scale(1,-1) translate(-125,-175)",
        "scale(-1,-1) translate(-125,-175)",
        "rotate(90) scale(1,1) translate(-125,-175)",
        "rotate(90) scale(-1,1) translate(-125,-175)",
        "rotate(90) scale(1,-1) translate(-125,-175)",
        "rotate(90) scale(-1,-1) translate(-125,-175)"
      ]
      break
    case "x16":
      transforms = [
        "scale(1,1) translate(-125,-175)",
        "scale(-1,1) translate(-125,-175)",
        "scale(1,-1) translate(-125,-175)",
        "scale(-1,-1) translate(-125,-175)",
        "rotate(90) scale(1,1) translate(-125,-175)",
        "rotate(90) scale(-1,1) translate(-125,-175)",
        "rotate(90) scale(1,-1) translate(-125,-175)",
        "rotate(90) scale(-1,-1) translate(-125,-175)",
        "rotate(45) scale(1,1) translate(-125,-175)",
        "rotate(45) scale(-1,1) translate(-125,-175)",
        "rotate(45) scale(1,-1) translate(-125,-175)",
        "rotate(45) scale(-1,-1) translate(-125,-175)",
        "rotate(135) scale(1,1) translate(-125,-175)",
        "rotate(135) scale(-1,1) translate(-125,-175)",
        "rotate(135) scale(1,-1) translate(-125,-175)",
        "rotate(135) scale(-1,-1) translate(-125,-175)"
      ]
      break
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

/**
 * @param {string} coverSvgString — SVG sérialisé (éditeur / post.cover)
 * @param {object} settings — pattern_settings JSON
 * @param {number} outW
 * @param {number} outH
 * @returns {Promise<HTMLImageElement|null>}
 */
export async function loadCoverSvgAsRasterImage(coverSvgString, settings, outW, outH) {
  if (!settings || !coverSvgString) return null

  const parser = new DOMParser()
  const target1 = parseFloat(settings.firstSliderControl)
  const target2 = parseFloat(settings.secondSliderControl)
  const targetSmoothing = parseFloat(settings.smoothing)

  const doc = parser.parseFromString(coverSvgString, "image/svg+xml")
  const svg = doc.documentElement
  svg.setAttribute("viewBox", "0 0 250 350")
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice")
  svg.setAttribute("width", String(outW))
  svg.setAttribute("height", String(outH))

  regenerateCoverPaths(svg, {
    firstSliderControl: target1,
    secondSliderControl: target2,
    smoothing: targetSmoothing,
    rows: parseInt(settings.rows, 10) || 1,
    columns: parseInt(settings.columns, 10) || 1,
    symmetryMode: settings.symmetryMode || "x4"
  })

  const svgStr = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([svgStr], { type: "image/svg+xml" })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.width = outW
  img.height = outH
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = url
  })
  URL.revokeObjectURL(url)
  return img
}

export async function ensureApfelCoverFontsLoaded(outW) {
  if (!document.fonts?.load) return
  const s = outW / REF_W
  const titlePx = Math.ceil(COVER_TITLE_PX * s)
  const userPx = Math.ceil(COVER_USER_PX * s)
  await Promise.all([
    document.fonts.load(`400 ${titlePx}px Apfel, sans-serif`),
    document.fonts.load(`700 ${userPx}px Apfel, sans-serif`)
  ])
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ title: string, username: string, hue: number }} data
 * @param {HTMLImageElement|null} svgImg
 * @param {number} outW
 * @param {number} outH
 */
export function drawCoverSlide(ctx, data, svgImg, outW, outH) {
  const sx = outW / REF_W
  const sy = outH / REF_H

  const accent = `hsl(${data.hue}, 80%, 70%)`
  const usernameBg = `hsl(${(data.hue + 120) % 360}, 80%, 70%)`
  const svgBg = `hsl(${data.hue}, ${REEL_SVG_BG_HSL_S}%, ${REEL_SVG_BG_HSL_L}%)`

  ctx.fillStyle = DARK
  ctx.fillRect(0, 0, outW, outH)

  if (svgImg) {
    ctx.drawImage(svgImg, 0, 0, outW, outH)
  } else {
    ctx.fillStyle = svgBg
    ctx.fillRect(0, 0, outW, outH)
  }

  const titleFontSize = COVER_TITLE_PX * sx
  const titleLineHeight = titleFontSize * COVER_TITLE_LINE_HEIGHT_MULT
  const titlePad = COVER_TITLE_PAD_PX * sx
  const titleVPadExtra = COVER_TITLE_VPAD_EXTRA_PX * sy
  const inset = COVER_SIDE_INSET_PX * sx
  const leftX = inset
  const maxWidth = outW - inset * 2

  ctx.font = `400 ${titleFontSize}px Apfel, sans-serif`
  ctx.textBaseline = "top"
  const words = data.title.split(/\s+/)
  const lines = wrapCoverLines(ctx, words, maxWidth)
  const titleTextNudge = Math.round(titleFontSize * COVER_TITLE_TEXT_OPTICAL_NUDGE_MULT)
  const titlePillOverhangBottom = titlePad / 2 + titleVPadExtra + titleTextNudge
  const blockHeight = lines.length * titleLineHeight + titlePillOverhangBottom

  const userFontSize = COVER_USER_PX * sx
  const userPadX = COVER_USER_PAD_X * sx
  const userPadY = COVER_USER_PAD_Y * sy
  const userBoxH = Math.ceil(userFontSize * COVER_USER_LINE_HEIGHT_MULT) + userPadY * 2
  const gapUserTitle = COVER_GAP_USER_TITLE_PX * sy
  const userLetterSp = (0.67 * userFontSize) / COVER_USERNAME_REF_PX
  const coverOuterPad = Math.max(titlePad, userPadX)
  const coverBlockLeft = leftX - coverOuterPad

  const titleStartY = outH - COVER_BOTTOM_MARGIN_PX * sy - blockHeight
  const userY = titleStartY - userBoxH - gapUserTitle

  const easedU = easeOutBack(1)
  const yOffsetUser = (1 - easedU) * COVER_REVEAL_SLIDE_PX * sy
  ctx.font = `700 ${userFontSize}px Apfel, sans-serif`
  const uText = `${data.username}`.toUpperCase()
  const uWidth = measureTextWithLetterSpacing(ctx, uText, userLetterSp)
  const userBarW = leftX + uWidth + userPadX - coverBlockLeft
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
  const yOffsetTitle = (1 - easedTitle) * COVER_REVEAL_SLIDE_PX * sy
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
  const titleExtraRight = COVER_TITLE_BG_EXTRA_RIGHT_PX * sx
  const titleBlockW = leftX + maxLineWidth + titlePad - coverBlockLeft + titleExtraRight

  ctx.fillStyle = accent
  ctx.fillRect(coverBlockLeft, titleBlockTop, titleBlockW, titleBlockH)

  ctx.fillStyle = DARK
  lines.forEach((line, lineIdx) => {
    const baseY = titleStartY + lineIdx * titleLineHeight + yOffsetTitle
    ctx.fillText(line, leftX, baseY + titleTextNudge)
  })
}

/** JPEG pour Active Storage / Open Graph (même logique que la slide couverture du carrousel). */
export async function renderCoverShareJpegBlob(
  { title, username, hue, pattern_settings: patternSettings, cover },
  width,
  height,
  jpegQuality = 0.92
) {
  await ensureApfelCoverFontsLoaded(width)
  const svgImg = await loadCoverSvgAsRasterImage(cover, patternSettings, width, height)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  drawCoverSlide(ctx, { title, username, hue }, svgImg, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob a échoué"))), "image/jpeg", jpegQuality)
  })
}

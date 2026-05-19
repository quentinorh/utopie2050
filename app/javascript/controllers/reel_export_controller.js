import { Controller } from "@hotwired/stimulus"
import { patternSmoothingFactorFromSlider } from "utils/pattern_smoothing"

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

// Matches CSS hsl() — h in degrees, s/l as percentages (e.g. 50, 13).
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

// 4×4 Bayer matrix / 15 — centered noise for ordered dither on alpha ramps.
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
]

// ═══════════════════════════════════════════════════════════════════════════
// Reel export — paramètres (durées, défilement, typo, encodeur…)
// ═══════════════════════════════════════════════════════════════════════════
//
// Timeline (t = secondes depuis le début) :
//   phase 1a  : 0 → REEL_SVG_MORPH_END     (morph SVG seul)
//   phase 1b  : → REEL_COVER_END            (titre + pseudo)
//   phase 1c  : fondu cover (REEL_PHASE1_FADE_OUT) puis fond uni (REEL_PHASE2_GAP_AFTER_FADE)
//   phase 2   : REEL_SCROLL_START → REEL_TEXT_END   (scroll corps, vitesse = REEL_BODY_SCROLL_PX_PER_SEC)
//   phase 3   : → REEL_DURATION            (outro)
//
const REEL_W = 1080
const REEL_H = 1920
const REEL_FPS = 60

const REEL_SVG_MORPH_END = 4.0
const REEL_COVER_END = 7.0
const REEL_PHASE1_FADE_OUT = 0.35
const REEL_PHASE2_GAP_AFTER_FADE = 0.12
/** Durée du scroll une fois REEL_SCROLL_START atteint (vitesse px/s inchangée → plus de texte défilé). */
const REEL_PHASE2_SCROLL_DURATION = 20.0
const REEL_OUTRO_DURATION = 6.0

const REEL_SCROLL_START = REEL_COVER_END + REEL_PHASE1_FADE_OUT + REEL_PHASE2_GAP_AFTER_FADE
const REEL_TEXT_END = REEL_SCROLL_START + REEL_PHASE2_SCROLL_DURATION
const REEL_DURATION = REEL_TEXT_END + REEL_OUTRO_DURATION
const REEL_TOTAL_FRAMES = REEL_FPS * REEL_DURATION

const REEL_ENCODER_QP = 18
const REEL_SVG_MORPH_FRAME_COUNT = 120

const REEL_DARK = "#12142C"
const REEL_SVG_BG_HSL_S = 50
const REEL_SVG_BG_HSL_L = 13

// Phase 1 — cover (titre, pseudo, révélation)
const REEL_COVER_TITLE_PX = 144
/** Aligné sur .cover-title-text : line-height 100 % */
const REEL_COVER_TITLE_LINE_HEIGHT_MULT = 1.0
const REEL_COVER_TITLE_PAD_PX = 10
/** Marge verticale en plus du pad « site » (haut + bas). */
const REEL_COVER_TITLE_VPAD_EXTRA_PX = 10
/** Descente fine du texte dans le bloc titre (centrage optique). */
const REEL_COVER_TITLE_TEXT_OPTICAL_NUDGE_MULT = 0.04
/** Extension du fond titre vers la droite (padding visuel). */
const REEL_COVER_TITLE_BG_EXTRA_RIGHT_PX = 5
const REEL_COVER_SIDE_INSET_PX = 80
/** Réf. site .cover-username font-size 14px ; pads 7px / 3px mis à l’échelle. */
const REEL_COVER_USERNAME_REF_PX = 14
const REEL_COVER_USER_PX = 48
const REEL_COVER_USER_PAD_X = Math.round((7 * REEL_COVER_USER_PX) / REEL_COVER_USERNAME_REF_PX)
const REEL_COVER_USER_PAD_Y = Math.round((3 * REEL_COVER_USER_PX) / REEL_COVER_USERNAME_REF_PX)
const REEL_COVER_USER_LINE_HEIGHT_MULT = 1.12
/** Descente fine : `middle` + caps + bold = centre géométrique trop haut visuellement. */
const REEL_COVER_USER_TEXT_OPTICAL_NUDGE_MULT = 0.072
const REEL_COVER_GAP_USER_TITLE_PX = 42
const REEL_COVER_REVEAL_SLIDE_PX = 80
const REEL_COVER_USER_REVEAL_S = 0.5
const REEL_COVER_TITLE_DELAY_AFTER_USER_S = 0.25
const REEL_COVER_TITLE_REVEAL_S = 0.55
const REEL_COVER_USER_ALPHA_RAMP = 1.5
const REEL_COVER_TITLE_ALPHA_RAMP = 1.6

// Phase 2 — corps du post
const REEL_BODY_FONT_PX = 50
const REEL_BODY_LINE_HEIGHT_MULT = 1.3
const REEL_BODY_SCROLL_PX_PER_SEC = 55 * 1.5 * 1.5

/** Hauteur des bandes dégradées haut/bas en phase 2 (−30 % par rapport à 560 px). */
const REEL_TEXT_GRAD_BAND_HEIGHT_PX = 280
const REEL_TEXT_GRAD_DITHER = 0.04

// Phase 2 — bandeau d'en-tête (titre + auteur, hors zone de scroll).
// Le dégradé du haut démarre à `REEL_PHASE2_HEADER_HEIGHT_PX` ; au-dessus,
// le fond est rempli en aplat pour masquer le texte qui défile.
const REEL_PHASE2_HEADER_HEIGHT_PX = 330
const REEL_PHASE2_TEXT_LIFT_PX = 70
const REEL_PHASE2_TOP_GRAD_LIFT_PX = 70
const REEL_PHASE2_HEADER_FONT_PX = 40
const REEL_PHASE2_HEADER_LINE_HEIGHT_MULT = 1.3
const REEL_PHASE2_HEADER_FONT_FAMILY = '"Roboto Mono", monospace'
const REEL_PHASE2_HEADER_ALPHA = 0.6

// Phase 3 — outro
const REEL_OUTRO_FLASH_START = 0.7
const REEL_OUTRO_FLASH_END = 1.5
const REEL_OUTRO_TILT_DEG = -3
const REEL_OUTRO_LIRE_PX = 72
const REEL_OUTRO_LIRE_PAD_X = 16
const REEL_OUTRO_LIRE_PAD_Y = 10
const REEL_OUTRO_LIRE_BASELINE_OFFSET_Y = -68
const REEL_OUTRO_SP_PX = 144
const REEL_OUTRO_SP_PAD_X = 20
const REEL_OUTRO_SP_PAD_Y = 16
const REEL_OUTRO_SP_BASELINE_OFFSET_Y = 68

const W = REEL_W
const H = REEL_H
const FPS = REEL_FPS
const DARK = REEL_DARK
const COVER_USERNAME_COLOR = "#000000"
const TOTAL_FRAMES = REEL_TOTAL_FRAMES

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
      const svgBg = `hsl(${data.hue}, ${REEL_SVG_BG_HSL_S}%, ${REEL_SVG_BG_HSL_L}%)`

      await this._ensureApfelCoverFontsLoaded()

      // Pre-render SVG morph frames — étalés sur REEL_SVG_MORPH_END.
      // ~1 nouvelle image tous les 2 frames vidéo à 60 fps : compromis lisse / mémoire.
      btn.textContent = "SVG 0%"
      const svgFrames = await this._preRenderSvgFrames(data, REEL_SVG_MORPH_FRAME_COUNT, btn)

      btn.textContent = "Encodeur..."
      const HME = await loadHME()
      const encoder = await HME.createH264MP4Encoder()
      encoder.width = W
      encoder.height = H
      encoder.frameRate = FPS
      encoder.quantizationParameter = REEL_ENCODER_QP
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

  /** Charge Apfel Regular + Bold + Roboto Mono pour le canvas (évite le fallback avant rendu). */
  async _ensureApfelCoverFontsLoaded() {
    if (!document.fonts?.load) return
    await Promise.all([
      document.fonts.load(`400 ${REEL_COVER_TITLE_PX}px Apfel, sans-serif`),
      document.fonts.load(`700 ${REEL_COVER_USER_PX}px Apfel, sans-serif`),
      document.fonts.load(`400 ${REEL_BODY_FONT_PX}px Apfel, sans-serif`),
      document.fonts.load(`400 ${REEL_OUTRO_LIRE_PX}px Apfel, sans-serif`),
      document.fonts.load(`400 ${REEL_OUTRO_SP_PX}px Apfel, sans-serif`),
      document.fonts.load(`400 ${REEL_PHASE2_HEADER_FONT_PX}px ${REEL_PHASE2_HEADER_FONT_FAMILY}`)
    ])
  }

  // ── Render a single frame to canvas ──
  _renderFrame(ctx, data, svgFrames, accent, usernameBg, svgBg, frame) {
    // Frame 0 = poster statique (couverture finale, titre + auteur visibles).
    // Sert de miniature sur les réseaux sociaux ; le flash de 1/60 s avant le
    // début de l'animation morph est imperceptible à la lecture.
    if (frame === 0) {
      this._drawCover(ctx, data, svgFrames, accent, usernameBg, svgBg, REEL_COVER_END)
      return
    }

    const t = frame / FPS

    if (t < REEL_COVER_END) {
      this._drawCover(ctx, data, svgFrames, accent, usernameBg, svgBg, t)
    } else if (t < REEL_TEXT_END) {
      const fadeEnd = REEL_COVER_END + REEL_PHASE1_FADE_OUT
      if (t < fadeEnd) {
        const fadeT = (t - REEL_COVER_END) / REEL_PHASE1_FADE_OUT
        this._drawCover(ctx, data, svgFrames, accent, usernameBg, svgBg, REEL_COVER_END)
        ctx.fillStyle = `hsla(${data.hue}, ${REEL_SVG_BG_HSL_S}%, ${REEL_SVG_BG_HSL_L}%, ${fadeT})`
        ctx.fillRect(0, 0, W, H)
      } else if (t < REEL_SCROLL_START) {
        ctx.fillStyle = svgBg
        ctx.fillRect(0, 0, W, H)
      } else {
        this._drawText(ctx, data, t, svgBg)
      }
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
    const sm = patternSmoothingFactorFromSlider(smoothing)

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
  //   Step A (0 → REEL_SVG_MORPH_END): SVG morph, full frame, no radial reveal.
  //   Step B (REEL_SVG_MORPH_END → REEL_COVER_END): title + username dynamic reveal.
  _drawCover(ctx, data, svgFrames, accent, usernameBg, svgBg, t) {
    ctx.fillStyle = DARK
    ctx.fillRect(0, 0, W, H)

    // SVG morph plays across the whole of Step A (and freezes on the final
    // frame during Step B). No radial clip — SVG fills the frame immediately.
    if (svgFrames.length > 0) {
      const morphT = Math.min(t, REEL_SVG_MORPH_END) / REEL_SVG_MORPH_END
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
    if (t < REEL_SVG_MORPH_END) return

    // Title (.cover-title-text) — pas de bold, line-height 100 %, #12142C sur fond accent
    const titleFontSize = REEL_COVER_TITLE_PX
    const titleLineHeight = titleFontSize * REEL_COVER_TITLE_LINE_HEIGHT_MULT
    const titlePad = REEL_COVER_TITLE_PAD_PX
    const titleVPadExtra = REEL_COVER_TITLE_VPAD_EXTRA_PX
    const inset = REEL_COVER_SIDE_INSET_PX
    const leftX = inset
    const maxWidth = W - inset * 2

    ctx.font = `400 ${titleFontSize}px Apfel, sans-serif`
    ctx.textBaseline = "top"
    const words = data.title.split(/\s+/)
    const lines = this._wrapText(ctx, words, maxWidth)
    const titleTextNudge = Math.round(titleFontSize * REEL_COVER_TITLE_TEXT_OPTICAL_NUDGE_MULT)
    const titlePillOverhangBottom = titlePad / 2 + titleVPadExtra + titleTextNudge
    const blockHeight = lines.length * titleLineHeight + titlePillOverhangBottom

    // Username (.cover-username) — bold, uppercase, letter-spacing, #000 sur triade
    const userFontSize = REEL_COVER_USER_PX
    const userPadX = REEL_COVER_USER_PAD_X
    const userPadY = REEL_COVER_USER_PAD_Y
    const userBoxH = Math.ceil(userFontSize * REEL_COVER_USER_LINE_HEIGHT_MULT) + userPadY * 2
    const gapUserTitle = REEL_COVER_GAP_USER_TITLE_PX
    const userLetterSp = (0.67 * userFontSize) / REEL_COVER_USERNAME_REF_PX
    const coverOuterPad = Math.max(titlePad, userPadX)
    const coverBlockLeft = leftX - coverOuterPad

    // Bloc titre + auteur calé en bas à gauche : même retrait bas que à gauche
    const titleStartY = H - inset - blockHeight
    const userY = titleStartY - userBoxH - gapUserTitle

    // Reveal phase clock — 0 at REEL_SVG_MORPH_END, 1 at REEL_COVER_END.
    const revealT = t - REEL_SVG_MORPH_END
    const slideDistance = REEL_COVER_REVEAL_SLIDE_PX

    // — Username (appears first) —
    const userDuration = REEL_COVER_USER_REVEAL_S
    const userProgress = Math.max(0, Math.min(1, revealT / userDuration))
    if (userProgress > 0) {
      const easedU = easeOutBack(userProgress)
      const yOffset = (1 - easedU) * slideDistance
      ctx.globalAlpha = Math.min(1, userProgress * REEL_COVER_USER_ALPHA_RAMP)
      ctx.font = `700 ${userFontSize}px Apfel, sans-serif`
      const uText = `${data.username}`.toUpperCase()
      const uWidth = measureTextWithLetterSpacing(ctx, uText, userLetterSp)

      const userBarW = (leftX + uWidth + userPadX) - coverBlockLeft
      ctx.fillStyle = usernameBg
      ctx.fillRect(coverBlockLeft, userY + yOffset, userBarW, userBoxH)
      ctx.fillStyle = COVER_USERNAME_COLOR
      ctx.textBaseline = "middle"
      const userTextCenterY =
        userY + userBoxH / 2 + yOffset + Math.round(userFontSize * REEL_COVER_USER_TEXT_OPTICAL_NUDGE_MULT)
      fillTextWithLetterSpacing(ctx, uText, leftX, userTextCenterY, userLetterSp)
      ctx.textBaseline = "top"
      ctx.globalAlpha = 1
    }

    // — Title (whole block slides in with overshoot, all at once) —
    ctx.font = `400 ${titleFontSize}px Apfel, sans-serif`
    const titleStart = REEL_COVER_TITLE_DELAY_AFTER_USER_S
    const titleDuration = REEL_COVER_TITLE_REVEAL_S
    const titleT = revealT - titleStart
    const titleProgress = Math.max(0, Math.min(1, titleT / titleDuration))

    if (titleProgress > 0) {
      const easedTitle = easeOutBack(titleProgress)
      const yOffset = (1 - easedTitle) * slideDistance
      ctx.globalAlpha = Math.min(1, titleProgress * REEL_COVER_TITLE_ALPHA_RAMP)

      let maxLineWidth = 0
      lines.forEach((line) => {
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width)
      })
      const titleBlockTop = titleStartY - titlePad / 2 - titleVPadExtra + yOffset
      const titleBlockH =
        (lines.length - 1) * titleLineHeight +
        titleFontSize +
        titlePad +
        titleVPadExtra * 2 +
        titleTextNudge
      const titleBlockW =
        (leftX + maxLineWidth + titlePad) - coverBlockLeft + REEL_COVER_TITLE_BG_EXTRA_RIGHT_PX

      ctx.fillStyle = accent
      ctx.fillRect(coverBlockLeft, titleBlockTop, titleBlockW, titleBlockH)

      ctx.fillStyle = DARK
      lines.forEach((line, lineIdx) => {
        const baseY = titleStartY + lineIdx * titleLineHeight + yOffset
        ctx.fillText(line, leftX, baseY + titleTextNudge)
      })

      ctx.globalAlpha = 1
    }
  }

  // Top/bottom masks: source-over blend per pixel (same as hsla fillRect) so
  // transparency stays correct; ordered dither breaks 8-bit banding. Scaling
  // transparent bitmaps with drawImage often flattens the bottom fade.
  // `maskTopY` : aplat 0..maskTopY ; `gradTopY` : début du dégradé haut (peut être
  // plus haut que le masque pour remonter la transition).
  _compositeTextGradientBands(ctx, hue, maskTopY = 0, gradTopY = maskTopY) {
    const gradH = REEL_TEXT_GRAD_BAND_HEIGHT_PX
    const ga = ctx.globalAlpha
    const { r: br, g: bg, b: bb } = hslToRgbBytes(hue, REEL_SVG_BG_HSL_S, REEL_SVG_BG_HSL_L)
    const alphaTop = (u) =>
      u <= 0.55 ? lerp(1, 0.88, u / 0.55) : lerp(0.88, 0, (u - 0.55) / 0.45)
    const alphaBot = (u) =>
      u <= 0.45 ? lerp(0, 0.88, u / 0.45) : lerp(0.88, 1, (u - 0.45) / 0.55)
    const DITHER = REEL_TEXT_GRAD_DITHER

    const blendBand = (destY, alphaFn) => {
      const img = ctx.getImageData(0, destY, W, gradH)
      const d = img.data
      const denom = gradH > 1 ? gradH - 1 : 1
      for (let y = 0; y < gradH; y++) {
        const u = y / denom
        let a = alphaFn(u)
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
      ctx.putImageData(img, 0, destY)
    }

    if (maskTopY > 0) {
      ctx.fillStyle = `hsl(${hue}, ${REEL_SVG_BG_HSL_S}%, ${REEL_SVG_BG_HSL_L}%)`
      ctx.fillRect(0, 0, W, maskTopY)
    }
    blendBand(gradTopY, alphaTop)
    blendBand(H - gradH, alphaBot)
  }

  // ── Phase 2: Text scene (REEL_SCROLL_START → REEL_TEXT_END) ──
  _drawText(ctx, data, t, svgBg) {
    ctx.fillStyle = svgBg
    ctx.fillRect(0, 0, W, H)

    if (!data.body) return

    const fontSize = REEL_BODY_FONT_PX
    ctx.font = `400 ${fontSize}px Apfel, sans-serif`
    ctx.textBaseline = "top"
    ctx.fillStyle = "#FFFFFF"

    const maxWidth = W - REEL_COVER_SIDE_INSET_PX * 2
    const bodyText = this._plainBody(data.body)
    const lines = this._wrapBodyLines(ctx, bodyText, maxWidth)
    const lineHeight = fontSize * REEL_BODY_LINE_HEIGHT_MULT

    // Fixed scroll speed in px/s — independent of text length.
    const scrollElapsed = t - REEL_SCROLL_START
    const scrollY = H - scrollElapsed * REEL_BODY_SCROLL_PX_PER_SEC - REEL_PHASE2_TEXT_LIFT_PX

    ctx.save()
    ctx.globalAlpha = 1

    lines.forEach((line, i) => {
      const y = scrollY + i * lineHeight
      if (y > -lineHeight && y < H + lineHeight) {
        ctx.fillStyle = "#FFFFFF"
        ctx.fillText(line, REEL_COVER_SIDE_INSET_PX, y)
      }
    })

    this._compositeTextGradientBands(
      ctx,
      data.hue,
      REEL_PHASE2_HEADER_HEIGHT_PX,
      REEL_PHASE2_HEADER_HEIGHT_PX - REEL_PHASE2_TOP_GRAD_LIFT_PX
    )
    this._drawPhase2Header(ctx, data)

    ctx.restore()
  }

  // ── Phase 2 header — titre (ligne 1) + auteur (ligne 2) ──
  // Roboto Mono Regular 40px, alignés à gauche, centrés verticalement dans
  // les `REEL_PHASE2_HEADER_HEIGHT_PX` du haut. Dessiné après le compositing
  // pour flotter au-dessus du dégradé (opacité partielle).
  _drawPhase2Header(ctx, data) {
    const fontPx = REEL_PHASE2_HEADER_FONT_PX
    const lineHeight = fontPx * REEL_PHASE2_HEADER_LINE_HEIGHT_MULT
    const blockHeight = lineHeight * 2
    const blockTop = (REEL_PHASE2_HEADER_HEIGHT_PX - blockHeight) / 2 + 15
    const titleLine = `${data.title || ""}`.toUpperCase()
    const authorLine = `${data.username || ""}`.toUpperCase()

    ctx.save()
    ctx.globalAlpha = REEL_PHASE2_HEADER_ALPHA
    ctx.font = `400 ${fontPx}px ${REEL_PHASE2_HEADER_FONT_FAMILY}`
    ctx.textBaseline = "top"
    ctx.fillStyle = "#FFFFFF"
    ctx.fillText(titleLine, REEL_COVER_SIDE_INSET_PX, blockTop)
    ctx.fillText(authorLine, REEL_COVER_SIDE_INSET_PX, blockTop + lineHeight)
    ctx.restore()
  }

  // ── Phase 3: Branded outro (REEL_TEXT_END → REEL_DURATION) ──
  // Une inversion courte au milieu de la phase ; mêmes styles que la cover.
  _drawBlink(ctx, data, accent, t) {
    const blinkT = t - REEL_TEXT_END
    const flashStart = REEL_OUTRO_FLASH_START
    const flashEnd = REEL_OUTRO_FLASH_END
    const inverted = blinkT >= flashStart && blinkT < flashEnd

    // On inverted cycles: page bg, box bg and text color all swap.
    const pageBg = inverted ? accent : DARK
    const boxBg = inverted ? DARK : accent
    const textColor = inverted ? accent : DARK

    ctx.fillStyle = pageBg
    ctx.fillRect(0, 0, W, H)

    const tiltRad = (REEL_OUTRO_TILT_DEG * Math.PI) / 180
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.rotate(tiltRad)
    ctx.translate(-W / 2, -H / 2)

    ctx.textAlign = "center"
    ctx.textBaseline = "alphabetic"

    const lireSize = REEL_OUTRO_LIRE_PX
    ctx.font = `400 ${lireSize}px Apfel, sans-serif`
    const lireText = "Lire la suite"
    const lireWidth = ctx.measureText(lireText).width
    const lirePadX = REEL_OUTRO_LIRE_PAD_X
    const lirePadY = REEL_OUTRO_LIRE_PAD_Y
    const lireBaselineY = H / 2 + REEL_OUTRO_LIRE_BASELINE_OFFSET_Y
    const lireBoxX = W / 2 - lireWidth / 2 - lirePadX
    const lireBoxY = lireBaselineY - lireSize + lirePadY
    const lireBoxW = lireWidth + lirePadX * 2
    const lireBoxH = lireSize + lirePadY

    ctx.fillStyle = boxBg
    ctx.fillRect(lireBoxX, lireBoxY, lireBoxW, lireBoxH)
    ctx.fillStyle = textColor
    ctx.fillText(lireText, W / 2, lireBaselineY)

    const spSize = REEL_OUTRO_SP_PX
    ctx.font = `400 ${spSize}px Apfel, sans-serif`
    const spText = "SP2050.org"
    const spWidth = ctx.measureText(spText).width
    const spPadX = REEL_OUTRO_SP_PAD_X
    const spPadY = REEL_OUTRO_SP_PAD_Y
    const spBaselineY = H / 2 + REEL_OUTRO_SP_BASELINE_OFFSET_Y
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

  _wrapBodyLines(ctx, text, maxWidth) {
    const lines = []
    text.split("\n").forEach((paragraph) => {
      const trimmed = paragraph.trim()
      if (trimmed) {
        const words = trimmed.split(/\s+/)
        lines.push(...this._wrapText(ctx, words, maxWidth))
      } else {
        lines.push("")
      }
    })
    return lines
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

import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/scrollTrigger"
import Splitting from "splitting"

/**
 * Pendant la reconstruction (texte brut → plus rien → lignes), la page rétrécit et Lenis / le navigateur
 * clamp le scroll : on fige le corps pour éviter cette corruption puis on restaure.
 */
function applyScrollFreeze(scrollYPx) {
  const html = document.documentElement
  const body = document.body
  html.dataset._srPrevOverflow = html.style.overflow
  body.dataset._srPrevPosition = body.style.position
  body.dataset._srPrevTop = body.style.top
  body.dataset._srPrevLeft = body.style.left
  body.dataset._srPrevRight = body.style.right
  body.dataset._srPrevWidth = body.style.width
  html.style.overflow = "hidden"
  body.style.position = "fixed"
  body.style.top = `-${scrollYPx}px`
  body.style.left = "0"
  body.style.right = "0"
  body.style.width = "100%"
}

function releaseScrollFreeze() {
  const html = document.documentElement
  const body = document.body
  html.style.overflow = html.dataset._srPrevOverflow ?? ""
  body.style.position = body.dataset._srPrevPosition ?? ""
  body.style.top = body.dataset._srPrevTop ?? ""
  body.style.left = body.dataset._srPrevLeft ?? ""
  body.style.right = body.dataset._srPrevRight ?? ""
  body.style.width = body.dataset._srPrevWidth ?? ""
  delete html.dataset._srPrevOverflow
  delete body.dataset._srPrevPosition
  delete body.dataset._srPrevTop
  delete body.dataset._srPrevLeft
  delete body.dataset._srPrevRight
  delete body.dataset._srPrevWidth
}

gsap.registerPlugin(ScrollTrigger)

/** Blocs de lecture (même ordre que text_reveal). */
const READING_LINE_BLOCKS_SELECTOR = ".body-content, h2.chapter-title, .chapter-content"

function caretRangeFromViewportCenter() {
  const margin = 12
  const x = Math.min(Math.max(margin, window.innerWidth / 2), window.innerWidth - margin)
  const y = Math.min(Math.max(margin, window.innerHeight / 2), window.innerHeight - margin)
  if (document.caretRangeFromPoint) {
    try {
      return document.caretRangeFromPoint(x, y)
    } catch {
      return null
    }
  }
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y)
    if (!p?.offsetNode) return null
    const r = document.createRange()
    const node = p.offsetNode
    const maxOff = node.nodeType === Node.TEXT_NODE ? node.nodeValue.length : 0
    const off = Math.min(Math.max(0, p.offset), maxOff)
    try {
      r.setStart(node, off)
      r.collapse(true)
      return r
    } catch {
      return null
    }
  }
  return null
}

function closestReadingBlock(startContainer, postBodyRoot) {
  let el = startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentElement : startContainer
  while (el && postBodyRoot.contains(el)) {
    if (
      el.matches?.(".body-content") ||
      el.matches?.("h2.chapter-title") ||
      el.matches?.(".chapter-content")
    ) {
      return el
    }
    el = el.parentElement
  }
  return null
}

function snapCharOffsetToWordStart(blockPlainText, offset) {
  const o = Math.max(0, Math.min(offset, blockPlainText.length))
  if (o === 0) return 0
  const before = blockPlainText.slice(0, o)
  const m = before.match(/[\p{L}\p{N}_'-]+$/u)
  if (!m) return o
  return o - m[0].length
}

function captureTextReadingAnchor(postBodyRoot) {
  if (!postBodyRoot) return null
  const rng = caretRangeFromViewportCenter()
  if (!rng?.startContainer) return null

  let block = closestReadingBlock(rng.startContainer, postBodyRoot)
  if (!block) {
    const margin = 12
    const x = Math.min(Math.max(margin, window.innerWidth / 2), window.innerWidth - margin)
    const y = Math.min(Math.max(margin, window.innerHeight / 2), window.innerHeight - margin)
    const hit = document.elementFromPoint(x, y)
    if (hit) block = closestReadingBlock(hit, postBodyRoot)
  }
  if (!block) return null

  const blocks = Array.from(postBodyRoot.querySelectorAll(READING_LINE_BLOCKS_SELECTOR))
  const blockIndex = blocks.indexOf(block)
  if (blockIndex < 0) return null

  let charOffset = 0
  try {
    const pre = document.createRange()
    pre.selectNodeContents(block)
    pre.setEnd(rng.startContainer, rng.startOffset)
    charOffset = pre.toString().length
  } catch {
    return null
  }

  const plain = block.textContent ?? ""
  charOffset = snapCharOffsetToWordStart(plain, charOffset)

  return { blockIndex, charOffset }
}

function rangeCaretRect(range) {
  const rects = range.getClientRects()
  if (rects.length > 0) return rects[rects.length - 1]
  const br = range.getBoundingClientRect()
  if (br.width > 0 || br.height > 0) return br
  return null
}

function getCaretRectForReadingAnchor(postBodyRoot, anchor) {
  if (!postBodyRoot || !anchor) return null
  const blocks = Array.from(postBodyRoot.querySelectorAll(READING_LINE_BLOCKS_SELECTOR))
  const block = blocks[anchor.blockIndex]
  if (!block) return null

  let remaining = Math.max(0, anchor.charOffset)
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null)
  let node
  while ((node = walker.nextNode())) {
    const len = node.nodeValue.length
    if (remaining <= len) {
      const r = document.createRange()
      const off = Math.min(remaining, len)
      try {
        r.setStart(node, off)
        r.collapse(true)
      } catch {
        return null
      }
      const rect = rangeCaretRect(r)
      if (rect && (rect.height > 0 || rect.width > 0)) return rect
      const parent = node.parentElement
      if (parent) return parent.getBoundingClientRect()
      return null
    }
    remaining -= len
  }

  try {
    const r = document.createRange()
    r.selectNodeContents(block)
    r.collapse(false)
    const rect = rangeCaretRect(r)
    if (rect) return rect
  } catch {
    /* ignore */
  }
  return null
}

function measureScrollDeltaToCenterReadingAnchor(postBodyRoot, anchor) {
  const rect = getCaretRectForReadingAnchor(postBodyRoot, anchor)
  if (!rect) return null
  const cy = window.innerHeight / 2
  return rect.top + rect.height / 2 - cy
}

function zoneMidProgressFromScroll(yPx, vhPx, zoneEl) {
  if (!zoneEl || zoneEl.scrollHeight < 24) return null
  const zr = zoneEl.getBoundingClientRect()
  const zoneTopDoc = zr.top + yPx
  const centerDoc = yPx + vhPx / 2
  const zh = Math.max(1, zoneEl.scrollHeight)
  const prog = (centerDoc - zoneTopDoc) / zh
  return Math.min(1, Math.max(0, prog))
}

function scrollYFromZoneMidProgress(progress, vhPx, zoneEl, maxScrollPx, currentScrollYPx) {
  if (!zoneEl || zoneEl.scrollHeight < 24) return null
  const zr = zoneEl.getBoundingClientRect()
  const zoneTopDoc = zr.top + currentScrollYPx
  const centerTarget = zoneTopDoc + progress * Math.max(1, zoneEl.scrollHeight)
  const y = centerTarget - vhPx / 2
  return Math.max(0, Math.min(maxScrollPx, y))
}

function documentScrollY() {
  const lenis = typeof window !== "undefined" ? window.lenis : null
  if (lenis && lenis.scroll != null && Number.isFinite(Number(lenis.scroll))) return Number(lenis.scroll)
  return window.scrollY
}

/** Limite scroll (Lenis.limit si présent). */
function maxScrollYPx() {
  const lenis = typeof window !== "undefined" ? window.lenis : null
  if (lenis && typeof lenis.limit === "number" && Number.isFinite(lenis.limit)) {
    return Math.max(0, lenis.limit)
  }
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
}

function scrollDocumentTo(y) {
  const lenis = typeof window !== "undefined" ? window.lenis : null
  if (lenis && typeof lenis.scrollTo === "function") {
    lenis.scrollTo(y, { immediate: true, force: true })
  } else {
    window.scrollTo(0, y)
  }
}

// cubic-bezier(0.625, 0.05, 0, 1)
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

// cubic-bezier(0.38, 0.005, 0.215, 1)
function textBlockEase(t) {
  const x1 = 0.38, y1 = 0.005, x2 = 0.215, y2 = 1
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

/** Même règles de retour à la ligne que le bloc édité (sinon la mesure et le rendu divergent). */
function copyTextLayoutStyles(sourceEl, targetEl) {
  const cs = getComputedStyle(sourceEl)
  targetEl.style.whiteSpace = cs.whiteSpace
  targetEl.style.wordBreak = cs.wordBreak
  targetEl.style.overflowWrap = cs.overflowWrap
  targetEl.style.font = cs.font
  targetEl.style.letterSpacing = cs.letterSpacing
  targetEl.style.wordSpacing = cs.wordSpacing
  targetEl.style.textAlign = cs.textAlign
}

/**
 * Sonde de césure : même largeur et styles que le texte réel ; on utilise offsetHeight
 * (moteur de mise en page du navigateur) au lieu des boîtes de mots, ce qui évite les
 * faux retours à la ligne.
 */
function prepareLineBreakProbe(sourceEl, probe, paragraphEl) {
  const cs = getComputedStyle(sourceEl)
  copyTextLayoutStyles(sourceEl, probe)
  probe.style.display = "block"
  probe.style.boxSizing = cs.boxSizing
  probe.style.visibility = "hidden"
  probe.style.position = "absolute"
  probe.style.left = "0"
  probe.style.top = "0"
  probe.style.width = "100%"
  probe.style.height = "auto"
  probe.style.margin = "0"
  probe.style.padding = "0"
  probe.textContent = ""
  const pos = getComputedStyle(paragraphEl).position
  if (pos === "static") paragraphEl.style.position = "relative"
  paragraphEl.appendChild(probe)
}

function singleLineHeightPx(probe, sourceEl) {
  const ws = getComputedStyle(sourceEl).whiteSpace
  probe.style.whiteSpace = "nowrap"
  probe.textContent = "PÿgБД"
  let h = probe.offsetHeight
  probe.style.whiteSpace = ws
  if (!h || h < 4) {
    const fz = parseFloat(getComputedStyle(sourceEl).fontSize) || 16
    h = Math.round(fz * 1.35)
  }
  return h
}

function sliceFitsOneVisualLine(words, start, end, probe, refH) {
  if (end <= start) return true
  probe.textContent = words.slice(start, end).join("")
  const h = probe.offsetHeight
  return h <= refH * 1.18 + 0.5
}

/**
 * Jetons « mot » + espace(s) + ponctuation seule → un seul jeton, pour coller à la césure du navigateur
 * et éviter ? » " … seuls en tête de ligne après découpe manuelle.
 */
function glueSpaceBeforeTrailingPunctuation(words) {
  // Ponctuation « fermante » ou suspendue typiquement après un mot + espace (pas « ouvrant » français).
  const trailingAlone = /^[?!:;,.\u2026\-–—»"'”’„\]}⟩›]+$/u
  const result = []
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (
      result.length >= 2 &&
      /^\s+$/.test(result[result.length - 1]) &&
      trailingAlone.test(w) &&
      !/^\s+$/.test(result[result.length - 2])
    ) {
      const space = result.pop()
      const prev = result.pop()
      result.push(prev + space + w)
      continue
    }
    result.push(w)
  }
  return result
}

/**
 * Découpe un segment (entre \n du source) en lignes visuelles pour la largeur courante.
 * @returns {string[]}
 */
function visualLinesFromTokens(words, probe, refH) {
  const n = words.length
  const lines = []
  let i = 0
  while (i < n) {
    if (!sliceFitsOneVisualLine(words, i, i + 1, probe, refH)) {
      lines.push(words.slice(i, i + 1).join(""))
      i += 1
      continue
    }
    let lo = i + 1
    let hi = n
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      if (sliceFitsOneVisualLine(words, i, mid, probe, refH)) lo = mid
      else hi = mid - 1
    }
    const end = lo
    lines.push(words.slice(i, end).join(""))
    i = end
  }
  return lines
}

export default class extends Controller {
  static values = {
    mode: { type: String, default: "words" }
  }

  connect() {
    this.tweens = []
    this._boundOnTypography = () => this.scheduleReflow("typography")
    /* La césure des lignes ne dépend que de la largeur. Sur mobile, un scroll fait
     * souvent varier la hauteur du viewport (barre d’URL) → resize → reflow complet
     * (effet « rechargement »). On ignore les changements de hauteur seuls. */
    this._reflowWidthSnapshot = window.innerWidth
    this._boundOnResize = () => {
      const w = window.innerWidth
      if (w === this._reflowWidthSnapshot) return
      this._reflowWidthSnapshot = w
      this.scheduleReflow("resize")
    }
    if (this.modeValue === "lines") {
      document.addEventListener("reading:typography-changed", this._boundOnTypography)
      window.addEventListener("resize", this._boundOnResize)
      const runInitialLayout = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => this.rebuildLineLayout({ initial: true }))
        })
      }
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(runInitialLayout)
      } else {
        runInitialLayout()
      }
    } else if (this.modeValue === "paragraphs") {
      this.animateParagraphs()
      this._dispatchLinesReady()
    } else {
      this.animateWords()
      this._dispatchLinesReady()
    }
  }

  disconnect() {
    document.removeEventListener("reading:typography-changed", this._boundOnTypography)
    window.removeEventListener("resize", this._boundOnResize)
    this.clearTweens()
  }

  clearTweens() {
    this.tweens?.forEach((t) => {
      t.scrollTrigger?.kill()
      t.kill()
    })
    this.tweens = []
  }

  /** Sauvegarde le texte brut de chaque bloc (avant découpe) pour refaire la mesure plus tard. */
  ensureSourceCaptured(el) {
    if (!this.sourceByEl) this.sourceByEl = new WeakMap()
    if (!this.sourceByEl.has(el)) {
      this.sourceByEl.set(el, el.textContent || "")
    }
  }

  _dispatchLinesReady() {
    requestAnimationFrame(() => {
      document.dispatchEvent(new CustomEvent("text-reveal:lines-ready", { bubbles: true }))
    })
  }

  scheduleReflow(source = "resize") {
    if (this.modeValue !== "lines") return
    if (this._reflowDebounce) clearTimeout(this._reflowDebounce)
    const delayMs = source === "typography" ? 0 : 50
    this._reflowDebounce = setTimeout(() => {
      this._reflowDebounce = null
      const run = () => this.rebuildLineLayout({ initial: false })
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => run())
      } else {
        run()
      }
    }, delayMs)
  }

  /**
   * Reconstruit les masques de lignes. Après le premier affichage, on évite de rejouer
   * l’anim sur les blocs déjà “révélés” (scroll passé le seuil).
   */
  rebuildLineLayout({ initial = false } = {}) {
    /** Ratio + progression dans `.post-body` (élément Stimulus) + ancre texte ; freeze pendant mutation pour éviter clamp Lenis. */
    let preservedScrollRatio = null
    let preservedZoneProgress = null
    let preservedTextAnchor = null
    let yFreeze = null
    if (!initial) {
      const lenisPre = typeof window !== "undefined" ? window.lenis : null
      if (lenisPre && typeof lenisPre.resize === "function") lenisPre.resize()
      const max0 = maxScrollYPx()
      const y0 = documentScrollY()
      preservedScrollRatio = max0 > 0 ? Math.min(1, Math.max(0, y0 / max0)) : 0
      preservedZoneProgress = zoneMidProgressFromScroll(y0, window.innerHeight, this.element)
      preservedTextAnchor = captureTextReadingAnchor(this.element)
      yFreeze = y0
    }

    const targets = this.element.querySelectorAll(READING_LINE_BLOCKS_SELECTOR)
    const blocks = targets.length > 0 ? Array.from(targets) : [this.element]

    const mutateAndAnimate = () => {
      blocks.forEach((el) => {
        this.ensureSourceCaptured(el)
        const source = this.sourceByEl.get(el) || ""
        if (!String(source).trim()) return
        el.textContent = source
      })
      this.clearTweens()
      this.animateLines({ initial })
    }

    if (!initial && yFreeze !== null) {
      applyScrollFreeze(yFreeze)
      try {
        mutateAndAnimate()
      } finally {
        releaseScrollFreeze()
      }
      const restore = () =>
        this._restoreReadingPositionAfterReflow(
          preservedZoneProgress,
          preservedScrollRatio,
          preservedTextAnchor
        )
      restore()
      const onRefresh = () => {
        ScrollTrigger.removeEventListener("refresh", onRefresh)
        restore()
      }
      ScrollTrigger.addEventListener("refresh", onRefresh)
      ScrollTrigger.refresh()
      restore()
      requestAnimationFrame(() => {
        restore()
        requestAnimationFrame(() => {
          restore()
          setTimeout(restore, 0)
        })
      })
    } else {
      mutateAndAnimate()
      ScrollTrigger.refresh()
    }

    if (initial) {
      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent("text-reveal:lines-ready", { bubbles: true }))
      })
    }
  }

  /** Zone `.post-body` + ratio secours + ancrage mot/caractère au centre viewport. */
  _restoreReadingPositionAfterReflow(zoneProgress, ratioFallback, textAnchor) {
    const lenis = typeof window !== "undefined" ? window.lenis : null
    if (lenis && typeof lenis.resize === "function") lenis.resize()
    const vh = window.innerHeight
    const maxScroll = maxScrollYPx()
    const cur = documentScrollY()

    let coarse = null
    if (zoneProgress != null) {
      coarse = scrollYFromZoneMidProgress(zoneProgress, vh, this.element, maxScroll, cur)
    }
    if (coarse == null) {
      coarse = Math.max(0, Math.min(maxScroll, ratioFallback * maxScroll))
    }
    scrollDocumentTo(coarse)

    const refine = () => {
      if (!textAnchor) return
      const delta = measureScrollDeltaToCenterReadingAnchor(this.element, textAnchor)
      if (delta == null || !Number.isFinite(delta) || Math.abs(delta) < 0.5) return
      const ms = maxScrollYPx()
      const nextY = Math.max(0, Math.min(ms, documentScrollY() + delta))
      scrollDocumentTo(nextY)
    }
    refine()
    requestAnimationFrame(() => {
      refine()
      requestAnimationFrame(refine)
    })
  }

  /**
   * Lines mode: césure identique au navigateur (sonde offsetHeight + dichotomie),
   * puis masques overflow + animation au scroll.
   * @param {{ initial?: boolean }} opts — initial: première entrée = animation scroll ; reflow = pas de rejeu inutile
   */
  animateLines(opts = {}) {
    const initial = opts.initial !== false
    const targets = this.element.querySelectorAll(READING_LINE_BLOCKS_SELECTOR)
    const blocks = targets.length > 0 ? Array.from(targets) : [this.element]

    blocks.forEach((el) => {
      this.ensureSourceCaptured(el)
      const raw = (this.sourceByEl.get(el) || el.textContent || "")
      if (!String(raw).trim()) return

      const shell = /^H[1-6]$/.test(el.tagName) ? "span" : "div"

      // Split by paragraphs (double newline)
      const paragraphs = raw.split(/\n\s*\n/)
      el.innerHTML = ""

      paragraphs.forEach((para) => {
        const text = para.trim()
        if (!text) return

        const p = document.createElement(shell)
        p.className = "text-reveal-block"
        p.style.display = "block"
        p.style.marginBottom = shell === "span" ? "0" : "1em"
        el.appendChild(p)

        // Handle explicit line breaks within the paragraph
        const explicitLines = text.split(/\n/)

        explicitLines.forEach((lineText, lineIdx) => {
          if (!lineText.trim()) {
            const spacer = document.createElement(shell)
            spacer.style.display = "block"
            spacer.style.height = "0.5em"
            p.appendChild(spacer)
            return
          }

          const words = glueSpaceBeforeTrailingPunctuation(
            lineText.split(/(\s+)/).filter((w) => w.length > 0)
          )
          if (!words.some((w) => !/^\s+$/.test(w))) return

          const probe = document.createElement(shell)
          prepareLineBreakProbe(el, probe, p)
          const refH = singleLineHeightPx(probe, el)
          const lineStrings = visualLinesFromTokens(words, probe, refH)
          probe.remove()

          lineStrings.forEach((lineStr) => {
            const mask = document.createElement(shell)
            mask.className = "text-reveal-mask"
            mask.style.overflow = "hidden"
            mask.style.display = "block"

            const inner = document.createElement(shell)
            inner.className = "text-reveal-line"
            inner.style.display = "block"
            copyTextLayoutStyles(el, inner)
            inner.textContent = lineStr
            mask.appendChild(inner)
            p.appendChild(mask)
          })
        })
      })
    })

    // Un seul déclencheur pour tout le corps + chapitres : même vague de révélation DOM (pas par bloc).
    const allLineEls = this.element.querySelectorAll(".text-reveal-line")
    if (!allLineEls.length) return

    const inRevealZone = this.element.getBoundingClientRect().top < window.innerHeight * 0.85

    if (!initial && inRevealZone) {
      gsap.set(allLineEls, { opacity: 1 })
      return
    }

    const tween = gsap.from(allLineEls, {
      opacity: 0,
      duration: 0.35,
      stagger: 0.04,
      delay: 0.8,
      ease: textBlockEase,
      scrollTrigger: {
        trigger: this.element,
        start: "top 85%",
        once: true
      }
    })
    this.tweens.push(tween)
  }

  /**
   * Paragraphs mode: wrap each paragraph, animate on scroll.
   */
  animateParagraphs() {
    const targets = this.element.querySelectorAll(READING_LINE_BLOCKS_SELECTOR)
    const blocks = targets.length > 0 ? Array.from(targets) : [this.element]

    blocks.forEach((el) => {
      const raw = el.textContent || ""
      if (!raw.trim()) return

      const paragraphs = raw.split(/\n\s*\n/)
      el.textContent = ""

      paragraphs.forEach((para) => {
        const text = para.trim()
        if (!text) return
        const p = document.createElement("p")
        p.className = "text-reveal-para"
        p.innerHTML = text.replace(/\n/g, "<br>")
        el.appendChild(p)
      })

      const paraEls = el.querySelectorAll(".text-reveal-para")
      if (!paraEls.length) return

      const tween = gsap.fromTo(
        paraEls,
        { opacity: 0, y: "1.5em" },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: coverEase,
          stagger: 0.15,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: "bottom 20%",
            scrub: true
          }
        }
      )
      this.tweens.push(tween)
    })
  }

  animateWords() {
    Splitting({ target: this.element, by: "words" })

    const words = this.element.querySelectorAll(".word")
    const tween = gsap.fromTo(
      words,
      { opacity: 0.2 },
      {
        opacity: 1,
        duration: 0.8,
        ease: coverEase,
        stagger: 0.1,
        scrollTrigger: {
          trigger: this.element,
          scrub: true,
          start: "top 80%",
          end: "bottom 20%"
        }
      }
    )
    this.tweens.push(tween)
  }
}

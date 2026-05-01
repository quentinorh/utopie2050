import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"
import scrollTrigger from "gsap/scrollTrigger"
import Splitting from "splitting"

/** Blocs de texte à découper (ordre document = ordre d’animation). */
const LINE_BLOCK_SELECTOR = ".body-content, h2.chapter-title, .chapter-content"

gsap.registerPlugin(scrollTrigger)

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

export default class extends Controller {
  static values = {
    mode: { type: String, default: "words" }
  }

  connect() {
    this.tweens = []
    this._boundOnTypography = () => this.scheduleReflow("typography")
    this._boundOnResize = () => this.scheduleReflow("resize")
    if (this.modeValue === "lines") {
      document.addEventListener("reading:typography-changed", this._boundOnTypography)
      window.addEventListener("resize", this._boundOnResize)
      requestAnimationFrame(() => this.rebuildLineLayout({ initial: true }))
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

  scheduleReflow() {
    if (this.modeValue !== "lines") return
    if (this._reflowDebounce) clearTimeout(this._reflowDebounce)
    this._reflowDebounce = setTimeout(() => {
      this._reflowDebounce = null
      const run = () => this.rebuildLineLayout({ initial: false })
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => run())
      } else {
        run()
      }
    }, 50)
  }

  /**
   * Reconstruit les masques de lignes. Après le premier affichage, on évite de rejouer
   * l’anim sur les blocs déjà “révélés” (scroll passé le seuil).
   */
  rebuildLineLayout({ initial = false } = {}) {
    /** Avant toute mutation : le layout qui suit réduit la hauteur et le navigateur peut clamp le scroll à 0 avant refresh(). */
    let scrollY0 = null
    let anchorDocY0 = null
    if (!initial) {
      scrollY0 = window.scrollY
      const anchor = this.element.querySelector(".body-content") || this.element
      anchorDocY0 = anchor.getBoundingClientRect().top + scrollY0
    }

    const targets = this.element.querySelectorAll(LINE_BLOCK_SELECTOR)
    const blocks = targets.length > 0 ? Array.from(targets) : [this.element]

    blocks.forEach((el) => {
      this.ensureSourceCaptured(el)
      const source = this.sourceByEl.get(el) || ""
      if (!String(source).trim()) return
      el.textContent = source
    })
    this.clearTweens()
    this.animateLines({ initial })
    if (!initial && scrollY0 !== null && anchorDocY0 !== null) {
      this._applyReadingScrollRestore(scrollY0, anchorDocY0)
      const restore = () => this._applyReadingScrollRestore(scrollY0, anchorDocY0)
      const onRefresh = () => {
        scrollTrigger.removeEventListener("refresh", onRefresh)
        restore()
      }
      scrollTrigger.addEventListener("refresh", onRefresh)
      scrollTrigger.refresh()
      restore()
      requestAnimationFrame(() => {
        restore()
        requestAnimationFrame(restore)
      })
    } else {
      scrollTrigger.refresh()
    }

    if (initial) {
      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent("text-reveal:lines-ready", { bubbles: true }))
      })
    }
  }

  /**
   * Conserve la position visuelle du début du corps (scroll doc + déplacement de l’ancre après reflow).
   */
  _applyReadingScrollRestore(scrollY0, anchorDocY0) {
    const anchor = this.element.querySelector(".body-content") || this.element
    const anchorDocY1 = anchor.getBoundingClientRect().top + window.scrollY
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    const top = Math.max(0, Math.min(maxScroll, scrollY0 + (anchorDocY1 - anchorDocY0)))
    window.scrollTo(0, top)
  }

  /**
   * Lines mode: detect visual lines by measuring word positions,
   * wrap each in a mask (overflow:hidden), animate yPercent slide-up.
   * Replicates GSAP SplitText mask:"lines" behavior.
   * @param {{ initial?: boolean }} opts — initial: première entrée = animation scroll ; reflow = pas de rejeu inutile
   */
  animateLines(opts = {}) {
    const initial = opts.initial !== false
    const targets = this.element.querySelectorAll(LINE_BLOCK_SELECTOR)
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

          const measurer = document.createElement(shell)
          measurer.style.display = "block"
          measurer.style.whiteSpace = "normal"
          const words = lineText.trim().split(/(\s+)/).filter(w => w.length > 0)
          const wordSpans = []

          words.forEach((w) => {
            if (/^\s+$/.test(w)) {
              measurer.appendChild(document.createTextNode(" "))
            } else {
              const span = document.createElement("span")
              span.textContent = w
              span.style.display = "inline"
              measurer.appendChild(span)
              wordSpans.push(span)
            }
          })

          p.appendChild(measurer)

          if (!wordSpans.length) return

          const visualLines = []
          let currentLine = [wordSpans[0]]
          let currentTop = wordSpans[0].getBoundingClientRect().top

          for (let i = 1; i < wordSpans.length; i++) {
            const top = wordSpans[i].getBoundingClientRect().top
            if (Math.abs(top - currentTop) > 3) {
              visualLines.push(currentLine)
              currentLine = [wordSpans[i]]
              currentTop = top
            } else {
              currentLine.push(wordSpans[i])
            }
          }
          visualLines.push(currentLine)

          measurer.remove()

          visualLines.forEach((spans) => {
            const mask = document.createElement(shell)
            mask.className = "text-reveal-mask"
            mask.style.overflow = "hidden"
            mask.style.display = "block"

            const inner = document.createElement(shell)
            inner.className = "text-reveal-line"
            inner.style.display = "block"
            inner.textContent = spans.map(s => s.textContent).join(" ")
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
    const targets = this.element.querySelectorAll(LINE_BLOCK_SELECTOR)
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

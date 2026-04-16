import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"
import scrollTriggerImport from "gsap/scrollTrigger"
import Splitting from "splitting"

// JSPM exposes ScrollTrigger differently depending on the build —
// sometimes as the default export (the class), sometimes as a module
// namespace `{ ScrollTrigger }`. Resolve once so `.create()` works.
const ScrollTrigger = scrollTriggerImport.ScrollTrigger || scrollTriggerImport
gsap.registerPlugin(ScrollTrigger)

// Scramble character palettes — the GSAP ScrambleTextPlugin uses
// these names ("upperCase", etc.) so we keep the API parity even
// though we implement the effect ourselves (the plugin is GSAP Club
// only and we don't ship it).
const SCRAMBLE_CHARS = {
  upperCase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  alt: "▯|",
  hover: "◊▯∆|",
  exit: "◊▯∆"
}

// Glyph-by-glyph scramble. Each character is independently rolled
// through random glyphs from `chars`, then settles on its target.
// Per-char "settle time" is spread linearly across [0, settleSpan]
// of the tween so the reveal reads as a wave.
function scrambleTo(el, finalText, opts = {}) {
  const duration   = opts.duration   ?? 1.0
  const chars      = opts.chars      || SCRAMBLE_CHARS.upperCase
  const settleSpan = opts.settleSpan ?? 0.7   // first 70% of duration spreads,
                                              // remaining 30% lets last chars finalize
  // Cancel any in-flight scramble on the same element.
  if (el._scrambleTween) el._scrambleTween.kill()

  const targetChars = Array.from(finalText)
  const n = targetChars.length
  if (n === 0) {
    el.textContent = finalText
    return null
  }

  const proxy = { p: 0 }
  const tween = gsap.to(proxy, {
    p: 1,
    duration,
    ease: "none",
    onUpdate: () => {
      let out = ""
      for (let i = 0; i < n; i++) {
        const target = targetChars[i]
        // Whitespace is preserved from the start — scrambling spaces
        // looks like jitter, not a reveal.
        if (/\s/.test(target)) {
          out += target
          continue
        }
        // Each char's settle progress within [0, 1].
        const settleAt = (i / Math.max(1, n - 1)) * settleSpan
        const span = 1 - settleSpan
        const local = (proxy.p - settleAt) / Math.max(0.0001, span)
        if (local >= 1) {
          out += target
        } else if (local <= 0) {
          out += chars[(Math.random() * chars.length) | 0]
        } else {
          out += chars[(Math.random() * chars.length) | 0]
        }
      }
      el.textContent = out
    },
    onComplete: () => {
      el.textContent = finalText
      el._scrambleTween = null
    }
  })
  el._scrambleTween = tween
  return tween
}

// Read a numeric attribute with a default. Empty string and null
// both fall back, but `0` survives.
function attrFloat(el, name, fallback) {
  const raw = el.getAttribute(name)
  if (raw == null || raw === "") return fallback
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

// Unified text-effects controller.
//
// Modes (set via `data-text` on the host element):
//   "scramble-load"    — scramble in on connect.
//   "scramble-scroll"  — scramble in when the element scrolls into view.
//   "highlight-scroll" — letter-by-letter scrub fade tied to scroll progress.
//
// Hover scramble: any element with `data-text-hover="link"` becomes
// a hover trigger; the descendant carrying `data-text-hover="target"`
// is scrambled on enter and reverted on leave.
export default class extends Controller {
  static values = {
    // duration of scramble (seconds)
    duration: { type: Number, default: 1.2 },
    // character palette: "upperCase" | "alt" | "hover" | a literal string
    chars:    { type: String, default: "" },
    // highlight-scroll: opacity of letters before reveal
    fade:     { type: Number, default: 0.18 },
    // highlight-scroll: stagger between chars (seconds)
    stagger:  { type: Number, default: 0.06 },
    // highlight-scroll: ScrollTrigger start
    start:    { type: String, default: "top 90%" },
    // highlight-scroll: ScrollTrigger end
    end:      { type: String, default: "center 40%" }
  }

  connect() {
    this._tweens = []
    this._splitInstance = null
    this._hoverHandlers = []

    const mode = this.element.getAttribute("data-text") || ""

    // 1) Hover scramble — set up handlers regardless of mode so a
    //    container can be both highlight-scroll AND host hover links.
    this._initHoverScramble()

    // 2) Mode-driven primary effect.
    if (mode === "scramble-load") {
      // Wait one frame so layout settles before scrambling.
      requestAnimationFrame(() => this._scrambleSelf())
    } else if (mode === "scramble-scroll") {
      this._tweens.push(
        ScrollTrigger.create({
          trigger: this.element,
          start: "top bottom",
          once: true,
          onEnter: () => this._scrambleSelf()
        })
      )
    } else if (mode === "highlight-scroll") {
      this._initHighlightScroll()
    }
  }

  disconnect() {
    this._tweens.forEach((t) => {
      if (t && t.scrollTrigger) t.scrollTrigger.kill()
      if (t && typeof t.kill === "function") t.kill()
    })
    this._tweens = []
    this._hoverHandlers.forEach(({ el, enter, leave }) => {
      el.removeEventListener("mouseenter", enter)
      el.removeEventListener("mouseleave", leave)
    })
    this._hoverHandlers = []
    if (this.element._scrambleTween) {
      this.element._scrambleTween.kill()
      this.element._scrambleTween = null
    }
  }

  // --- scramble (self) -----------------------------------------------

  _scrambleSelf() {
    const finalText = (this.element.textContent || "").trim()
    if (!finalText) return
    const palette = this._resolveChars(this.charsValue || "upperCase")
    const tween = scrambleTo(this.element, finalText, {
      duration: this.durationValue,
      chars: palette
    })
    if (tween) this._tweens.push(tween)
  }

  _resolveChars(name) {
    if (SCRAMBLE_CHARS[name]) return SCRAMBLE_CHARS[name]
    return name // treat as literal palette
  }

  // --- highlight scroll fade -----------------------------------------

  _initHighlightScroll() {
    // Splitting wraps every word/char in spans we can target.
    const result = Splitting({ target: this.element, by: "chars" })
    this._splitInstance = result
    const chars = this.element.querySelectorAll(".char")
    if (!chars.length) return

    const tween = gsap.from(chars, {
      autoAlpha: this.fadeValue,
      stagger: this.staggerValue,
      ease: "linear",
      scrollTrigger: {
        trigger: this.element,
        scrub: true,
        start: this.startValue,
        end: this.endValue
      }
    })
    this._tweens.push(tween)
  }

  // --- hover scramble (link / target) --------------------------------

  _initHoverScramble() {
    const links = this.element.matches('[data-text-hover="link"]')
      ? [this.element]
      : Array.from(this.element.querySelectorAll('[data-text-hover="link"]'))

    links.forEach((link) => {
      const target = link.matches('[data-text-hover="target"]')
        ? link
        : link.querySelector('[data-text-hover="target"]')
      if (!target) return

      const original = target.textContent
      const customHover = target.getAttribute("data-text-hover-text")

      const enter = () => {
        const tween = scrambleTo(target, customHover || original, {
          duration: 1.0,
          chars: SCRAMBLE_CHARS.hover
        })
        if (tween) this._tweens.push(tween)
      }
      const leave = () => {
        const tween = scrambleTo(target, original, {
          duration: 0.6,
          chars: SCRAMBLE_CHARS.exit,
          settleSpan: 0.55
        })
        if (tween) this._tweens.push(tween)
      }
      link.addEventListener("mouseenter", enter)
      link.addEventListener("mouseleave", leave)
      this._hoverHandlers.push({ el: link, enter, leave })
    })
  }
}

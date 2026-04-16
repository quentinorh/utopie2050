import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"
import scrollTriggerImport from "gsap/scrollTrigger"
import Splitting from "splitting"

const ScrollTrigger = scrollTriggerImport.ScrollTrigger || scrollTriggerImport
gsap.registerPlugin(ScrollTrigger)

// Footer entrance reveal — fires once when the footer enters the
// viewport. Two layers of motion:
//   1. Stagger fade + slight rise on every [data-footer-reveal-stagger]
//      element (eyebrows, links, license row).
//   2. Per-character mask reveal on the giant "SP 2050" / "2026" pair,
//      each char wrapped in an overflow:hidden mask and translated from
//      yPercent 110 → 0.
// Easing matches the underline animation on `.demo-footer__a`:
// cubic-bezier(0.625, 0.05, 0, 1).
const EASE = "cubic-bezier(0.625, 0.05, 0, 1)"

export default class extends Controller {
  static targets = ["stagger", "chars"]

  connect() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    this._tweens = []
    this._splitInstances = []

    const boot = () => {
      this._raf1 = requestAnimationFrame(() =>
        this._raf2 = requestAnimationFrame(() => this._setup())
      )
    }
    if (document.fonts?.ready) {
      document.fonts.ready.then(boot)
    } else {
      boot()
    }
  }

  disconnect() {
    if (this._raf1) cancelAnimationFrame(this._raf1)
    if (this._raf2) cancelAnimationFrame(this._raf2)
    this._tweens?.forEach(t => {
      if (t?.scrollTrigger) t.scrollTrigger.kill()
      t?.kill?.()
    })
    this._tweens = []
    // Splitting doesn't expose a clean "destroy" — leave the spans in
    // place; they'll be GC'd with the element on Turbo navigation.
    this._splitInstances = []
  }

  _setup() {
    this._splitChars()
    this._buildTimeline()

    // Refresh in case the footer's own height changed once chars wrapped.
    ScrollTrigger.refresh()
    setTimeout(() => ScrollTrigger.refresh(), 600)
  }

  // ── Splitting + masking ───────────────────────────────────────────
  _splitChars() {
    const targets = this.hasCharsTarget ? this.charsTargets : []
    if (!targets.length) return

    targets.forEach(el => {
      // Splitting wraps each char in a .char span (display inline-block).
      const result = Splitting({ target: el, by: "chars" })
      this._splitInstances.push(result)

      // Wrap every .char in an overflow:hidden mask so the translate
      // reveal clips against the baseline rather than spilling above.
      el.querySelectorAll(".char").forEach(char => {
        if (char.parentElement?.classList.contains("char-mask")) return
        const mask = document.createElement("span")
        mask.className = "char-mask"
        char.parentNode.insertBefore(mask, char)
        mask.appendChild(char)
      })
    })
  }

  // ── Timeline ──────────────────────────────────────────────────────
  _buildTimeline() {
    const tl = gsap.timeline({
      defaults: { ease: EASE },
      scrollTrigger: {
        trigger: this.element,
        // Fire just before the footer is fully in view so the reveal
        // overlaps the parallax slide-up rather than waiting for it.
        start: "top 85%",
        once: true,
        invalidateOnRefresh: true
      }
    })

    // 1. Stagger fade for every tagged element (eyebrows, links, etc.)
    if (this.hasStaggerTarget && this.staggerTargets.length) {
      tl.from(this.staggerTargets, {
        autoAlpha: 0,
        y: 28,
        duration: 0.9,
        stagger: 0.06
      }, 0)
    }

    // 2. Per-char mask reveal for the giant year row.
    const chars = this.element.querySelectorAll("[data-footer-reveal-chars] .char")
    if (chars.length) {
      tl.from(chars, {
        yPercent: 110,
        duration: 1.1,
        stagger: 0.025
      }, 0.15)
    }

    this._tweens.push(tl)
  }
}

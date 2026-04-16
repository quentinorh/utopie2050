import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"
import scrollTriggerImport from "gsap/scrollTrigger"

const ScrollTrigger = scrollTriggerImport.ScrollTrigger || scrollTriggerImport
gsap.registerPlugin(ScrollTrigger)

// Osmo "Footer Parallax Effect" — Stimulus port.
//
// The wrap (`[data-footer-parallax]`) is the trigger. As it scrolls
// from "top of viewport bottom" to "top of viewport top", we rewind
// two from() tweens:
//   - the inner footer slides up from yPercent: -25 → 0
//   - the dark overlay fades from opacity 0.5 → 0
//
// The visual result: the footer starts hidden behind a dark veil and
// settles into place just as you reach the bottom of the page.
export default class extends Controller {
  connect() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    // Defer two RAFs so layout + late images settle before measuring.
    this._raf1 = requestAnimationFrame(() =>
      this._raf2 = requestAnimationFrame(() => this._setup())
    )
  }

  disconnect() {
    if (this._raf1) cancelAnimationFrame(this._raf1)
    if (this._raf2) cancelAnimationFrame(this._raf2)
    if (this._tl?.scrollTrigger) this._tl.scrollTrigger.kill()
    this._tl?.kill?.()
  }

  _setup() {
    const el    = this.element
    const inner = el.querySelector("[data-footer-parallax-inner]")
    const dark  = el.querySelector("[data-footer-parallax-dark]")

    this._tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "top bottom",
        end:   "top top",
        scrub: true,
        invalidateOnRefresh: true
      }
    })

    if (inner) {
      this._tl.from(inner, { yPercent: -25, ease: "none" })
    }
    if (dark) {
      this._tl.from(dark, { opacity: 0.5, ease: "none" }, "<")
    }

    ScrollTrigger.refresh()
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh())
    }
  }
}

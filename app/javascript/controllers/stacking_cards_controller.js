import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"
import scrollTriggerImport from "gsap/scrollTrigger"

const ScrollTrigger = scrollTriggerImport.ScrollTrigger || scrollTriggerImport
gsap.registerPlugin(ScrollTrigger)

// Osmo "Stacking Cards Parallax" — Stimulus port, hardened.
//
// Setup is deferred until fonts.ready + 2 RAFs so cover SVGs (rendered
// via .html_safe) are committed before we measure trigger bounds.
// Without this, ScrollTrigger registers triggers against a document
// height that's still growing, and "start: top bottom" lands past
// document end, so the timeline never plays.
//
// Add `?stmark=1` to the URL to visualise the trigger boundaries.
export default class extends Controller {
  connect() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    this._tweens = []
    this._debug = new URLSearchParams(window.location.search).has("stmark")

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

    // Refresh on resize — `min-height: 100vh` cards change height
    // when the URL bar collapses on mobile, etc. Throttle via ST's
    // own debounce semantics.
    this._onResize = () => ScrollTrigger.refresh()
    window.addEventListener("resize", this._onResize)
  }

  disconnect() {
    if (this._raf1) cancelAnimationFrame(this._raf1)
    if (this._raf2) cancelAnimationFrame(this._raf2)
    if (this._onResize) window.removeEventListener("resize", this._onResize)
    this._tweens?.forEach(t => {
      if (t?.scrollTrigger) t.scrollTrigger.kill()
      t?.kill?.()
    })
    this._tweens = []
  }

  _setup() {
    const cards = this.element.querySelectorAll("[data-stacking-cards-item]")
    if (cards.length < 2) {
      if (this._debug) console.debug("[stacking-cards] only", cards.length, "card(s) — bailing")
      return
    }

    if (this._debug) console.debug("[stacking-cards] wiring", cards.length, "cards")

    cards.forEach((card, i) => {
      if (i === 0) return
      const previousCard = cards[i - 1]
      if (!previousCard) return

      const previousCardImage = previousCard.querySelector("[data-stacking-cards-img]")

      const tl = gsap.timeline({
        defaults: { ease: "none", duration: 1 },
        scrollTrigger: {
          trigger: card,
          start: "top bottom",
          end: "top top",
          scrub: true,
          invalidateOnRefresh: true,
          markers: this._debug
        }
      })

      tl.fromTo(previousCard,
        { yPercent: 0, scale: 1 },
        { yPercent: 50, scale: 0.92 })

      if (previousCardImage) {
        tl.fromTo(previousCardImage,
          { rotate: 0, yPercent: 0 },
          { rotate: -5, yPercent: -25 }, "<")
      }

      this._tweens.push(tl)
    })

    // Layered refresh schedule:
    //   - immediately (sync after wiring)
    //   - after fonts.ready (catches glyph-driven layout shifts)
    //   - +800ms (catches Cloudinary lazy-decoded webp)
    //   - +2000ms (catches very late SVG injection from cover_controller)
    ScrollTrigger.refresh()
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh())
    }
    setTimeout(() => ScrollTrigger.refresh(), 800)
    setTimeout(() => {
      ScrollTrigger.refresh()
      if (this._debug) {
        const triggers = ScrollTrigger.getAll().filter(t =>
          t.trigger && t.trigger.matches?.("[data-stacking-cards-item]")
        )
        console.debug("[stacking-cards] active triggers:", triggers.length, triggers)
      }
    }, 2000)
  }
}

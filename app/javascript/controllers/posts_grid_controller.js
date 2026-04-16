import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"
import scrollTriggerImport from "gsap/scrollTrigger"

// JSPM ships ScrollTrigger as either the class or `{ ScrollTrigger }`
// depending on the build — normalise once.
const ScrollTrigger = scrollTriggerImport.ScrollTrigger || scrollTriggerImport
gsap.registerPlugin(ScrollTrigger)

// Horizontal pinned card scroll — adapted from mwg_047.
//
// The model uses a horizontal Lenis on the whole page. We can't do
// that without breaking the rest of the home page (manifesto + solar-
// punk both rely on the global vertical Lenis), so instead:
//
//   1. Pin the section vertically for the duration needed to scroll
//      through the entire horizontal track.
//   2. While pinned, scrub `container.x` from 0 to -(scrollWidth -
//      viewport.width). Vertical wheel → horizontal motion.
//   3. For each card, register two scroll-triggered tweens that watch
//      the card's *horizontal* position by passing the container tween
//      as `containerAnimation` — ScrollTrigger then resolves the
//      'left 100%' / 'right 0%' bounds against the moving container,
//      not the static page scroll. This is the canonical GSAP pattern
//      for "horizontal section inside a vertical page".
//
// Animation per card (matches the model exactly):
//   - reveal: scaleX 0 → 1, origin left, while card.left moves
//     viewport-right → 80% of viewport.
//   - vanish: scaleX 1 → 0, origin right, while card.right moves
//     20% of viewport → off the left edge.
//
// The .media__info overlay (username + title) scales with the cover
// via a CSS custom property (`--media-scale` / `--media-origin`).
export default class extends Controller {
  static targets = ["container", "header"]

  connect() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Reduced-motion fallback: static responsive grid.
      this.element.classList.add("posts-grid--static")
      this.element.querySelectorAll(".media__svg").forEach(el => {
        el.style.transform = "none"
      })
      return
    }

    this._tweens = []
    this._scrollTriggers = []

    // Wait one frame so cover SVGs have laid out and scrollWidth is real.
    this._rafId = requestAnimationFrame(() => this._setup())
  }

  disconnect() {
    if (this._rafId) cancelAnimationFrame(this._rafId)
    if (this._intersection) this._intersection.disconnect()
    this._tweens?.forEach(t => {
      if (t?.scrollTrigger) t.scrollTrigger.kill()
      t?.kill?.()
    })
    this._scrollTriggers?.forEach(st => st.kill())
    this._tweens = []
    this._scrollTriggers = []
  }

  _setup() {
    const section   = this.element
    const container = this.hasContainerTarget
      ? this.containerTarget
      : section.querySelector(".mwg_effect047__container")
    if (!container) return

    // Force every card cover to start at scale 0 with origin-left so
    // the first scrub doesn't flash the full image before the trigger
    // resolves on the first frame.
    section.querySelectorAll(".media").forEach(media => {
      const cover = media.querySelector(".media__svg")
      const info  = media.querySelector(".media__info")
      if (cover) gsap.set(cover, { scaleX: 0, transformOrigin: "0% 50%" })
      if (info)  info.style.setProperty("--media-scale", "0")
    })

    // Total horizontal travel = container width − viewport width. We
    // recompute on refresh so resizes / font swaps stay correct.
    const totalX = () => Math.max(0, container.scrollWidth - window.innerWidth)

    // ── Pin the section + scrub container.x ────────────────────────
    const containerTween = gsap.to(container, {
      x: () => -totalX(),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        start: "top top",
        end: () => `+=${totalX()}`,
        invalidateOnRefresh: true
      }
    })
    this._tweens.push(containerTween)

    // ── Per-card reveal / vanish ───────────────────────────────────
    section.querySelectorAll(".media").forEach(media => {
      const cover = media.querySelector(".media__svg")
      const info  = media.querySelector(".media__info")
      if (!cover) return

      // Reveal — scaleX 0 → 1, origin left.
      this._tweens.push(gsap.fromTo(cover,
        { scaleX: 0, transformOrigin: "0% 50%" },
        {
          scaleX: 1,
          transformOrigin: "0% 50%",
          ease: "none",
          scrollTrigger: {
            trigger: media,
            containerAnimation: containerTween,
            start: "left 100%",
            end:   "left 80%",
            scrub: true,
            onUpdate: (self) => {
              if (info) {
                info.style.setProperty("--media-scale", self.progress)
                info.style.setProperty("--media-origin", "0% 50%")
              }
            }
          }
        }
      ))

      // Vanish — scaleX 1 → 0, origin right.
      this._tweens.push(gsap.fromTo(cover,
        { scaleX: 1, transformOrigin: "100% 50%" },
        {
          scaleX: 0,
          transformOrigin: "100% 50%",
          ease: "none",
          immediateRender: false, // avoid clobbering the reveal's start
          scrollTrigger: {
            trigger: media,
            containerAnimation: containerTween,
            start: "right 20%",
            end:   "right 0%",
            scrub: true,
            onUpdate: (self) => {
              if (info) {
                info.style.setProperty("--media-scale", 1 - self.progress)
                info.style.setProperty("--media-origin", "100% 50%")
              }
            }
          }
        }
      ))
    })

    // The pin can be measured before fonts / cover SVGs settle, leaving
    // the wrong end position. Refresh once everything is loaded.
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }
}

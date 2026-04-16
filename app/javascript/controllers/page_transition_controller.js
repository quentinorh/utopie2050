import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"
// Turbo is loaded via @hotwired/turbo-rails and exposes itself on
// window.Turbo — pulling it from there avoids needing a separate
// import-map pin for @hotwired/turbo.

// Lightweight enter/exit transition for any page region.
//
// Usage:
//   <div data-controller="page-transition">
//     ...page content...
//   </div>
//
// On connect:    fades the host element in from y:16
// On turbo:before-visit (anywhere):
//                fades the host out then performs the visit
//
// The exit interception is per-controller, so a page can opt in by
// simply mounting this controller. We don't touch the global Turbo
// configuration, and we still respect prefers-reduced-motion.
export default class extends Controller {
  static values = {
    duration: { type: Number, default: 0.5 },
    exit: { type: Number, default: 0.3 }
  }

  connect() {
    this._reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (!this._reducedMotion) {
      gsap.fromTo(
        this.element,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: this.durationValue,
          ease: "power3.out",
          clearProps: "all"
        }
      )
    }

    this._beforeVisit = this._handleBeforeVisit.bind(this)
    document.addEventListener("turbo:before-visit", this._beforeVisit)
  }

  disconnect() {
    document.removeEventListener("turbo:before-visit", this._beforeVisit)
    // Cancel any in-flight exit tween so it doesn't keep tweening a
    // detached element after the visit lands.
    gsap.killTweensOf(this.element)
  }

  _handleBeforeVisit(event) {
    // The visit is already in progress — don't intercept the synthetic
    // call we trigger from onComplete.
    if (this._exiting) return
    if (this._reducedMotion) return

    const url = event.detail?.url
    if (!url) return

    event.preventDefault()
    this._exiting = true

    // Detach the listener immediately so the synthetic Turbo.visit
    // below isn't re-intercepted in some browsers/edge cases.
    document.removeEventListener("turbo:before-visit", this._beforeVisit)

    gsap.to(this.element, {
      opacity: 0,
      y: -10,
      duration: this.exitValue,
      ease: "power2.in",
      onComplete: () => {
        if (window.Turbo?.visit) {
          window.Turbo.visit(url)
        } else {
          // Fall back to a plain navigation if Turbo isn't on the
          // page (shouldn't happen, but worth being safe).
          window.location.href = url
        }
      }
    })
  }
}

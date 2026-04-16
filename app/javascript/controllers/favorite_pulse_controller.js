import { Controller } from "@hotwired/stimulus"

// Tiny gesture: when the favorite button's turbo-frame is replaced
// after a toggle, pop the star icon. We tell new-state from initial
// page-load by reading a `data-favorite-pulse-state-value`:
//   - "favorited" / "unfavorited"  → animate
//   - missing                      → first paint, stay quiet
//
// Markup expects this controller on the form (or button) wrapping the
// SVG; the icon itself carries `data-favorite-pulse-target="icon"`.
export default class extends Controller {
  static targets = ["icon"]
  static values  = { state: String, fresh: Boolean }

  connect() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (!this.freshValue) return
    if (!this.hasIconTarget) return

    // Stagger one frame so the SVG is in the layout before the
    // animation kicks in (otherwise some browsers drop the first
    // keyframe).
    requestAnimationFrame(() => this._pulse(this.iconTarget))
  }

  _pulse(el) {
    const klass = this.stateValue === "favorited"
      ? "is-heart-pulsing"
      : "is-popping-in"
    el.classList.remove(klass)
    // eslint-disable-next-line no-unused-expressions
    void el.offsetWidth
    el.classList.add(klass)
    setTimeout(() => el.classList.remove(klass), 700)
  }
}

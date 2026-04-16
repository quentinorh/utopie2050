import { Controller } from "@hotwired/stimulus"

// Osmo "Big Typo Scroll Preview" — Stimulus port.
//
// Two execution paths:
//   - Touch / coarse pointer → RAF loop picks the item closest to the
//     viewport vertical centre and tags it `data-typo-scroll-item="active"`.
//     Cleared whenever the centre falls outside the section.
//   - Pointer:fine → mouseenter on each item sets active, mouseleave
//     on the container clears.
//
// We deliberately DO NOT spin up a new Lenis here — there's already a
// global Lenis driven by application.js, and a second one would fight
// the first. Infinite-mode is therefore disabled (the section uses
// `data-typo-scroll-infinite="false"`).
export default class extends Controller {
  connect() {
    this.items = Array.from(
      this.element.querySelectorAll('[data-typo-scroll-item]')
    )
    if (!this.items.length) return

    this._isTouch =
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0)

    if (this._isTouch) {
      this._raf = requestAnimationFrame(() => this._tickTouch())
    } else {
      this._bindHover()
    }
  }

  disconnect() {
    if (this._raf) cancelAnimationFrame(this._raf)
    if (this._unbindHover) this._unbindHover()
  }

  // ── Touch: closest item to viewport centre ──────────────────────
  _tickTouch() {
    const centreY = window.innerHeight / 2
    const sectionRect = this.element.getBoundingClientRect()

    if (centreY < sectionRect.top || centreY > sectionRect.bottom) {
      this._clearActive()
    } else {
      let closest = null
      let closestDist = Infinity
      this.items.forEach(item => {
        const rect = item.getBoundingClientRect()
        if (rect.bottom < 0 || rect.top > window.innerHeight) return
        const itemCentreY = rect.top + rect.height / 2
        const dist = Math.abs(centreY - itemCentreY)
        if (dist < closestDist) {
          closestDist = dist
          closest = item
        }
      })
      if (closest) this._setActive(closest)
      else this._clearActive()
    }

    this._raf = requestAnimationFrame(() => this._tickTouch())
  }

  // ── Pointer:fine: mouseenter per item, mouseleave on container ──
  _bindHover() {
    const handlers = []

    this.items.forEach(item => {
      const onEnter = () => this._setActive(item)
      item.addEventListener("mouseenter", onEnter)
      handlers.push([item, "mouseenter", onEnter])
    })

    const onContainerLeave = () => this._clearActive()
    this.element.addEventListener("mouseleave", onContainerLeave)
    handlers.push([this.element, "mouseleave", onContainerLeave])

    this._unbindHover = () => handlers.forEach(([el, ev, fn]) =>
      el.removeEventListener(ev, fn))
  }

  _setActive(target) {
    this.items.forEach(item => {
      item.setAttribute(
        "data-typo-scroll-item",
        item === target ? "active" : ""
      )
    })
  }

  _clearActive() {
    this.items.forEach(item => {
      item.setAttribute("data-typo-scroll-item", "")
    })
  }
}

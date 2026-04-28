import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"

// Pilule + libellé statique au survol de `[data-cursor-marquee-text]`.
// Monté sur <body> pour suivre le pointeur ; pas d’animation de défilement.
//
// We disable on touch / coarse pointers because the visual is purely
// cursor-driven.
export default class extends Controller {
  static targets = ["cursor", "text"]

  static values = {
    followDuration: { type: Number, default: 0.4 }
  }

  connect() {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return

    this.xTo = gsap.quickTo(this.cursorTarget, "x",
      { duration: this.followDurationValue, ease: "power3" })
    this.yTo = gsap.quickTo(this.cursorTarget, "y",
      { duration: this.followDurationValue, ease: "power3" })

    this._activeEl = null
    this._lastX = 0
    this._lastY = 0
    this._pauseTimeout = null

    this._onPointerMove = this._onPointerMove.bind(this)
    this._onScroll      = this._onScroll.bind(this)

    window.addEventListener("pointermove", this._onPointerMove, { passive: true })
    window.addEventListener("scroll",       this._onScroll,       { passive: true })

    // Show in idle state once the script has booted.
    setTimeout(() => {
      this.cursorTarget.setAttribute("data-cursor-marquee-status", "not-active")
    }, 500)
  }

  disconnect() {
    window.removeEventListener("pointermove", this._onPointerMove)
    window.removeEventListener("scroll",       this._onScroll)
    if (this._pauseTimeout) clearTimeout(this._pauseTimeout)
  }

  _onPointerMove(e) {
    this._lastX = e.clientX
    this._lastY = e.clientY
    this.xTo(this._lastX)
    this.yTo(this._lastY)
    this._checkTarget()
  }

  _onScroll() {
    this.xTo(this._lastX)
    this.yTo(this._lastY)
    this._checkTarget()
  }

  _checkTarget() {
    const el  = document.elementFromPoint(this._lastX, this._lastY)
    const hit = el && el.closest("[data-cursor-marquee-text]")
    if (hit !== this._activeEl) {
      if (this._activeEl) this._pauseLater()
      if (hit)             this._playFor(hit)
    }
  }

  _playFor(el) {
    if (!el) return
    if (this._pauseTimeout) clearTimeout(this._pauseTimeout)
    const text = el.getAttribute("data-cursor-marquee-text") || ""
    this.textTargets.forEach(t => {
      t.textContent = text
    })
    this.cursorTarget.setAttribute("data-cursor-marquee-status", "active")
    this._activeEl = el
  }

  _pauseLater() {
    this.cursorTarget.setAttribute("data-cursor-marquee-status", "not-active")
    if (this._pauseTimeout) clearTimeout(this._pauseTimeout)
    this._activeEl = null
  }
}

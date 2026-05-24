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
    this._active = false
    this._activeEl = null
    this._lastX = 0
    this._lastY = 0
    this._pauseTimeout = null
    this._bootTimeout = null

    this._onPointerMove = this._onPointerMove.bind(this)
    this._onScroll      = this._onScroll.bind(this)
    this._onPageChange  = this._sync.bind(this)

    document.addEventListener("turbo:load", this._onPageChange)
    this._sync()
  }

  disconnect() {
    document.removeEventListener("turbo:load", this._onPageChange)
    this._deactivate()
  }

  _sync() {
    const canUse = !window.matchMedia("(hover: none), (pointer: coarse)").matches
      && document.querySelector("[data-cursor-marquee-text]")

    if (canUse) {
      if (!this._active) this._activate()
    } else {
      this._deactivate()
    }
  }

  _activate() {
    this._active = true
    this._activeEl = null

    if (this.hasCursorTarget) {
      this.cursorTarget.hidden = false
      this.cursorTarget.setAttribute("data-cursor-marquee-status", "")
    }

    this.xTo = gsap.quickTo(this.cursorTarget, "x",
      { duration: this.followDurationValue, ease: "power3" })
    this.yTo = gsap.quickTo(this.cursorTarget, "y",
      { duration: this.followDurationValue, ease: "power3" })

    window.addEventListener("pointermove", this._onPointerMove, { passive: true })
    window.addEventListener("scroll",       this._onScroll,       { passive: true })

    this._bootTimeout = setTimeout(() => {
      if (this._active && this.hasCursorTarget) {
        this.cursorTarget.setAttribute("data-cursor-marquee-status", "not-active")
      }
    }, 500)
  }

  _deactivate() {
    window.removeEventListener("pointermove", this._onPointerMove)
    window.removeEventListener("scroll",       this._onScroll)

    if (this._pauseTimeout) {
      clearTimeout(this._pauseTimeout)
      this._pauseTimeout = null
    }
    if (this._bootTimeout) {
      clearTimeout(this._bootTimeout)
      this._bootTimeout = null
    }

    if (this.hasCursorTarget) {
      gsap.killTweensOf(this.cursorTarget)
      gsap.set(this.cursorTarget, { clearProps: "transform" })
      this.cursorTarget.setAttribute("data-cursor-marquee-status", "")
      this.cursorTarget.hidden = true
    }

    this._activeEl = null
    this._active = false
    this.xTo = null
    this.yTo = null
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

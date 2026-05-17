import { Controller } from "@hotwired/stimulus"

const TOOLTIP_IDLE_HIDE_MS = 200

// Lightweight cursor-following tooltip.
// Usage: <div data-controller="tooltip" data-tooltip-text-value="...">…</div>
//
// Injects a single absolutely-positioned bubble inside the host element and
// updates its transform on pointermove. Visible only while the pointer moves
// inside the host; hidden after a short idle period when motion stops.
// The host needs `position: relative` (or any positioned ancestor) for offsets.
export default class extends Controller {
  static values = { text: String, offset: { type: Number, default: 14 } }

  connect() {
    this.tip = document.createElement("div")
    this.tip.className = "cc-tip"
    this.tip.setAttribute("role", "tooltip")
    this.tip.setAttribute("aria-hidden", "true")
    this.tip.textContent = this.textValue
    this.element.appendChild(this.tip)

    this._idleTimer = null

    this._onEnter = this._onEnter.bind(this)
    this._onLeave = this._onLeave.bind(this)
    this._onMove = this._onMove.bind(this)

    this.element.addEventListener("pointerenter", this._onEnter)
    this.element.addEventListener("pointerleave", this._onLeave)
    this.element.addEventListener("pointermove", this._onMove)
  }

  disconnect() {
    this._clearIdleHide()
    this.element.removeEventListener("pointerenter", this._onEnter)
    this.element.removeEventListener("pointerleave", this._onLeave)
    this.element.removeEventListener("pointermove", this._onMove)
    this.tip?.remove()
  }

  textValueChanged() {
    if (this.tip) this.tip.textContent = this.textValue
  }

  _onEnter(e) {
    this._position(e)
  }

  _onLeave() {
    this._clearIdleHide()
    this.tip.classList.remove("is-visible")
    this.tip.setAttribute("aria-hidden", "true")
  }

  _onMove(e) {
    this._position(e)
    this.tip.classList.add("is-visible")
    this.tip.setAttribute("aria-hidden", "false")
    this._scheduleIdleHide()
  }

  _clearIdleHide() {
    if (this._idleTimer != null) {
      clearTimeout(this._idleTimer)
      this._idleTimer = null
    }
  }

  _scheduleIdleHide() {
    this._clearIdleHide()
    const ms = TOOLTIP_IDLE_HIDE_MS
    this._idleTimer = setTimeout(() => {
      this._idleTimer = null
      this.tip.classList.remove("is-visible")
      this.tip.setAttribute("aria-hidden", "true")
    }, ms)
  }

  _position(e) {
    const rect = this.element.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top - this.offsetValue
    this.tip.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
  }
}

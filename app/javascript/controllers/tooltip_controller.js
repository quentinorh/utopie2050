import { Controller } from "@hotwired/stimulus"

// Lightweight cursor-following tooltip.
// Usage: <div data-controller="tooltip" data-tooltip-text-value="...">…</div>
//
// Injects a single absolutely-positioned bubble inside the host element and
// updates its transform on mousemove. The host needs `position: relative`
// (or any positioned ancestor) for the offsets to make sense.
export default class extends Controller {
  static values = { text: String, offset: { type: Number, default: 14 } }

  connect() {
    this.tip = document.createElement("div")
    this.tip.className = "cc-tip"
    this.tip.setAttribute("role", "tooltip")
    this.tip.setAttribute("aria-hidden", "true")
    this.tip.textContent = this.textValue
    this.element.appendChild(this.tip)

    this._onEnter = this._onEnter.bind(this)
    this._onLeave = this._onLeave.bind(this)
    this._onMove = this._onMove.bind(this)

    this.element.addEventListener("pointerenter", this._onEnter)
    this.element.addEventListener("pointerleave", this._onLeave)
    this.element.addEventListener("pointermove", this._onMove)
  }

  disconnect() {
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
    this.tip.classList.add("is-visible")
  }

  _onLeave() {
    this.tip.classList.remove("is-visible")
  }

  _onMove(e) {
    this._position(e)
  }

  _position(e) {
    const rect = this.element.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top - this.offsetValue
    this.tip.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
  }
}

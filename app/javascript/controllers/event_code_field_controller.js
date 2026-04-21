import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "input", "switch"]

  connect() {
    this.applyState(this.inputTarget.value.trim().length > 0)
  }

  toggle(event) {
    event.preventDefault()
    const isOn = this.switchTarget.getAttribute("aria-checked") === "true"
    const next = !isOn
    if (!next) {
      this.inputTarget.value = ""
    }
    this.applyState(next)
  }

  applyState(expanded) {
    this.switchTarget.setAttribute("aria-checked", String(expanded))
    this.switchTarget.classList.toggle("is-on", expanded)
    this.panelTarget.classList.toggle("hidden", !expanded)
  }
}

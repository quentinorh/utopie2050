import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu"]

  connect() {
    this._close = (e) => {
      if (!this.element.contains(e.target)) this.hide()
    }
    document.addEventListener("click", this._close)
  }

  disconnect() {
    document.removeEventListener("click", this._close)
  }

  toggle() {
    this.menuTarget.classList.contains("hidden") ? this.show() : this.hide()
  }

  show() {
    this.menuTarget.classList.remove("hidden")
    // Force a reflow so the browser registers the initial (opacity-0/scale-95)
    // state before we flip data-open — otherwise the transition is skipped
    // and the menu appears to "pop" after a delay instead of animating in.
    void this.menuTarget.offsetWidth
    this.menuTarget.dataset.open = ""
  }

  hide() {
    delete this.menuTarget.dataset.open
    this.menuTarget.addEventListener("transitionend", () => {
      this.menuTarget.classList.add("hidden")
    }, { once: true })
  }
}

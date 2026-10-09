import { Controller } from "@hotwired/stimulus"

const MOBILE_QUERY = "(max-width: 639px)"

export default class extends Controller {
  static targets = ["choice", "loginForm"]
  static values = { showForm: { type: Boolean, default: false } }

  connect() {
    this.mobileBreakpoint = window.matchMedia(MOBILE_QUERY)
    this.boundUpdateView = this.updateView.bind(this)
    this.mobileBreakpoint.addEventListener("change", this.boundUpdateView)
    this.updateView()
  }

  disconnect() {
    this.mobileBreakpoint?.removeEventListener("change", this.boundUpdateView)
  }

  showLogin() {
    this.showFormValue = true
    this.updateView()
  }

  updateView() {
    const showChoice = this.mobileBreakpoint.matches && !this.showFormValue

    if (this.hasChoiceTarget) {
      this.choiceTarget.hidden = !showChoice
    }

    if (this.hasLoginFormTarget) {
      this.loginFormTarget.hidden = showChoice
    }
  }
}

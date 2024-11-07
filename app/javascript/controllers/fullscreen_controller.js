import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["enterIcon", "exitIcon"]

  toggle() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.enterIconTarget.classList.add("hidden")
        this.exitIconTarget.classList.remove("hidden")
      })
    } else {
      document.exitFullscreen().then(() => {
        this.enterIconTarget.classList.remove("hidden")
        this.exitIconTarget.classList.add("hidden")
      })
    }
  }
} 
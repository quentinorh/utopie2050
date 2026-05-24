import { Controller } from "@hotwired/stimulus"

const AUTO_DISMISS_MS = 5000

export default class extends Controller {
  static targets = ["alert"]

  connect() {
    this.alertTargets.forEach((alert) => this.show(alert))
  }

  show(alert) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        alert.dataset.visible = ""
      })
    })

    alert._autoDismissTimer = setTimeout(() => this.dismiss(alert), AUTO_DISMISS_MS)
  }

  close(event) {
    event.preventDefault()
    const alert = event.currentTarget.closest("[data-flash-target='alert']")
    if (alert) this.dismiss(alert)
  }

  dismiss(alert) {
    if (!alert || alert.dataset.dismissing !== undefined) return

    clearTimeout(alert._autoDismissTimer)
    alert.dataset.dismissing = ""

    alert.addEventListener(
      "transitionend",
      () => {
        alert.remove()
        if (!this.element.querySelector("[data-flash-target='alert']")) {
          this.element.remove()
        }
      },
      { once: true }
    )
  }
}

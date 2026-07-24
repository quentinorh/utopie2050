import { Controller } from "@hotwired/stimulus"
import { loadRegistrationPrefill } from "utils/registration_prefill"

export default class extends Controller {
  static targets = ["username", "age"]

  connect() {
    const prefill = loadRegistrationPrefill()
    if (!prefill) return

    if (prefill.username && this.hasUsernameTarget) {
      this.usernameTarget.value = prefill.username
    }

    if (prefill.age && this.hasAgeTarget) {
      this.ageTarget.value = prefill.age
    }
  }
}

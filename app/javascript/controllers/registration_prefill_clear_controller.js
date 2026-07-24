import { Controller } from "@hotwired/stimulus"
import { clearRegistrationPrefill } from "utils/registration_prefill"

export default class extends Controller {
  static values = { active: Boolean }

  connect() {
    if (!this.activeValue) return

    clearRegistrationPrefill()
  }
}

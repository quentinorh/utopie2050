import { Controller } from "@hotwired/stimulus"
import { loadRegistrationPrefill } from "utils/registration_prefill"
import { buildEtincelle, resolveBodyTemplateFromPrefill } from "utils/narrative_template"

export default class extends Controller {
  static targets = ["body", "title"]
  static values = { enabled: Boolean }

  connect() {
    if (!this.enabledValue) return

    const prefill = loadRegistrationPrefill()
    if (!prefill) return

    this.applyCoverUsername(prefill)
    this.applyTitlePrefill(prefill)
    this.applyBodyPrefill(prefill)
  }

  applyCoverUsername(prefill) {
    const username = prefill.username?.trim()
    if (!username) return

    const coverName = document.querySelector('[data-cover-editor-target="userName"]')
    if (coverName) coverName.textContent = username

    const actionbarType = document.querySelector(".editor-actionbar__type[data-guest-author]")
    if (actionbarType) actionbarType.textContent = `Le futur de ${username}`
  }

  applyTitlePrefill(prefill) {
    const etincelle = buildEtincelle(prefill)
    if (!etincelle) return

    const field = this.hasTitleTarget ? this.titleTarget : document.getElementById("post_title")
    if (!field || field.value.trim().length > 0) return

    field.value = etincelle
    field.dispatchEvent(new Event("input", { bubbles: true }))
  }

  applyBodyPrefill(prefill) {
    const body = resolveBodyTemplateFromPrefill(prefill)
    if (!body) return

    const field = this.hasBodyTarget ? this.bodyTarget : document.getElementById("post_body")
    if (!field || field.value.trim().length > 0) return

    field.value = body
    field.dispatchEvent(new Event("input", { bubbles: true }))
  }
}

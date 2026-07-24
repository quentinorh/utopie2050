import { Controller } from "@hotwired/stimulus"
import { loadRegistrationPrefill, saveRegistrationPrefill } from "utils/registration_prefill"
import { highlightNarrativeValues, resolveBodyTemplateFromPrefill } from "utils/narrative_template"

export default class extends Controller {
  static targets = ["panel", "editor"]

  connect() {
    this.render = this.render.bind(this)
    this.render()
    document.addEventListener("writing-tutorial:synthesis-update", this.render)
  }

  disconnect() {
    document.removeEventListener("writing-tutorial:synthesis-update", this.render)
  }

  render() {
    if (!this.hasPanelTarget || !this.hasEditorTarget) return
    if (this.editorTarget === document.activeElement) return

    const prefill = loadRegistrationPrefill()
    const body = prefill ? resolveBodyTemplateFromPrefill(prefill) : ""

    if (!body) {
      this.panelTarget.hidden = true
      this.editorTarget.innerHTML = ""
      return
    }

    this.editorTarget.innerHTML = highlightNarrativeValues(body, prefill)
    this.panelTarget.hidden = false
  }

  updateDraft() {
    if (!this.hasEditorTarget) return

    saveRegistrationPrefill({
      bodyTemplate: this.extractPlainText(),
      bodyTemplateEdited: true
    })
  }

  confirm() {
    this.updateDraft()
  }

  extractPlainText() {
    if (!this.hasEditorTarget) return ""
    return this.editorTarget.innerText.replace(/\u00A0/g, " ")
  }
}

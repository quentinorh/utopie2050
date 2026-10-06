import { Controller } from "@hotwired/stimulus"
import {
  loadRegistrationPrefill,
  saveRegistrationPrefill,
  renderWritingTutorialSynthesis,
  syncRegistrationPrefillFromAccount,
  buildSynthesisSummary,
  prefillUpdatesFromSynthesisField
} from "utils/registration_prefill"
import { buildEtincelle, regenerateBodyTemplateFromPrefill } from "utils/narrative_template"

const COLLAPSED_STORAGE_KEY = "sp2050_draft_synthesis_collapsed"

export default class extends Controller {
  static targets = ["panel", "list", "body", "toggle", "summary"]
  static values = { username: String, age: String, collapsible: Boolean }

  connect() {
    if (this.usernameValue || this.ageValue) {
      syncRegistrationPrefillFromAccount(this.usernameValue, this.ageValue)
    }

    this.lastPrefill = loadRegistrationPrefill()
    this.render = this.render.bind(this)
    this.render()

    if (this.collapsibleValue) {
      this.applyCollapsed(this.loadCollapsedState())
    }

    document.addEventListener("writing-tutorial:synthesis-update", this.render)
  }

  disconnect() {
    document.removeEventListener("writing-tutorial:synthesis-update", this.render)
  }

  toggle(event) {
    event.preventDefault()
    if (!this.collapsibleValue || !this.hasPanelTarget) return

    this.applyCollapsed(!this.isCollapsed())
    this.saveCollapsedState(this.isCollapsed())
  }

  updateField(event) {
    if (!this.collapsibleValue) return

    const field = event.target.dataset.synthesisField
    if (!field) return

    const value = event.target.value.trim()
    const updates = prefillUpdatesFromSynthesisField(field, value)
    if (Object.keys(updates).length === 0) return

    const stored = loadRegistrationPrefill() || {}
    saveRegistrationPrefill(updates)

    const prefill = loadRegistrationPrefill()
    this.syncDependentFields(field, prefill, stored)
    this.updateSummary(prefill)
    this.lastPrefill = prefill
  }

  syncDependentFields(field, prefill, previousPrefill) {
    if (field === "username") {
      this.syncCoverUsername(prefill.username)
    }

    if (field === "spark") {
      this.syncPostTitle(prefill, previousPrefill)
    }

    if (this.shouldSyncPostBody(field, prefill)) {
      const previousBody = regenerateBodyTemplateFromPrefill(previousPrefill)
      const bodyField = document.getElementById("post_body")
      const currentBody = bodyField?.value || ""
      const body = regenerateBodyTemplateFromPrefill(prefill)

      if (!body) return

      const unchangedBody = !currentBody.trim() ||
        currentBody === previousBody ||
        currentBody === previousPrefill.bodyTemplate

      if (unchangedBody) {
        saveRegistrationPrefill({ bodyTemplate: body, bodyTemplateEdited: false })
        this.syncPostBody(body)
      }
    }
  }

  shouldSyncPostBody(field, prefill) {
    if (prefill.bodyTemplateEdited) return false

    return [
      "username",
      "age",
      "livingPlace",
      "spark",
      "theme",
      "trend",
      "trendOpposite"
    ].includes(field)
  }

  syncCoverUsername(username) {
    if (!username) return

    const coverName = document.querySelector('[data-cover-editor-target="userName"]')
    if (coverName) coverName.textContent = username

    const actionbarType = document.querySelector(".editor-actionbar__type[data-guest-author]")
    if (actionbarType) actionbarType.textContent = `Le futur de ${username}`
  }

  syncPostTitle(prefill, previousPrefill) {
    const field = document.getElementById("post_title")
    if (!field) return

    const etincelle = buildEtincelle(prefill)
    const previousEtincelle = buildEtincelle(previousPrefill)
    const current = field.value.trim()

    if (!current || current === previousEtincelle) {
      field.value = etincelle
      field.dispatchEvent(new Event("input", { bubbles: true }))
    }
  }

  syncPostBody(body) {
    const field = document.getElementById("post_body")
    if (!field) return

    field.value = body
    field.dispatchEvent(new Event("input", { bubbles: true }))
  }

  updateSummary(prefill) {
    if (!this.hasSummaryTarget) return

    const summary = buildSynthesisSummary(prefill, {
      username: this.usernameValue || undefined,
      age: this.ageValue || undefined
    })

    this.summaryTarget.textContent = summary
    this.summaryTarget.hidden = !summary
  }

  render() {
    if (!this.hasPanelTarget || !this.hasListTarget) return
    if (this.collapsibleValue && this.listTarget.contains(document.activeElement)) return

    const prefill = loadRegistrationPrefill()
    const options = {
      username: this.usernameValue || undefined,
      age: this.ageValue || undefined,
      editable: this.collapsibleValue
    }

    if (this.hasSummaryTarget) {
      options.summaryElement = this.summaryTarget
    }

    renderWritingTutorialSynthesis(this.listTarget, this.panelTarget, prefill, options)
    this.lastPrefill = prefill

    if (this.collapsibleValue) {
      this.syncCollapsedUi()
    }
  }

  isCollapsed() {
    return this.hasPanelTarget && this.panelTarget.classList.contains("is-collapsed")
  }

  applyCollapsed(collapsed) {
    if (!this.hasPanelTarget) return

    this.panelTarget.classList.toggle("is-collapsed", collapsed)
    this.syncCollapsedUi()
  }

  syncCollapsedUi() {
    if (!this.hasPanelTarget) return

    const collapsed = this.isCollapsed()

    if (this.hasToggleTarget) {
      this.toggleTarget.setAttribute("aria-expanded", collapsed ? "false" : "true")
    }

    if (this.hasSummaryTarget) {
      this.summaryTarget.hidden = !collapsed || !this.summaryTarget.textContent
    }
  }

  loadCollapsedState() {
    try {
      // Réduit par défaut ; on respecte le choix de l'utilisateur une fois posé.
      const stored = sessionStorage.getItem(COLLAPSED_STORAGE_KEY)
      return stored === null ? true : stored === "true"
    } catch {
      return true
    }
  }

  saveCollapsedState(collapsed) {
    try {
      sessionStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "true" : "false")
    } catch {
      // sessionStorage indisponible
    }
  }
}

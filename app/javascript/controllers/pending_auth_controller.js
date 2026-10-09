import { Controller } from "@hotwired/stimulus"
import { loadRegistrationPrefill, saveRegistrationPrefill } from "utils/registration_prefill"

const PLACEHOLDER_NAME = "…"

export default class extends Controller {
  static targets = [
    "form", "username", "usernameField", "age", "terms", "termsAccepted",
    "coverImage", "usernameError", "termsError"
  ]
  static values = { coverUsername: String, syncCover: Boolean, coverUploadUrl: String }

  connect() {
    this.applyPrefill()
    if (this.coverUsernameValue) this.paintCover(this.coverUsernameValue, { force: true })
    if (this.syncCoverValue) this.syncCoverImage()
  }

  applyPrefill() {
    const prefill = loadRegistrationPrefill()
    if (!prefill) return

    if (prefill.username && this.hasUsernameTarget && !this.usernameTarget.value.trim()) {
      this.usernameTarget.value = prefill.username
    }

    if (prefill.age && this.hasAgeTarget && !this.ageTarget.value.trim()) {
      this.ageTarget.value = prefill.age
    }

    if (prefill.termsAccepted && this.hasTermsAcceptedTarget && this.termsAcceptedTarget.value !== "1") {
      this.termsAcceptedTarget.value = "1"
    }

    if (prefill.termsAccepted && this.hasTermsTarget) this.termsTarget.checked = true

    const name = this.coverUsernameValue || prefill.username
    if (name) this.paintCover(name)
  }

  onUsernameInput() {
    const value = this.usernameFieldTarget.value
    this.paintCover(value, { force: true })
    if (this.hasUsernameErrorTarget) this.usernameErrorTarget.textContent = ""
    this.usernameFieldTarget.classList.remove("sp-input--error")
    if (value.trim()) saveRegistrationPrefill({ username: value.trim() })
  }

  onTermsChange() {
    if (this.hasTermsErrorTarget) this.termsErrorTarget.textContent = ""
    saveRegistrationPrefill({ termsAccepted: this.termsTarget.checked })
  }

  async prepareSubmit(event) {
    if (this._allowSubmit) return
    if (this._submitted) {
      event.preventDefault()
      return
    }

    const needsGate = this.hasUsernameFieldTarget || this.hasTermsTarget
    if (!needsGate) {
      this._submitted = true
      const button = event.target.querySelector("button[type=submit]")
      if (button) button.disabled = true
      return
    }

    event.preventDefault()
    if (this._preparing) return
    this._preparing = true

    const button = event.target.querySelector("button[type=submit]")
    if (button) button.disabled = true

    try {
      if (this.hasUsernameFieldTarget) {
        const ok = await this.validateUsername()
        if (!ok) return
      }

      if (this.hasTermsTarget && !this.termsTarget.checked) {
        if (this.hasTermsErrorTarget) {
          this.termsErrorTarget.textContent = "Merci d'accepter les conditions pour continuer."
        }
        return
      }

      const username = this.resolveUsername()
      if (username) this.paintCover(username, { force: true })
      await this.attachCoverFile()

      this._allowSubmit = true
      this._submitted = true
      event.target.requestSubmit()
    } finally {
      this._preparing = false
      if (!this._submitted && button) button.disabled = false
    }
  }

  async validateUsername() {
    const value = this.usernameFieldTarget.value.trim()
    if (!value || value === PLACEHOLDER_NAME) {
      return this.failUsername("Indique un nom pour le toi du futur.")
    }

    try {
      const res = await fetch(`/users/check_username?username=${encodeURIComponent(value.toLowerCase())}`)
      const data = await res.json()
      if (data.exists) return this.failUsername("Ce nom est déjà pris.")
    } catch (_) { /* réseau : le serveur revalidera */ }

    return true
  }

  failUsername(message) {
    if (this.hasUsernameErrorTarget) this.usernameErrorTarget.textContent = message
    this.usernameFieldTarget.classList.add("sp-input--error")
    return false
  }

  resolveUsername() {
    const fromCover = this.coverUsernameValue.trim()
    if (fromCover && fromCover !== PLACEHOLDER_NAME) return fromCover
    if (this.hasUsernameFieldTarget) return this.usernameFieldTarget.value.trim()
    if (this.hasUsernameTarget) return this.usernameTarget.value.trim()
    return ""
  }

  paintCover(username, { force = false } = {}) {
    const name = String(username || "").trim()
    if (!name || name === PLACEHOLDER_NAME) return

    const cover = this.coverEditor()
    if (!cover?.hasUserNameTarget) return

    const current = cover.userNameTarget.textContent.trim()
    if (!force && current && current !== PLACEHOLDER_NAME) return

    cover.userNameTarget.textContent = name
    cover.updateTitle()
  }

  // Met à jour l'image de partage après l'envoi du lien, sans changer de page.
  async syncCoverImage() {
    const cover = this.coverEditor()
    if (!this.coverUploadUrlValue || !cover?.hasCoverTarget || !cover.hasCoverImageFileTarget) return

    try {
      if (this.coverUsernameValue) this.paintCover(this.coverUsernameValue, { force: true })
      cover.saveSVG()
      if (cover.hasPatternSettingsTarget) cover.savePatternSettings()
      if (!cover.coverTarget.value) return

      await cover.attachSocialCoverRaster()
      const file = cover.coverImageFileTarget.files?.[0]
      if (!file) return

      const body = new FormData()
      body.append("cover_image", file)
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
      await fetch(this.coverUploadUrlValue, {
        method: "POST",
        body,
        credentials: "same-origin",
        headers: {
          "X-CSRF-Token": token,
          Accept: "application/json"
        }
      })
    } catch (error) {
      console.warn("Couverture réseau non générée", error)
    }
  }

  async attachCoverFile() {
    const cover = this.coverEditor()
    if (!cover?.hasCoverTarget || !cover.hasCoverImageFileTarget || !this.hasCoverImageTarget) return

    try {
      cover.saveSVG()
      if (cover.hasPatternSettingsTarget) cover.savePatternSettings()
      if (!cover.coverTarget.value) return

      await cover.attachSocialCoverRaster()
      const file = cover.coverImageFileTarget.files?.[0]
      if (!file) return

      const transfer = new DataTransfer()
      transfer.items.add(file)
      this.coverImageTarget.files = transfer.files
    } catch (error) {
      console.warn("Couverture réseau non générée", error)
    }
  }

  coverEditor() {
    return this.application.getControllerForElementAndIdentifier(this.element, "cover-editor")
  }
}

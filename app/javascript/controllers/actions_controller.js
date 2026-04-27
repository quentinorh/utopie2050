import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

export default class extends Controller {
  static targets = [ "settingsPanel",
                     "actionsPanel",
                     "sharePanel",
                     "addBookmarkPanel",
                     "editPanel",
                     "deletePanel",
                     "reportPanel",
                     "reportConfirmationPanel",
                     "textSize",
                     "lineHeight",
                     "font",
                     "theme" ]

  connect() {
    this.loadSettings()
    this._onPointerDownOutside = this._handlePointerDownOutside.bind(this)
    document.addEventListener("pointerdown", this._onPointerDownOutside)
  }

  disconnect() {
    document.removeEventListener("pointerdown", this._onPointerDownOutside)
  }

  // ─── Panel animation helpers ───

  _showPanel(panel) {
    panel.classList.remove('!hidden')
    gsap.to(panel, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" })
  }

  _hidePanel(panel) {
    if (panel.classList.contains('!hidden')) return
    gsap.to(panel, {
      opacity: 0, y: 8, duration: 0.15, ease: "power2.in",
      onComplete: () => panel.classList.add('!hidden')
    })
  }

  /** Ferme menu actions + paramètres au clic extérieur (sans toucher aux autres overlays). */
  _handlePointerDownOutside(event) {
    if (!this.hasActionsPanelTarget || !this.hasSettingsPanelTarget) return

    const actionsOpen = !this.actionsPanelTarget.classList.contains('!hidden')
    const settingsOpen = !this.settingsPanelTarget.classList.contains('!hidden')
    if (!actionsOpen && !settingsOpen) return

    const t = event.target
    if (this.actionsPanelTarget.contains(t) || this.settingsPanelTarget.contains(t)) return

    // Même barre que les toggles : on ignore pour laisser click->toggle gérer ouvrir/fermer
    if (t.closest('button[data-action*="toggleActions"]') ||
        t.closest('button[data-action*="toggleSettings"]')) return

    this._hidePanel(this.actionsPanelTarget)
    this._hidePanel(this.settingsPanelTarget)
  }

  _togglePanel(panel) {
    if (panel.classList.contains('!hidden')) {
      this._showPanel(panel)
    } else {
      this._hidePanel(panel)
    }
  }

  _hideAll(except) {
    const panels = [
      this.actionsPanelTarget,
      this.settingsPanelTarget,
      this.sharePanelTarget,
      this.addBookmarkPanelTarget,
      this.editPanelTarget,
      this.deletePanelTarget,
      this.reportPanelTarget,
      this.reportConfirmationPanelTarget
    ]
    panels.forEach(p => {
      if (p !== except && !p.classList.contains('!hidden')) {
        this._hidePanel(p)
      }
    })
  }

  // ─── Toggles ───

  toggleSettings() {
    this._hideAll(this.settingsPanelTarget)
    this._togglePanel(this.settingsPanelTarget)
  }

  toggleActions() {
    this._hideAll(this.actionsPanelTarget)
    this._togglePanel(this.actionsPanelTarget)
  }

  toggleShare() {
    this._hideAll(this.sharePanelTarget)
    this._togglePanel(this.sharePanelTarget)
  }

  toggleAddBookmark() {
    const panel = this.addBookmarkPanelTarget
    this._showPanel(panel)
    setTimeout(() => this._hidePanel(panel), 1500)
  }

  toggleEdit() {
    this._hideAll(this.editPanelTarget)
    this._togglePanel(this.editPanelTarget)
  }

  toggleDelete() {
    this._hideAll(this.deletePanelTarget)
    this._togglePanel(this.deletePanelTarget)
  }

  toggleReport() {
    this._hideAll(this.reportPanelTarget)
    this._togglePanel(this.reportPanelTarget)
  }

  toggleReportConfirmation() {
    this._hidePanel(this.reportPanelTarget)
    this._showPanel(this.reportConfirmationPanelTarget)
    setTimeout(() => this._hidePanel(this.reportConfirmationPanelTarget), 3000)
  }

  closeActions() {
    this._hidePanel(this.actionsPanelTarget)
  }

  // ─── Reading settings ───

  changeTextSize(event) {
    const size = event.currentTarget.dataset.value
    this.setActiveButton('textSize', size)
    this.applyStyleToAdjustable('fontSize', this.getFontSize(size))
    this.saveSetting('text-size', size)
    this.dispatchReadingTypographyChanged()
  }

  changeLineHeight(event) {
    const height = event.currentTarget.dataset.value
    this.setActiveButton('lineHeight', height)
    this.applyStyleToAdjustable('lineHeight', this.getLineHeight(height))
    this.saveSetting('line-height', height)
    this.dispatchReadingTypographyChanged()
  }

  changeFont(event) {
    const font = event.currentTarget.dataset.value
    this.setActiveButton('font', font)
    this.applyStyleToAdjustable('fontFamily', font === 'sans' ? 'Apfel' : 'Lexend')
    this.saveSetting('font-family', font)
    this.dispatchReadingTypographyChanged()
  }

  changePostTheme(event) {
    const theme = event.currentTarget.dataset.value
    this.setActiveButton('theme', theme)
    document.body.classList.toggle('dark', theme === 'dark')
    document.querySelectorAll('.show-content').forEach(el => {
      el.classList.toggle('dark', theme === 'dark')
    })
    this.saveSetting('post-theme', theme)
  }

  setActiveButton(group, value) {
    const buttons = this[group + "Targets"]
    if (!buttons) return

    buttons.forEach(button => {
      button.classList.remove('border-gray-950/10', 'dark:border-white/10', 'bg-gray-950/5', 'dark:bg-white/5')
      button.classList.add('border-transparent')
    })

    const activeButton = buttons.find(button => button.dataset.value === value)
    if (activeButton) {
      activeButton.classList.remove('border-transparent')
      activeButton.classList.add('border-gray-950/10', 'dark:border-white/10', 'bg-gray-950/5', 'dark:bg-white/5')
    }
  }

  applyStyleToAdjustable(property, value) {
    document.querySelectorAll('.adjustable').forEach(el => {
      el.style[property] = value
    })
  }

  dispatchReadingTypographyChanged() {
    document.dispatchEvent(new CustomEvent("reading:typography-changed", { bubbles: true }))
  }

  getFontSize(size) {
    return { small: '14px', medium: '16px', large: '18px', xlarge: '20px' }[size]
  }

  getLineHeight(height) {
    return { small: '1.2', medium: '1.5', large: '1.8', xlarge: '2.0' }[height]
  }

  saveSetting(key, value) {
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1)
    document.cookie = `${key}=${value};expires=${expires.toUTCString()};path=/;SameSite=None; Secure`
  }

  loadSettings() {
    const textSize = this.getCookie('text-size') || 'medium'
    const lineHeight = this.getCookie('line-height') || 'medium'
    const font = this.getCookie('font-family') || 'sans'
    const theme = this.getCookie('post-theme') || 'light'

    this.setActiveButton('textSize', textSize)
    this.setActiveButton('lineHeight', lineHeight)
    this.setActiveButton('font', font)
    this.setActiveButton('theme', theme)

    this.applyStyleToAdjustable('fontSize', this.getFontSize(textSize))
    this.applyStyleToAdjustable('lineHeight', this.getLineHeight(lineHeight))
    this.applyStyleToAdjustable('fontFamily', font === 'sans' ? 'Apfel' : 'Lexend')

    document.body.classList.toggle('dark', theme === 'dark')
    document.querySelectorAll('.show-content').forEach(el => {
      el.classList.toggle('dark', theme === 'dark')
    })
  }

  getCookie(name) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
  }

  copyUrl(event) {
    const url = window.location.href.replace('http://', 'https://')
    const button = event.currentTarget
    navigator.clipboard.writeText(url).then(() => {
      const originalHTML = button.innerHTML
      button.innerHTML = '<svg class="size-4 stroke-green-500 shrink-0" viewBox="0 0 16 16" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8 6.5 11.5 13 4.5"/></svg>'
      setTimeout(() => { button.innerHTML = originalHTML }, 2000)
    })
  }

  handleReportSubmit(event) {
    if (event.detail.success) {
      event.target.reset()
      this._hidePanel(this.reportPanelTarget)
      this._showPanel(this.reportConfirmationPanelTarget)
      setTimeout(() => this._hidePanel(this.reportConfirmationPanelTarget), 3000)
    }
  }
}

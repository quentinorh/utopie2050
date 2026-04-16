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
    // Suppress the select-pulse during the initial sync to persisted
    // cookies — only changes the user actively makes should pop.
    this._suppressPulse = true
    this.loadSettings()
    this._suppressPulse = false
  }

  // ─── Panel animation helpers ───

  // Springy reveal: scale + translate Y come in on a slight overshoot
  // (Osmo "spring" curve), opacity uses the brand sharp-out so the
  // panel reads as "snapping into focus". Children stagger in just
  // behind the container so the panel feels assembled rather than
  // pasted in.
  _showPanel(panel) {
    if (this._reducedMotion()) return this._showPanelReduced(panel)
    panel.classList.remove('!hidden')
    gsap.killTweensOf(panel)

    gsap.fromTo(panel,
      { opacity: 0, y: 12, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.42,
        ease: "back.out(1.5)", overwrite: "auto" }
    )

    const items = this._panelItems(panel)
    if (items.length) {
      gsap.killTweensOf(items)
      gsap.fromTo(items,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.32, ease: "power3.out",
          stagger: 0.035, delay: 0.06, overwrite: "auto",
          clearProps: "transform" }
      )
    }
  }

  _hidePanel(panel) {
    if (this._reducedMotion()) return this._hidePanelReduced(panel)
    gsap.killTweensOf(panel)
    const items = this._panelItems(panel)
    if (items.length) gsap.killTweensOf(items)
    gsap.to(panel, {
      opacity: 0, y: 12, scale: 0.96,
      duration: 0.22, ease: "power2.in", overwrite: "auto",
      onComplete: () => panel.classList.add('!hidden')
    })
  }

  _showPanelReduced(panel) {
    panel.classList.remove('!hidden')
    panel.style.opacity = '1'
    panel.style.transform = 'none'
  }

  _hidePanelReduced(panel) {
    panel.style.opacity = '0'
    panel.classList.add('!hidden')
  }

  _reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  // Direct children of the panel's first inner card — these are the
  // "rows" we stagger. Falling back to direct children of the panel
  // covers toast-style panels with no inner wrapper.
  _panelItems(panel) {
    const card = panel.querySelector(":scope > div")
    if (!card) return []
    const rows = card.querySelectorAll(":scope > *")
    return rows.length > 1 ? Array.from(rows) : []
  }

  _togglePanel(panel) {
    if (panel.classList.contains('!hidden')) {
      this._showPanel(panel)
    } else {
      this._hidePanel(panel)
    }
  }

  // Tiny pop on a setting-button to confirm the user's selection.
  // Uses `is-select-pulsing` (no opacity change) so the button never
  // flashes invisible — important since these buttons stay visible
  // throughout the interaction.
  _pulse(el) {
    if (!el || this._reducedMotion()) return
    el.classList.remove("is-select-pulsing")
    // eslint-disable-next-line no-unused-expressions
    void el.offsetWidth
    el.classList.add("is-select-pulsing")
    setTimeout(() => el.classList.remove("is-select-pulsing"), 400)
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
  }

  changeLineHeight(event) {
    const height = event.currentTarget.dataset.value
    this.setActiveButton('lineHeight', height)
    this.applyStyleToAdjustable('lineHeight', this.getLineHeight(height))
    this.saveSetting('line-height', height)
  }

  changeFont(event) {
    const font = event.currentTarget.dataset.value
    this.setActiveButton('font', font)
    this.applyStyleToAdjustable('fontFamily', font === 'sans' ? 'Apfel' : 'Lexend')
    this.saveSetting('font-family', font)
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

    const previouslyActive = buttons.find(b =>
      b.classList.contains('bg-gray-950/5') || b.classList.contains('dark:bg-white/5')
    )

    buttons.forEach(button => {
      button.classList.remove('border-gray-950/10', 'dark:border-white/10', 'bg-gray-950/5', 'dark:bg-white/5')
      button.classList.add('border-transparent')
    })

    const activeButton = buttons.find(button => button.dataset.value === value)
    if (activeButton) {
      activeButton.classList.remove('border-transparent')
      activeButton.classList.add('border-gray-950/10', 'dark:border-white/10', 'bg-gray-950/5', 'dark:bg-white/5')

      // Pop only on a real change — no phantom pulse during initial
      // load when we sync the UI to persisted cookies.
      if (!this._suppressPulse && previouslyActive !== activeButton) {
        this._pulse(activeButton)
      }
    }
  }

  applyStyleToAdjustable(property, value) {
    document.querySelectorAll('.adjustable').forEach(el => {
      el.style[property] = value
    })
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

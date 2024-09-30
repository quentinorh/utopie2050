import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "panel", "textSize", "lineHeight", "font", "theme" ]

  toggle() {
    this.panelTarget.classList.toggle('hidden')
    console.log("Hello Settings")
  }

  connect() {
    // Charger les paramètres depuis le cookie ou les valeurs par défaut
    this.loadSettings()
  }

  changeTextSize(event) {
    const size = event.currentTarget.dataset.value
    this.setActiveButton('textSize', size)
    document.documentElement.style.fontSize = this.getFontSize(size)
    this.saveSetting('text-size', size)
  }

  changeLineHeight(event) {
    const height = event.currentTarget.dataset.value
    this.setActiveButton('lineHeight', height)
    document.documentElement.style.lineHeight = this.getLineHeight(height)
    this.saveSetting('line-height', height)
  }

  changeFont(event) {
    const font = event.currentTarget.dataset.value
    this.setActiveButton('font', font)
    document.documentElement.style.fontFamily = font === 'sans' ? 'Apfel' : 'Opendylexic'
    this.saveSetting('font-family', font)
  }

  changeTheme(event) {
    const theme = event.currentTarget.dataset.value
    this.setActiveButton('theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    this.saveSetting('theme', theme)
  }

  setActiveButton(group, value) {
    const buttons = this[group + "Targets"]
    if (!buttons) return // Vérifie que le groupe de boutons existe

    // Reset the border of all buttons in the group
    buttons.forEach(button => button.classList.remove('border-primary'))
    buttons.forEach(button => button.classList.add('border-transparent'))

    // Trouver le bouton actif
    const activeButton = buttons.find(button => button.dataset.value === value)
    if (activeButton) {
      activeButton.classList.add('border-primary')
      activeButton.classList.remove('border-transparent')
    }
  }

  getFontSize(size) {
    return {
      small: '14px',
      medium: '16px',
      large: '18px',
      xlarge: '20px'
    }[size]
  }

  getLineHeight(height) {
    return {
      small: '1.2',
      medium: '1.5',
      large: '1.8',
      xlarge: '2.0'
    }[height]
  }

  saveSetting(key, value) {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1); // Expiration dans un an

    document.cookie = `${key}=${value};expires=${expires.toUTCString()};path=/;SameSite=None; Secure`;
  }

  loadSettings() {
    // Charger les paramètres depuis les cookies et appliquer les styles
    const textSize = this.getCookie('text-size') || 'medium'
    const lineHeight = this.getCookie('line-height') || 'medium'
    const font = this.getCookie('font-family') || 'sans'
    const theme = this.getCookie('theme') || 'light'

    this.setActiveButton('textSize', textSize)
    this.setActiveButton('lineHeight', lineHeight)
    this.setActiveButton('font', font)
    this.setActiveButton('theme', theme)

    document.documentElement.style.fontSize = this.getFontSize(textSize)
    document.documentElement.style.lineHeight = this.getLineHeight(lineHeight)
    document.documentElement.style.fontFamily = font === 'sans' ? 'Apfel' : 'Opendylexic'
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }

  getCookie(name) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
  }
}
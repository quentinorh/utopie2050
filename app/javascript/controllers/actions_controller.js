import { Controller } from "@hotwired/stimulus"

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

  toggleSettings() {
    if (window.innerWidth < 1024) {
      this.actionsPanelTarget.classList.remove('active')
    }
    this.settingsPanelTarget.classList.toggle('active')
  }

  toggleShare(){
    this.sharePanelTarget.classList.toggle('active')
  }

  toggleAddBookmark() {
    console.log("toggleAddBookmark")
    this.addBookmarkPanelTarget.classList.toggle('active')
    setTimeout(() => {
      this.addBookmarkPanelTarget.classList.remove('active')
    }, 1500)
  }

  toggleEdit() {
    this.editPanelTarget.classList.toggle('active')
  }

  toggleDelete() {
    this.deletePanelTarget.classList.toggle('active')
  }

  toggleReport() {
    this.reportPanelTarget.classList.toggle('active')
  }

  toggleReportConfirmation() {
    this.reportPanelTarget.classList.remove('active')
    this.reportConfirmationPanelTarget.classList.toggle('active')
    setTimeout(() => {
      this.reportConfirmationPanelTarget.classList.remove('active')
    }, 1500)
  }

  toggleActions() {
    this.actionsPanelTarget.classList.toggle('active')
    this.sharePanelTarget.classList.remove('active')
    this.addBookmarkPanelTarget.classList.remove('active')
    this.editPanelTarget.classList.remove('active')
    this.deletePanelTarget.classList.remove('active')
    this.reportPanelTarget.classList.remove('active')
    this.reportConfirmationPanelTarget.classList.remove('active')
  }

  connect() {
    this.loadSettings()
    console.log("Hello Settings")



    this.settingsPanelTarget.classList.toggle('hidden')
    this.actionsPanelTarget.classList.toggle('hidden')
    this.sharePanelTarget.classList.toggle('hidden')
    this.addBookmarkPanelTarget.classList.toggle('hidden')
    this.editPanelTarget.classList.toggle('hidden')
    this.deletePanelTarget.classList.toggle('hidden')
    this.reportPanelTarget.classList.toggle('hidden')
    this.reportConfirmationPanelTarget.classList.toggle('hidden')

    console.log("reportConfirmationPanel:", this.reportConfirmationPanelTarget)
  }

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
    this.applyStyleToAdjustable('fontFamily', font === 'sans' ? 'Apfel' : 'Opendylexic')
    this.saveSetting('font-family', font)
  }

  changePostTheme(event) {
    const theme = event.currentTarget.dataset.value
    this.setActiveButton('theme', theme)
    
    // Modifier le body et les éléments .show-content
    document.body.classList.toggle('dark', theme === 'dark')
    document.querySelectorAll('.show-content').forEach(el => {
      el.classList.toggle('dark', theme === 'dark')
    })
    this.saveSetting('post-theme', theme)
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

  applyStyleToAdjustable(property, value) {
    document.querySelectorAll('.adjustable').forEach(el => {
      el.style[property] = value
    })
  }

  getFontSize(size) {
    return {
      small: '12px',
      medium: '14px',
      large: '16px',
      xlarge: '18px'
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
    const theme = this.getCookie('post-theme') || 'light'

    this.setActiveButton('textSize', textSize)
    this.setActiveButton('lineHeight', lineHeight)
    this.setActiveButton('font', font)
    this.setActiveButton('theme', theme)

    this.applyStyleToAdjustable('fontSize', this.getFontSize(textSize))
    this.applyStyleToAdjustable('lineHeight', this.getLineHeight(lineHeight))
    this.applyStyleToAdjustable('fontFamily', font === 'sans' ? 'Apfel' : 'Opendylexic')
    
    // Appliquer le thème au body et aux éléments .show-content
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

  closeActions() {
    this.actionsPanelTarget.classList.remove('active')
  }

  copyUrl(event) {
    const url = window.location.href.replace('http://', 'https://');
    const button = event.currentTarget;
    
    navigator.clipboard.writeText(url).then(() => {
      const originalIcon = button.innerHTML;
      button.innerHTML = '<i class="fa-solid fa-check"></i>';
      
      setTimeout(() => {
        button.innerHTML = originalIcon;
      }, 2000);
    });
  }

  handleReportSubmit(event) {
    if (event.detail.success) {
      // Réinitialise le formulaire
      event.target.reset()
      
      // Ferme le panneau de rapport et affiche la confirmation
      this.reportPanelTarget.classList.remove('active')
      this.reportConfirmationPanelTarget.classList.add('active')
      
      // Ferme automatiquement après 3 secondes
      setTimeout(() => {
        this.reportConfirmationPanelTarget.classList.remove('active')
      }, 3000)
    }
  }
}

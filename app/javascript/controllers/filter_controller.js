import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "icon", "button"]
  static classes = ["visible", "hidden"]

  connect() {
    if (window.innerWidth < 1024) {
      this.panelTarget.classList.add(this.hiddenClass)
    }

    // Écouter les événements de focus/blur des champs de saisie
    this.panelTarget.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('focus', () => this.handleInputFocus())
      input.addEventListener('blur', () => this.handleInputBlur())
    })

    // Ajouter un écouteur pour les changements de taille de la fenêtre
    window.visualViewport.addEventListener('resize', this.handleViewportResize.bind(this))
  }

  handleViewportResize = () => {
    if (this.isKeyboardVisible()) {
      const keyboardHeight = window.innerHeight - window.visualViewport.height
      const offset = Math.min(keyboardHeight + 50, 185) // 50px de marge minimum
      this.panelTarget.style.maxHeight = `${window.visualViewport.height * 0.5}px`
      this.buttonTarget.style.transform = `translateY(-${offset}px)`
    }
  }

  isKeyboardVisible() {
    return window.innerHeight - window.visualViewport.height > 100 // Seuil arbitraire
  }

  handleInputFocus() {
    // Attendre que le clavier soit complètement visible
    setTimeout(() => this.handleViewportResize(), 100)
  }

  handleInputBlur() {
    this.panelTarget.style.maxHeight = '80dvh'
    if (!this.panelTarget.classList.contains(this.hiddenClass)) {
      this.buttonTarget.style.transform = "translateY(-185px)"
    }
  }

  toggle() {
    const isHidden = this.panelTarget.classList.contains(this.hiddenClass)
    
    if (isHidden) {
      this.panelTarget.classList.remove(this.hiddenClass)
      this.panelTarget.classList.add(this.visibleClass)
      this.iconTarget.style.transform = "rotate(180deg)"
      this.buttonTarget.style.transform = "translateY(calc(-185px)"
    } else {
      this.panelTarget.classList.remove(this.visibleClass)
      this.panelTarget.classList.add(this.hiddenClass)
      this.iconTarget.style.transform = "rotate(0deg)"
      this.buttonTarget.style.transform = "translateY(0)"
    }
  }
} 
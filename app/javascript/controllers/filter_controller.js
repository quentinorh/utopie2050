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
  }

  handleInputFocus() {
    // Réduire la hauteur du panneau quand le clavier est visible
    this.panelTarget.style.maxHeight = '50dvh'
    // Ajuster la position du bouton
    this.buttonTarget.style.transform = "translateY(calc(-50dvh - 1rem))"
  }

  handleInputBlur() {
    // Restaurer la hauteur normale
    this.panelTarget.style.maxHeight = '80dvh'
    // Restaurer la position du bouton si le panneau est ouvert
    if (!this.panelTarget.classList.contains(this.hiddenClass)) {
      this.buttonTarget.style.transform = "translateY(calc(-80dvh - 1rem))"
    }
  }

  toggle() {
    const isHidden = this.panelTarget.classList.contains(this.hiddenClass)
    
    if (isHidden) {
      this.panelTarget.classList.remove(this.hiddenClass)
      this.panelTarget.classList.add(this.visibleClass)
      this.iconTarget.style.transform = "rotate(180deg)"
      this.buttonTarget.style.transform = "translateY(calc(-80dvh - 1rem))"
    } else {
      this.panelTarget.classList.remove(this.visibleClass)
      this.panelTarget.classList.add(this.hiddenClass)
      this.iconTarget.style.transform = "rotate(0deg)"
      this.buttonTarget.style.transform = "translateY(0)"
    }
  }
} 
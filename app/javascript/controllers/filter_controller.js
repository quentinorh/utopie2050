import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "icon", "button"]
  static classes = ["visible", "hidden"]

  connect() {
    if (window.innerWidth < 1024) {
      this.panelTarget.classList.add(this.hiddenClass)
    }

    window.visualViewport?.addEventListener('resize', this.handleViewportChange.bind(this))
  }

  disconnect() {
    window.visualViewport?.removeEventListener('resize', this.handleViewportChange.bind(this))
  }

  handleViewportChange() {
    if (!this.panelTarget.classList.contains(this.hiddenClass)) {
      const keyboardHeight = window.innerHeight - window.visualViewport.height
      const baseTransform = -185
      const offset = keyboardHeight > 0 ? keyboardHeight : 0
      this.buttonTarget.style.transform = `translateY(${baseTransform - offset}px)`
    }
  }

  toggle() {
    const isHidden = this.panelTarget.classList.contains(this.hiddenClass)
    
    if (isHidden) {
      this.panelTarget.classList.remove(this.hiddenClass)
      this.panelTarget.classList.add(this.visibleClass)
      this.iconTarget.style.transform = "rotate(180deg)"
      
      const visualViewport = window.visualViewport
      const keyboardHeight = window.innerHeight - visualViewport.height
      const baseTransform = -185
      const offset = keyboardHeight > 0 ? keyboardHeight : 0
      
      this.buttonTarget.style.transform = `translateY(${baseTransform - offset}px)`
    } else {
      this.panelTarget.classList.remove(this.visibleClass)
      this.panelTarget.classList.add(this.hiddenClass)
      this.iconTarget.style.transform = "rotate(0deg)"
      this.buttonTarget.style.transform = "translateY(0)"
    }
  }
} 
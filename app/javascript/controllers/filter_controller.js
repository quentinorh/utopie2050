import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "icon", "button"]
  static classes = ["visible", "hidden"]

  connect() {
    if (window.innerWidth < 1024) {
      this.panelTarget.classList.add(this.hiddenClass)
    }
  }

  toggle() {
    const isHidden = this.panelTarget.classList.contains(this.hiddenClass)
    
    if (isHidden) {
      this.panelTarget.classList.remove(this.hiddenClass)
      this.panelTarget.classList.add(this.visibleClass)
      this.iconTarget.style.transform = "rotate(180deg)"
      this.buttonTarget.style.transform = "translateY(calc(-100% - 136px))"
    } else {
      this.panelTarget.classList.remove(this.visibleClass)
      this.panelTarget.classList.add(this.hiddenClass)
      this.iconTarget.style.transform = "rotate(0deg)"
      this.buttonTarget.style.transform = "translateY(0)"
    }
  }
} 
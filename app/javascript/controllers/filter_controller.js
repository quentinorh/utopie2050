import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "icon", "button", "filterPath", "closePath"]
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
      this.filterPathTarget.classList.add('hidden')
      this.closePathTarget.classList.remove('hidden')
      const panelHeight = this.panelTarget.offsetHeight
      this.buttonTarget.style.transform = `translateY(${panelHeight}px)`
    } else {
      this.panelTarget.classList.remove(this.visibleClass)
      this.panelTarget.classList.add(this.hiddenClass)
      this.filterPathTarget.classList.remove('hidden')
      this.closePathTarget.classList.add('hidden')
      this.buttonTarget.style.transform = "translateY(0)"
    }
  }
} 
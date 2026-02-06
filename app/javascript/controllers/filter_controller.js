import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "icon", "button", "filterPath", "closePath"]

  toggle() {
    this.panelTarget.classList.toggle('translate-x-full')
    this.syncIcon()
  }

  // Appelé automatiquement quand un nouveau filterPath target se connecte au DOM
  // (par ex. après un remplacement Turbo Stream)
  filterPathTargetConnected() {
    this.syncIcon()
  }

  syncIcon() {
    const isOpen = !this.panelTarget.classList.contains('translate-x-full')
    this.filterPathTargets.forEach(el => el.classList.toggle('hidden', isOpen))
    this.closePathTargets.forEach(el => el.classList.toggle('hidden', !isOpen))
  }
} 
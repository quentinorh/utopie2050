import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["colorSlider", "colorInput"]

  connect() {
    this.initializeColor()
  }

  initializeColor() {
    const hue = this.colorSliderTarget.value
    const color = `hsl(${hue}, 100%, 50%)`
    this.colorSliderTarget.style.setProperty('--slider-thumb-color', color)
    this.colorInputTarget.value = color
  }

  updateColor(event) {
    const hue = event.target.value
    const color = `hsl(${hue}, 100%, 50%)`
    this.colorSliderTarget.style.setProperty('--slider-thumb-color', color)
    this.colorInputTarget.value = color
  }
}

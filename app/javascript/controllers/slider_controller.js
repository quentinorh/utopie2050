import { Controller } from "@hotwired/stimulus"
import noUiSlider from "nouislider"

export default class extends Controller {
  connect() {
    const slider = this.element
    const maxValue = parseInt(this.element.dataset.sliderMaxValue) || 30
    const minValue = parseInt(this.element.dataset.sliderMinValue) || 0

    noUiSlider.create(slider, {
      start: [
        parseInt(document.querySelector('[name="by_reading_time_range[min]"]').value) || minValue,
        parseInt(document.querySelector('[name="by_reading_time_range[max]"]').value) || maxValue
      ],
      connect: true,
      range: {
        'min': minValue,
        'max': maxValue
      },
      tooltips: false,
      step: 1,
      padding: 0
    })

    slider.noUiSlider.on('update', (values) => {
      document.getElementById('min-time-value').textContent = Math.round(values[0])
      document.getElementById('max-time-value').textContent = Math.round(values[1])
      document.querySelector('[name="by_reading_time_range[min]"]').value = Math.round(values[0])
      document.querySelector('[name="by_reading_time_range[max]"]').value = Math.round(values[1])
    })

    slider.noUiSlider.on('change', () => {
      document.querySelector('[name="by_reading_time_range[min]"]').dispatchEvent(new Event('change'))
    })
  }

  disconnect() {
    if (this.element.noUiSlider) {
      this.element.noUiSlider.destroy()
    }
  }
} 
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["cover", "title", "image", "author"]

  connect() {
    this.updateTitle()
    this.updateColor()
  }

  updateTitle(event) {
    const titleInput = this.element.querySelector('input[name="post[title]"]')
    this.titleTarget.textContent = titleInput.value || "Titre du texte"
  }

  updateColor(event) {
    const colorInput = this.element.querySelector('#colorInput')
    this.coverTarget.style.color = this.getContrastColor(colorInput.value)
    this.titleTarget.style.backgroundColor = colorInput.value
    this.authorTarget.style.backgroundColor = colorInput.value
  }

  updateImage(event) {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        this.imageTarget.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`
      }
      reader.readAsDataURL(file)
    }
  }

  getContrastColor(hslColor) {
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (match) {
      const l = parseInt(match[3])
      return l > 50 ? 'black' : 'white'
    }
    return 'black'
  }
}
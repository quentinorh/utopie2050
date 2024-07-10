import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["query", "results", "hidden"]

  connect() {
    console.log("Unsplash controller connected")
    this.search = this.search.bind(this)
    this.handleImageClick = this.handleImageClick.bind(this)
  }

  search(event) {
    event.preventDefault()
    console.log("Search triggered")
    const query = this.queryTarget.value
    fetch(`/posts/search_unsplash?query=${query}`, {
      headers: {
        "Accept": "application/javascript",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content
      }
    })
      .then(response => response.text())
      .then(html => {
        this.resultsTarget.innerHTML = html
        this.attachImageClickEvents()
      })
  }

  attachImageClickEvents() {
    console.log("Attaching image click events")
    const images = this.resultsTarget.querySelectorAll("img")
    images.forEach((img, index) => {
      console.log(`Attaching click event to image ${index}`)
      img.addEventListener("click", this.handleImageClick)
    })
  }

  handleImageClick(event) {
    console.log("Image clicked")
    const img = event.currentTarget
    console.log("Image URL:", img.dataset.url)
    this.hiddenTarget.value = img.dataset.url
    console.log("Hidden field value set to:", this.hiddenTarget.value)
    const images = this.resultsTarget.querySelectorAll("img")
    images.forEach(i => i.classList.remove("selected"))
    img.classList.add("selected")
    console.log("Selected class added to clicked image")
  }
}

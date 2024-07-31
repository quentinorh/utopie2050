import { Controller } from "@hotwired/stimulus"

export default class extends Controller {

  static targets = ['postsGalleryImage']

  postsGallery(event) {
    const imagePath = event.currentTarget.dataset.imagePath;
    this.postsGalleryImageTarget.src = imagePath;
  }
}

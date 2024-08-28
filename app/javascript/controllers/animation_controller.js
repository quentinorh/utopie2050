import { Controller } from "@hotwired/stimulus";
import gsap from 'gsap';
import Splitting from "splitting";

export default class extends Controller {
  static targets = ['postsGalleryImage', 'postsGalleryWrapper', 'revealText'];

  connect() {
    Splitting({ target: this.revealTextTarget, by: 'lines' });
  }

  postsGallery(event) {
    const imagePath = event.currentTarget.dataset.imagePath;
    const postColor = event.currentTarget.dataset.postColor;

    this.postsGalleryWrapperTarget.style.backgroundColor = postColor;
    const originalImage = this.postsGalleryImageTarget;

    // Create a new image element
    const newImage = originalImage.cloneNode();
    newImage.src = imagePath;
    newImage.classList.add('tw-gallery-image');
    
    // Set initial position
    newImage.style.top = '100%'; // Initially place it out of the screen (100% y translation)
    newImage.style.transition = 'top 1s ease-out'; // Set transition for the top property

    // Append the new image to the gallery container
    this.postsGalleryWrapperTarget.appendChild(newImage);

    // Trigger the animation by changing the top property
    requestAnimationFrame(() => {
      newImage.style.top = '0';
    });

    // Remove the old image when the animation ends
    newImage.addEventListener('transitionend', () => {
      // Remove the old image
      this.postsGalleryImageTarget.src = newImage.src;
      this.postsGalleryWrapperTarget.removeChild(newImage);
    });
  }

  revealText(event) {
    const text = event.currentTarget;
    gsap.to(text, { opacity: 1, duration: 1, ease: "power2.out" });
  }
}

import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["svg"];

  connect() {
    this.updateSvgClass();
    window.addEventListener('resize', this.updateSvgClass.bind(this));
  }

  updateSvgClass() {
    const width = this.element.offsetWidth;
    const height = this.element.offsetHeight;

    // Supprimer les anciennes classes
    this.svgTarget.classList.forEach(className => {
      if (className.startsWith('w-[') || className.startsWith('h-[')) {
        this.svgTarget.classList.remove(className);
      }
    });

    // Ajouter les nouvelles classes
    const widthClass = `w-[${width}px]`;
    const heightClass = `h-[${height}px]`;

    this.svgTarget.classList.add(widthClass);
    this.svgTarget.classList.add(heightClass);
  }
}

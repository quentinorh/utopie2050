import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["svg"];

  connect() {
    this.updateSvgClass();
    window.addEventListener('resize', this.updateSvgClass.bind(this));
  }

  updateSvgClass() {
    // Supprimer les anciennes classes de dimension (px ou arbitraires)
    this.svgTarget.classList.forEach(className => {
      if (className.startsWith('w-[') || className.startsWith('h-[') || className === 'w-full' || className === 'h-full') {
        this.svgTarget.classList.remove(className);
      }
    });

    // Utiliser 100% pour remplir exactement le conteneur (pas de rognage dû au arrondi en px)
    this.svgTarget.classList.add('w-full', 'h-full');
  }
}

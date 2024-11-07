import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["element"];

  connect() {
    this.resizeObserver = new ResizeObserver(this.updateMargins.bind(this));
    this.resizeObserver.observe(document.body);
    this.updateMargins();
    this.previousWidth = window.innerWidth;
  }

  disconnect() {
    this.resizeObserver.disconnect();
  }

  updateMargins() {
    const element = this.elementTarget;
    const width = window.innerWidth;
    const lgBreakpoint = 1024; // Taille de la largeur pour le breakpoint 'lg'
    let targetMarginValue;

    // Vérifiez si le passage du breakpoint a eu lieu
    if (this.previousWidth >= lgBreakpoint && width < lgBreakpoint) {
      element.classList.add('transition-margin');
      if (width < lgBreakpoint) {
        targetMarginValue = (window.innerWidth - (window.innerHeight - 120) * (250 / 350)) / 2;
      }
    }

    if (this.previousWidth < lgBreakpoint && width >= lgBreakpoint) {
      element.classList.add('transition-margin');
      if (width > lgBreakpoint) {
        targetMarginValue = 0;
      }
    }

    if (width < lgBreakpoint) {
        targetMarginValue = (window.innerWidth - (window.innerHeight - 120) * (250 / 350)) / 2;
    } else {
        targetMarginValue = 0;
    }

    element.style.marginLeft = `${targetMarginValue}px`;

    // Mettez à jour la largeur précédente
    this.previousWidth = width;

    // Retirez la classe de transition après l'animation
    setTimeout(() => {
      element.classList.remove('transition-margin');
    }, 500); // Assurez-vous que ce délai correspond à la durée de la transition CSS
  }
} 
import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

export default class extends Controller {
  static targets = ["title", "userName"]

  connect() {
    // Sélectionner la classe parente
    const parent = this.element.querySelector('.cover-svg');

    // Définir l'opacité initiale
    gsap.set(parent, { opacity: 1 });
    gsap.set(this.titleTarget, { opacity: 1 });
    gsap.set(this.userNameTarget, { opacity: 1 });

    // Créer une timeline pour synchroniser les animations
    const tl = gsap.timeline();

    // Animer le SVG en glissant de gauche à droite
    tl.fromTo(parent, {
      x: '-100%' 
    }, {
      x: '0%', 
      duration: 1,
      ease: "power4.out"
    }, 0); 

    // Animer le titre et l'auteur en glissant de gauche à droite
    tl.fromTo(this.titleTarget, {
      x: '-100%' 
    }, {
      x: '0%', 
      duration: 1,
      ease: "power4.out"
    }, 0); 

    tl.fromTo(this.userNameTarget, {
      x: '-100%' 
    }, {
      x: '0%', 
      duration: 1,
      ease: "power4.out"
    }, 0); 
  }
}

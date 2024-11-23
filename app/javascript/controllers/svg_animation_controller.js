import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

export default class extends Controller {
  static targets = ["title", "userName"]

  connect() {
    console.log("SVG Animation Controller connected");
    // Sélectionner la classe parente
    const parent = this.element.querySelector('.cover-svg');

    // Sélectionner tous les éléments enfants sauf le premier <rect>
    const shapes = Array.from(parent.querySelectorAll('svg > *:not(:first-child)'));

    // Sélectionner le premier élément
    const firstElement = parent.querySelector('svg > *:first-child');

    // Regrouper les éléments par leur position `x`
    const columns = {};
    shapes.forEach(shape => {
      const x = Math.round(shape.getBoundingClientRect().x); // Utiliser Math.round pour éviter les problèmes de précision
      if (!columns[x]) {
        columns[x] = [];
      }
      columns[x].push(shape);
    });

    // Définir l'opacité initiale
    gsap.set(shapes, { opacity: 0 });
    gsap.set(firstElement, { opacity: 0 });
    gsap.set(this.titleTarget, { opacity: 1 });
    gsap.set(this.userNameTarget, { opacity: 1 });

    // Créer une timeline pour synchroniser les animations
    const tl = gsap.timeline();

    // Animer la classe parente pour la rendre visible
    tl.to(parent, {
      opacity: 1,
      duration: 0.1 // Réduire la durée pour accélérer l'apparition
    });

    // Calculer la durée totale de l'animation
    const columnKeys = Object.keys(columns).sort((a, b) => a - b);
    const maxDuration = 2; // Durée maximale pour la dernière colonne

    // Animer toutes les colonnes en même temps avec des durées variables
    columnKeys.forEach((x, index) => {
      const duration = maxDuration * (index + 1) / columnKeys.length;
      tl.to(columns[x], {
        opacity: 1,
        duration: duration, // Durée variable pour chaque colonne
        ease: "power4.inOut"
      }, 0); // Toutes les animations commencent en même temps
    });

    // Animer le premier élément en même temps que la dernière colonne
    tl.to(firstElement, {
      opacity: 1,
      duration: maxDuration, // Utiliser la même durée que les colonnes pour une apparition progressive
      ease: "power4.inOut"
    }, 0); // Commence en même temps que les colonnes

    // Animer le titre et l'auteur en glissant de gauche à droite
    tl.fromTo(this.titleTarget, {
      x: '-100%' // Position initiale en dehors de l'écran
    }, {
      x: '0%', // Position finale
      duration: 2,
      ease: "power4.out"
    }, 0); // Délai après la fin de l'animation du SVG

    tl.fromTo(this.userNameTarget, {
      x: '-100%' // Position initiale en dehors de l'écran
    }, {
      x: '0%', // Position finale
      duration: 2,
      ease: "power4.out"
    }, 0); // Commence en même temps que le titre
  }
}

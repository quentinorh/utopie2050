import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

export default class extends Controller {
  static targets = ["title", "userName"]

  connect() {
    // Sélectionner la classe parente
    const cover = this.element.querySelector('.cover');

    // Sélectionner le svg
    const shapes = this.element.querySelector('.svg-container');

    // Créer une timeline pour synchroniser les animations
    const tl = gsap.timeline();

    // Définir l'opacité initiale
    this.titleTarget.classList.remove('hidden')
    this.userNameTarget.classList.remove('hidden')

    gsap.set(shapes, { 
      opacity: 0,
      zIndex: 1 
    });
    gsap.set(cover, { opacity: 1 });




    // Animer la couverture pour la rendre visible
    tl.to(shapes, {
      opacity: 1,
      duration: 2,
      ease: "power4.inOut",
    }, 0);

    // Animer le titre et l'auteur en glissant de gauche à droite
    tl.to(this.titleTarget, {
      x: '0%', // Position finale
      duration: 2,
      ease: "power4.out"
    }, 0);
    tl.to(this.userNameTarget, {
      x: '0%', // Position finale
      duration: 2,
      ease: "power4.out"
    }, 0); 

    // Sélectionner tous les paths du SVG
    const paths = this.element.querySelectorAll('.svg-container path');
    
    // Pour chaque path, créer une animation
    paths.forEach(path => {
      const currentD = path.getAttribute('d');
      const cParams = this.extractCParams(currentD);
      
      // Animer chaque paramètre C
      cParams.forEach((param, index) => {
        gsap.to(path, {
          attr: {
            d: this.updateCParam(currentD, index, param - ((Math.random() * 0.02 - 0.01)))
          },
          duration: 3,
          ease: "sine.inOut",
        });
      });
    });

    // Limiter le nombre de frames par seconde
    gsap.ticker.fps(20);
  }

  // Fonction helper pour extraire les paramètres C
  extractCParams(d) {
    // Nettoyer la chaîne en supprimant les retours à la ligne et les espaces multiples
    const cleanD = d.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Trouver toutes les commandes C
    const cCommands = cleanD.match(/C\s*([-\d.]+)[\s,]*([-\d.]+)[\s,]*([-\d.]+)[\s,]*([-\d.]+)[\s,]*([-\d.]+)[\s,]*([-\d.]+)/);
    if (!cCommands) return [];
    
    // Extraire les paramètres de la commande C
    return [
      parseFloat(cCommands[1]),
      parseFloat(cCommands[2]),
      parseFloat(cCommands[3]),
      parseFloat(cCommands[4]),
      parseFloat(cCommands[5]),
      parseFloat(cCommands[6])
    ];
  }

  // Fonction helper pour mettre à jour un paramètre C spécifique
  updateCParam(d, index, newValue) {
    // Nettoyer la chaîne en gardant le format original
    const lines = d.split('\n').map(line => line.trim());
    const cLineIndex = lines.findIndex(line => line.startsWith('C'));
    if (cLineIndex === -1) return d;

    const params = lines[cLineIndex].split(/\s+/);
    
    // Assurez-vous que l'index est correct et que nous ne dépassons pas le nombre de paramètres
    if (index < params.length - 1) {
      params[index + 1] = newValue.toFixed(2);
    }
    
    // Reconstruire la ligne C
    lines[cLineIndex] = params.join(' ');
    
    return lines.join('\n      ');
  }
}

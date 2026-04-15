import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

export default class extends Controller {
  static targets = ["title", "userName"]

  connect() {
    const cover = this.element.querySelector('.cover');
    const shapes = this.element.querySelector('.svg-container');
    const svg = shapes?.querySelector('svg') || shapes?.firstElementChild;

    const tl = gsap.timeline();
    gsap.set(cover, { opacity: 1 });

    // Fond = premier rect (pleine taille), motifs = paths + autres rect/ellipse/polygon
    const bgRect = svg?.querySelector('rect');
    const allRects = svg ? Array.from(svg.querySelectorAll('rect')) : [];
    const firstRect = allRects[0];
    const motifRects = allRects.slice(1);
    const motifPaths = svg ? Array.from(svg.querySelectorAll('path')) : [];
    const motifOthers = svg ? Array.from(svg.querySelectorAll('ellipse, polygon')) : [];
    const motifElements = [].concat(motifPaths, motifRects, motifOthers);

    if (firstRect) {
      gsap.set(firstRect, { opacity: 0 });
      motifElements.forEach(el => gsap.set(el, { opacity: 0 }));

      // Fond + titre + auteur en même temps (1,5 s)
      tl.to(firstRect, {
        opacity: 1,
        duration: 1.5,
        ease: "power2.out"
      }, 0);
      tl.to(this.titleTarget, {
        opacity: 1,
        duration: 1.5,
        ease: "power2.out"
      }, 0);
      tl.to(this.userNameTarget, {
        opacity: 1,
        duration: 1.5,
        ease: "power2.out"
      }, 0);
      // Motifs : apparition en fondu doux à 0,9 s
      if (motifElements.length > 0) {
        tl.to(motifElements, {
          opacity: 1,
          duration: 1.2,
          ease: "sine.inOut"
        }, 0.9);
      }
    } else {
      // Fallback : tout le SVG comme avant
      gsap.set(shapes, { opacity: 0, zIndex: 1 });
      tl.to(shapes, { opacity: 1, duration: 1.5, ease: "power4.inOut" }, 0);
      tl.to(this.titleTarget, { opacity: 1, duration: 1.5, ease: "power2.out" }, 0);
      tl.to(this.userNameTarget, { opacity: 1, duration: 1.5, ease: "power2.out" }, 0);
    }

    // Animation des formes (paths) : démarre plus tôt (0,5 s)
    const paths = this.element.querySelectorAll('.svg-container path');
    const pathDelay = firstRect ? 0.5 : 0;

    paths.forEach(path => {
      const currentD = path.getAttribute('d');
      const cParams = this.extractCParams(currentD);

      cParams.forEach((param, index) => {
        gsap.to(path, {
          attr: {
            d: this.updateCParam(currentD, index, param - ((Math.random() * 0.02 - 0.01)))
          },
          duration: 3,
          delay: pathDelay,
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

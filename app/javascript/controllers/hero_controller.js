import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"

export default class extends Controller {
  static targets = ["path", "curveGroup", "svg"]
  static values = { uniqueId: String }

  connect() {
    // Nettoyer toutes les animations GSAP existantes pour éviter les conflits
    gsap.killTweensOf(this.element);
    
    // Réinitialiser les valeurs de l'élément immédiatement pour éviter le flash
    gsap.set(this.element, {
      scale: 1.25,
      opacity: 0
    });
    
    // Attendre que le layout soit stabilisé avant de démarrer les animations
    // Cela évite les problèmes de décalage lors de la navigation Turbo
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Utiliser les dimensions réelles du SVG plutôt que du conteneur
        // Le SVG doit avoir les mêmes dimensions que son conteneur parent
        const svgElement = this.svgTarget;
        const svgRect = svgElement.getBoundingClientRect();
        const containerRect = this.element.getBoundingClientRect();
        
        // Utiliser les dimensions du conteneur, ou du SVG si disponibles
        this.totalWidth = containerRect.width || svgRect.width || window.innerWidth;
        this.totalHeight = containerRect.height || svgRect.height || (window.visualViewport?.height - 50 || window.innerHeight - 50);
        
        // S'assurer que le SVG prend toute la hauteur disponible
        if (svgElement.style.height !== '100%') {
          svgElement.style.width = '100%';
          svgElement.style.height = '100%';
        }
        
        this.generateParameters();
        this.updateColors()
        this.updateCurve()
        this.updateViewBox()
        
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', this.updateViewBox.bind(this));
        } else {
          window.addEventListener('resize', this.updateViewBox.bind(this));
        }

        // Attendre encore un frame pour s'assurer que le SVG est complètement rendu
        requestAnimationFrame(() => {
          // Initial scale animation
          gsap.to(this.element, {
            scale: 1,
            opacity: 1,
            delay: 0.4,
            duration: 1.6,
            ease: "power4.out"
          });

          // Commencer l'animation
          this.animationFrameId = null;
          this.animateParameters();
        });
      });
    });
  }

  disconnect() {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.updateViewBox.bind(this));
    } else {
      window.removeEventListener('resize', this.updateViewBox.bind(this));
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
  
  updateViewBox() {
    const svgElement = this.svgTarget;
    // Utiliser les dimensions réelles du conteneur et du SVG
    const containerRect = this.element.getBoundingClientRect();
    const svgRect = svgElement.getBoundingClientRect();
    
    // Prioriser les dimensions du conteneur, puis du SVG
    const totalWidth = containerRect.width || svgRect.width || window.innerWidth;
    const totalHeight = containerRect.height || svgRect.height || (window.visualViewport?.height - 50 || window.innerHeight - 50);
    
    // Mettre à jour les dimensions internes si elles ont changé
    this.totalWidth = totalWidth;
    this.totalHeight = totalHeight;
    
    svgElement.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
    this.updateCurve()
  }

  generateParameters() {
    this.modes = ['x4', 'x8', 'x16'];
    this.randomMode = this.modes[Math.floor(Math.random() * this.modes.length)];
    // this.mode = this.randomMode;
    this.mode = 'x16';
    // this.rows = parseInt(Math.floor(Math.random() * 3) + 2);
    // this.columns = parseInt(Math.floor(Math.random() * 3) + 2);
    this.rows = 1;
    this.columns = 1;
    this.x = 0.7;
    //this.y = 1 -this.x;
    this.y = 0.5;
    this.x3 = 0.9;
    //this.y3 = 1 - this.x3;
    this.y3 = 0.9;
    this.smoothing = 0.95;
    // Teinte fixe pour éviter la variation des couleurs
    this.hue = 243; // Violet souhaité (#4f46e5)
    //this.hue = parseInt(Math.floor(Math.random() * 360));
    
    // Initialiser les directions de changement
    this.xDirection = Math.random() < 0.5 ? 1 : -1;
    //this.yDirection = - this.xDirection;
    this.yDirection = Math.random() < 0.5 ? 1 : -1;
    this.x3Direction = Math.random() < 0.5 ? 1 : -1;
    //this.y3Direction = - this.x3Direction;
    this.y3Direction = Math.random() < 0.5 ? 1 : -1;
    this.smoothingDirection = Math.random() < 0.5 ? 1 : -1;
  }

  updateCurve() {
    // Utiliser les dimensions stockées ou les recalculer depuis le conteneur
    const rect = this.element.getBoundingClientRect();
    const totalWidth = this.totalWidth || rect.width || window.innerWidth;
    const totalHeight = this.totalHeight || rect.height || (window.visualViewport?.height - 50 || window.innerHeight - 50);

    const mode = this.mode;
    const rows = this.rows;
    const columns = this.columns;
    const x = this.x;
    const y = this.y;
    const x3 = this.x3;
    const y3 = this.y3;
    const smoothing = this.smoothing;

    const width = totalWidth / columns;
    const height = totalHeight / rows;
    const startPoint = [0, height];

    // Vérifier que les valeurs sont valides
    if (isNaN(width) || isNaN(height) || isNaN(x) || isNaN(y) || isNaN(x3) || isNaN(y3) || isNaN(smoothing)) {
        console.error("Invalid parameters for path construction");
        return;
    }

    // Ajuster les points de contrôle pour le lissage
    const control1 = [width * x * smoothing, height * smoothing];
    const control2 = [width * smoothing, height * (1 - y * smoothing)];
    const control3 = [width * x3 * smoothing, height * (1 - y3 * smoothing)];

    // Création du chemin de base
    const basePath = `
      M ${startPoint[0]},${startPoint[1]}
      C ${control1[0]},${control1[1]}
      ${control3[0]},${control3[1]}
      ${control2[0]},${control2[1]}
    `;

    let transforms = []

    switch(mode) {
      case 'x4':
        transforms = [
          'scale(1,1) translate(-125,-175)',
          'scale(-1,1) translate(-125,-175)',
          'scale(1,-1) translate(-125,-175)',
          'scale(-1,-1) translate(-125,-175)'
        ]
        
        break
      case 'x8':
        transforms = [
          'scale(1,1) translate(-125,-175)',
          'scale(-1,1) translate(-125,-175)',
          'scale(1,-1) translate(-125,-175)',
          'scale(-1,-1) translate(-125,-175)',
          'rotate(90) scale(1,1) translate(-125,-175)',
          'rotate(90) scale(-1,1) translate(-125,-175)',
          'rotate(90) scale(1,-1) translate(-125,-175)',
          'rotate(90) scale(-1,-1) translate(-125,-175)'
        ]
        
        break
      case 'x16':
        const translateX = -totalWidth * 0.5;
        const translateY = -totalHeight * 0.5;
        transforms = [
          `scale(1,1) translate(${translateX},${translateY})`,
          `scale(-1,1) translate(${translateX},${translateY})`,
          `scale(1,-1) translate(${translateX},${translateY})`,
          `scale(-1,-1) translate(${translateX},${translateY})`,
          `rotate(90) scale(1,1) translate(${translateX},${translateY})`,
          `rotate(90) scale(-1,1) translate(${translateX},${translateY})`,
          `rotate(90) scale(1,-1) translate(${translateX},${translateY})`,
          `rotate(90) scale(-1,-1) translate(${translateX},${translateY})`,
          // `rotate(45) scale(1,1) translate(${translateX},${translateY})`,
          // `rotate(45) scale(-1,1) translate(${translateX},${translateY})`,
          // `rotate(45) scale(1,-1) translate(${translateX},${translateY})`,
          // `rotate(45) scale(-1,-1) translate(${translateX},${translateY})`,
          // `rotate(135) scale(1,1) translate(${translateX},${translateY})`,
          // `rotate(135) scale(-1,1) translate(${translateX},${translateY})`,
          // `rotate(135) scale(1,-1) translate(${translateX},${translateY})`,
          // `rotate(135) scale(-1,-1) translate(${translateX},${translateY})`
        ]
        
        break
      default:
        transforms = ['scale(1,1) translate(-200,-300)']
    }

    // Suppression des anciens chemins
    this.curveGroupTarget.innerHTML = ''

    // Calculer l'espacement
    const spacingX = totalWidth / columns
    const spacingY = totalHeight / rows

    // Calculer le décalage pour centrer la grille
    const offsetX = ((totalWidth - (spacingX * columns)) / 2)-1
    const offsetY = ((totalHeight - (spacingY * rows)) / 2)-1

    const hue = this.hue;
    const backgroundColor = `hsl(${hue}, 50%, 13%)`;

    // Ajouter un rectangle de fond
    const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    backgroundRect.setAttribute('width', totalWidth);
    backgroundRect.setAttribute('height', totalHeight);
    backgroundRect.setAttribute('fill', backgroundColor);
    this.curveGroupTarget.appendChild(backgroundRect);

    // Créer une grille de motifs
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        transforms.forEach((baseTransform, index) => {
          const newPath = document.createElementNS("http://www.w3.org/2000/svg", "path")
          newPath.setAttribute('d', basePath)
          
          // Combiner la translation de la grille avec la transformation du motif
          const gridTransform = `translate(${offsetX + spacingX * col + width / 2}, ${offsetY + spacingY * row + height / 2})`
          newPath.setAttribute('transform', `${gridTransform} ${baseTransform}`)
          
          // Alterner les gradients
          const gradientIndex = (Math.floor(index / 4) % 3) + 1
          newPath.setAttribute('fill', `url(#gradient${gradientIndex}-${this.uniqueIdValue})`)
          newPath.setAttribute('stroke', 'none')
          
          this.curveGroupTarget.appendChild(newPath)
        })
      }
    }
  }

  updateColors() {
    // Utiliser uniquement des variations de violet (#4f46e5) - T: 243°, S: 69%, L: 90%
    const baseHsl = { h: this.hue, s: 69, l: 90 };
    // Variations très proches de la teinte de base : même teinte, variations de luminosité uniquement
    const variation1Hsl = { ...baseHsl };
    const variation2Hsl = { ...baseHsl };
    const variation3Hsl = { ...baseHsl };

    // Créer des variations avec contraste de luminosité en gardant la saturation à 69% (violet souhaité)
    const lightVariation1Hsl = { h: variation1Hsl.h, s: 69, l: 95 }; // Très clair
    const darkVariation1Hsl = { h: variation1Hsl.h, s: 69, l: 50 };  // Foncé
    const lightVariation2Hsl = { h: variation2Hsl.h, s: 69, l: 90 };
    const darkVariation2Hsl = { h: variation2Hsl.h, s: 69, l: 45 };
    const lightVariation3Hsl = { h: variation3Hsl.h, s: 69, l: 92 };
    const darkVariation3Hsl = { h: variation3Hsl.h, s: 69, l: 55 };

    // Utilisez l'ID unique pour créer des identifiants de dégradé
    const uniqueId = this.uniqueIdValue;

    // Gradients avec contraste de luminosité pour plus de visibilité
    this.updateGradient(`gradient1-${uniqueId}`, this.hslToHex(lightVariation1Hsl), this.hslToHex(darkVariation1Hsl));
    this.updateGradient(`gradient2-${uniqueId}`, this.hslToHex(lightVariation2Hsl), this.hslToHex(darkVariation2Hsl));
    this.updateGradient(`gradient3-${uniqueId}`, this.hslToHex(lightVariation3Hsl), this.hslToHex(darkVariation3Hsl));
  }

  updateGradient(id, color1, color2) {
    const gradient = document.getElementById(id);
    
    gradient.querySelector('stop:first-child').style.stopColor = color1;
    gradient.querySelector('stop:first-child').style.stopOpacity = '1';
    gradient.querySelector('stop:last-child').style.stopColor = color2;
    gradient.querySelector('stop:last-child').style.stopOpacity = '1';
  }

  hexToHSL(hex) {
    let r = parseInt(hex.slice(1,3), 16) / 255
    let g = parseInt(hex.slice(3,5), 16) / 255
    let b = parseInt(hex.slice(5,7), 16) / 255
    
    let max = Math.max(r, g, b)
    let min = Math.min(r, g, b)
    let h, s, l = (max + min) / 2
    
    if (max === min) {
      h = s = 0
    } else {
      let d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      
      switch(max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }

  hslToHex({h, s, l}) {
    l /= 100
    const a = s * Math.min(l, 1 - l) / 100
    const f = n => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  animateParameters() {
    const speed = 0.0007; // Ajustez cette valeur pour changer la vitesse de l'animation

    // Mettre à jour les paramètres progressivement
    // gsap.to(this, {
    //   x: `+=${this.xDirection * speed}`,
    //   y: `+=${this.yDirection * speed}`,
    //   x3: `+=${this.x3Direction * speed}`,
    //   y3: `+=${this.y3Direction * speed}`,
    //   duration: 0.0016, // Roughly one frame at 60fps
    //   ease: "expo.out"
    // });

    this.x += this.xDirection * speed;
    this.y += this.yDirection * speed;
    this.x3 += this.x3Direction * speed;
    this.y3 += this.y3Direction * speed;

    // this.smoothing += this.smoothingDirection * speed;
    // Teinte fixe - ne plus faire varier les couleurs
    // this.hue = (this.hue + 1) % 360; // Incrémenter la teinte pour un changement continu

    // Inverser la direction si les limites sont atteintes
    if (this.x <= 0.5 || this.x >= 1) this.xDirection *= -1;
    if (this.y <= 0.3 || this.y >= 0.8) this.yDirection *= -1;
    if (this.x3 <= 0.2 || this.x3 >=0.6) this.x3Direction *= -1;
    if (this.y3 <= 0.7 || this.y3 >=1) this.y3Direction *= -1;
    if (this.smoothing <= 0.9 || this.smoothing >= 1) this.smoothingDirection *= -1;

    // console.log(this.x, this.y, this.x3, this.y3)
    // console.log(this.smoothing)
    
    // Mettre à jour le motif
    this.updateCurve();

    // Demander la prochaine frame
    this.animationFrameId = requestAnimationFrame(this.animateParameters.bind(this));
    this.updateColors()
  }
} 
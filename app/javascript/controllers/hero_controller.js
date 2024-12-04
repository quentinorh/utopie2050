import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"

export default class extends Controller {
  static targets = ["path", "curveGroup", "svg"]
  static values = { uniqueId: String }

  connect() {
    this.totalWidth = window.innerWidth;
    this.totalHeight = window.visualViewport?.height - 60 || window.innerHeight - 60;
    // Initial scale animation
    gsap.from(this.element, {
      scale: 1.15,
      duration: 1,
      ease: "quad4.out"
    });
    this.generateParameters();

    this.updateColors()
    this.updateCurve()
    this.updateViewBox()
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.updateViewBox.bind(this));
    } else {
      window.addEventListener('resize', this.updateViewBox.bind(this));
    }

    // Commencer l'animation
    this.animationFrameId = null;
    this.animateParameters();
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
    const totalWidth = window.innerWidth;
    const totalHeight = window.visualViewport?.height - 60|| window.innerHeight - 60;
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
    this.x = Math.random();
    //this.y = 1 -this.x;
    this.y = Math.random();
    this.x3 = Math.random();
    //this.y3 = 1 - this.x3;
    this.y3 = Math.random();
    this.smoothing = (Math.floor(Math.random() * 10) + 90) / 100;
    this.hue = parseInt(Math.floor(Math.random() * 360));

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
    const totalWidth = window.innerWidth;
    const totalHeight = window.visualViewport?.height - 60|| window.innerHeight - 60;

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
    
    
    const baseHsl = { h: this.hue, s: 100, l: 65 };
    const compHsl = { ...baseHsl, h: (baseHsl.h + 180) % 360 };
    const triad1Hsl = { ...baseHsl, h: (baseHsl.h + 60) % 360 };
    const triad2Hsl = { ...baseHsl, h: (baseHsl.h + 180) % 360 };
    const triad3Hsl = { ...baseHsl, h: (baseHsl.h + 300) % 360 };

    // Utilisez l'ID unique pour créer des identifiants de dégradé
    const uniqueId = this.uniqueIdValue;

    this.updateGradient(`gradient1-${uniqueId}`, this.hslToHex(baseHsl), this.hslToHex(triad1Hsl));
    this.updateGradient(`gradient2-${uniqueId}`, this.hslToHex(baseHsl), this.hslToHex(triad2Hsl));
    this.updateGradient(`gradient3-${uniqueId}`, this.hslToHex(baseHsl), this.hslToHex(triad3Hsl));
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
    const speed = 0.001; // Ajustez cette valeur pour changer la vitesse de l'animation

    // Mettre à jour les paramètres progressivement
    gsap.to(this, {
      x: `+=${this.xDirection * speed}`,
      y: `+=${this.yDirection * speed}`,
      x3: `+=${this.x3Direction * speed}`,
      y3: `+=${this.y3Direction * speed}`,
      duration: 0.016, // Roughly one frame at 60fps
      ease: "expo.out"
    });
    this.smoothing += this.smoothingDirection * speed;
    this.hue = (this.hue + 1) % 360; // Incrémenter la teinte pour un changement continu

    // Inverser la direction si les limites sont atteintes
    if (this.x <= 0.1 || this.x >= 1) this.xDirection *= -1;
    if (this.y <= 0.1 || this.y >= 1) this.yDirection *= -1;
    if (this.x3 <= 0.1 || this.x3 >=1) this.x3Direction *= -1;
    if (this.y3 <= 0.1 || this.y3 >=1) this.y3Direction *= -1;
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
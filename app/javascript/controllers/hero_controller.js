import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"

// cubic-bezier(0.625, 0.05, 0, 1)
function coverEase(t) {
  const x1 = 0.625, y1 = 0.05, x2 = 0, y2 = 1
  let guess = t
  for (let i = 0; i < 8; i++) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    const currentX = ((ax * guess + bx) * guess + cx) * guess
    const currentSlope = (3 * ax * guess + 2 * bx) * guess + cx
    if (currentSlope === 0) break
    guess -= (currentX - t) / currentSlope
  }
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  return ((ay * guess + by) * guess + cy) * guess
}

export default class extends Controller {
  static targets = ["path", "curveGroup", "svg"]
  static values = { uniqueId: String }

  connect() {
    gsap.killTweensOf(this.element);

    gsap.set(this.element, {
      scale: 1.25,
      opacity: 0
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const svgElement = this.svgTarget;
        const svgRect = svgElement.getBoundingClientRect();
        const containerRect = this.element.getBoundingClientRect();

        this.totalWidth = containerRect.width || svgRect.width || window.innerWidth;
        this.totalHeight = containerRect.height || svgRect.height || (window.visualViewport?.height - 50 || window.innerHeight - 50);

        if (svgElement.style.height !== '100%') {
          svgElement.style.width = '100%';
          svgElement.style.height = '100%';
        }

        this.generateParameters();
        this.updateColors()
        this.updateCurve()
        this.updateViewBox()

        if (window.visualViewport) {
          this._resizeHandler = () => this.updateViewBox();
          window.visualViewport.addEventListener('resize', this._resizeHandler);
        } else {
          this._resizeHandler = () => this.updateViewBox();
          window.addEventListener('resize', this._resizeHandler);
        }

        requestAnimationFrame(() => {
          gsap.to(this.element, {
            scale: 1,
            opacity: 1,
            delay: 0.2,
            duration: 0.8,
            ease: coverEase
          });

          this.animationFrameId = null;
          this.animateParameters();
        });
      });
    });
  }

  disconnect() {
    if (this._resizeHandler) {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', this._resizeHandler);
      } else {
        window.removeEventListener('resize', this._resizeHandler);
      }
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  updateViewBox() {
    const svgElement = this.svgTarget;
    const containerRect = this.element.getBoundingClientRect();
    const svgRect = svgElement.getBoundingClientRect();

    const totalWidth = containerRect.width || svgRect.width || window.innerWidth;
    const totalHeight = containerRect.height || svgRect.height || (window.visualViewport?.height - 50 || window.innerHeight - 50);

    this.totalWidth = totalWidth;
    this.totalHeight = totalHeight;

    svgElement.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
    this.updateCurve()
  }

  generateParameters() {
    this.modes = ['x4', 'x8', 'x16'];
    this.randomMode = this.modes[Math.floor(Math.random() * this.modes.length)];
    this.mode = 'x16';
    this.rows = 1;
    this.columns = 1;
    this.x = 0.7;
    this.y = 0.5;
    this.x3 = 0.9;
    this.y3 = 0.9;
    this.smoothing = 0.95;
    this.hue = 243;

    this.xDirection = Math.random() < 0.5 ? 1 : -1;
    this.yDirection = Math.random() < 0.5 ? 1 : -1;
    this.x3Direction = Math.random() < 0.5 ? 1 : -1;
    this.y3Direction = Math.random() < 0.5 ? 1 : -1;
    this.smoothingDirection = Math.random() < 0.5 ? 1 : -1;
  }

  updateCurve() {
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

    if (isNaN(width) || isNaN(height) || isNaN(x) || isNaN(y) || isNaN(x3) || isNaN(y3) || isNaN(smoothing)) {
        console.error("Invalid parameters for path construction");
        return;
    }

    const control1 = [width * x * smoothing, height * smoothing];
    const control2 = [width * smoothing, height * (1 - y * smoothing)];
    const control3 = [width * x3 * smoothing, height * (1 - y3 * smoothing)];

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
          `rotate(90) scale(-1,-1) translate(${translateX},${translateY})`
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

          const gridTransform = `translate(${offsetX + spacingX * col + width / 2}, ${offsetY + spacingY * row + height / 2})`
          newPath.setAttribute('transform', `${gridTransform} ${baseTransform}`)

          const gradientIndex = (Math.floor(index / 4) % 3) + 1
          newPath.setAttribute('fill', `url(#gradient${gradientIndex}-${this.uniqueIdValue})`)
          newPath.setAttribute('stroke', 'none')

          this.curveGroupTarget.appendChild(newPath)
        })
      }
    }
  }

  updateColors() {
    const baseHsl = { h: this.hue, s: 69, l: 90 };
    const lightVariation1Hsl = { h: baseHsl.h, s: 69, l: 95 };
    const darkVariation1Hsl = { h: baseHsl.h, s: 69, l: 50 };
    const lightVariation2Hsl = { h: baseHsl.h, s: 69, l: 90 };
    const darkVariation2Hsl = { h: baseHsl.h, s: 69, l: 45 };
    const lightVariation3Hsl = { h: baseHsl.h, s: 69, l: 92 };
    const darkVariation3Hsl = { h: baseHsl.h, s: 69, l: 55 };

    const uniqueId = this.uniqueIdValue;

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
    const speed = 0.0007;

    this.x += this.xDirection * speed;
    this.y += this.yDirection * speed;
    this.x3 += this.x3Direction * speed;
    this.y3 += this.y3Direction * speed;

    if (this.x <= 0.5 || this.x >= 1) this.xDirection *= -1;
    if (this.y <= 0.3 || this.y >= 0.8) this.yDirection *= -1;
    if (this.x3 <= 0.2 || this.x3 >=0.6) this.x3Direction *= -1;
    if (this.y3 <= 0.7 || this.y3 >=1) this.y3Direction *= -1;
    if (this.smoothing <= 0.9 || this.smoothing >= 1) this.smoothingDirection *= -1;

    this.updateCurve();

    this.animationFrameId = requestAnimationFrame(this.animateParameters.bind(this));
    this.updateColors()
  }
}

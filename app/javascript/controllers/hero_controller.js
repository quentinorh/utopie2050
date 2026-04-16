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
  static targets = ["path", "curveGroup", "svg", "revealGrad"]
  static values = { uniqueId: String }

  connect() {
    gsap.killTweensOf(this.element);

    // The pattern is now revealed via an SVG dissolve mask (see the
    // <radialGradient data-hero-target="revealGrad"> in the partial),
    // not via a CSS scale + opacity tween — so the host stays at its
    // natural size and the noise-edged disc grows out from centre.
    gsap.set(this.element, {
      scale: 1,
      opacity: 1,
      clearProps: "transform"
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
          this._animateReveal()

          this.animationFrameId = null;
          this.animateParameters();
        });
      });
    });
  }

  // Drive the dissolve mask: grow the radial gradient's `r` from 0 to
  // a value that overshoots the corners (≈1.4 in objectBoundingBox
  // units). The gradient's edge is displaced by feTurbulence so the
  // reveal reads as a noisy organic dissolve from the centre outward.
  _animateReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (this.hasRevealGradTarget) {
        this.revealGradTarget.setAttribute("r", "1.4")
      }
      return
    }
    if (!this.hasRevealGradTarget) return

    // Animate via a proxy so we can write the SVG attribute each frame
    // without depending on the GSAP attr plugin being available.
    const proxy = { r: 0 }
    gsap.to(proxy, {
      r: 1.4,
      duration: 1.8,
      delay: 0.15,
      ease: coverEase,
      onUpdate: () => {
        this.revealGradTarget.setAttribute("r", proxy.r.toFixed(4))
      }
    })
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

    // Perlin noise drives every animated parameter — purely forward in
    // time, no direction-flipping, no perceptible loop. Each parameter
    // gets its own gradient table + time offset so they evolve
    // independently and never resync into a recognisable pattern.
    const buildGradients = () => {
      const g = new Array(256)
      for (let i = 0; i < 256; i++) g[i] = Math.random() * 2 - 1
      return g
    }
    this._noise = {
      x: buildGradients(),
      y: buildGradients(),
      x3: buildGradients(),
      y3: buildGradients(),
      smoothing: buildGradients()
    }
    // Random per-mount phase offsets — different visitors / reloads
    // see different starting curves.
    this._noiseOffsets = {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      x3: Math.random() * 1000,
      y3: Math.random() * 1000,
      smoothing: Math.random() * 1000
    }
    // Each parameter has its own drift speed (cycles per second of
    // clock time fed into Perlin space). Picking incommensurable
    // values keeps the field feeling alive.
    this._noiseSpeeds = {
      x: 0.060,
      y: 0.048,
      x3: 0.072,
      y3: 0.040,
      smoothing: 0.025
    }
    this._noiseStart = performance.now()
  }

  // Classic 1-D Perlin gradient noise. Returns roughly [-0.5, 0.5];
  // the result is smoothly interpolated and never repeats within the
  // 256-element period for our drift speeds (period ≈ thousands of
  // seconds at this rate).
  _perlin1D(t, gradients) {
    const xi = Math.floor(t) & 255
    const xf = t - Math.floor(t)
    const fade = u => u * u * u * (u * (u * 6 - 15) + 10)
    const u = fade(xf)
    const g0 = gradients[xi]
    const g1 = gradients[(xi + 1) & 255]
    const n0 = g0 * xf
    const n1 = g1 * (xf - 1)
    return n0 + u * (n1 - n0)
  }

  // Map raw noise (~[-0.5, 0.5]) into a target [min, max] range.
  _noiseTo(min, max, raw) {
    const center = (min + max) / 2
    const half = (max - min) / 2
    // Clamp lightly so the rare out-of-range Perlin spike doesn't
    // overshoot our intended bounds.
    return center + half * Math.max(-1, Math.min(1, raw * 2))
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
    // Time strictly moves forward — Perlin produces an organic,
    // non-repeating drift, so we never need to flip a direction.
    const t = (performance.now() - this._noiseStart) / 1000

    this.x        = this._noiseTo(0.50, 1.00, this._perlin1D(this._noiseOffsets.x        + t * this._noiseSpeeds.x,        this._noise.x))
    this.y        = this._noiseTo(0.30, 0.80, this._perlin1D(this._noiseOffsets.y        + t * this._noiseSpeeds.y,        this._noise.y))
    this.x3       = this._noiseTo(0.20, 0.60, this._perlin1D(this._noiseOffsets.x3       + t * this._noiseSpeeds.x3,       this._noise.x3))
    this.y3       = this._noiseTo(0.70, 1.00, this._perlin1D(this._noiseOffsets.y3       + t * this._noiseSpeeds.y3,       this._noise.y3))
    this.smoothing = this._noiseTo(0.90, 1.00, this._perlin1D(this._noiseOffsets.smoothing + t * this._noiseSpeeds.smoothing, this._noise.smoothing))

    this.updateCurve();

    this.animationFrameId = requestAnimationFrame(this.animateParameters.bind(this));
    this.updateColors()
  }
}

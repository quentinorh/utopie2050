import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["path", "sliderX", "sliderY", "sliderX3", "sliderY3", 
                   "control1", "control2", "control3", "symmetryMode", "curveGroup", "colorPicker", 
                   "rows", "columns", "smoothing"]

  connect() {
    this.updateColors()
    this.updateCurve()
  }

  updateCurve() {
    // Récupérer le nombre de lignes et colonnes
    const rows = parseInt(this.rowsTarget.value)
    const columns = parseInt(this.columnsTarget.value)

    // Calculer la taille de chaque motif en fonction du nombre de lignes et colonnes
    const totalWidth = 400  // largeur totale du SVG
    const totalHeight = 600 // hauteur totale du SVG
    const width = totalWidth / columns
    const height = totalHeight / rows

    const startPoint = [0, height]
    const endPoint = [width, 0]

    const x = this.sliderXTarget.value / 100
    const y = this.sliderYTarget.value / 100
    const x3 = this.sliderX3Target.value / 100
    const y3 = this.sliderY3Target.value / 100

    // Récupérer la valeur de lissage
    const smoothing = this.smoothingTarget.value / 100

    // Ajuster les points de contrôle pour le lissage
    const control1 = [width * x * smoothing, height * smoothing]
    const control2 = [width * smoothing, height * (1 - y * smoothing)]
    const control3 = [width * x3 * smoothing, height * (1 - y3 * smoothing)]

    // Création du chemin de base
    const basePath = `
      M ${startPoint[0]},${startPoint[1]}
      C ${control1[0]},${control1[1]}
      ${control3[0]},${control3[1]}
      ${control2[0]},${control2[1]}
      ${endPoint[0]},${endPoint[1]}
    `

    // Application des symétries selon le mode sélectionné
    const mode = this.symmetryModeTarget.value
    let transforms = []

    switch(mode) {
      case 'x4':
        transforms = [
          'scale(1,1) translate(-150,-150)',
          'scale(-1,1) translate(-150,-150)',
          'scale(1,-1) translate(-150,-150)',
          'scale(-1,-1) translate(-150,-150)'
        ]
        this.updateColors()
        break
      case 'x8':
        transforms = [
          'scale(1,1) translate(-150,-150)',
          'scale(-1,1) translate(-150,-150)',
          'scale(1,-1) translate(-150,-150)',
          'scale(-1,-1) translate(-150,-150)',
          'rotate(90) scale(1,1) translate(-150,-150)',
          'rotate(90) scale(-1,1) translate(-150,-150)',
          'rotate(90) scale(1,-1) translate(-150,-150)',
          'rotate(90) scale(-1,-1) translate(-150,-150)'
        ]
        this.updateColors()
        break
      case 'x16':
        transforms = [
          'scale(1,1) translate(-150,-150)',
          'scale(-1,1) translate(-150,-150)',
          'scale(1,-1) translate(-150,-150)',
          'scale(-1,-1) translate(-150,-150)',
          'rotate(90) scale(1,1) translate(-150,-150)',
          'rotate(90) scale(-1,1) translate(-150,-150)',
          'rotate(90) scale(1,-1) translate(-150,-150)',
          'rotate(90) scale(-1,-1) translate(-150,-150)',
          'rotate(180) scale(1,1) translate(-150,-150)',
          'rotate(180) scale(-1,1) translate(-150,-150)',
          'rotate(180) scale(1,-1) translate(-150,-150)',
          'rotate(180) scale(-1,-1) translate(-150,-150)',
          'rotate(45) scale(1,1) translate(-150,-150)',
          'rotate(45) scale(-1,1) translate(-150,-150)',
          'rotate(45) scale(1,-1) translate(-150,-150)',
          'rotate(45) scale(-1,-1) translate(-150,-150)',
          'rotate(135) scale(1,1) translate(-150,-150)',
          'rotate(135) scale(-1,1) translate(-150,-150)',
          'rotate(135) scale(1,-1) translate(-150,-150)',
          'rotate(135) scale(-1,-1) translate(-150,-150)'
        ]
        this.updateColors()
        break
      case 'vertical':
        transforms = [
          'scale(1,1) translate(-150,-150)',
          'scale(-1,1) translate(-150,-150)'
        ]
        break
      case 'horizontal':
        transforms = [
          'scale(1,1) translate(-150,-150)',
          'scale(1,-1) translate(-150,-150)'
        ]
        break
      default:
        transforms = ['scale(1,1) translate(-150,-150)']
    }

    // Suppression des anciens chemins
    this.curveGroupTarget.innerHTML = ''

    // Calculer l'espacement
    const spacingX = totalWidth / columns
    const spacingY = totalHeight / rows

    // Calculer le décalage pour centrer la grille
    const offsetX = (totalWidth - (spacingX * columns)) / 2
    const offsetY = (totalHeight - (spacingY * rows)) / 2

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
          newPath.setAttribute('fill', `url(#gradient${gradientIndex})`)
          newPath.setAttribute('stroke', 'none')
          
          this.curveGroupTarget.appendChild(newPath)
        })
      }
    }

    // Mise à jour des points de contrôle
    const points = [
      { target: this.control1Target, pos: control1 },
      { target: this.control2Target, pos: control2 },
      { target: this.control3Target, pos: control3 }
    ]

    points.forEach(({target, pos}) => {
      target.setAttribute('cx', pos[0])
      target.setAttribute('cy', pos[1])
    })
  }

  updateColors() {
    const hue = parseInt(this.colorPickerTarget.value)
    const mode = this.symmetryModeTarget.value
    
    // Création de l'objet HSL de base
    const baseHsl = {
      h: hue,
      s: 80,
      l: 70
    }
    
    // Calcul des couleurs complémentaires et triadiques
    const compHsl = {...baseHsl, h: (baseHsl.h + 180) % 360}
    const triad1Hsl = {...baseHsl, h: (baseHsl.h + 120) % 360}
    const triad2Hsl = {...baseHsl, h: (baseHsl.h + 240) % 360}
    
    // Mise à jour des gradients selon le mode
    if (mode === 'x4') {
      this.updateGradient('gradient1', this.hslToHex(baseHsl), this.hslToHex(compHsl))
      this.updateGradient('gradient2', this.hslToHex(baseHsl), this.hslToHex(compHsl))
      this.updateGradient('gradient3', this.hslToHex(baseHsl), this.hslToHex(compHsl))
    } else if (mode === 'x8') {
      this.updateGradient('gradient1', this.hslToHex(compHsl), this.hslToHex(baseHsl))
      this.updateGradient('gradient2', this.hslToHex(compHsl), this.hslToHex(baseHsl))
      this.updateGradient('gradient3', this.hslToHex(compHsl), this.hslToHex(baseHsl))
    } else if (mode === 'x16') {
      this.updateGradient('gradient1', this.hslToHex(triad1Hsl), this.hslToHex(baseHsl))
      this.updateGradient('gradient2', this.hslToHex(triad2Hsl), this.hslToHex(baseHsl))
      this.updateGradient('gradient3', this.hslToHex(triad1Hsl), this.hslToHex(baseHsl))
    }
  }

  updateGradient(id, color1, color2) {
    const gradient = document.getElementById(id)
    
    // Utiliser les deux couleurs fournies pour le dégradé
    gradient.querySelector('stop:first-child').style.stopColor = color1
    gradient.querySelector('stop:first-child').style.stopOpacity = '1'
    gradient.querySelector('stop:last-child').style.stopColor = color2
    gradient.querySelector('stop:last-child').style.stopOpacity = '1'
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

  randomize() {
    // Générer des valeurs aléatoires pour tous les sliders
    this.sliderXTarget.value = Math.random() * 100
    this.sliderYTarget.value = Math.random() * 100
    this.sliderX3Target.value = Math.random() * 100
    this.sliderY3Target.value = Math.random() * 100
    
    // Générer une couleur aléatoire
    this.colorPickerTarget.value = Math.floor(Math.random() * 360)
    
    // Choisir un mode de symétrie aléatoire
    const modes = ['x4', 'x8', 'x16']
    const randomMode = modes[Math.floor(Math.random() * modes.length)]
    this.symmetryModeTarget.value = randomMode
    
    // Générer des valeurs aléatoires pour les lignes et colonnes
    this.rowsTarget.value = Math.floor(Math.random() * 4) + 1
    this.columnsTarget.value = Math.floor(Math.random() * 4) + 1

    // Générer une valeur aléatoire pour le lissage
    this.smoothingTarget.value = Math.random() * 100
    
    // Mettre à jour les couleurs et la courbe
    this.updateColors()
    this.updateCurve()
  }
} 
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container"]

  connect() {
    this.containerTarget.style.height = 'calc(100vh - 45px)'
    this.containerTarget.style.overflow = 'hidden'
    this.createPatternRows()
    window.addEventListener('resize', () => this.handleResize())
  }

  createPatternRows() {
    this.containerTarget.innerHTML = '' // Nettoyer le conteneur
    
    const numberOfRows = Math.floor(Math.random() * 5) + 10
    
    // Générer des hauteurs aléatoires pour chaque ligne
    const randomHeights = Array(numberOfRows).fill(0).map(() => 
      Math.floor(Math.random() * 51) + 50
    )
    
    const totalRandomHeight = randomHeights.reduce((sum, height) => sum + height, 0)
    const containerHeight = this.containerTarget.offsetHeight
    const scaleFactor = containerHeight / totalRandomHeight
    
    randomHeights.forEach((randomHeight, i) => {
      const adjustedHeight = randomHeight * scaleFactor
      
      const rowWrapper = document.createElement('div')
      Object.assign(rowWrapper.style, { 
        position: 'relative', 
        height: `${adjustedHeight}px`, 
        overflow: 'hidden',
        marginBottom: '-1px'
      })

      // Créer un conteneur pour l'animation
      const slider = document.createElement('div')
      Object.assign(slider.style, { 
        display: 'flex', 
        position: 'absolute', 
        height: '100%', 
        left: '0', 
        gap: '0',
        fontSize: '0'
      })
      
      // Générer le motif de base
      const basePattern = this.createPattern(this.generateRandomParams(), adjustedHeight)
      
      // Créer trois copies du motif pour un défilement continu
      for (let j = 0; j < 3; j++) {
        const patternDiv = document.createElement('div')
        patternDiv.style.flexShrink = '0'
        patternDiv.style.marginRight = '-1px'
        patternDiv.innerHTML = basePattern
        slider.appendChild(patternDiv)
      }

      // Configurer l'animation
      const duration = Math.random() * 60 + 20 // Entre 10 et 30 secondes
      const direction = Math.random() < 0.5 ? 'normal' : 'reverse'
      
      slider.style.animation = `slidePattern ${duration}s linear infinite ${direction}`
      
      rowWrapper.appendChild(slider)
      this.containerTarget.appendChild(rowWrapper)
    })

    // Ajouter la keyframe animation si elle n'existe pas déjà
    if (!document.querySelector('#pattern-animation')) {
      const styleSheet = document.createElement('style')
      styleSheet.id = 'pattern-animation'
      styleSheet.textContent = `
        @keyframes slidePattern {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-33.33%);
          }
        }
      `
      document.head.appendChild(styleSheet)
    }
  }

  generateRandomParams() {
    return {
      columns: Math.floor(Math.random() * 70)+1,
      rows: 1,
      padding: Math.floor(Math.random() * 10) * 5,
      hue: Math.floor(Math.random() * 360),
      filledSquares: Math.floor(Math.random() * 10) + 1,
      whiteSquares: Math.floor(Math.random() * 10) + 1,
      shape: ['square', 'ellipse', 'triangle', 'losange'][Math.floor(Math.random() * 4)]
    }
  }

  createPattern(params, adjustedHeight) {
    const width = window.innerWidth
    const patternWidth = width + 1
    const height = adjustedHeight
    
    const fillColor = `hsl(${params.hue}, 80%, 70%)`
    const complementaryColor = `hsl(${(params.hue + 180) % 360}, 80%, 70%)`
    const triadicColor = `hsl(${(params.hue + 120) % 360}, 80%, 70%)`
    
    let svgContent = `<rect x="0" y="0" width="${patternWidth}" height="${height}" fill="${complementaryColor}" />`
    
    const cellWidth = patternWidth / params.columns
    const cellHeight = height / params.rows
    const paddingX = cellWidth * (params.padding / 100) / 2
    const paddingY = cellHeight * (params.padding / 100) / 2
    
    const patternCycle = params.filledSquares + params.whiteSquares

    for (let row = 0; row < params.rows; row++) {
      for (let col = 0; col < params.columns; col++) {
        const cellIndex = row * params.columns + col
        const patternIndex = cellIndex % patternCycle
        const isFilled = patternIndex < params.filledSquares
        
        const x = col * cellWidth
        const y = row * cellHeight
        
        svgContent += this.getShapeContent(
          x, y, 
          cellWidth, cellHeight, 
          paddingX, paddingY, 
          isFilled ? fillColor : triadicColor,
          params.shape
        )
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${patternWidth}" height="${height}">
      ${svgContent}
    </svg>`
  }

  getShapeContent(x, y, width, height, paddingX, paddingY, fill, shape) {
    const overlap = 0.5

    switch (shape) {
      case 'square':
        return `<rect 
          x="${x + paddingX}" 
          y="${y + paddingY}" 
          width="${width - 2 * paddingX + overlap}" 
          height="${height - 2 * paddingY + overlap}" 
          fill="${fill}" 
        />`
      case 'ellipse':
        return `<ellipse 
          cx="${x + width / 2}" 
          cy="${y + height / 2}" 
          rx="${(width - 2 * paddingX) / 2 + overlap / 2}" 
          ry="${(height - 2 * paddingY) / 2 + overlap / 2}" 
          fill="${fill}" 
        />`
      case 'triangle':
        return `<polygon 
          points="${x + paddingX - overlap},${y + height - paddingY + overlap} ${x + width / 2},${y + paddingY - overlap} ${x + width - paddingX + overlap},${y + height - paddingY + overlap}" 
          fill="${fill}" 
        />`
      case 'losange':
        return `<polygon 
          points="${x + width / 2},${y + paddingY - overlap} ${x + width - paddingX + overlap},${y + height / 2} ${x + width / 2},${y + height - paddingY + overlap} ${x + paddingX - overlap},${y + height / 2}" 
          fill="${fill}" 
        />`
    }
  }

  handleResize() {
    // Recréer tous les motifs lors du redimensionnement de la fenêtre
    this.createPatternRows()
  }

  disconnect() {
    window.removeEventListener('resize', () => this.handleResize())
  }
} 
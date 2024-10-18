import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "patternContainer", "columns", "rows", "hue", "filledSquares", "whiteSquares",
    "padding", "complementaryBg", "columnValue", "rowValue", "filledValue",
    "whiteValue", "paddingValue", "title", "patternSettings", "titleWrapper", "userName", "cover"
  ]

  static values = {
    username: String
  }

  connect() {
  // console.log('Preview controller connected');
  // console.log('Columns target:', this.columnsTarget);
  // console.log('Pattern Settings target:', this.patternSettingsTarget);
  this.currentShape = 'square';

  // Vérifier si des paramètres de motif existent
  if (this.patternSettingsTarget.value) {
    const settings = JSON.parse(this.patternSettingsTarget.value);

    // Appliquer les valeurs des paramètres aux cibles
    this.columnsTarget.value = settings.columns || 1;
    this.rowsTarget.value = settings.rows || 1;
    this.hueTarget.value = settings.hue || '#ff0000';
    this.filledSquaresTarget.value = settings.filledSquares || 1;
    this.whiteSquaresTarget.value = settings.whiteSquares || 1;
    this.paddingTarget.value = settings.padding || 0;
    this.complementaryBgTarget.checked = settings.complementaryBg || false;
    this.currentShape = settings.shape || 'square';

    // Mettre à jour les boutons de forme
    this.element.querySelectorAll('.shape-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shape === this.currentShape);
    });

    // Mettre à jour le motif avec les paramètres chargés
    this.updatePattern();
  } else {
    // Si aucun paramètre n'est présent, générer des paramètres aléatoires par défaut
    this.randomizeParameters();
  }

  this.userNameTarget.textContent = this.usernameValue;

  // Forcer l'initialisation du titre
  this.initializeTitle();

  this.updateColors();

  // Set max values for columns and rows
  this.columnsTarget.max = 50;
  this.rowsTarget.max = 50;

  // Set step and max for padding
  this.paddingTarget.step = 10;
  this.paddingTarget.max = 50;

  // Set up color picker to only change hue
  this.hueTarget.addEventListener('input', this.updateHue.bind(this));
  this.element.addEventListener('submit', (event) => {
    this.updatePattern(); // Met à jour le champ cover avant de soumettre le formulaire
  });

  // Initialiser le slider de couleur
  const initialHue = this.getHueFromHex(this.hueTarget.value)
  this.hueTarget.value = initialHue
  this.hueTarget.style.background = `linear-gradient(to right, hsl(0, 80%, 70%), hsl(60, 80%, 70%), hsl(120, 80%, 70%), hsl(180, 80%, 70%), hsl(240, 80%, 70%), hsl(300, 80%, 70%), hsl(360, 80%, 70%))`
}


  updateHue(event) {
    const hue = parseInt(event.target.value)
    const newColor = `hsl(${hue}, 80%, 70%)`
    this.hueTarget.value = hue
    this.hueTarget.style.background = `linear-gradient(to right, hsl(0, 80%, 70%), hsl(60, 80%, 70%), hsl(120, 80%, 70%), hsl(180, 80%, 70%), hsl(240, 80%, 70%), hsl(300, 80%, 70%), hsl(360, 80%, 70%))`
    this.updatePattern()
    this.updateColors() // Ajoutez cette ligne pour mettre à jour les couleurs du titre
  }

  getHslColor(hexColor) {
    const hue = parseInt(this.hueTarget.value)
    return `hsl(${hue}, 80%, 70%)`
  }

  updateTitle(e) {
    const title = e.currentTarget.value || "Futur titre";
    this.splitAndWrapText(title);
    this.updateColors();
  }

  splitAndWrapText(text) {
    if (!text || text.trim() === "") {
      text = "Futur titre";
    }
    
    const words = text.split(/\s+/)
    let lines = []
    let currentLine = []

    words.forEach(word => {
      const testLine = [...currentLine, word].join(' ')
      const testWidth = this.getTextWidth(testLine)

      if (testWidth > this.titleWrapperTarget.offsetWidth) {
        if (currentLine.length > 0) {
          lines.push(currentLine.join(' '))
          currentLine = [word]
        } else {
          lines.push(word)
          currentLine = []
        }
      } else {
        currentLine.push(word)
      }
    })

    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '))
    }

    const fillColor = this.getHslColor(this.hueTarget.value)
    const textColor = this.getContrastColor(fillColor)

    this.titleWrapperTarget.innerHTML = lines.map(line => 
      `<span class="p-xs inline-block" style="background-color: ${fillColor}; color: ${textColor}; word-break:break-word;">${line}</span>`
    ).join('<br>')
  }

  getTextWidth(text) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    context.font = getComputedStyle(this.titleWrapperTarget).font
    return context.measureText(text).width
  }

  updatePattern() {
    // const width = this.patternContainerTarget.clientWidth
    // const height = this.patternContainerTarget.clientHeight
    const width = 250
    const height = 350
    const columns = Math.min(parseInt(this.columnsTarget.value), 50)
    const rows = Math.min(parseInt(this.rowsTarget.value), 50)
    const filledSquares = parseInt(this.filledSquaresTarget.value)
    const whiteSquares = parseInt(this.whiteSquaresTarget.value)
    const paddingPercentage = Math.min(parseInt(this.paddingTarget.value), 50)

    this.columnValueTarget.textContent = columns
    this.rowValueTarget.textContent = rows
    this.filledValueTarget.textContent = filledSquares
    this.whiteValueTarget.textContent = whiteSquares
    this.paddingValueTarget.textContent = paddingPercentage

    const hue = parseInt(this.hueTarget.value)
    const fillColor = this.getHslColor()
    const complementaryColor = this.getComplementaryColor(fillColor)
    const triadicColor = this.getTriadicColor(fillColor)

    const nonFilledColor = this.getNonFilledColor(triadicColor)

    const patternCycle = filledSquares + whiteSquares
    let svgContent = ''

    if (this.complementaryBgTarget.checked) {
      svgContent += `<rect x="0" y="0" width="${width}" height="${height}" fill="${complementaryColor}" />`
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const cellIndex = row * columns + col
        const patternIndex = cellIndex % patternCycle
        const isFilled = patternIndex < filledSquares
        const cellWidth = width / columns
        const cellHeight = height / rows
        const x = col * cellWidth
        const y = row * cellHeight

        const paddingX = paddingPercentage === 0 ? 0 : cellWidth * (paddingPercentage / 100) / 2
        const paddingY = paddingPercentage === 0 ? 0 : cellHeight * (paddingPercentage / 100) / 2

        svgContent += this.getShapeContent(x, y, cellWidth, cellHeight, paddingX, paddingY, isFilled ? fillColor : nonFilledColor)
      }
    }

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" shape-rendering="auto">
        ${svgContent}
      </svg>
    `

    this.updateColors()
    this.patternContainerTarget.innerHTML = svg
    this.updatePatternSettings()
    
    // Réinitialiser le titre après la mise à jour du motif
    this.initializeTitle();

    // Mettre à jour le champ caché 'cover' avec le contenu SVG
    //console.log(svg)
    this.coverTarget.value = svg; // Ajout de cette ligne
  }

  getComplementaryColor(hslColor) {
    const hue = parseInt(hslColor.match(/hsl\((\d+),/)[1])
    return `hsl(${(hue - 120) % 360}, 80%, 70%)`
  }

  getTriadicColor(hslColor) {
    const hue = parseInt(hslColor.match(/hsl\((\d+),/)[1])
    return `hsl(${(hue + 120) % 360}, 80%, 70%)`
  }

  getHueFromHex(hex) {
    const rgb = this.hexToRgb(hex)
    const hsl = this.rgbToHsl(rgb[0], rgb[1], rgb[2])
    return Math.round(hsl[0])
  }

  hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16)
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
  }

  rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h, s, l = (max + min) / 2

    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }

    return [h * 360, s * 100, l * 100]
  }

  hslToHex(h, s, l) {
    l /= 100
    const a = s * Math.min(l, 1 - l) / 100
    const f = n => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  getNonFilledColor(triadicColor) {
    return triadicColor;
  }

  getShapeContent(x, y, width, height, paddingX, paddingY, fill) {
    // Round the padding values to avoid floating point issues
    paddingX = Math.round(paddingX);
    paddingY = Math.round(paddingY);

    // Add a small overlap to eliminate gaps
    const overlap = 0.5;

    switch (this.currentShape) {
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

  changeShape(event) {
    this.element.querySelectorAll('.shape-button').forEach(btn => btn.classList.remove('active'))
    event.target.classList.add('active')
    this.currentShape = event.target.dataset.shape
    this.updatePattern()
  }

  randomizeParameters() {
    this.columnsTarget.value = Math.floor(Math.random() * 50) + 1
    this.rowsTarget.value = Math.floor(Math.random() * 50) + 1
    this.filledSquaresTarget.value = Math.floor(Math.random() * 100) + 1
    this.whiteSquaresTarget.value = Math.floor(Math.random() * 100) + 1
    this.paddingTarget.value = Math.floor(Math.random() * 6) * 10 // 0 to 50 in steps of 10
    
    // Modifier cette ligne pour changer directement la valeur du slider de teinte
    this.hueTarget.value = Math.floor(Math.random() * 360)
    
    const shapes = ['square', 'ellipse', 'triangle', 'losange']
    this.currentShape = shapes[Math.floor(Math.random() * shapes.length)]
    this.element.querySelectorAll('.shape-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shape === this.currentShape)
    })

    this.complementaryBgTarget.checked = Math.random() < 0.5

    this.updatePattern()
    this.updateHue({ target: this.hueTarget }) // Ajoutez cette ligne pour mettre à jour le dégradé du slider
  }

  updatePatternSettings() {
    const settings = {
      columns: this.columnsTarget.value,
      rows: this.rowsTarget.value,
      hue: this.hueTarget.value,
      filledSquares: this.filledSquaresTarget.value,
      whiteSquares: this.whiteSquaresTarget.value,
      padding: this.paddingTarget.value,
      shape: this.currentShape,
      complementaryBg: this.complementaryBgTarget.checked,
      // Remove this line
      // nonFilled: document.querySelector('input[name="non-filled"]:checked').value
    }
    this.patternSettingsTarget.value = JSON.stringify(settings)
  }

  updateColors() {
    const hue = parseInt(this.hueTarget.value)
    const fillColor = this.getHslColor()
    const textColor = this.getContrastColor(fillColor)

    // Update each span in the titleWrapper
    this.titleWrapperTarget.querySelectorAll('span').forEach(span => {
      span.style.backgroundColor = fillColor
      span.style.color = textColor
    })

    this.userNameTarget.style.backgroundColor = fillColor
    this.userNameTarget.style.color = textColor
  }

  getContrastColor(backgroundColor) {
    // Convert the HSL color to RGB
    const rgb = this.hslToRgb(...this.parseHSL(backgroundColor));
    
    // Calculate relative luminance
    const luminance = 0.2126 * this.getLuminance(rgb[0]) + 
                      0.7152 * this.getLuminance(rgb[1]) + 
                      0.0722 * this.getLuminance(rgb[2]);

    // Calculate contrast ratio with white (1 is the luminance of white)
    const contrastRatio = (luminance + 0.05) / (1 + 0.05);

    // Use black text if the contrast ratio is below 4.5:1 (WCAG AA standard for normal text)
    return contrastRatio < 1 / 4.5 ? '#FFFFFF' : '#000000';
  }

  getLuminance(value) {
    const val = value / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  }

  parseHSL(hslString) {
    const [h, s, l] = hslString.match(/\d+/g).map(Number);
    return [h, s / 100, l / 100];
  }

  hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h / 360 + 1/3);
      g = hue2rgb(p, q, h / 360);
      b = hue2rgb(p, q, h / 360 - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  exportSVG() {
    this.coverTarget.value = svgString;

    // const width = this.patternContainerTarget.clientWidth;
    // const height = this.patternContainerTarget.clientHeight;

    const width = 250;
    const height = 350;
    
    // Get the pattern SVG
    const patternSVG = this.patternContainerTarget.innerHTML;
    
    // Create a temporary SVG element
    const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgElement.setAttribute("width", width);
    svgElement.setAttribute("height", height);
    svgElement.innerHTML = patternSVG;
    
    // Convert the SVG to a string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    
    // Create a Blob with the SVG content
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element and trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pattern.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  initializeTitle() {
    const currentTitle = this.titleTarget.value || "Futur titre";
    this.splitAndWrapText(currentTitle);
    this.updateColors();
  }
}

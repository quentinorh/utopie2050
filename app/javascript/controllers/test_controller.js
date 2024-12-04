import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["path", "firstSliderControl", "secondSliderControl", 
                   "symmetryMode", "curveGroup", "colorPicker", 
                   "rows", "columns", "smoothing", "titleInput", "titleWrapper", "userName", "cover", "patternSettings", "anchor", "grid"]
  static values = { uniqueId: String }

  connect() {
    if (this.hasPatternSettingsTarget && this.patternSettingsTarget.value) {
      this.loadPatternSettings();
    } else {
      this.randomize();
    }
    this.updateColors()
    this.updateCurve()
    this.updateTitle()
  }

  loadPatternSettings() {
    const patternSettings = JSON.parse(this.patternSettingsTarget.value);

    // Charger les valeurs dans les contrôles
    this.symmetryModeTargets.forEach(target => {
      target.checked = (target.value === patternSettings.symmetryMode);
    });
    this.colorPickerTarget.value = patternSettings.color;
    this.firstSliderControlTarget.value = patternSettings.firstSliderControl;
    this.secondSliderControlTarget.value = patternSettings.secondSliderControl;
    this.rowsTarget.value = patternSettings.rows;
    this.columnsTarget.value = patternSettings.columns;
    this.smoothingTarget.value = patternSettings.smoothing;
  }

  updateTitle() {
    const title = this.titleInputTarget.value || "Futur titre";
    
    this.titleWrapperTarget.innerHTML = '';

    const hue = this.colorPickerTarget.value;
    const backgroundColor = `hsl(${hue}, 80%, 70%)`;

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    
    titleSpan.style.boxShadow = `0 0 0 10px ${backgroundColor}`;
    titleSpan.style.backgroundColor = backgroundColor;

    this.userNameTarget.style.backgroundColor = backgroundColor

    titleSpan.classList.add('leading-relaxed', 'box-decoration-clone');

    this.titleWrapperTarget.appendChild(titleSpan);
  }

  updateCurve() {
    const selectedMode = this.symmetryModeTargets.find(target => target.checked);
    const mode = selectedMode.value;

    // Récupérer le nombre de lignes et colonnes
    const rows = parseInt(this.rowsTarget.value)
    const columns = parseInt(this.columnsTarget.value)

    // Calculer la taille de chaque motif en fonction du nombre de lignes et colonnes
    const totalWidth = 250  // largeur totale du SVG
    const totalHeight = 350 // hauteur totale du SVG
    const width = totalWidth / columns
    const height = totalHeight / rows

    const startPoint = [0, height]

    const x = this.firstSliderControlTarget.value / 100
    const y = 1 - this.firstSliderControlTarget.value / 100
    const x3 = this.secondSliderControlTarget.value / 100
    const y3 = 1 - this.secondSliderControlTarget.value / 100

    // Récupérer la valeur de lissage
    const smoothing = this.smoothingTarget.value / 100

    //console.log(x, y, x3, y3, smoothing)

    // Ajuster les points de contrôle pour le lissage
    const control1 = [
      (width * x * smoothing).toFixed(2), 
      (height * smoothing).toFixed(2)
    ];
    const control2 = [
      (width * smoothing).toFixed(2), 
      (height * (1 - y * smoothing)).toFixed(2)
    ];
    const control3 = [
      (width * x3 * smoothing).toFixed(2), 
      (height * (1 - y3 * smoothing)).toFixed(2)
    ];

    // Création du chemin de base
    const basePath = `
      M ${startPoint[0]},${startPoint[1]}
      C ${control1[0]},${control1[1]}
      ${control3[0]},${control3[1]}
      ${control2[0]},${control2[1]}
    `

    let transforms = []

    switch(mode) {
      case 'x4':
        transforms = [
          'scale(1,1) translate(-125,-175)',
          'scale(-1,1) translate(-125,-175)',
          'scale(1,-1) translate(-125,-175)',
          'scale(-1,-1) translate(-125,-175)'
        ]
        this.updateColors()
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
        this.updateColors()
        break
      case 'x16':
        transforms = [
          'scale(1,1) translate(-125,-175)',
          'scale(-1,1) translate(-125,-175)',
          'scale(1,-1) translate(-125,-175)',
          'scale(-1,-1) translate(-125,-175)',
          'rotate(90) scale(1,1) translate(-125,-175)',
          'rotate(90) scale(-1,1) translate(-125,-175)',
          'rotate(90) scale(1,-1) translate(-125,-175)',
          'rotate(90) scale(-1,-1) translate(-125,-175)',
          'rotate(45) scale(1,1) translate(-125,-175)',
          'rotate(45) scale(-1,1) translate(-125,-175)',
          'rotate(45) scale(1,-1) translate(-125,-175)',
          'rotate(45) scale(-1,-1) translate(-125,-175)',
          'rotate(135) scale(1,1) translate(-125,-175)',
          'rotate(135) scale(-1,1) translate(-125,-175)',
          'rotate(135) scale(1,-1) translate(-125,-175)',
          'rotate(135) scale(-1,-1) translate(-125,-175)'
        ]
        this.updateColors()
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

    const hue = this.colorPickerTarget.value;
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
    const hue = parseInt(this.colorPickerTarget.value);
    const mode = this.symmetryModeTarget.value;
    
    const baseHsl = { h: hue, s: 100, l: 65 };
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

  randomize() {
    // Générer des valeurs aléatoires pour tous les sliders
    this.firstSliderControlTarget.value = Math.random() * 100;
    this.secondSliderControlTarget.value = Math.random() * 100;
    
    // Générer une couleur aléatoire
    this.colorPickerTarget.value = Math.floor(Math.random() * 360);
    
    // Choisir un mode de symétrie aléatoire
    const modes = ['x4', 'x8', 'x16'];
    const randomMode = modes[Math.floor(Math.random() * modes.length)];
    
    // Sélectionner le bouton radio correspondant
    this.symmetryModeTargets.forEach(target => {
      target.checked = (target.value === randomMode);
    });
    
    // Générer des valeurs aléatoires pour les lignes et colonnes
    this.rowsTarget.value = Math.floor(Math.random() * 4) + 1;
    this.columnsTarget.value = Math.floor(Math.random() * 4) + 1;

    // Générer une valeur aléatoire pour le lissage
    this.smoothingTarget.value = Math.floor(Math.random() * 90) + 10;
    
    // Mettre à jour les couleurs et la courbe
    this.updateColors();
    this.updateCurve();
    this.updateTitle();
  }

  saveSVG() {
    const svgElement = this.curveGroupTarget.closest('svg');
    const svgText = new XMLSerializer().serializeToString(svgElement);
    const coverField = this.coverTarget;
    coverField.value = svgText;
  }

  savePatternSettings() {
    const patternSettings = {
      symmetryMode: this.symmetryModeTargets.find(target => target.checked)?.value,
      color: this.colorPickerTarget.value,
      firstSliderControl: this.firstSliderControlTarget.value,
      secondSliderControl: this.secondSliderControlTarget.value,
      rows: this.rowsTarget.value,
      columns: this.columnsTarget.value,
      smoothing: this.smoothingTarget.value,
      hue: this.colorPickerTarget.value
    };

    const patternSettingsField = this.patternSettingsTarget;
    patternSettingsField.value = JSON.stringify(patternSettings);
  }


  startDrag(event) {
    console.log('startDrag');
  }

  drag(event) {
    console.log('drag');
    const gridParent = event.currentTarget.parentElement;
    const gridRect = gridParent.getBoundingClientRect();
    const target = event.currentTarget;

    // Calculate mouse position relative to grid
    const mouseX = event.clientX - gridRect.left;
    const mouseY = event.clientY - gridRect.top;

    // Constrain position within grid boundaries
    const maxX = gridRect.width - target.offsetWidth;
    const maxY = gridRect.height - target.offsetHeight;
    
    const newX = Math.min(Math.max(0, mouseX), maxX);
    const newY = Math.min(Math.max(0, mouseY), maxY);

    // Update target position
    target.style.left = `${newX}px`;
    target.style.top = `${newY}px`;

    // Calculate percentage coordinates
    const percentX = (newX / maxX) * 100;
    const percentY = (newY / maxY) * 100;

    // Round to 2 decimal places for cleaner output
    const roundedX = Math.round(percentX * 100) / 100;
    const roundedY = Math.round(percentY * 100) / 100;

    console.log(`Anchor position: ${roundedX}%, ${roundedY}%`);
    // Update slider controls with anchor position percentages
    if (gridParent.dataset.patternGrid === "1") {
      this.firstSliderControlTarget.value = roundedX;
      this.secondSliderControlTarget.value = roundedY;
    } else if (gridParent.dataset.patternGrid === "2") {
      this.rowsTarget.value = 1 + (roundedX / 25); // Maps 0-100 to 1-5
      this.columnsTarget.value = 1 + (roundedY / 25); // Maps 0-100 to 1-5
    }

    // Update the curve with new control point positions
    this.updateCurve();
  }

  stopDrag(event) {
    console.log('stopDrag');
  }
} 
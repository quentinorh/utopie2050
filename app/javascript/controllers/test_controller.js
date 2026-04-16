import { Controller } from "@hotwired/stimulus"
import { fitTitleWrapperToLongestLine } from "utils/fit_title_to_longest_line"

export default class extends Controller {
  static targets = ["path", "firstSliderControl", "secondSliderControl",
                   "symmetryMode", "curveGroup", "colorPicker",
                   "rows", "columns", "smoothing", "titleInput", "titleWrapper", "userName", "cover", "patternSettings", "anchor1", "anchor2", "grid", "draft", "controlsToggleIcon",
                   "hueValue", "smoothingValue", "curveValue", "gridValue"]
  static values = { uniqueId: String }

  connect() {
    this.renderGridLines()
    if (this.hasPatternSettingsTarget && this.patternSettingsTarget.value) {
      this.loadPatternSettings();
    } else {
      this.randomize();
    }
    this.updateColors()
    this.updateCurve()
    this.updateTitle()
    this.updateCursorPositions()
    this.updateValueDisplays()

    // Premier recalcul immédiat pour éviter un délai au chargement
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.fitTitleToLongestLine());
    });

    this.boundFitTitle = () => this.scheduleFitTitle();
    window.addEventListener("resize", this.boundFitTitle);

    // Ajouter un écouteur d'événement pour les boutons de symétrie
    this.symmetryModeTargets.forEach(target => {
      target.addEventListener('click', (event) => {
        this.symmetryModeTargets.forEach(btn => btn.classList.remove('is-active'));
        event.currentTarget.classList.add('is-active');

        // Mettre à jour le mode de symétrie
        this.symmetryMode = event.currentTarget.dataset.value;
        this.updateCurve();
      });
    });
  }

  disconnect() {
    if (this.boundFitTitle) {
      window.removeEventListener("resize", this.boundFitTitle);
    }
    if (this._fitTitleTimeout) clearTimeout(this._fitTitleTimeout);
  }

  scheduleFitTitle() {
    if (this._fitTitleTimeout) clearTimeout(this._fitTitleTimeout);
    this._fitTitleTimeout = setTimeout(() => {
      this._fitTitleTimeout = null;
      requestAnimationFrame(() => this.fitTitleToLongestLine());
    }, 100);
  }

  loadPatternSettings() {
    const patternSettings = JSON.parse(this.patternSettingsTarget.value);
    // Charger les valeurs dans les contrôles

    this.symmetryMode = patternSettings.symmetryMode
    this.colorPickerTarget.value = patternSettings.color;
    this.firstSliderControlTarget.value = patternSettings.firstSliderControl;
    this.secondSliderControlTarget.value = patternSettings.secondSliderControl;
    this.rowsTarget.value = patternSettings.rows;
    this.columnsTarget.value = patternSettings.columns;
    this.smoothingTarget.value = patternSettings.smoothing;

    this.updateSymmetrybutton(patternSettings.symmetryMode)
  }

  updateTitle() {
    const title = this.titleInputTarget.value || "Futur titre";

    const hue = parseInt(this.colorPickerTarget.value, 10);
    const titleBackground = `hsl(${hue}, 80%, 70%)`;
    const usernameBackground = `hsl(${(hue + 120) % 360}, 80%, 70%)`;

    this.titleWrapperTarget.textContent = title;
    this.titleWrapperTarget.style.boxShadow = "none";
    this.titleWrapperTarget.style.backgroundColor = titleBackground;

    if (this.hasUserNameTarget) {
      this.userNameTarget.style.backgroundColor = usernameBackground;
    }

    // On ne touche pas à la largeur pendant la saisie : elle est fixée au chargement et au resize
    // pour éviter que les côtés bougent et que les mots sautent d'une ligne à l'autre
  }

  updateValueDisplays() {
    if (this.hasHueValueTarget) {
      this.hueValueTarget.textContent = `${parseInt(this.colorPickerTarget.value, 10)}°`;
    }
    if (this.hasSmoothingValueTarget) {
      this.smoothingValueTarget.textContent = parseInt(this.smoothingTarget.value, 10);
    }
    if (this.hasCurveValueTarget) {
      const x = Math.round(parseFloat(this.firstSliderControlTarget.value) || 0);
      const y = Math.round(parseFloat(this.secondSliderControlTarget.value) || 0);
      this.curveValueTarget.textContent = `${x}, ${y}`;
    }
    if (this.hasGridValueTarget) {
      const cols = Math.round(parseFloat(this.columnsTarget.value) || 1);
      const rows = Math.round(parseFloat(this.rowsTarget.value) || 1);
      this.gridValueTarget.textContent = `${cols} × ${rows}`;
    }
    if (this.hasColorPickerTarget) {
      const hue = parseInt(this.colorPickerTarget.value, 10);
      this.colorPickerTarget.style.setProperty("--slider-accent", `hsl(${hue}, 80%, 55%)`);
    }
  }

  renderGridLines() {
    if (!this.hasGridTarget) return;
    this.gridTargets.forEach(grid => {
      if (grid.dataset.linesRendered === "true") return;
      const isQuad = grid.classList.contains("cc-grid__lines--quad") ||
                     grid.classList.contains("editor-grid__lines--quad");
      const cells = isQuad ? 16 : 64;
      const cols = isQuad ? 4 : 8;
      grid.style.setProperty("grid-template-columns", `repeat(${cols}, 1fr)`);
      grid.style.setProperty("grid-template-rows", `repeat(${cols}, 1fr)`);
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < cells; i++) {
        const cell = document.createElement("span");
        cell.className = "cc-grid__cell";
        fragment.appendChild(cell);
      }
      grid.appendChild(fragment);
      grid.dataset.linesRendered = "true";
    });
  }

  fitTitleToLongestLine() {
    if (!this.hasTitleWrapperTarget) return
    fitTitleWrapperToLongestLine(this.titleWrapperTarget)
  }

  updateCurve() {
    // Utiliser le mode de symétrie mis à jour
    const mode = this.symmetryMode;
    this.updateSymmetrybutton(mode);

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
    const offsetX = ((totalWidth - (spacingX * columns)) / 2)
    const offsetY = ((totalHeight - (spacingY * rows)) / 2)

    const hue = this.colorPickerTarget.value;
    const backgroundColor = `hsl(${hue}, 50%, 13%)`;

    // Background rect fills the full SVG — placed outside the curve group
    const svg = this.curveGroupTarget.closest('svg')
    const oldRect = svg.querySelector('.cover-bg-rect')
    if (oldRect) oldRect.remove()

    const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    backgroundRect.setAttribute('width', totalWidth);
    backgroundRect.setAttribute('height', totalHeight);
    backgroundRect.setAttribute('fill', backgroundColor);
    backgroundRect.setAttribute('class', 'cover-bg-rect');
    svg.insertBefore(backgroundRect, this.curveGroupTarget);

    // Scale curve group from center (margins all around)
    this.curveGroupTarget.setAttribute('transform', 'translate(125, 175) scale(0.8) translate(-125, -175)');

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

    this.updateValueDisplays();
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


    // Mettre à jour les boutons pour refléter le mode sélectionné

    this.updateSymmetrybutton(randomMode)
    this.symmetryMode = randomMode
    
    // Générer des valeurs aléatoires pour les lignes et colonnes
    this.rowsTarget.value = Math.floor(Math.random() * 4) + 1;
    this.columnsTarget.value = Math.floor(Math.random() * 4) + 1;

    // Générer une valeur aléatoire pour le lissage
    this.smoothingTarget.value = Math.floor(Math.random() * 90) + 10;
    
    // Mettre à jour les couleurs et la courbe
    this.updateColors();
    this.updateCurve();
    this.updateTitle();

    // Mettre à jour les positions des curseurs après la randomisation
    requestAnimationFrame(() => this.updateCursorPositions());
  }

  updateSymmetrybutton(symmetryMode) {
    this.symmetryModeTargets.forEach(target => {
      target.classList.toggle('is-active', target.dataset.value === symmetryMode);
    });
  }

  saveSVG() {
    const svgElement = this.curveGroupTarget.closest('svg');
    const svgText = new XMLSerializer().serializeToString(svgElement);
    const coverField = this.coverTarget;
    coverField.value = svgText;
  }

  savePatternSettings() {
    const activeButton = this.symmetryModeTargets.find(target => target.classList.contains('is-active'));
    const symmetryMode = activeButton ? activeButton.dataset.value : (this.symmetryMode || 'x4');
    const patternSettings = {
      symmetryMode: symmetryMode,
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


  // Helper pour obtenir les coordonnées (souris ou tactile)
  getEventCoordinates(event) {
    if (event.touches && event.touches.length > 0) {
      return {
        clientX: event.touches[0].clientX,
        clientY: event.touches[0].clientY
      };
    }
    return {
      clientX: event.clientX,
      clientY: event.clientY
    };
  }

  startDrag(event) {
    event.preventDefault(); // Empêcher le scroll sur mobile
    this.isDragging = true;
    this.dragTarget = event.currentTarget;
    const coords = this.getEventCoordinates(event);
    this.lastMouseX = coords.clientX;
    this.lastMouseY = coords.clientY;
    
    // Événements souris
    document.addEventListener('mousemove', this.drag);
    document.addEventListener('mouseup', this.stopDrag);
    document.addEventListener('mouseleave', this.stopDrag);
    
    // Événements tactiles
    document.addEventListener('touchmove', this.drag, { passive: false });
    document.addEventListener('touchend', this.stopDrag);
    document.addEventListener('touchcancel', this.stopDrag);
  }

  drag = (event) => {
    if (!this.isDragging) return;
    
    event.preventDefault(); // Empêcher le scroll pendant le drag
    
    requestAnimationFrame(() => {
      const gridParent = this.dragTarget.parentElement;
      const gridRect = gridParent.getBoundingClientRect();

      // Calculer la position (souris ou tactile) par rapport à la grille
      const coords = this.getEventCoordinates(event);
      const mouseX = coords.clientX - gridRect.left;
      const mouseY = coords.clientY - gridRect.top;

      // Contraindre la position dans les limites de la grille
      const maxX = gridRect.width;
      const maxY = gridRect.height;

      const newX = Math.min(Math.max(0, mouseX), maxX);
      const newY = Math.min(Math.max(0, mouseY), maxY);

      // Mettre à jour la position de la cible
      this.dragTarget.style.left = `${newX}px`;
      this.dragTarget.style.top = `${newY}px`;

      // Calculer les coordonnées en pourcentage
      const percentX = (newX / maxX) * 100;
      const percentY = (newY / maxY) * 100;

      // Arrondir à 2 décimales pour un affichage plus propre
      const roundedX = Math.round(percentX * 100) / 100;
      const roundedY = Math.round(percentY * 100) / 100;

  
      // Mettre à jour les contrôles de curseur avec les pourcentages de position de l'ancre
      if (gridParent.dataset.patternGrid === "1") {
        this.firstSliderControlTarget.value = roundedX;
        this.secondSliderControlTarget.value = roundedY;
      } else if (gridParent.dataset.patternGrid === "2") {
        this.rowsTarget.value = 1 + (roundedY / 25); // Maps 0-100 to 1-5
        this.columnsTarget.value = 1 + (roundedX / 25); // Maps 0-100 to 1-5
      }

      // Mettre à jour la courbe avec les nouvelles positions des points de contrôle
      this.updateCurve();
    });
  }

  stopDrag = (event) => {
    this.isDragging = false;
    
    // Retirer les écouteurs souris
    document.removeEventListener('mousemove', this.drag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('mouseleave', this.stopDrag);
    
    // Retirer les écouteurs tactiles
    document.removeEventListener('touchmove', this.drag);
    document.removeEventListener('touchend', this.stopDrag);
    document.removeEventListener('touchcancel', this.stopDrag);
  }

  updateCursorPositions() {
    const grid1 = this.gridTargets.find(grid => grid.dataset.patternGrid === "1");
    const grid2 = this.gridTargets.find(grid => grid.dataset.patternGrid === "2");

    if (grid1 && this.hasAnchor1Target) {
      const gridRect1 = grid1.getBoundingClientRect();
      const firstSliderValue = this.firstSliderControlTarget.value;
      const secondSliderValue = this.secondSliderControlTarget.value;

      const newX1 = (firstSliderValue / 100) * gridRect1.width;
      const newY1 = (secondSliderValue / 100) * gridRect1.height;

      this.anchor1Target.style.left = `${newX1}px`;
      this.anchor1Target.style.top = `${newY1}px`;
    }

    if (grid2 && this.hasAnchor2Target) {
      const gridRect2 = grid2.getBoundingClientRect();
      const columnsValue = this.columnsTarget.value;
      const rowsValue = this.rowsTarget.value;

      // Inverser les calculs pour la deuxième grille
      const newX2 = ((columnsValue - 1) / 4) * gridRect2.width;
      const newY2 = ((rowsValue - 1) / 4) * gridRect2.height;

      this.anchor2Target.style.left = `${newX2}px`;
      this.anchor2Target.style.top = `${newY2}px`;
    }
  }

  toggleControls(event) {
    const editor = this.element.closest('.form-editor');

    // Activer les transitions uniquement pour le toggle
    editor.classList.add('is-animating');
    const isCollapsed = editor.classList.toggle('controls-collapsed');

    // Toggle aria-expanded sur le bouton head pour l'accessibilité
    if (event && event.currentTarget) {
      event.currentTarget.setAttribute('aria-expanded', String(!isCollapsed));
    }

    // Rotation du chevron
    if (this.hasControlsToggleIconTarget) {
      this.controlsToggleIconTarget.classList.toggle('rotate-180', isCollapsed);
    }

    // Retirer la classe d'animation et mettre à jour le coversize après la transition
    setTimeout(() => {
      editor.classList.remove('is-animating');
      window.dispatchEvent(new Event('resize'));
    }, 350);
  }

  toggleDraft(event) {
    const button = event.currentTarget;
    const isChecked = button.getAttribute('aria-checked') === 'true';
    const nextState = !isChecked;

    button.setAttribute('aria-checked', nextState);
    button.classList.toggle('is-on', nextState);

    const thumb = button.querySelector('.editor-toggle__thumb');
    if (thumb) {
      thumb.classList.toggle('translate-x-full', nextState);
      thumb.classList.toggle('translate-x-0', !nextState);
    }

    this.draftTarget.value = nextState;
  }
} 
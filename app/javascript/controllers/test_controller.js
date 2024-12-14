import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["path", "firstSliderControl", "secondSliderControl", 
                   "symmetryMode", "curveGroup", "colorPicker", 
                   "rows", "columns", "smoothing", "titleInput", "titleWrapper", "userName", "cover", "patternSettings", "anchor1", "anchor2", "grid", "draft"]
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
    this.updateCursorPositions()

    // Ajouter un écouteur d'événement pour les boutons de symétrie
    this.symmetryModeTargets.forEach(target => {
      target.addEventListener('click', (event) => {
        this.symmetryModeTargets.forEach(btn => {
          btn.classList.remove('active', 'tw-btn-primary');
          btn.classList.add('bg-white', 'tw-btn-secondary');
        });
        event.currentTarget.classList.add('active', 'tw-btn-primary');
        event.currentTarget.classList.remove('bg-white', 'tw-btn-secondary');
        
        // Mettre à jour le mode de symétrie
        this.symmetryMode = event.currentTarget.dataset.value;
        this.updateCurve();
      });
    });
  }

  loadPatternSettings() {
    const patternSettings = JSON.parse(this.patternSettingsTarget.value);
    console.log(patternSettings)
    // Charger les valeurs dans les contrôles

    this.symmetryMode = patternSettings.symmetryMode
    this.colorPickerTarget.value = patternSettings.color;
    this.firstSliderControlTarget.value = patternSettings.firstSliderControl;
    this.secondSliderControlTarget.value = patternSettings.secondSliderControl;
    this.rowsTarget.value = patternSettings.rows;
    this.columnsTarget.value = patternSettings.columns;
    this.smoothingTarget.value = patternSettings.smoothing;

    this.updateSymmetrybutton(patternSettings.symmetryMode)

    console.log(this.colorPickerTarget.value)
    console.log(this.firstSliderControlTarget.value)
    console.log(this.secondSliderControlTarget.value)
    console.log(this.rowsTarget.value)
    console.log(this.columnsTarget.value)
    console.log(this.smoothingTarget.value)
    console.log("settings loaded")
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
    const offsetX = ((totalWidth - (spacingX * columns)) / 2)
    const offsetY = ((totalHeight - (spacingY * rows)) / 2)

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


    // Mettre à jour les boutons pour refléter le mode sélectionné

    this.updateSymmetrybutton(randomMode)
    this.symmetryMode = this.symmetryModeTargets.find(target => target.classList.contains('active')).dataset.value
    
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
      if (target.dataset.value === symmetryMode) {
        target.classList.add('active', 'tw-btn-primary');
        target.classList.remove('bg-white', 'tw-btn-secondary');
      } else {
        target.classList.remove('active', 'tw-btn-primary');
        target.classList.add('bg-white', 'tw-btn-secondary');
      }
    });
  }

  saveSVG() {
    const svgElement = this.curveGroupTarget.closest('svg');
    const svgText = new XMLSerializer().serializeToString(svgElement);
    const coverField = this.coverTarget;
    coverField.value = svgText;
  }

  savePatternSettings() {
    const activeButton = this.symmetryModeTargets.find(target => target.classList.contains('active'));
    console.log(activeButton.dataset.value)
    const patternSettings = {
      symmetryMode: activeButton.dataset.value,
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
    this.isDragging = true;
    this.dragTarget = event.currentTarget;
    this.lastMouseX = event.clientX || event.touches[0].clientX;
    this.lastMouseY = event.clientY || event.touches[0].clientY;
    document.addEventListener('mousemove', this.drag);
    document.addEventListener('mouseup', this.stopDrag);
    document.addEventListener('mouseleave', this.stopDrag);
    document.addEventListener('touchmove', this.drag, { passive: false });
    document.addEventListener('touchend', this.stopDrag);
    document.addEventListener('touchcancel', this.stopDrag);
  }

  drag = (event) => {
    if (!this.isDragging) return;
    
    event.preventDefault(); // Empêche le défilement par défaut sur mobile

    requestAnimationFrame(() => {
      const gridParent = this.dragTarget.parentElement;
      const gridRect = gridParent.getBoundingClientRect();

      // Calculer la position de la souris ou du toucher par rapport à la grille
      const mouseX = (event.clientX || event.touches[0].clientX) - gridRect.left;
      const mouseY = (event.clientY || event.touches[0].clientY) - gridRect.top;

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

      console.log(`Anchor position: ${roundedX}%, ${roundedY}%`);
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
    document.removeEventListener('mousemove', this.drag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('mouseleave', this.stopDrag);
    document.removeEventListener('touchmove', this.drag);
    document.removeEventListener('touchend', this.stopDrag);
    document.removeEventListener('touchcancel', this.stopDrag);
  }

  updateCursorPositions() {
    console.log("updateCursorPositions")
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

  toggleDraft(event) {
    const button = event.currentTarget;
    const isChecked = button.getAttribute('aria-checked') === 'true';
    
    // Inverser l'état du bouton
    button.setAttribute('aria-checked', !isChecked);
    button.querySelector('span[aria-hidden="true"]').classList.toggle('translate-x-5', !isChecked);
    button.querySelector('span[aria-hidden="true"]').classList.toggle('translate-x-0', isChecked);

    // Mettre à jour la classe de couleur du bouton
    if (isChecked) {
      button.classList.remove('bg-primary');
      button.classList.add('bg-gray-200');
    } else {
      button.classList.remove('bg-gray-200');
      button.classList.add('bg-primary');
    }

    // Mettre à jour le champ caché
    this.draftTarget.value = !isChecked;
  }
} 
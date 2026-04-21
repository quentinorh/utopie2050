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
  static targets = [
    "path", "curveGroup", "svg", "bgLayer",
    "firstSliderControl", "secondSliderControl", "symmetryMode",
    "colorPicker", "rows", "columns", "smoothing",
    "anchor1", "anchor2", "grid", "controlsToggleIcon",
    "hueValue", "smoothingValue", "curveValue", "gridValue"
  ]
  static values = { uniqueId: String }

  connect() {
    this.dragPaused = false
    this.renderGridLines()

    const introTarget = this.hasBgLayerTarget ? this.bgLayerTarget : this.element
    gsap.killTweensOf(introTarget);

    gsap.set(introTarget, {
      scale: 1.25,
      opacity: 0
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const svgElement = this.svgTarget;
        const svgRect = svgElement.getBoundingClientRect();
        const containerRect = introTarget.getBoundingClientRect();

        this.totalWidth = containerRect.width || svgRect.width || window.innerWidth;
        this.totalHeight = containerRect.height || svgRect.height || (window.visualViewport?.height - 50 || window.innerHeight - 50);

        if (svgElement.style.height !== '100%') {
          svgElement.style.width = '100%';
          svgElement.style.height = '100%';
        }

        this.generateParameters();
        this.syncControlsFromState();
        this.updateSymmetrybutton(this.mode);
        this.updateValueDisplays();
        this.updateCursorPositions();

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
          gsap.to(introTarget, {
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
      this.animationFrameId = null;
    }
    if (this.isDragging) this.stopDrag();
  }

  updateViewBox() {
    const svgElement = this.svgTarget;
    const refElement = this.hasBgLayerTarget ? this.bgLayerTarget : this.element;
    const containerRect = refElement.getBoundingClientRect();
    const svgRect = svgElement.getBoundingClientRect();

    const totalWidth = containerRect.width || svgRect.width || window.innerWidth;
    const totalHeight = containerRect.height || svgRect.height || (window.visualViewport?.height - 50 || window.innerHeight - 50);

    this.totalWidth = totalWidth;
    this.totalHeight = totalHeight;

    svgElement.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
    this.updateCurve()
    this.updateCursorPositions()
  }

  generateParameters() {
    this.modes = ['x4', 'x8', 'x16'];
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
  }

  // Sync interactive controls with the current internal state.
  syncControlsFromState() {
    if (this.hasFirstSliderControlTarget) this.firstSliderControlTarget.value = Math.round(this.x * 100);
    if (this.hasSecondSliderControlTarget) this.secondSliderControlTarget.value = Math.round(this.x3 * 100);
    if (this.hasSmoothingTarget) this.smoothingTarget.value = Math.round(this.smoothing * 100);
    if (this.hasRowsTarget) this.rowsTarget.value = this.rows;
    if (this.hasColumnsTarget) this.columnsTarget.value = this.columns;
    if (this.hasColorPickerTarget) this.colorPickerTarget.value = this.hue;
  }

  // Apply non-animated control values to internal state. Leaves the
  // oscillating params (x/y/x3/y3) alone so the animation can keep running
  // from wherever it currently is — they are only updated on direct input.
  applyStaticControlsToState() {
    if (this.hasSmoothingTarget) {
      this.smoothing = parseFloat(this.smoothingTarget.value) / 100;
    }
    if (this.hasRowsTarget) {
      this.rows = Math.max(1, Math.round(parseFloat(this.rowsTarget.value) || 1));
    }
    if (this.hasColumnsTarget) {
      this.columns = Math.max(1, Math.round(parseFloat(this.columnsTarget.value) || 1));
    }
    if (this.hasColorPickerTarget) {
      this.hue = parseInt(this.colorPickerTarget.value, 10);
    }
  }

  onControlInput(event) {
    // When a slider moves, sync the relevant internal state from it.
    // For the curve slider we also seed x/y (animation keeps oscillating from there).
    const target = event && event.currentTarget;
    if (target === this.firstSliderControlTarget) {
      const v = parseFloat(this.firstSliderControlTarget.value) / 100;
      this.x = v;
      this.y = 1 - v;
    } else if (target === this.secondSliderControlTarget) {
      const v = parseFloat(this.secondSliderControlTarget.value) / 100;
      this.x3 = v;
      this.y3 = 1 - v;
    }

    this.applyStaticControlsToState();
    this.updateColors();
    this.updateCurve();
    this.updateValueDisplays();
  }

  onSymmetryClick(event) {
    const btn = event.currentTarget;
    this.mode = btn.dataset.value;
    this.updateSymmetrybutton(this.mode);
    this.applyStaticControlsToState();
    this.updateColors();
    this.updateCurve();
  }

  updateCurve() {
    const refElement = this.hasBgLayerTarget ? this.bgLayerTarget : this.element;
    const rect = refElement.getBoundingClientRect();
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

    const translateX = -totalWidth * 0.5;
    const translateY = -totalHeight * 0.5;
    let transforms = []

    switch(mode) {
      case 'x4':
        transforms = [
          `scale(1,1) translate(${translateX},${translateY})`,
          `scale(-1,1) translate(${translateX},${translateY})`,
          `scale(1,-1) translate(${translateX},${translateY})`,
          `scale(-1,-1) translate(${translateX},${translateY})`
        ]
        break
      case 'x8':
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
      case 'x16':
        transforms = [
          `scale(1,1) translate(${translateX},${translateY})`,
          `scale(-1,1) translate(${translateX},${translateY})`,
          `scale(1,-1) translate(${translateX},${translateY})`,
          `scale(-1,-1) translate(${translateX},${translateY})`,
          `rotate(90) scale(1,1) translate(${translateX},${translateY})`,
          `rotate(90) scale(-1,1) translate(${translateX},${translateY})`,
          `rotate(90) scale(1,-1) translate(${translateX},${translateY})`,
          `rotate(90) scale(-1,-1) translate(${translateX},${translateY})`,
          `rotate(45) scale(1,1) translate(${translateX},${translateY})`,
          `rotate(45) scale(-1,1) translate(${translateX},${translateY})`,
          `rotate(45) scale(1,-1) translate(${translateX},${translateY})`,
          `rotate(45) scale(-1,-1) translate(${translateX},${translateY})`,
          `rotate(135) scale(1,1) translate(${translateX},${translateY})`,
          `rotate(135) scale(-1,1) translate(${translateX},${translateY})`,
          `rotate(135) scale(1,-1) translate(${translateX},${translateY})`,
          `rotate(135) scale(-1,-1) translate(${translateX},${translateY})`
        ]
        break
      default:
        transforms = ['scale(1,1) translate(-200,-300)']
    }

    this.curveGroupTarget.innerHTML = ''

    const spacingX = totalWidth / columns
    const spacingY = totalHeight / rows

    const offsetX = ((totalWidth - (spacingX * columns)) / 2) - 1
    const offsetY = ((totalHeight - (spacingY * rows)) / 2) - 1

    const hue = this.hue;
    const backgroundColor = `hsl(${hue}, 50%, 13%)`;

    const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    backgroundRect.setAttribute('width', totalWidth);
    backgroundRect.setAttribute('height', totalHeight);
    backgroundRect.setAttribute('fill', backgroundColor);
    this.curveGroupTarget.appendChild(backgroundRect);

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
    if (!gradient) return;

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
    if (this.dragPaused) {
      // While dragging a handle, the user drives x/y/x3/y3 directly.
      // Skip frames but keep the RAF loop alive so it resumes on drop.
      this.animationFrameId = requestAnimationFrame(this.animateParameters.bind(this));
      return;
    }

    const speed = 0.0007;

    this.x += this.xDirection * speed;
    this.y += this.yDirection * speed;
    this.x3 += this.x3Direction * speed;
    this.y3 += this.y3Direction * speed;

    // Direction-aware clamps so user-set values outside the natural range
    // don't get stuck flipping direction every frame.
    if (this.x <= 0.5 && this.xDirection < 0) this.xDirection = 1;
    else if (this.x >= 1 && this.xDirection > 0) this.xDirection = -1;
    if (this.y <= 0.3 && this.yDirection < 0) this.yDirection = 1;
    else if (this.y >= 0.8 && this.yDirection > 0) this.yDirection = -1;
    if (this.x3 <= 0.2 && this.x3Direction < 0) this.x3Direction = 1;
    else if (this.x3 >= 0.6 && this.x3Direction > 0) this.x3Direction = -1;
    if (this.y3 <= 0.7 && this.y3Direction < 0) this.y3Direction = 1;
    else if (this.y3 >= 1 && this.y3Direction > 0) this.y3Direction = -1;

    this.updateCurve();
    this.updateColors();

    this.animationFrameId = requestAnimationFrame(this.animateParameters.bind(this));
  }

  // === Toolbar actions ===

  randomize() {
    if (this.hasColorPickerTarget) this.colorPickerTarget.value = Math.floor(Math.random() * 360);
    if (this.hasSmoothingTarget) this.smoothingTarget.value = Math.floor(Math.random() * 90) + 10;
    if (this.hasRowsTarget) this.rowsTarget.value = Math.floor(Math.random() * 4) + 1;
    if (this.hasColumnsTarget) this.columnsTarget.value = Math.floor(Math.random() * 4) + 1;

    // Re-seed the oscillating curve params with random values.
    this.x = 0.5 + Math.random() * 0.5;
    this.y = 0.3 + Math.random() * 0.5;
    this.x3 = 0.2 + Math.random() * 0.4;
    this.y3 = 0.7 + Math.random() * 0.3;
    if (this.hasFirstSliderControlTarget) this.firstSliderControlTarget.value = Math.round(this.x * 100);
    if (this.hasSecondSliderControlTarget) this.secondSliderControlTarget.value = Math.round(this.x3 * 100);

    const modes = ['x4', 'x8', 'x16'];
    this.mode = modes[Math.floor(Math.random() * modes.length)];
    this.updateSymmetrybutton(this.mode);

    this.applyStaticControlsToState();
    this.updateColors();
    this.updateCurve();
    this.updateValueDisplays();

    requestAnimationFrame(() => this.updateCursorPositions());
  }

  toggleControls(event) {
    const isCollapsed = this.element.classList.toggle('controls-collapsed');

    if (event && event.currentTarget) {
      event.currentTarget.setAttribute('aria-expanded', String(!isCollapsed));
    }

    if (this.hasControlsToggleIconTarget) {
      this.controlsToggleIconTarget.classList.toggle('rotate-180', isCollapsed);
    }

    if (!isCollapsed) {
      // On opening the panel, sync the controls to the current animation state
      // so the user sees values that match what's on screen.
      this.syncControlsFromState();
      this.updateSymmetrybutton(this.mode);
      this.updateValueDisplays();
      requestAnimationFrame(() => this.updateCursorPositions());
    }
  }

  updateSymmetrybutton(symmetryMode) {
    if (!this.hasSymmetryModeTarget) return;
    this.symmetryModeTargets.forEach(target => {
      target.classList.toggle('is-active', target.dataset.value === symmetryMode);
    });
  }

  updateValueDisplays() {
    if (this.hasHueValueTarget && this.hasColorPickerTarget) {
      this.hueValueTarget.textContent = `${parseInt(this.colorPickerTarget.value, 10)}`;
    }
    if (this.hasSmoothingValueTarget && this.hasSmoothingTarget) {
      this.smoothingValueTarget.textContent = parseInt(this.smoothingTarget.value, 10);
    }
    if (this.hasCurveValueTarget && this.hasFirstSliderControlTarget && this.hasSecondSliderControlTarget) {
      const x = Math.round(parseFloat(this.firstSliderControlTarget.value) || 0);
      const y = Math.round(parseFloat(this.secondSliderControlTarget.value) || 0);
      this.curveValueTarget.textContent = `${x}, ${y}`;
    }
    if (this.hasGridValueTarget && this.hasColumnsTarget && this.hasRowsTarget) {
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

  updateCursorPositions() {
    if (!this.hasGridTarget) return;
    const grid1 = this.gridTargets.find(grid => grid.dataset.patternGrid === "1");
    const grid2 = this.gridTargets.find(grid => grid.dataset.patternGrid === "2");

    if (grid1 && this.hasAnchor1Target && this.hasFirstSliderControlTarget && this.hasSecondSliderControlTarget) {
      const gridRect1 = grid1.getBoundingClientRect();
      if (gridRect1.width > 0) {
        const firstSliderValue = this.firstSliderControlTarget.value;
        const secondSliderValue = this.secondSliderControlTarget.value;

        const newX1 = (firstSliderValue / 100) * gridRect1.width;
        const newY1 = (secondSliderValue / 100) * gridRect1.height;

        this.anchor1Target.style.left = `${newX1}px`;
        this.anchor1Target.style.top = `${newY1}px`;
      }
    }

    if (grid2 && this.hasAnchor2Target && this.hasColumnsTarget && this.hasRowsTarget) {
      const gridRect2 = grid2.getBoundingClientRect();
      if (gridRect2.width > 0) {
        const columnsValue = this.columnsTarget.value;
        const rowsValue = this.rowsTarget.value;

        const newX2 = ((columnsValue - 1) / 4) * gridRect2.width;
        const newY2 = ((rowsValue - 1) / 4) * gridRect2.height;

        this.anchor2Target.style.left = `${newX2}px`;
        this.anchor2Target.style.top = `${newY2}px`;
      }
    }
  }

  // === Drag handles for curve/grid points ===

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
    event.preventDefault();
    this.isDragging = true;
    this.dragPaused = true;
    this.dragTarget = event.currentTarget;

    document.addEventListener('mousemove', this.drag);
    document.addEventListener('mouseup', this.stopDrag);
    document.addEventListener('mouseleave', this.stopDrag);

    document.addEventListener('touchmove', this.drag, { passive: false });
    document.addEventListener('touchend', this.stopDrag);
    document.addEventListener('touchcancel', this.stopDrag);
  }

  drag = (event) => {
    if (!this.isDragging) return;

    event.preventDefault();

    requestAnimationFrame(() => {
      const gridParent = this.dragTarget.parentElement;
      const gridRect = gridParent.getBoundingClientRect();

      const coords = this.getEventCoordinates(event);
      const mouseX = coords.clientX - gridRect.left;
      const mouseY = coords.clientY - gridRect.top;

      const maxX = gridRect.width;
      const maxY = gridRect.height;

      const newX = Math.min(Math.max(0, mouseX), maxX);
      const newY = Math.min(Math.max(0, mouseY), maxY);

      this.dragTarget.style.left = `${newX}px`;
      this.dragTarget.style.top = `${newY}px`;

      const percentX = (newX / maxX) * 100;
      const percentY = (newY / maxY) * 100;

      const roundedX = Math.round(percentX * 100) / 100;
      const roundedY = Math.round(percentY * 100) / 100;

      if (gridParent.dataset.patternGrid === "1") {
        if (this.hasFirstSliderControlTarget) this.firstSliderControlTarget.value = roundedX;
        if (this.hasSecondSliderControlTarget) this.secondSliderControlTarget.value = roundedY;
        this.x = roundedX / 100;
        this.y = roundedY / 100;
      } else if (gridParent.dataset.patternGrid === "2") {
        if (this.hasRowsTarget) this.rowsTarget.value = 1 + (roundedY / 25);
        if (this.hasColumnsTarget) this.columnsTarget.value = 1 + (roundedX / 25);
      }

      this.applyStaticControlsToState();
      this.updateColors();
      this.updateCurve();
      this.updateValueDisplays();
    });
  }

  stopDrag = () => {
    this.isDragging = false;
    this.dragPaused = false;

    document.removeEventListener('mousemove', this.drag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('mouseleave', this.stopDrag);

    document.removeEventListener('touchmove', this.drag);
    document.removeEventListener('touchend', this.stopDrag);
    document.removeEventListener('touchcancel', this.stopDrag);
  }
}

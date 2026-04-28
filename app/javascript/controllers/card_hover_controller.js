import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

// Index-card hover animation.
//
// On `mouseenter` of the parent `.index-card` link, this controller
// starts a forward-only Perlin-driven path morph using the same
// `_regeneratePaths` math as `svg_animation_controller`. Because the
// drift is Perlin (not yoyo), the curves never play-and-reverse —
// they just keep evolving organically while the cursor stays on the
// card. On `mouseleave` we cancel the loop and write the original
// `d` / `transform` attributes back so the card looks identical to
// its at-rest state.
//
// The CSS in `_posts_index.scss` handles a light SVG scale on hover;
// this controller morphs the paths (Perlin) for stronger shape motion.
export default class extends Controller {
  connect() {
    this._link = this.element.closest(".index-card") || this.element
    this._svg = this.element.querySelector(".index-card__svg svg")
    if (!this._svg) return

    // Cache original `d` / `transform` so we can restore on leave —
    // pure idempotent revert, no GSAP needed.
    this._originalPaths = Array.from(this._svg.querySelectorAll("path")).map(p => ({
      el: p,
      d: p.getAttribute("d"),
      transform: p.getAttribute("transform")
    }))

    this._settings = this._readPatternSettings()
    if (!this._settings) return

    this._buildNoise()

    this._onEnter = this._startHover.bind(this)
    this._onLeave = this._endHover.bind(this)
    this._link.addEventListener("mouseenter", this._onEnter)
    this._link.addEventListener("mouseleave", this._onLeave)
  }

  disconnect() {
    if (this._link) {
      this._link.removeEventListener("mouseenter", this._onEnter)
      this._link.removeEventListener("mouseleave", this._onLeave)
    }
    this._stopRaf()
    if (this._enterTween) this._enterTween.kill()
  }

  // --- pattern settings -------------------------------------------

  _readPatternSettings() {
    const input = this.element.querySelector('[data-cover-target="patternSettings"]')
    if (!input) return null
    try { return JSON.parse(input.value) } catch { return null }
  }

  // --- perlin noise -----------------------------------------------

  _buildNoise() {
    const make = () => {
      const g = new Array(256)
      for (let i = 0; i < 256; i++) g[i] = Math.random() * 2 - 1
      return g
    }
    this._noise = {
      first: make(),
      second: make(),
      smoothing: make()
    }
    this._noiseOffsets = {
      first: Math.random() * 1000,
      second: Math.random() * 1000,
      smoothing: Math.random() * 1000
    }
    // Vitesses plus élevées = formes qui bougent davantage au survol.
    this._noiseSpeeds = {
      first: 0.78,
      second: 0.92,
      smoothing: 0.52
    }
  }

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

  // --- hover lifecycle --------------------------------------------

  _startHover() {
    if (this._raf) return
    const s = this._settings
    this._target1 = parseFloat(s.firstSliderControl)
    this._target2 = parseFloat(s.secondSliderControl)
    this._targetSm = parseFloat(s.smoothing)
    this._rows = parseInt(s.rows, 10)
    this._columns = parseInt(s.columns, 10)
    this._symmetryMode = s.symmetryMode

    if ([this._target1, this._target2, this._targetSm, this._rows, this._columns]
        .some(v => Number.isNaN(v))) {
      return
    }

    // Envelope: ease in over ~350ms, then hold at full deviation.
    // Tracked on the GSAP tween so we get smooth progress + auto-cleanup.
    this._envelope = { v: 0 }
    if (this._enterTween) this._enterTween.kill()
    this._enterTween = gsap.to(this._envelope, {
      v: 1,
      duration: 0.35,
      ease: "power2.out"
    })

    this._hoverStart = performance.now()
    this._raf = requestAnimationFrame(this._tick)
  }

  _endHover() {
    this._stopRaf()
    if (this._enterTween) this._enterTween.kill()

    // Smoothly retreat to neutral instead of snapping. Animating the
    // envelope back to 0 while continuing to regenerate gives a
    // graceful settle.
    if (!this._envelope) {
      this._restorePaths()
      return
    }

    if (this._exitTween) this._exitTween.kill()
    this._exitTween = gsap.to(this._envelope, {
      v: 0,
      duration: 0.45,
      ease: "power2.inOut",
      onUpdate: () => this._renderFrame(),
      onComplete: () => this._restorePaths()
    })
  }

  _stopRaf() {
    if (this._raf) {
      cancelAnimationFrame(this._raf)
      this._raf = null
    }
  }

  _restorePaths() {
    this._originalPaths.forEach(p => {
      if (p.d) p.el.setAttribute("d", p.d)
      if (p.transform != null) p.el.setAttribute("transform", p.transform)
    })
  }

  // --- per-frame rendering ----------------------------------------

  _tick = () => {
    this._renderFrame()
    this._raf = requestAnimationFrame(this._tick)
  }

  _renderFrame() {
    const t = (performance.now() - this._hoverStart) / 1000
    const env = this._envelope?.v ?? 0

    // Perturbations Perlin plus amples = courbes qui « respirent » plus.
    const params = {
      firstSliderControl: this._target1 +
        env * 40 * this._perlin1D(this._noiseOffsets.first + t * this._noiseSpeeds.first, this._noise.first),
      secondSliderControl: this._target2 +
        env * 40 * this._perlin1D(this._noiseOffsets.second + t * this._noiseSpeeds.second, this._noise.second),
      smoothing: Math.max(5,
        this._targetSm + env * 24 *
        this._perlin1D(this._noiseOffsets.smoothing + t * this._noiseSpeeds.smoothing, this._noise.smoothing)),
      rows: this._rows,
      columns: this._columns,
      symmetryMode: this._symmetryMode
    }
    this._regeneratePaths(this._svg, params)
  }

  // Identical math to svg_animation_controller's _regeneratePaths so
  // the morph stays consistent with the show-page animation.
  _regeneratePaths(svg, params) {
    const { firstSliderControl, secondSliderControl, smoothing, rows, columns, symmetryMode } = params

    const totalWidth = 250
    const totalHeight = 350
    const width = totalWidth / columns
    const height = totalHeight / rows

    const startPoint = [0, height]

    const x = firstSliderControl / 100
    const y = 1 - firstSliderControl / 100
    const x3 = secondSliderControl / 100
    const y3 = 1 - secondSliderControl / 100

    const sm = smoothing / 100

    const control1 = [(width * x * sm).toFixed(2), (height * sm).toFixed(2)]
    const control2 = [(width * sm).toFixed(2), (height * (1 - y * sm)).toFixed(2)]
    const control3 = [(width * x3 * sm).toFixed(2), (height * (1 - y3 * sm)).toFixed(2)]

    const basePath = `M ${startPoint[0]},${startPoint[1]} C ${control1[0]},${control1[1]} ${control3[0]},${control3[1]} ${control2[0]},${control2[1]}`

    let transforms = []
    switch (symmetryMode) {
      case 'x4':
        transforms = [
          'scale(1,1) translate(-125,-175)', 'scale(-1,1) translate(-125,-175)',
          'scale(1,-1) translate(-125,-175)', 'scale(-1,-1) translate(-125,-175)'
        ]; break
      case 'x8':
        transforms = [
          'scale(1,1) translate(-125,-175)', 'scale(-1,1) translate(-125,-175)',
          'scale(1,-1) translate(-125,-175)', 'scale(-1,-1) translate(-125,-175)',
          'rotate(90) scale(1,1) translate(-125,-175)', 'rotate(90) scale(-1,1) translate(-125,-175)',
          'rotate(90) scale(1,-1) translate(-125,-175)', 'rotate(90) scale(-1,-1) translate(-125,-175)'
        ]; break
      case 'x16':
        transforms = [
          'scale(1,1) translate(-125,-175)', 'scale(-1,1) translate(-125,-175)',
          'scale(1,-1) translate(-125,-175)', 'scale(-1,-1) translate(-125,-175)',
          'rotate(90) scale(1,1) translate(-125,-175)', 'rotate(90) scale(-1,1) translate(-125,-175)',
          'rotate(90) scale(1,-1) translate(-125,-175)', 'rotate(90) scale(-1,-1) translate(-125,-175)',
          'rotate(45) scale(1,1) translate(-125,-175)', 'rotate(45) scale(-1,1) translate(-125,-175)',
          'rotate(45) scale(1,-1) translate(-125,-175)', 'rotate(45) scale(-1,-1) translate(-125,-175)',
          'rotate(135) scale(1,1) translate(-125,-175)', 'rotate(135) scale(-1,1) translate(-125,-175)',
          'rotate(135) scale(1,-1) translate(-125,-175)', 'rotate(135) scale(-1,-1) translate(-125,-175)'
        ]; break
      default:
        transforms = ['scale(1,1) translate(-200,-300)']
    }

    const spacingX = totalWidth / columns
    const spacingY = totalHeight / rows
    const offsetX = (totalWidth - spacingX * columns) / 2
    const offsetY = (totalHeight - spacingY * rows) / 2

    const allPaths = Array.from(svg.querySelectorAll('path'))
    let pathIndex = 0
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        transforms.forEach((baseTransform) => {
          if (pathIndex < allPaths.length) {
            const gridTransform = `translate(${offsetX + spacingX * col + width / 2}, ${offsetY + spacingY * row + height / 2})`
            allPaths[pathIndex].setAttribute('d', basePath)
            allPaths[pathIndex].setAttribute('transform', `${gridTransform} ${baseTransform}`)
            pathIndex++
          }
        })
      }
    }
  }
}

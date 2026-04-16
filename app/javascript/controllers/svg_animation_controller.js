import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

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
  connect() {
    this._cacheHandler = () => {
      if (this._mainTl) this._mainTl.kill()
      this._breatheTweens?.forEach(t => t.kill())

      const cover = this.element.querySelector('.cover')
      if (cover) {
        gsap.killTweensOf(cover)
        cover.style.opacity = '0'
        cover.classList.add('opacity-0')
      }
      const svg = this.element.querySelector('.cover-svg svg') || this.element.querySelector('.cover-svg')?.firstElementChild
      if (svg) gsap.killTweensOf(svg)
      // Reset title
      const titleWrapper = this.element.querySelector('.cover-title-text')
      if (titleWrapper) {
        if (this._originalTitle) titleWrapper.textContent = this._originalTitle
        titleWrapper.style.backgroundColor = this._originalTitleBg || ''
        titleWrapper.style.clipPath = ''
      }
      // Reset username
      const username = this.element.querySelector('.cover-username')
      if (username) {
        username.style.width = ''
        username.style.overflow = ''
        username.style.whiteSpace = ''
        username.style.clipPath = ''
      }
      // Reset metadata & separator
      const metadata = this.element.querySelector('.show-metadata')
      if (metadata) metadata.style.opacity = ''
      const separator = this.element.querySelector('.show-separator')
      if (separator) { separator.style.transform = ''; separator.style.transformOrigin = '' }
    }
    document.addEventListener('turbo:before-cache', this._cacheHandler)
    requestAnimationFrame(() => this._runAnimation())
  }

  disconnect() {
    document.removeEventListener('turbo:before-cache', this._cacheHandler)
    if (this._mainTl) this._mainTl.kill()
    this._breatheTweens?.forEach(t => t.kill())
  }

  _getPatternSettings() {
    const raw = this.element.dataset.coverPatternSettingsValue
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

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

  _runAnimation() {
    const cover = this.element.querySelector('.cover')
    const shapes = this.element.querySelector('.cover-svg')
    const svg = shapes?.querySelector('svg') || shapes?.firstElementChild
    if (!svg) return

    // Fill entire cover panel
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice')

    const settings = this._getPatternSettings()
    const tl = gsap.timeline()
    this._mainTl = tl
    this._breatheTweens = []

    // ─── 1. Cover appears instantly, no circle zoom ───
    gsap.set(cover, { opacity: 1 })
    cover.classList.remove('opacity-0')

    // ─── 2. Dramatic SVG parameter morph ───
    if (settings) {
      const target1 = parseFloat(settings.firstSliderControl)
      const target2 = parseFloat(settings.secondSliderControl)
      const targetSmoothing = parseFloat(settings.smoothing)
      const rows = parseInt(settings.rows)
      const columns = parseInt(settings.columns)
      const symmetryMode = settings.symmetryMode

      // Start from very different values — dramatic morph
      const params = {
        firstSliderControl: target1 + (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 20),
        secondSliderControl: target2 + (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 20),
        smoothing: Math.max(5, targetSmoothing + (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 15)),
        rows, columns, symmetryMode
      }

      // Render the starting state immediately
      this._regeneratePaths(svg, params)

      // Long dramatic morph to final values
      tl.to(params, {
        firstSliderControl: target1,
        secondSliderControl: target2,
        smoothing: targetSmoothing,
        duration: 2.4,
        ease: coverEase,
        onUpdate: () => this._regeneratePaths(svg, params)
      }, 0)

      // Breathing after morph settles
      const breatheParams = {
        firstSliderControl: target1,
        secondSliderControl: target2,
        smoothing: targetSmoothing,
        rows, columns, symmetryMode
      }

      const breathe1 = gsap.to(breatheParams, {
        firstSliderControl: target1 + (Math.random() - 0.5) * 8,
        secondSliderControl: target2 + (Math.random() - 0.5) * 8,
        smoothing: targetSmoothing + (Math.random() - 0.5) * 5,
        duration: 4 + Math.random() * 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 2.6,
        onUpdate: () => this._regeneratePaths(svg, breatheParams)
      })
      this._breatheTweens.push(breathe1)
    }

    // ─── 3. Title — single div, clip-path wipe left → right ───
    const titleWrapper = this.element.querySelector('.cover-title-text')
    if (titleWrapper) {
      this._originalTitle = titleWrapper.textContent.trim()
      this._originalTitleBg = titleWrapper.style.backgroundColor

      // Hide with clip-path (fully clipped from right)
      gsap.set(titleWrapper, { clipPath: 'inset(0 100% 0 0)' })

      tl.to(titleWrapper, {
        clipPath: 'inset(0 0% 0 0)',
        duration: 0.8,
        ease: coverEase
      }, 0.6)
    }

    // ─── 4. Username — clip-path wipe left → right ───
    const username = this.element.querySelector('.cover-username')
    if (username) {
      gsap.set(username, { clipPath: 'inset(0 100% 0 0)' })
      tl.to(username, {
        clipPath: 'inset(0 0% 0 0)',
        duration: 0.8,
        ease: coverEase
      }, 0.4)
    }

    // ─── 5. Metadata + separator ───
    const metadata = this.element.querySelector('.show-metadata')
    const separator = this.element.querySelector('.show-separator')

    if (metadata) {
      gsap.set(metadata, { opacity: 0 })
      tl.to(metadata, { opacity: 0.4, duration: 0.8, ease: coverEase }, 1.2)
    }
    if (separator) {
      gsap.set(separator, { scaleX: 0, transformOrigin: 'left center' })
      tl.to(separator, { scaleX: 1, duration: 0.8, ease: coverEase }, 1.0)
    }

    gsap.ticker.fps(30)
  }
}

import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"
import { reveal } from "utils/motion"

// cubic-bezier(0.625, 0.05, 0, 1) — same coverEase used on the show page,
// so the editor entrance feels like a natural continuation.
function coverEase(t) {
  const x1 = 0.625, y1 = 0.05, x2 = 0, y2 = 1
  let guess = t
  for (let i = 0; i < 8; i++) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
    const currentX = ((ax * guess + bx) * guess + cx) * guess
    const currentSlope = (3 * ax * guess + 2 * bx) * guess + cx
    if (currentSlope === 0) break
    guess -= (currentX - t) / currentSlope
  }
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  return ((ay * guess + by) * guess + cy) * guess
}

// Staggered reveal for the editor:
// 1. Cover panel fades in
// 2. Title + username clip-path wipe
// 3. Cover-pill toolbar (params + randomize) clip-path wipe
// 4. Right column header (title field, meta, body) fade-up
// 5. Action bar slides in from the bottom
export default class extends Controller {
  connect() {
    // Add .is-revealing synchronously so the CSS-gated initial states apply
    // before the next paint — avoids a flash of fully-rendered content
    // before the timeline runs.
    this.element.classList.add("is-revealing")

    this._cacheHandler = () => this._reset()
    document.addEventListener("turbo:before-cache", this._cacheHandler)

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this._revealInstant()
    } else {
      this._run()
    }
  }

  // Accessibilité : pas d'animation d'entrée, on montre l'état final direct.
  _revealInstant() {
    this._tl?.kill()
    this.element.classList.remove("is-revealing")
    this.element.querySelectorAll(
      ".form-cover-svg, .cover-pill--reveal, .cover-title-text, .cover-username, .editor-stagger, .editor-actionbar"
    ).forEach(el => {
      el.style.opacity = ""
      el.style.transform = ""
      el.style.clipPath = ""
    })
    const skeleton = this.element.querySelector(".editor-skeleton")
    if (skeleton) skeleton.style.display = "none"
    this.element.querySelectorAll(
      ".editor-body-field .editor-textarea, .editor-body-field .editor-draft-layer"
    ).forEach(el => { el.style.opacity = "" })
    const drawline = this.element.querySelector(".editor-drawline")
    if (drawline) drawline.style.transform = "scaleX(1)"
  }

  disconnect() {
    document.removeEventListener("turbo:before-cache", this._cacheHandler)
    this._tl?.kill()
    this.element.classList.remove("is-revealing")
  }

  _reset() {
    this._tl?.kill()
    const all = this.element.querySelectorAll(
      ".form-cover-svg, .cover-pill--reveal, .cover-title-text, .cover-username, .editor-stagger, .editor-actionbar"
    )
    all.forEach(el => {
      gsap.killTweensOf(el)
      el.style.opacity = ""
      el.style.transform = ""
      el.style.clipPath = ""
    })
    // Re-arm for the next page show (Turbo restores from cache).
    this.element.classList.add("is-revealing")
  }

  _run() {
    // When the timeline completes, strip every inline style we wrote so that
    // downstream CSS rules can take over without being out-prioritised by
    // inline `style=""`.
    const tl = gsap.timeline({
      onComplete: () => {
        this.element.classList.remove("is-revealing")
        const cleanup = this.element.querySelectorAll(
          ".form-cover-svg, .cover-pill--reveal, .cover-title-text, .cover-username, .editor-stagger, .editor-actionbar"
        )
        cleanup.forEach(el => {
          el.style.opacity = ""
          el.style.transform = ""
          el.style.clipPath = ""
          el.style.transformOrigin = ""
        })
      }
    })
    this._tl = tl

    const cover = this.element.querySelector(".form-cover-svg")
    if (cover) {
      gsap.set(cover, { opacity: 0 })
      tl.to(cover, { opacity: 1, duration: 0.6, ease: coverEase }, 0)
    }

    const username = this.element.querySelector(".cover-username")
    if (username) {
      gsap.set(username, { clipPath: "inset(0 100% 0 0)" })
      tl.to(username, { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: coverEase }, 0.35)
    }

    const title = this.element.querySelector(".cover-title-text")
    if (title) {
      gsap.set(title, { clipPath: "inset(0 100% 0 0)" })
      tl.to(title, { clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: coverEase }, 0.45)
    }

    const allRevealPills = this.element.querySelectorAll(".cover-pill--reveal")
    const toolbarRevealPills = this.element.querySelectorAll(".cover-toolbar .cover-pill--reveal")
    if (allRevealPills.length) {
      const toolbarSet = new Set(toolbarRevealPills)
      const wipePills = Array.from(allRevealPills).filter((el) => !toolbarSet.has(el))

      // Toolbar : opacité + léger slide (y) — ne pas combiner translateY en CSS + clip GSAP
      // (le SCSS ne met plus de translate pendant .is-revealing, le y est entièrement tween ici).
      if (toolbarRevealPills.length) {
        gsap.set(toolbarRevealPills, { opacity: 0, y: 10 })
        tl.to(toolbarRevealPills, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: coverEase,
          stagger: 0.08
        }, 0.7)
      }

      if (wipePills.length) {
        gsap.set(wipePills, { clipPath: "inset(0 100% 0 0)", opacity: 0 })
        tl.to(wipePills, {
          clipPath: "inset(0 0% 0 0)",
          opacity: 1,
          duration: 0.6,
          ease: coverEase,
          stagger: 0.08
        }, 0.7)
      }
    }

    // La barre s'ouvre au repos sur le dé + le bouton Paramètres : les groupes
    // de réglages sont hors flux tant que l'utilisateur ne les déplie pas, il
    // n'y a donc plus de popover à révéler ici.

    // Reveal staggeré : easing/durée/stagger repris de mm-content-anim
    // (fr.familleperrin.com), exposés via utils/motion.
    const staggered = this.element.querySelectorAll(".editor-stagger")
    if (staggered.length) {
      gsap.set(staggered, { opacity: 0, y: 12 })
      tl.to(staggered, {
        opacity: 1,
        y: 0,
        duration: reveal.duration,
        ease: reveal.ease,
        stagger: reveal.stagger
      }, 0.55)
    }

    // Trait qui se dessine sous le titre, dans le fil des staggers.
    const drawline = this.element.querySelector(".editor-drawline")
    if (drawline) {
      gsap.set(drawline, { scaleX: 0, transformOrigin: "left center" })
      tl.to(drawline, { scaleX: 1, duration: 0.7, ease: coverEase }, 0.72)
    }

    // Skeleton → brouillon : le corps prérempli (issu de l'entonnoir) se révèle
    // à partir de lignes squelette qui s'estompent. Nouveau texte uniquement.
    const skeleton = this.element.querySelector(".editor-skeleton")
    if (skeleton) {
      const field = skeleton.closest(".editor-body-field")
      // Le calque de balisage se révèle avec le textarea : les deux couches
      // forment une seule image.
      const body = field
        ? Array.from(field.querySelectorAll(".editor-textarea, .editor-draft-layer"))
        : []
      if (body.length) gsap.set(body, { opacity: 0 })
      gsap.set(skeleton, { opacity: 1 })
      const at = 1.0
      if (body.length) tl.to(body, { opacity: 1, duration: 0.55, ease: reveal.ease }, at)
      tl.to(skeleton, {
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        onComplete: () => { skeleton.style.display = "none" }
      }, at)
    }

    const actionbar = this.element.querySelector(".editor-actionbar")
    if (actionbar) {
      gsap.set(actionbar, { y: "100%" })
      tl.to(actionbar, { y: "0%", duration: 0.55, ease: coverEase }, 0.85)
    }
  }
}

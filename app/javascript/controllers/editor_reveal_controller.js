import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

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
    requestAnimationFrame(() => this._run())
  }

  disconnect() {
    document.removeEventListener("turbo:before-cache", this._cacheHandler)
    this._tl?.kill()
    this.element.classList.remove("is-revealing")
  }

  _reset() {
    this._tl?.kill()
    const all = this.element.querySelectorAll(
      ".form-cover-svg, .cover-pill--reveal, .cover-title-text, .cover-username, .editor-stagger, .editor-actionbar, .cover-controls__body"
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
    // downstream CSS rules (e.g. `.controls-collapsed .cover-controls__body`)
    // can take over without being out-prioritised by inline `style=""`.
    const tl = gsap.timeline({
      onComplete: () => {
        this.element.classList.remove("is-revealing")
        const cleanup = this.element.querySelectorAll(
          ".form-cover-svg, .cover-pill--reveal, .cover-title-text, .cover-username, .editor-stagger, .editor-actionbar, .cover-controls__body"
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

    const pills = this.element.querySelectorAll(".cover-pill--reveal")
    if (pills.length) {
      gsap.set(pills, { clipPath: "inset(0 100% 0 0)", opacity: 0 })
      tl.to(pills, {
        clipPath: "inset(0 0% 0 0)",
        opacity: 1,
        duration: 0.6,
        ease: coverEase,
        stagger: 0.08
      }, 0.7)
    }

    // Le popover des paramètres flotte sous le pill head — on le révèle
    // juste après le head pour éviter qu'il n'apparaisse en orphelin.
    const popover = this.element.querySelector(".cover-controls__body")
    if (popover) {
      gsap.set(popover, { opacity: 0, y: -8, scale: 0.96, transformOrigin: "top left" })
      tl.to(popover, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        ease: coverEase
      }, 0.85)
    }

    const staggered = this.element.querySelectorAll(".editor-stagger")
    if (staggered.length) {
      gsap.set(staggered, { opacity: 0, y: 12 })
      tl.to(staggered, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: coverEase,
        stagger: 0.07
      }, 0.55)
    }

    const actionbar = this.element.querySelector(".editor-actionbar")
    if (actionbar) {
      gsap.set(actionbar, { y: "100%" })
      tl.to(actionbar, { y: "0%", duration: 0.55, ease: coverEase }, 0.85)
    }
  }
}

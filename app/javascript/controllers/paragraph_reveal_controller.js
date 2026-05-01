import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"
import scrollTrigger from "gsap/scrollTrigger"

gsap.registerPlugin(scrollTrigger)

// cubic-bezier(0.625, 0.05, 0, 1) — même easing que coverEase utilisé sur
// le post show / l'éditeur, pour homogénéiser la sensation des révélations.
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

// Révèle en cascade les enfants d'un bloc (paragraphes par défaut) à l'entrée
// dans le viewport : fade + léger slide-up. Conçu pour les blocs introductifs
// type chapeau de page, où l'on veut accompagner la lecture sans bloquer
// le rendu initial avec un scrub coûteux.
export default class extends Controller {
  static values = {
    selector: { type: String, default: ":scope > p" },
    stagger:  { type: Number, default: 0.15 },
    duration: { type: Number, default: 0.9 },
    y:        { type: String, default: "1.25em" },
    start:    { type: String, default: "top 85%" },
    delay:    { type: Number, default: 0 }
  }

  connect() {
    const items = this.element.querySelectorAll(this.selectorValue)
    if (!items.length) return

    // Si le bloc est déjà bien visible au connect (ex. retour Turbo cache),
    // on évite de le cacher pour ne pas créer un saut visuel.
    const rect = this.element.getBoundingClientRect()
    const alreadyVisible = rect.top < window.innerHeight * 0.5

    gsap.set(items, { opacity: 0, y: this.yValue, willChange: "transform, opacity" })

    this.tween = gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: this.durationValue,
      stagger: this.staggerValue,
      delay: this.delayValue,
      ease: coverEase,
      clearProps: "willChange",
      scrollTrigger: alreadyVisible ? undefined : {
        trigger: this.element,
        start: this.startValue,
        once: true
      }
    })
  }

  disconnect() {
    this.tween?.scrollTrigger?.kill()
    this.tween?.kill()
  }
}

// Easings + durées calqués sur l'animation de contenu mm-content-anim de
// fr.familleperrin.com (transition next/prev). Valeurs reprises de sa config :
//   eases.hop        = cubic-bezier(0.87, 0, 0.13, 1)   (titre "in")
//   NAV_EASE         = cubic-bezier(0.7, 0, 0.15, 1)
//   eases.slideshow  = cubic-bezier(0.6, 0.08, 0.02, 0.99)
//   sortie "out"     = power4.inOut, durée ~.5 ; entrée "in" ~.6
// Exportés comme variables pour être appelés dans les reveals staggerés.

// Fabrique une fonction d'easing GSAP à partir d'un cubic-bezier (x1,y1,x2,y2).
export function cubicBezier(x1, y1, x2, y2) {
  return (t) => {
    let guess = t
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    for (let i = 0; i < 8; i++) {
      const currentX = ((ax * guess + bx) * guess + cx) * guess
      const currentSlope = (3 * ax * guess + 2 * bx) * guess + cx
      if (currentSlope === 0) break
      guess -= (currentX - t) / currentSlope
    }
    const cy = 3 * y1
    const by = 3 * (y2 - y1) - cy
    const ay = 1 - cy - by
    return ((ay * guess + by) * guess + cy) * guess
  }
}

export const easings = {
  hop: cubicBezier(0.87, 0, 0.13, 1),
  nav: cubicBezier(0.7, 0, 0.15, 1),
  slideshowWipe: cubicBezier(0.6, 0.08, 0.02, 0.99),
}

// Reveal staggeré (entrée de page).
export const reveal = {
  ease: easings.hop,
  duration: 0.6,
  stagger: 0.12,
}

// Transition d'étape de l'assistant (clic next/prev).
export const step = {
  out: { ease: "power4.inOut", duration: 0.5 },
  in: { ease: easings.hop, duration: 0.6 },
}

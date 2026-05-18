/** Plafond curseur pour le rendu : le curseur peut aller à 100 sans que le facteur atteigne 1. */
export const PATTERN_SMOOTHING_SLIDER_CAP = 98

/** Valeur curseur (typiquement 10–100) → facteur Bézier utilisé pour les paths. */
export function patternSmoothingFactorFromSlider(sliderValue) {
  const n = Number(sliderValue)
  if (!Number.isFinite(n)) return 0.5
  return Math.min(n, PATTERN_SMOOTHING_SLIDER_CAP) / 100
}

/** Facteur déjà dans [0, 1] (ex. état interne animé). */
export function clampPatternSmoothingFactor(factor) {
  const x = Number(factor)
  if (!Number.isFinite(x)) return 0.5
  return Math.min(x, PATTERN_SMOOTHING_SLIDER_CAP / 100)
}

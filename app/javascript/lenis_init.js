/**
 * Doit être chargé avant `import "controllers"` pour que `window.lenis` existe
 * dès que Stimulus exécute connect() (sinon la molette desktop n’est pas synchronisée).
 */
import Lenis from "@studio-freight/lenis"

export const lenis = new Lenis({
  lerp: 0.1,
  wheelMultiplier: 1
})

window.lenis = lenis

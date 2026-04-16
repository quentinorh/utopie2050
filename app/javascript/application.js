import { Turbo } from "@hotwired/turbo-rails"
import "controllers"
import Lenis from "@studio-freight/lenis"
import gsap from "gsap"
import scrollTriggerImport from "gsap/scrollTrigger"

// JSPM ships ScrollTrigger as either the class or `{ ScrollTrigger }`
// depending on the build — normalise once.
const ScrollTrigger = scrollTriggerImport.ScrollTrigger || scrollTriggerImport
gsap.registerPlugin(ScrollTrigger)

// Lenis smooth scroll, driven by GSAP's ticker so scrub-true ScrollTrigger
// timelines stay frame-perfectly in sync with the interpolated scroll
// position. Two things matter here, both per Lenis' official GSAP recipe:
//
//   1. `gsap.ticker.add(t => lenis.raf(t * 1000))` — Lenis is ticked by
//      the SAME RAF that GSAP uses, so a Lenis scroll write happens in
//      the same frame as the ScrollTrigger update that reads it. With
//      separate RAF loops the two drift one frame apart and `scrub`
//      tweens visibly stop firing.
//   2. `gsap.ticker.lagSmoothing(0)` — disables GSAP's tab-throttled
//      time skipping, otherwise long pauses (e.g. devtools) make Lenis
//      desync.
//
// `lenis.on("scroll", ScrollTrigger.update)` keeps ST's internal cache
// of scrollY current even between ticks (e.g. on programmatic scrolls).
//
// ScrollTrigger.refresh() is fired on first paint, on Turbo navigation,
// and after fonts settle, because cover SVGs/late images change
// document height and trigger bounds need to be recomputed against the
// final layout — otherwise `start: top bottom` lands past document end
// and the timeline never plays.
const lenis = new Lenis({
  lerp: 0.1,
  wheelMultiplier: 1
})
window.lenis = lenis

lenis.on("scroll", ScrollTrigger.update)
gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)

const refreshTriggers = () => ScrollTrigger.refresh()
window.addEventListener("load",         refreshTriggers)
document.addEventListener("turbo:load", refreshTriggers)
document.fonts?.ready?.then(refreshTriggers)
// Late refresh — covers the case where SVGs / Cloudinary images render
// past turbo:load. Cheap, just runs once 600ms after each navigation.
document.addEventListener("turbo:load", () =>
  setTimeout(refreshTriggers, 600))

// Expose for debugging from the browser console:
//   ScrollTrigger.getAll() → registered triggers
//   lenis.scroll           → current Lenis scroll position
window.ScrollTrigger = ScrollTrigger

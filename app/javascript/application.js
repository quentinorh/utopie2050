import "@hotwired/turbo-rails"
import "controllers"
import Lenis from '@studio-freight/lenis';

const lenis = new Lenis({
  lerp: 0.1, 
  wheelMultiplier: 1
})

function raf(time) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}

requestAnimationFrame(raf)

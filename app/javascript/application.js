import { Turbo } from "@hotwired/turbo-rails"
import { lenis } from "lenis_init"
import "controllers"

function raf(time) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}

requestAnimationFrame(raf)

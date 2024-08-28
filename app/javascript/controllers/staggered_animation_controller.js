import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap";

export default class extends Controller {

  static targets = ["element"]

  connect() {
    console.log(this.elementTargets)

    // Create a timeline for the staggered animation
    const tl = gsap.timeline();

    // Add each element to the timeline with a staggered effect
    tl.fromTo(this.elementTargets, 
      { opacity: 0 },
      { 
        opacity: 1, 
        duration: 0.5, 
        stagger: 0.1, 
        ease: "power2.out"
      }
    );
  }
}

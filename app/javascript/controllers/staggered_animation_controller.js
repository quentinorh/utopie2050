import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap";
import scrollTrigger from "gsap/scrollTrigger";

export default class extends Controller {

  static targets = ["element"]

  connect() {
    const allItemsToAnimate = this.elementTargets;
    
    const tl = gsap.timeline();

    tl.fromTo(allItemsToAnimate, 
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

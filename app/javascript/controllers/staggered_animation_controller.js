import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap";
import scrollTrigger from "gsap/scrollTrigger";

export default class extends Controller {

  static targets = ["element"]

  connect() {
    const staggerCount = parseInt(this.elementTarget.dataset.staggerCount);
    const initialItemsToAnimate = this.elementTargets.slice(0, Math.min(staggerCount, 25));
    const remainingItemsToAnimate = this.elementTargets.slice(Math.min(staggerCount, 25));

    
    const tl = gsap.timeline();

    tl.fromTo(initialItemsToAnimate, 
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

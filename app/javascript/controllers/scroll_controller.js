// app/javascript/controllers/scroll_controller.js
import { Controller } from "@hotwired/stimulus";
import Splitting from "splitting";
import gsap from "gsap";
import scrollTrigger from "gsap/scrollTrigger";

gsap.registerPlugin(scrollTrigger);

export default class extends Controller {
  static targets = ["content", "scrollPercentage"];

  connect() {
    this.updateScrollPercentage();
    Splitting({ target: this.contentTarget, by: 'lines' });
    window.addEventListener("scroll", this.updateScrollPercentage.bind(this));

    const lines = this.contentTarget.querySelectorAll('.word');
    
    lines.forEach((line) => {
      gsap.fromTo(line, 
        { opacity: 0,
          skewY: 10, 
          ease: "power4.out",
          stagger: {
            amount: 0.4
          },
         },
        {
          opacity: 1,
          scrollTrigger: {
            trigger: line,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
            toggleActions: "play none none none"
          }
        }
      );
    });
  }

  disconnect() {
    window.removeEventListener("scroll", this.updateScrollPercentage.bind(this));
  }

  updateScrollPercentage() {
    const content = this.contentTarget;
    const scrollPercentage = this.calculateScrollPercentage(content);
    this.scrollPercentageTarget.textContent = scrollPercentage;
  }

  calculateScrollPercentage(element) {
    let elementTop = element.offsetTop;
    let elementHeight = element.offsetHeight;
    let scrollTop = window.scrollY - elementTop;
    let visibleHeight = window.innerHeight;
    let scrollPercent = scrollTop / (elementHeight - visibleHeight);
    
    return Math.max(0, Math.min(100, Math.round(scrollPercent * 100)));
  }
}

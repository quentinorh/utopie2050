// app/javascript/controllers/scroll_controller.js
import { Controller } from "@hotwired/stimulus";
import Splitting from 'splitting';
//import ScrollTrigger from "gsap/ScrollTrigger";

export default class extends Controller {
  static targets = ["content", "scrollPercentage"];

  connect() {
    this.updateScrollPercentage();
    Splitting({ target: this.contentTarget, by: 'lines' });
    window.addEventListener("scroll", this.updateScrollPercentage.bind(this));

    // ScrollTrigger.create({
    //   trigger: element,
    //   start: "top bottom",
    //   end: "bottom top",
    //   scrub:true,
    //   //markers:true,
    //   animation: textrev,
    //   toggleActions: "play none none none",
    // });
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

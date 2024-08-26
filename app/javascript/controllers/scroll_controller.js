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
    let scrollTop = window.scrollY;
    let docHeight = document.body.offsetHeight;
    let winHeight = window.innerHeight;
    let scrollPercent = scrollTop / (docHeight - winHeight);
    
    return Math.round(scrollPercent * 100);
  }
}

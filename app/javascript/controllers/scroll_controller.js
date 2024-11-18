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
    window.addEventListener("scroll", this.updateScrollPercentage.bind(this));
  }

  disconnect() {
    window.removeEventListener("scroll", this.updateScrollPercentage.bind(this));
  }

  updateScrollPercentage() {
    const content = this.contentTarget;
    const scrollPercentage = this.calculateScrollPercentage(content);
    
    // Mettre à jour tous les scrollPercentageTargets
    this.scrollPercentageTargets.forEach(target => {
        target.textContent = scrollPercentage;
    });
  }

  calculateScrollPercentage(element) {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const elementTop = element.getBoundingClientRect().top + scrollTop;
    const scrollDistance = documentHeight - windowHeight;
    
    if (scrollDistance <= 0) return 100;
    
    const percentage = ((scrollTop - elementTop) / (scrollDistance - elementTop)) * 100;
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }
}

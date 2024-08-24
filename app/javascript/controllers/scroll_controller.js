// app/javascript/controllers/scroll_controller.js
import { Controller } from "@hotwired/stimulus";

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

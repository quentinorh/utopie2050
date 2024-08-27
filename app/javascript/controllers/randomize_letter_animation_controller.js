// app/javascript/controllers/randomize_letter_animation_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = []

  connect() {
    const originalText = this.element.textContent;
    const animationDuration = 1000; // 1 second
    const refreshInterval = 50; // Refresh every 50ms
    const totalIterations = animationDuration / refreshInterval;
    let currentIteration = 0;

    const animateText = () => {
      if (currentIteration < totalIterations) {
        const animatedText = originalText.split('').map((char, index) => {
          if (index === 2 || index === 5) return '.';
          if (index < 2 || (index > 2 && index < 5) || index > 5) {
            return Math.random() < currentIteration / totalIterations
              ? char
              : Math.floor(Math.random() * 10);
          }
          return char;
        }).join('');

        this.element.textContent = animatedText;
        currentIteration++;
        setTimeout(animateText, refreshInterval);
      } else {
        this.element.textContent = originalText;
      }
    };

    animateText();
  }
}

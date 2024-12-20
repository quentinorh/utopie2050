// app/javascript/controllers/randomize_letter_animation_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = []
  static values = { text: String }

  connect() {
    const originalText = this.textValue;
    const animationDuration = 400; // 1 second
    const refreshInterval = 60;
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

import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "title", "titleWrapper", "userName", "patternSettings", "postColor"
  ]

  static values = {
    hue: Number,
    patternSettings: Object
  }

  connect() {
    this.initializeHue();
    this.updateTitle();
  }

  initializeHue() {
    if (this.hasPatternSettingsTarget) {
      const settings = JSON.parse(this.patternSettingsTarget.value);
      this.hueValue = parseInt(settings.hue);
    } else if (this.hasPostColorTarget) {
      const hslMatch = this.postColorTarget.value.match(/hsl\((\d+),/);
      if (hslMatch) {
        this.hueValue = parseInt(hslMatch[1]);
      }
    }
  }

  updateTitle() {
    const title = this.titleTarget.value
    this.titleWrapperTarget.innerHTML = '';

    const hue = this.hueValue;
    const backgroundColor = `hsl(${hue}, 80%, 70%)`;

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    
    titleSpan.style.boxShadow = `0 0 0 10px ${backgroundColor}`;
    titleSpan.style.backgroundColor = backgroundColor;

    this.userNameTarget.style.backgroundColor = backgroundColor

    titleSpan.classList.add('leading-relaxed', 'box-decoration-clone');

    this.titleWrapperTarget.appendChild(titleSpan);
  }

  
}

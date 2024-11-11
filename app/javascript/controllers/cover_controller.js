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
    this.initializeTitle();
    this.initializeUserName();
    this.updateColors();
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

  initializeTitle() {
    const currentTitle = this.titleTarget.value || "Futur titre";
    this.splitAndWrapText(currentTitle);
  }

  initializeUserName() {
    const userName = this.userNameTarget.textContent.trim() || this.usernameValue;
    this.styleUserName(userName);
  }

  splitAndWrapText(text) {
    if (!text || text.trim() === "") {
      text = "Futur titre";
    }
    
    const fillColor = this.getHslColor()
    const textColor = this.getContrastColor(fillColor)

    this.titleWrapperTarget.innerHTML = 
      `<span class="p-xs inline-block" style="background-color: ${fillColor}; color: ${textColor}; word-break:break-word;">${text}</span>`
  }

  styleUserName(userName) {
    const fillColor = this.getHslColor()
    const textColor = this.getContrastColor(fillColor)

    this.userNameTarget.innerHTML = `<span class="p-xs mt-[-2px] inline-block" style="background-color: ${fillColor}; color: ${textColor};">${userName}</span>`
  }

  getTextWidth(text) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    context.font = getComputedStyle(this.titleWrapperTarget).font
    return context.measureText(text).width
  }

  updateColors() {
    const fillColor = this.getHslColor()
    const textColor = this.getContrastColor(fillColor)

    this.titleWrapperTarget.querySelectorAll('span').forEach(span => {
      span.style.backgroundColor = fillColor
      span.style.color = textColor
    })

    this.userNameTarget.querySelector('span').style.backgroundColor = fillColor
    this.userNameTarget.querySelector('span').style.color = textColor
  }

  getHslColor() {
    return `hsl(${this.hueValue || 0}, 80%, 70%)`;
  }

  getContrastColor(backgroundColor) {
    const rgb = this.hslToRgb(this.hueValue / 360, 0.8, 0.7)
    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
    return brightness > 128 ? '#000000' : '#FFFFFF'
  }

  hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
}

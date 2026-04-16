import { Controller } from "@hotwired/stimulus"
import { fitTitleWrapperToLongestLine } from "utils/fit_title_to_longest_line"

export default class extends Controller {
  static targets = [
    "title", "titleWrapper", "userName", "patternSettings", "postColor"
  ]

  static values = {
    hue: Number,
    patternSettings: Object
  }

  connect() {
    this.initializeHue()
    this.updateTitle()
    this.fitIndexSvg()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.fitTitleToLongestLine())
    })
    this.boundFitTitle = () => this.scheduleFitTitle()
    window.addEventListener("resize", this.boundFitTitle)
  }

  disconnect() {
    if (this.boundFitTitle) {
      window.removeEventListener("resize", this.boundFitTitle)
    }
    if (this._fitTitleTimeout) clearTimeout(this._fitTitleTimeout)
  }

  scheduleFitTitle() {
    if (this._fitTitleTimeout) clearTimeout(this._fitTitleTimeout)
    this._fitTitleTimeout = setTimeout(() => {
      this._fitTitleTimeout = null
      requestAnimationFrame(() => this.fitTitleToLongestLine())
    }, 100)
  }

  fitTitleToLongestLine() {
    if (!this.hasTitleWrapperTarget) return
    fitTitleWrapperToLongestLine(this.titleWrapperTarget)
  }

  initializeHue() {
    if (this.hasPatternSettingsTarget) {
      const settings = JSON.parse(this.patternSettingsTarget.value);
      this.hueValue = parseInt(settings.hue, 10);
    } else if (this.hasPostColorTarget) {
      const hslMatch = this.postColorTarget.value.match(/hsl\((\d+),/);
      if (hslMatch) {
        this.hueValue = parseInt(hslMatch[1], 10);
      }
    }
  }

  /** Grille index : le SVG remplit la carte (pas de bandes vides). */
  fitIndexSvg() {
    const wrap = this.element.querySelector(".index-card__svg")
    if (!wrap) return
    const svg = wrap.querySelector("svg")
    if (svg) {
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice")
    }
  }

  updateTitle() {
    if (!this.hasTitleWrapperTarget || !this.hasTitleTarget) return

    const title = this.titleTarget.value
    const hue = Number.isFinite(this.hueValue) ? this.hueValue : 0
    // Aligné sur generer_svg_couverture : cases pleines vs triade (autre dominante)
    const titleBackground = `hsl(${hue}, 80%, 70%)`
    const usernameBackground = `hsl(${(hue + 120) % 360}, 80%, 70%)`

    this.titleWrapperTarget.textContent = title
    this.titleWrapperTarget.style.backgroundColor = titleBackground
    this.titleWrapperTarget.style.boxShadow = "none"

    if (this.hasUserNameTarget) {
      this.userNameTarget.style.backgroundColor = usernameBackground
    }
  }
}

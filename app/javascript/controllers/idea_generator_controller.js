import { Controller } from "@hotwired/stimulus"
import { saveRegistrationPrefill } from "utils/registration_prefill"

export default class extends Controller {
  static targets = ["noun", "adjective", "phrase"]
  static values = { url: String }

  connect() {
    this.randomize("both")
  }

  randomizeNoun() {
    this.randomize("noun")
  }

  randomizeAdjective() {
    this.randomize("adjective")
  }

  randomizeBoth() {
    this.randomize("both")
  }

  async randomize(part) {
    const params = new URLSearchParams({
      part,
      noun: this.wordValue(this.nounTarget),
      adjective: this.wordValue(this.adjectiveTarget)
    })

    try {
      const response = await fetch(`${this.urlValue}?${params}`, {
        headers: { Accept: "application/json" }
      })

      if (!response.ok) return

      const data = await response.json()

      if (part === "both" || part === "noun") {
        this.animateWord(this.nounTarget, data.noun)
      }

      if (part === "both" || part === "adjective") {
        this.animateWord(this.adjectiveTarget, data.adjective)
      }

      if (this.hasPhraseTarget) {
        this.phraseTarget.textContent = data.phrase
      }

      saveRegistrationPrefill({
        noun: data.noun,
        adjective: data.adjective,
        phrase: data.phrase
      })
    } catch {
      // Silencieux : le générateur reste sur la dernière association valide.
    }
  }

  wordValue(element) {
    return element.dataset.randomizeLetterAnimationTextValue || element.textContent.trim()
  }

  animateWord(element, word) {
    element.dataset.randomizeLetterAnimationTextValue = word
    const controller = this.application.getControllerForElementAndIdentifier(
      element,
      "randomize-letter-animation"
    )
    controller?.connect()
  }
}

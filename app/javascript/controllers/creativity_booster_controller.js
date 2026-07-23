import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["trigger", "prompt", "question"]

  connect() {
    this.questions = this.loadQuestions()
    this.currentIndex = -1
  }

  boost(event) {
    event.preventDefault()
    if (this.questions.length === 0) return

    this.questionTarget.textContent = this.pickQuestion()
    this.showPrompt()
  }

  close(event) {
    event.preventDefault()
    this.hidePrompt()
  }

  showPrompt() {
    this.promptTarget.hidden = false
    this.promptTarget.classList.remove("hidden")
    this.triggerTarget.setAttribute("aria-expanded", "true")
  }

  hidePrompt() {
    this.promptTarget.hidden = true
    this.promptTarget.classList.add("hidden")
    this.triggerTarget.setAttribute("aria-expanded", "false")
  }

  pickQuestion() {
    if (this.questions.length === 1) {
      this.currentIndex = 0
      return this.questions[0]
    }

    let nextIndex
    do {
      nextIndex = Math.floor(Math.random() * this.questions.length)
    } while (nextIndex === this.currentIndex)

    this.currentIndex = nextIndex
    return this.questions[nextIndex]
  }

  loadQuestions() {
    const source = document.getElementById("creativity-booster-questions-json")
    if (!source) return []

    try {
      const parsed = JSON.parse(source.textContent)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return []
    }
  }
}

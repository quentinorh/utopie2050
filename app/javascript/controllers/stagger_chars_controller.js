import { Controller } from "@hotwired/stimulus"

// Splits a button's text into per-character spans, each with a staggered
// CSS transition-delay so the characters animate sequentially on hover.
// See the matching `.btn-animate-chars` styles in application.tailwind.css.
export default class extends Controller {
  static targets = ["text"]
  static values = { offset: { type: Number, default: 0.01 } }

  connect() {
    const target = this.hasTextTarget ? this.textTarget : this.element
    if (target.dataset.staggerInitialized === "true") return

    const text = target.textContent
    target.innerHTML = ""

    Array.from(text).forEach((char, index) => {
      const span = document.createElement("span")
      span.textContent = char
      span.style.transitionDelay = `${index * this.offsetValue}s`
      if (char === " ") span.style.whiteSpace = "pre"
      target.appendChild(span)
    })

    target.dataset.staggerInitialized = "true"
  }
}

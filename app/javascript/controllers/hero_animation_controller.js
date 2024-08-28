import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

export default class extends Controller {
  static targets = ["trail"]

  connect() {
    this.trailElements = []
    this.trailSize = 5
    this.createTrail()
    this.element.addEventListener("mousemove", this.handleMouseMove.bind(this))
    
  }

  createTrail() {
    for (let i = 0; i < this.trailSize; i++) {
      const img = document.createElement("img")
      img.src = "https://picsum.photos/200/300" // Replace with your image path
      img.classList.add("absolute", "pointer-events-none", "w-8", "h-8")
      img.style.opacity = 0
      this.element.appendChild(img)
      this.trailElements.push(img)
    }
  }

  handleMouseMove(event) {
    console.log("hello")
    const { clientX, clientY } = event
    const rect = this.element.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    gsap.to(this.trailElements, {
      duration: 0.5,
      x: x,
      y: y,
      opacity: (i) => 1 - i * 0.2,
      scale: (i) => 1 - i * 0.1,
      stagger: {
        each: 0.02,
        from: "start",
      },
      overwrite: "auto",
    })
  }

  disconnect() {
    this.element.removeEventListener("mousemove", this.handleMouseMove)
  }
}


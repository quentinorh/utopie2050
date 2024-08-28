import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

export default class extends Controller {
  static targets = ['title', 'buttons']

  connect() {
    this.titleAnimation()
    this.buttonsAnimation()
  }

  titleAnimation() {
    const text = this.titleTarget.textContent
    const words = text.split(/(\s+)/)

    this.titleTarget.innerHTML = ''

    words.forEach((word, index) => {
      if (word.trim() === '') {
        // If it's a space, add it directly to maintain spacing
         this.titleTarget.appendChild(document.createTextNode(word))
      } else {
        const wordSpan = document.createElement('span')
        wordSpan.style.display = 'inline-block'
        wordSpan.style.overflow = 'hidden'
        
        const innerSpan = document.createElement('span')
        innerSpan.textContent = word
        innerSpan.style.display = 'inline-block'
        
        wordSpan.appendChild(innerSpan)
         this.titleTarget.appendChild(wordSpan)

        gsap.from(innerSpan, {
          y: '100%',
          duration: 0.5,
          ease: "power2.out",
          delay: index * 0.05
        })
      }
    })
  }

  buttonsAnimation() {
    console.log(this.buttonsTarget)
    const buttons = this.buttonsTarget
    gsap.from(buttons.children, {
      opacity: 0,
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.1,
      delay: 0.5
    });
  }
}

import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

export default class extends Controller {
  static targets = ['title', 'buttons', 'content']

  connect() {
    // Nettoyer toutes les animations GSAP existantes pour éviter les conflits
    gsap.killTweensOf(this.titleTarget);
    gsap.killTweensOf(this.buttonsTarget.children);
    
    // Attendre que le layout soit stabilisé avant de démarrer les animations
    // Cela évite les problèmes de décalage lors de la navigation Turbo
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.titleAnimation()
        this.buttonsAnimation()
        this.contentTarget.classList.remove('hidden')
      });
    });
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
        
        // Définir explicitement la position initiale avant l'animation
        gsap.set(innerSpan, {
          y: '100%',
          clearProps: "all"
        });
        
        wordSpan.appendChild(innerSpan)
         this.titleTarget.appendChild(wordSpan)

        gsap.to(innerSpan, {
          y: '0%',
          duration: 0.5,
          ease: "power2.out",
          delay: index * 0.05
        })
      }
    })
  }

  buttonsAnimation() {
    const buttons = this.buttonsTarget
    
    // Définir explicitement l'opacité initiale avant l'animation
    gsap.set(buttons.children, {
      opacity: 0,
      clearProps: "all"
    });
    
    gsap.to(buttons.children, {
      opacity: 1,
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.1,
      delay: 0.5
    });
  }
}

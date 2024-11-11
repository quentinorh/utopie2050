import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"
import Splitting from "splitting"
import scrollTrigger from "gsap/scrollTrigger";;

gsap.registerPlugin(scrollTrigger);

export default class extends Controller {

  connect() {
    this.animateWords()
  }

  animateWords() {
    Splitting({ target: this.element, by: 'words' })

    const words = this.element.querySelectorAll('.word')
    console.log(words)
    gsap.fromTo(words, 
      { opacity: .2 },
      { 
        opacity: 1, 
        duration: 1.5, 
        ease: "power4.out",
        stagger: 0.1,
        scrollTrigger: {
          trigger: this.element, 
          scrub: true,
          start: 'top 80%', 
          end: 'bottom 0%', 
          toggleActions: 'play none none none', 
        }
      })
  }
}

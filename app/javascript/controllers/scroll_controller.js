// app/javascript/controllers/scroll_controller.js
import { Controller } from "@hotwired/stimulus";
import Splitting from "splitting";
import gsap from "gsap";
import scrollTrigger from "gsap/scrollTrigger";

gsap.registerPlugin(scrollTrigger);

export default class extends Controller {
  static targets = ["content", "scrollPercentage", "title", "postImage"];

  connect() {
    this.contentTarget.style.opacity = 0;
    
    // Animation pour l'image du post
    gsap.fromTo(this.postImageTarget, 
      { scaleX: 0 },
      { 
        scaleX: 1, 
        duration: 1.5,
        ease: "power4.out"
      }
    );

    // Split the title
    Splitting({ target: this.titleTarget, by: 'lines' });
    this.titleTarget.style.opacity = 1;



    // Animation pour le titre
    const titleWords = this.titleTarget.querySelectorAll('.word');

    // Créer un wrapper avec overflow-hidden pour chaque mot
    titleWords.forEach(word => {
      // Ajouter un arrière-plan coloré à chaque mot
      const backgroundTitleColor = this.titleTarget.dataset.colorAttribute;
      word.style.backgroundColor = backgroundTitleColor;
      word.style.padding = '0.2em 0.4em';
      word.style.display = 'inline-block';
    });

    // Animer chaque mot
    gsap.fromTo(titleWords, 
      { y: 100, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        duration: 1,
        stagger: 0.1,
        delay:1,
        ease: "power3.out"
      }
    );
    
    // Reveal content
    setTimeout(() => {
      this.contentTarget.style.opacity = 1;
    }, 2000);

    // Split the content
    Splitting({ target: this.contentTarget, by: 'lines' });

    this.updateScrollPercentage();
    window.addEventListener("scroll", this.updateScrollPercentage.bind(this));

    const lines = this.contentTarget.querySelectorAll('.word');
    const content = this.contentTarget;
    lines.forEach((line) => {
      gsap.fromTo(line, 
        { opacity: 0,
          ease: "power4.out",
          stagger: {
            amount: 0.4
          },
         },
        {
          opacity: 1,
          scrollTrigger: {
            trigger: line,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
            toggleActions: "play none none none"
          }
        }
      );
    });
  }

  disconnect() {
    window.removeEventListener("scroll", this.updateScrollPercentage.bind(this));
  }

  updateScrollPercentage() {
    const content = this.contentTarget;
    const scrollPercentage = this.calculateScrollPercentage(content);
    this.scrollPercentageTarget.textContent = scrollPercentage;
  }

  calculateScrollPercentage(element) {
    let elementTop = element.offsetTop;
    let elementHeight = element.offsetHeight;
    let scrollTop = window.scrollY - elementTop;
    let visibleHeight = window.innerHeight;
    let scrollPercent = scrollTop / (elementHeight - visibleHeight);
    
    return Math.max(0, Math.min(100, Math.round(scrollPercent * 100)));
  }
}

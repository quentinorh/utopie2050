import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"
import scrollTrigger from "gsap/scrollTrigger"
import Splitting from "splitting"

gsap.registerPlugin(scrollTrigger)

// cubic-bezier(0.625, 0.05, 0, 1)
function coverEase(t) {
  const x1 = 0.625, y1 = 0.05, x2 = 0, y2 = 1
  let guess = t
  for (let i = 0; i < 8; i++) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    const currentX = ((ax * guess + bx) * guess + cx) * guess
    const currentSlope = (3 * ax * guess + 2 * bx) * guess + cx
    if (currentSlope === 0) break
    guess -= (currentX - t) / currentSlope
  }
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  return ((ay * guess + by) * guess + cy) * guess
}

// cubic-bezier(0.38, 0.005, 0.215, 1)
function textBlockEase(t) {
  const x1 = 0.38, y1 = 0.005, x2 = 0.215, y2 = 1
  let guess = t
  for (let i = 0; i < 8; i++) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    const currentX = ((ax * guess + bx) * guess + cx) * guess
    const currentSlope = (3 * ax * guess + 2 * bx) * guess + cx
    if (currentSlope === 0) break
    guess -= (currentX - t) / currentSlope
  }
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  return ((ay * guess + by) * guess + cy) * guess
}

export default class extends Controller {
  static values = {
    mode: { type: String, default: "words" }
  }

  connect() {
    this.tweens = []
    if (this.modeValue === "lines") {
      requestAnimationFrame(() => this.animateLines())
    } else if (this.modeValue === "paragraphs") {
      this.animateParagraphs()
    } else {
      this.animateWords()
    }
  }

  disconnect() {
    this.tweens?.forEach((t) => {
      t.scrollTrigger?.kill()
      t.kill()
    })
    this.tweens = []
  }

  /**
   * Lines mode: detect visual lines by measuring word positions,
   * wrap each in a mask (overflow:hidden), animate yPercent slide-up.
   * Replicates GSAP SplitText mask:"lines" behavior.
   */
  animateLines() {
    const targets = this.element.querySelectorAll(".body-content, .chapter-content")
    const blocks = targets.length > 0 ? Array.from(targets) : [this.element]

    blocks.forEach((el) => {
      const raw = el.textContent || ""
      if (!raw.trim()) return

      // Split by paragraphs (double newline)
      const paragraphs = raw.split(/\n\s*\n/)
      el.innerHTML = ""

      paragraphs.forEach((para) => {
        const text = para.trim()
        if (!text) return

        // Create paragraph container with spacing between paragraphs
        const p = document.createElement("div")
        p.className = "text-reveal-block"
        p.style.marginBottom = "1em"
        el.appendChild(p)

        // Handle explicit line breaks within the paragraph
        const explicitLines = text.split(/\n/)

        explicitLines.forEach((lineText, lineIdx) => {
          if (!lineText.trim()) {
            // Empty line — spacer
            const spacer = document.createElement("div")
            spacer.style.height = "0.5em"
            p.appendChild(spacer)
            return
          }

          // Wrap each word in a measurable span
          const measurer = document.createElement("div")
          measurer.style.whiteSpace = "normal"
          const words = lineText.trim().split(/(\s+)/).filter(w => w.length > 0)
          const wordSpans = []

          words.forEach((w) => {
            if (/^\s+$/.test(w)) {
              measurer.appendChild(document.createTextNode(" "))
            } else {
              const span = document.createElement("span")
              span.textContent = w
              span.style.display = "inline"
              measurer.appendChild(span)
              wordSpans.push(span)
            }
          })

          p.appendChild(measurer)

          if (!wordSpans.length) return

          // Detect visual lines by comparing vertical positions
          const visualLines = []
          let currentLine = [wordSpans[0]]
          let currentTop = wordSpans[0].getBoundingClientRect().top

          for (let i = 1; i < wordSpans.length; i++) {
            const top = wordSpans[i].getBoundingClientRect().top
            if (Math.abs(top - currentTop) > 3) {
              visualLines.push(currentLine)
              currentLine = [wordSpans[i]]
              currentTop = top
            } else {
              currentLine.push(wordSpans[i])
            }
          }
          visualLines.push(currentLine)

          // Replace measurer with masked line wrappers
          measurer.remove()

          visualLines.forEach((spans) => {
            const mask = document.createElement("div")
            mask.className = "text-reveal-mask"
            mask.style.overflow = "hidden"

            const inner = document.createElement("div")
            inner.className = "text-reveal-line"
            inner.textContent = spans.map(s => s.textContent).join(" ")
            mask.appendChild(inner)
            p.appendChild(mask)
          })
        })
      })

      // Animate all lines within this block
      const lineEls = el.querySelectorAll(".text-reveal-line")
      if (!lineEls.length) return

      const tween = gsap.from(lineEls, {
        opacity: 0,
        duration: 0.35,
        stagger: 0.04,
        delay: 0.8,
        ease: textBlockEase,
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true
        }
      })
      this.tweens.push(tween)
    })
  }

  /**
   * Paragraphs mode: wrap each paragraph, animate on scroll.
   */
  animateParagraphs() {
    const targets = this.element.querySelectorAll(".body-content, .chapter-content")
    const blocks = targets.length > 0 ? Array.from(targets) : [this.element]

    blocks.forEach((el) => {
      const raw = el.textContent || ""
      if (!raw.trim()) return

      const paragraphs = raw.split(/\n\s*\n/)
      el.textContent = ""

      paragraphs.forEach((para) => {
        const text = para.trim()
        if (!text) return
        const p = document.createElement("p")
        p.className = "text-reveal-para"
        p.innerHTML = text.replace(/\n/g, "<br>")
        el.appendChild(p)
      })

      const paraEls = el.querySelectorAll(".text-reveal-para")
      if (!paraEls.length) return

      const tween = gsap.fromTo(
        paraEls,
        { opacity: 0, y: "1.5em" },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: coverEase,
          stagger: 0.15,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: "bottom 20%",
            scrub: true
          }
        }
      )
      this.tweens.push(tween)
    })
  }

  animateWords() {
    Splitting({ target: this.element, by: "words" })

    const words = this.element.querySelectorAll(".word")
    const tween = gsap.fromTo(
      words,
      { opacity: 0.2 },
      {
        opacity: 1,
        duration: 0.8,
        ease: coverEase,
        stagger: 0.1,
        scrollTrigger: {
          trigger: this.element,
          scrub: true,
          start: "top 80%",
          end: "bottom 20%"
        }
      }
    )
    this.tweens.push(tween)
  }
}

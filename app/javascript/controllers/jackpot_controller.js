import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"
import { saveRegistrationPrefill } from "utils/registration_prefill"

// Générateur d'étincelles « machine à sous » : deux rouleaux (nom + adjectif)
// tirés d'un pool préchargé depuis le service d'étincelles. Le spin fait défiler
// les mots (power2.out, 1s) et s'arrête sur une paire cohérente (accord
// grammatical préservé car les deux rouleaux atterrissent sur le même index).
const POOL_SIZE = 12
const CELL = 52
const DURATION = 1
const EASE = "power2.out"

export default class extends Controller {
  static targets = ["strip", "spin"]
  static values = { url: String }

  async connect() {
    this.pairs = []
    this.index = 0
    this._spinning = false
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    await this.loadPool()
    this.buildStrips()
    const start = Math.floor(Math.random() * this.pairs.length)
    this.place(start)
    this.persist()
  }

  async loadPool() {
    const reqs = Array.from({ length: POOL_SIZE }, () =>
      fetch(`${this.urlValue}?part=both`, { headers: { Accept: "application/json" } })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)
    )
    const results = await Promise.all(reqs)
    const seen = new Set()
    this.pairs = results.filter(Boolean).filter(p => {
      const key = `${p.noun}|${p.adjective}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    if (!this.pairs.length) {
      this.pairs = [{ noun: "futur", adjective: "radieux", phrase: "futur radieux" }]
    }
  }

  buildStrips() {
    // 3 copies empilées pour donner de la course au défilement.
    this.stripTargets.forEach(strip => {
      const kind = strip.dataset.reel // "noun" | "adjective"
      strip.textContent = ""
      for (let c = 0; c < 3; c++) {
        this.pairs.forEach(pair => {
          const cell = document.createElement("div")
          cell.className = "jackpot__cell"
          cell.textContent = pair[kind]
          strip.appendChild(cell)
        })
      }
    })
  }

  place(index) {
    this.index = index
    this.stripTargets.forEach(strip => gsap.set(strip, { y: -(index * CELL) }))
    this.updateHooks()
  }

  spin() {
    if (this._spinning || this.pairs.length < 2) return
    const n = this.pairs.length
    const target = (this.index + 1 + Math.floor(Math.random() * (n - 1))) % n

    if (this.reduceMotion) {
      this.place(target)
      this.persist()
      return
    }

    this._spinning = true
    if (this.hasSpinTarget) this.spinTarget.classList.add("is-spinning")

    this.stripTargets.forEach((strip, i) => {
      gsap.set(strip, { y: -(this.index * CELL) })
      const dest = n + target // défile ~une boucle puis atterrit
      gsap.to(strip, {
        y: -(dest * CELL),
        duration: DURATION + i * 0.14, // arrêt décalé des rouleaux
        ease: EASE,
        onComplete: () => {
          gsap.set(strip, { y: -(target * CELL) }) // repli sur la 1re copie (identique)
          if (i === this.stripTargets.length - 1) {
            this.index = target
            this._spinning = false
            if (this.hasSpinTarget) this.spinTarget.classList.remove("is-spinning")
            this.updateHooks()
            this.persist()
          }
        },
      })
    })
  }

  current() {
    return this.pairs[this.index] || {}
  }

  updateHooks() {
    const p = this.current()
    const nh = this.element.querySelector('[data-idea-generator-target="noun"]')
    const ah = this.element.querySelector('[data-idea-generator-target="adjective"]')
    if (nh) {
      nh.textContent = p.noun || ""
      nh.dataset.randomizeLetterAnimationTextValue = p.noun || ""
    }
    if (ah) {
      ah.textContent = p.adjective || ""
      ah.dataset.randomizeLetterAnimationTextValue = p.adjective || ""
    }
  }

  persist() {
    const p = this.current()
    if (p.noun && p.adjective) {
      saveRegistrationPrefill({ noun: p.noun, adjective: p.adjective, phrase: `${p.noun} ${p.adjective}` })
    }
  }
}

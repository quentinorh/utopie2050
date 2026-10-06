import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"
import { saveRegistrationPrefill } from "utils/registration_prefill"

// Générateur d'étincelles « machine à sous » : deux rouleaux (nom + adjectif).
// Le bouton central relance la paire ; un clic sur un rouleau ne relance que
// ce mot. L'accord grammatical vient du service (part=both | noun | adjective).
const POOL_SIZE = 12
const CELL = 52
const COPIES = 3
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

  disconnect() {
    this.stripTargets.forEach(strip => gsap.killTweensOf(strip))
  }

  buildStrips() {
    // 3 copies empilées pour donner de la course au défilement.
    this.stripTargets.forEach(strip => {
      const kind = strip.dataset.reel // "noun" | "adjective"
      strip.textContent = ""
      for (let c = 0; c < COPIES; c++) {
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

  async spin() {
    if (this._spinning || this.pairs.length < 1) return
    await this.runSpin("both", { stagger: true })
  }

  async spinReel(event) {
    if (this._spinning || this.pairs.length < 1) return
    const reel = event.currentTarget
    const strip = reel.querySelector("[data-jackpot-target='strip']")
    const kind = strip?.dataset.reel
    if (!strip || (kind !== "noun" && kind !== "adjective")) return
    await this.runSpin(kind)
  }

  async runSpin(part, { stagger = false } = {}) {
    this.lock(stagger)
    try {
      const next = await this.fetchPart(part)
      if (!next?.noun || !next?.adjective) return

      if (this.reduceMotion) {
        this.commit(next)
        return
      }

      const jobs = this.stripTargets.map((strip, i) => {
        const kind = strip.dataset.reel
        if (!stagger && kind !== part) return null
        const duration = stagger ? DURATION + i * 0.14 : DURATION
        return this.animateReel(strip, kind, next[kind], duration)
      }).filter(Boolean)

      await Promise.all(jobs)
      this.commit(next)
    } finally {
      this.unlock()
    }
  }

  lock(animateButton = false) {
    this._spinning = true
    this.element.querySelectorAll(".jackpot__reel, .jackpot__spin").forEach(el => {
      el.disabled = true
      el.classList.add("is-busy")
    })
    if (animateButton && this.hasSpinTarget) this.spinTarget.classList.add("is-spinning")
  }

  unlock() {
    this._spinning = false
    this.element.querySelectorAll(".jackpot__reel, .jackpot__spin").forEach(el => {
      el.disabled = false
      el.classList.remove("is-busy")
    })
    if (this.hasSpinTarget) this.spinTarget.classList.remove("is-spinning")
  }

  async fetchPart(part) {
    const current = this.current()
    const params = new URLSearchParams({ part })
    if (current.noun) params.set("noun", current.noun)
    if (current.adjective) params.set("adjective", current.adjective)

    try {
      const res = await fetch(`${this.urlValue}?${params}`, { headers: { Accept: "application/json" } })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  animateReel(strip, kind, word, duration = DURATION) {
    const n = this.pairs.length
    const fillers = []
    const laps = Math.max(n, 2)
    for (let i = 1; i < laps; i++) {
      fillers.push(this.pairs[(this.index + i) % n][kind])
    }
    fillers.push(word)

    fillers.forEach(text => {
      const cell = document.createElement("div")
      cell.className = "jackpot__cell"
      cell.textContent = text
      strip.appendChild(cell)
    })

    const dest = strip.children.length - 1
    return new Promise(resolve => {
      gsap.to(strip, {
        y: -(dest * CELL),
        duration,
        ease: EASE,
        onComplete: resolve,
      })
    })
  }

  commit(next) {
    this.pairs[this.index] = {
      noun: next.noun,
      adjective: next.adjective,
      phrase: `${next.noun} ${next.adjective}`,
    }
    const n = this.pairs.length
    this.stripTargets.forEach(strip => {
      const kind = strip.dataset.reel
      for (let c = 0; c < COPIES; c++) {
        const cell = strip.children[c * n + this.index]
        if (cell) cell.textContent = this.pairs[this.index][kind]
      }
      gsap.set(strip, { y: -(this.index * CELL) })
      while (strip.children.length > n * COPIES) strip.lastChild.remove()
    })
    this.updateHooks()
    this.persist()
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

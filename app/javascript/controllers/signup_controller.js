import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"
import { loadRegistrationPrefill, saveRegistrationPrefill } from "utils/registration_prefill"
import { step } from "utils/motion"

// Assistant d'inscription multi-étapes (« questions au toi du futur »).
// Chaque étape = une question. Transition entre étapes : dissolution 300ms +
// légère translation (soft), directionnelle (avant/arrière). Validation par
// étape (dont unicité pseudo/email en async) avant de pouvoir avancer.
// Respecte prefers-reduced-motion.
const SHIFT = 24 // px — translation horizontale douce

export default class extends Controller {
  static targets = ["step", "username", "age", "email", "terms", "stage", "back", "next"]

  connect() {
    this.index = 0
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // N'afficher que la première étape.
    this.stepTargets.forEach((step, i) => {
      step.style.display = i === 0 ? "block" : "none"
      step.style.opacity = ""
    })

    this.applyPrefill()
    this.updateNav()

    this._onKeydown = this.handleKeydown.bind(this)
    this.element.addEventListener("keydown", this._onKeydown)
  }

  get isLast() {
    return this.index === this.stepTargets.length - 1
  }

  // Barre de nav partagée : libellé du CTA + présence du « Retour ». Le CTA reste
  // toujours à droite (« Retour » masqué en visibility → conserve sa place).
  updateNav() {
    if (this.hasBackTarget) {
      this.backTarget.classList.toggle("sp-back--hidden", this.index === 0)
    }
    if (this.hasNextTarget) {
      const span = this.nextTarget.querySelector(".btn-animate-chars__text")
      if (span) span.textContent = this.isLast ? "Créer mon compte" : "Suite"
    }
  }

  // Clic sur le CTA : avance d'une étape, ou soumet à la dernière.
  handleCta() {
    if (this._animating) return
    if (this.isLast) {
      this.element.querySelector("form.sp-form")?.requestSubmit()
    } else {
      this.next()
    }
  }

  disconnect() {
    this.element.removeEventListener("keydown", this._onKeydown)
    this._tween?.kill()
  }

  // --- Navigation -------------------------------------------------------

  async next(event) {
    event?.preventDefault()
    if (this._animating) return

    const ok = await this.validateStep(this.index)
    if (!ok) return

    this.persistPrefill()
    if (this.index < this.stepTargets.length - 1) {
      this.go(this.index + 1, 1)
    }
  }

  back(event) {
    event?.preventDefault()
    if (this._animating || this.index === 0) return
    this.clearError(this.stepTargets[this.index])
    this.go(this.index - 1, -1)
  }

  go(toIndex, dir) {
    const from = this.stepTargets[this.index]
    const to = this.stepTargets[toIndex]
    this.index = toIndex
    this.updateNav()
    this.rerollCover()

    const focusTarget = () => {
      const field = to.querySelector("input:not([type=hidden]):not([type=file]), [contenteditable]")
      field?.focus({ preventScroll: true })
    }

    if (this.reduceMotion) {
      from.style.display = "none"
      to.style.display = "block"
      to.style.opacity = "1"
      focusTarget()
      return
    }

    this._animating = true
    this._tween?.kill()
    // Timeline unique : sortie (dissolve + translation HORIZONTALE) → bascule
    // display → entrée. Seule la question se déplace ; la nav ne bouge pas.
    this._tween = gsap.timeline({
      onComplete: () => {
        this._animating = false
        focusTarget()
      },
    })
    this._tween
      .to(from, { opacity: 0, x: -SHIFT * dir, duration: step.out.duration, ease: step.out.ease })
      .set(from, { display: "none", clearProps: "opacity,transform" })
      .set(to, { display: "block" })
      .fromTo(
        to,
        { opacity: 0, x: SHIFT * dir },
        { opacity: 1, x: 0, duration: step.in.duration, ease: step.in.ease, clearProps: "transform,opacity" }
      )
  }

  handleKeydown(event) {
    if (event.key !== "Enter") return
    const step = this.stepTargets[this.index]
    // Sur la dernière étape (CGU) : laisser le submit natif si les CGU sont OK.
    if (step.dataset.step === "terms") return
    event.preventDefault()
    this.next()
  }

  // --- Validation -------------------------------------------------------

  async validateStep(index) {
    const step = this.stepTargets[index]
    switch (step.dataset.step) {
      case "username":
        return this.validateUsername(step)
      case "age":
        return this.validateAge(step)
      case "email":
        return this.validateEmail(step)
      case "terms":
        return this.validateTerms(step)
      default:
        return true
    }
  }

  async validateUsername(step) {
    const value = this.usernameTarget.value.trim()
    if (!value) return this.fail(step, this.usernameTarget, "Indique un nom pour le toi du futur.")
    try {
      const res = await fetch(`/users/check_username?username=${encodeURIComponent(value.toLowerCase())}`)
      const data = await res.json()
      if (data.exists) return this.fail(step, this.usernameTarget, "Ce nom est déjà pris.")
    } catch (_) { /* réseau : on laisse passer, le serveur revalidera */ }
    return this.pass(step, this.usernameTarget)
  }

  validateAge(step) {
    const raw = this.ageTarget.value.trim()
    const age = Number.parseInt(raw, 10)
    if (!raw || Number.isNaN(age) || age < 1 || age > 150) {
      return this.fail(step, this.ageTarget, "Indique un âge valide.")
    }
    return this.pass(step, this.ageTarget)
  }

  async validateEmail(step) {
    const value = this.emailTarget.value.trim().toLowerCase()
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value) return this.fail(step, this.emailTarget, "Indique ton adresse email.")
    if (!re.test(value)) return this.fail(step, this.emailTarget, "Cette adresse email n'est pas valide.")
    try {
      const res = await fetch(`/users/check_email?email=${encodeURIComponent(value)}`)
      const data = await res.json()
      if (data.exists) return this.fail(step, this.emailTarget, "Cette adresse email est déjà utilisée.")
    } catch (_) { /* réseau : on laisse passer */ }
    return this.pass(step, this.emailTarget)
  }

  validateTerms(step) {
    if (this.hasTermsTarget && !this.termsTarget.checked) {
      return this.fail(step, null, "Merci d'accepter les conditions pour continuer.")
    }
    return this.pass(step, null)
  }

  // --- Helpers erreurs --------------------------------------------------

  fail(step, input, message) {
    this.setError(step, message)
    if (input) input.classList.add("sp-input--error")
    return false
  }

  pass(step, input) {
    this.clearError(step)
    if (input) input.classList.remove("sp-input--error")
    return true
  }

  setError(step, message) {
    const el = step.querySelector('[data-signup-target="error"]')
    if (el) el.textContent = message
  }

  clearError(step) {
    const el = step.querySelector('[data-signup-target="error"]')
    if (el) el.textContent = ""
  }

  // Efface l'erreur d'un champ pendant la saisie.
  clearFieldError(event) {
    const step = event.target.closest('[data-signup-target="step"]')
    if (step) this.clearError(step)
    event.target.classList.remove("sp-input--error")
  }

  // Nouvelle couverture à chaque changement d'étape (même moteur que le dé).
  rerollCover() {
    const cover = this.application.getControllerForElementAndIdentifier(this.element, "cover-editor")
    cover?.randomize()
  }

  // --- Prefill (flux « futur en attente ») ------------------------------

  applyPrefill() {
    const prefill = loadRegistrationPrefill()
    if (prefill) {
      if (prefill.username && this.hasUsernameTarget) this.usernameTarget.value = prefill.username
      if (prefill.age && this.hasAgeTarget) this.ageTarget.value = prefill.age
    }

    const fromQuery = new URLSearchParams(window.location.search).get("email")
    if (fromQuery && this.hasEmailTarget && !this.emailTarget.value.trim()) {
      this.emailTarget.value = fromQuery.trim()
    }
  }

  persistPrefill() {
    const payload = {}
    if (this.hasUsernameTarget) payload.username = this.usernameTarget.value
    if (this.hasAgeTarget) payload.age = this.ageTarget.value
    saveRegistrationPrefill(payload)
  }
}

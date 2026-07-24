import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"
import { loadRegistrationPrefill, saveRegistrationPrefill } from "utils/registration_prefill"

export default class extends Controller {
  static targets = [
    "step", "flashMessages", "username", "age", "email", "terms",
    "usernameError", "emailError", "ageError", "termsError",
    "nextStepProfileButton", "submitButton", "progress", "progressStep"
  ]

  connect() {
    this.usernameUnique = false
    this.emailUnique = false
    this.ageValid = false
    this.termsAccepted = false
    document.addEventListener("keydown", this.handleKeydownBound = this.handleKeydown.bind(this))
    this.applyRegistrationPrefill()
    this.updateProgress(this.currentStepId())
    this.toggleNextStepProfileButton()
    this.toggleSubmitButton()
  }

  applyRegistrationPrefill() {
    const prefill = loadRegistrationPrefill()
    if (!prefill) return

    if (prefill.username && this.hasUsernameTarget) {
      this.usernameTarget.value = prefill.username
      this.checkUsername()
    }

    if (prefill.age && this.hasAgeTarget) {
      this.ageTarget.value = prefill.age
      this.checkAge()
    }
  }

  currentStepId() {
    const current = this.stepTargets.find(step => step.style.display !== "none")
    return current ? current.id : null
  }

  updateProgress(activeStepId) {
    if (!this.hasProgressTarget) return

    const trackedIds = this.progressStepTargets.map(el => el.dataset.stepId)
    const activeIndex = trackedIds.indexOf(activeStepId)

    if (activeIndex === -1) {
      this.progressTarget.hidden = true
      return
    }

    this.progressTarget.hidden = false
    this.progressStepTargets.forEach((el, index) => {
      el.classList.toggle("auth-progress__step--completed", index < activeIndex)
      el.classList.toggle("auth-progress__step--active", index === activeIndex)
    })
  }

  disconnect() {
    document.removeEventListener("keydown", this.handleKeydownBound)
  }

  handleKeydown(event) {
    if (!document.querySelector("#registration-steps")) return

    if (event.key === "Enter") {
      const currentStep = this.stepTargets.find(step => step.style.display !== "none")
      if (!currentStep) return

      if (currentStep.id === "step-terms") {
        return
      }

      event.preventDefault()
      const nextButton = currentStep.querySelector('[data-action="click->signup#nextStep"]')
      if (nextButton && !nextButton.disabled) {
        nextButton.click()
      }
    }
  }

  nextStep(event) {
    const nextStepId = event.currentTarget.dataset.nextStep
    const currentStepId = this.stepTargets.find(step => step.style.display !== "none").id
    const currentStep = document.getElementById(currentStepId)
    const inputs = currentStep.querySelectorAll("input")
    let isValid = true

    inputs.forEach(input => {
      if (input.type === "checkbox") return

      if (input.required && !input.value.trim()) {
        isValid = false
        input.classList.add("border-red-500")

        const fieldName = input.name.replace("user[", "").replace("]", "")
        const errorTarget = this[`${fieldName}ErrorTarget`]

        if (errorTarget) {
          errorTarget.innerText = `Le champ "${fieldName}" est obligatoire.`
        }
      } else {
        input.classList.remove("border-red-500")
      }
    })

    if (currentStepId === "step-profile") {
      this.checkUsername()
      this.checkAge()
      this.checkEmail()
      if (!this.usernameUnique || !this.ageValid || !this.emailUnique) {
        isValid = false
      }
    }

    if (isValid) {
      this.persistStepPrefill(currentStepId)
      this.fadeTransition(currentStepId, nextStepId)
    }
  }

  persistStepPrefill(stepId) {
    if (stepId === "step-profile") {
      const payload = {}
      if (this.hasUsernameTarget) payload.username = this.usernameTarget.value
      if (this.hasAgeTarget) payload.age = this.ageTarget.value
      saveRegistrationPrefill(payload)
    }
  }

  previousStep(event) {
    const currentStepId = this.stepTargets.find(step => step.style.display !== "none").id
    const previousStepId = event.currentTarget.dataset.stepId
    this.fadeTransition(currentStepId, previousStepId)
  }

  fadeTransition(currentStepId, nextStepId) {
    this.element.dispatchEvent(new CustomEvent("auth:step-changed", {
      bubbles: true,
      detail: { from: currentStepId, to: nextStepId }
    }))

    const currentStep = document.getElementById(currentStepId)
    const nextStep = document.getElementById(nextStepId)

    gsap.to(currentStep, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        currentStep.style.display = "none"
        nextStep.style.display = "block"
        this.updateProgress(nextStepId)
        gsap.fromTo(nextStep,
          { opacity: 0 },
          { opacity: 1, duration: 0.3 }
        )
      }
    })
  }

  showFlash(type, message) {
    const alertClass = type === "error" ? "bg-red-100 border-red-400 text-red-700" : "bg-green-100 border-green-400 text-green-700"

    this.flashMessagesTarget.innerHTML = `
      <div class="border px-4 py-3 rounded relative ${alertClass}" role="alert">
        <span class="block sm:inline">${message}</span>
      </div>
    `

    this.flashMessagesTarget.scrollIntoView({ behavior: "smooth" })

    setTimeout(() => {
      this.flashMessagesTarget.innerHTML = ""
    }, 5000)
  }

  checkUsername() {
    const username = this.usernameTarget.value.trim().toLowerCase()

    if (username.length > 0) {
      fetch(`/users/check_username?username=${username}`)
        .then(response => response.json())
        .then(data => {
          if (data.exists) {
            this.usernameErrorTarget.innerText = "Ce nom d'utilisateur est déjà pris."
            this.usernameUnique = false
          } else {
            this.usernameErrorTarget.innerText = ""
            this.usernameUnique = true
          }
          this.toggleNextStepProfileButton()
        })
    } else {
      this.usernameErrorTarget.innerText = "Le nom d'utilisateur ne peut pas être vide."
      this.usernameUnique = false
      this.toggleNextStepProfileButton()
    }
  }

  checkAge() {
    const ageValue = this.ageTarget.value.trim()
    const age = Number.parseInt(ageValue, 10)

    if (ageValue.length === 0 || Number.isNaN(age) || age < 0) {
      this.ageErrorTarget.innerText = "Indique un âge valide."
      this.ageValid = false
    } else {
      this.ageErrorTarget.innerText = ""
      this.ageValid = true
    }
    this.toggleNextStepProfileButton()
  }

  checkEmail() {
    const email = this.emailTarget.value.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (email.length === 0) {
      this.emailErrorTarget.innerText = "L'email ne peut pas être vide."
      this.emailUnique = false
      this.toggleNextStepProfileButton()
      return
    }

    if (!emailRegex.test(email)) {
      this.emailErrorTarget.innerText = "Veuillez entrer une adresse email valide."
      this.emailUnique = false
      this.toggleNextStepProfileButton()
      return
    }

    fetch(`/users/check_email?email=${email}`)
      .then(response => response.json())
      .then(data => {
        if (data.exists) {
          this.emailErrorTarget.innerText = "Cette adresse email est déjà utilisée."
          this.emailUnique = false
        } else {
          this.emailErrorTarget.innerText = ""
          this.emailUnique = true
        }
        this.toggleNextStepProfileButton()
      })
  }

  checkTerms() {
    this.termsAccepted = this.hasTermsTarget && this.termsTarget.checked
    if (this.hasTermsErrorTarget) {
      this.termsErrorTarget.innerText = this.termsAccepted ? "" : ""
    }
    this.toggleSubmitButton()
  }

  toggleNextStepProfileButton() {
    if (!this.hasNextStepProfileButtonTarget) return

    if (this.usernameUnique && this.ageValid && this.emailUnique) {
      this.nextStepProfileButtonTarget.removeAttribute("disabled")
    } else {
      this.nextStepProfileButtonTarget.setAttribute("disabled", "true")
    }
  }

  toggleSubmitButton() {
    if (!this.hasSubmitButtonTarget) return

    if (this.termsAccepted) {
      this.submitButtonTarget.removeAttribute("disabled")
    } else {
      this.submitButtonTarget.setAttribute("disabled", "true")
    }
  }
}

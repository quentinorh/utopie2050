import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"
import { saveRegistrationPrefill, loadRegistrationPrefill, clearRegistrationPrefill } from "utils/registration_prefill"
import { buildEtincelle, interpolateNarrativeTemplate, buildNarrativeContext } from "utils/narrative_template"

export default class extends Controller {
  static targets = [
    "step",
    "progress",
    "progressStep",
    "skip",
    "username",
    "age",
    "livingPlace",
    "usernameError",
    "ageError",
    "livingPlaceError",
    "nextStepUsernameButton",
    "themeOption",
    "themeError",
    "nextStepThemeButton",
    "trendPicker",
    "trendLabel",
    "trendOppositePanel",
    "trendOpposite",
    "trendError",
    "trendOppositeError",
    "nextStepTrendButton",
    "styleOption",
    "styleError",
    "nextStepStyleButton"
  ]

  static values = { signedIn: Boolean, username: String, age: String }

  connect() {
    this.usernameUnique = false
    this.selectedTheme = null
    this.selectedTrend = null
    this.selectedStyleId = null
    this.selectedStyleLabel = null
    this.selectedBodyTemplate = null
    this._narrativeStyles = null
    this._trends = null
    document.addEventListener("keydown", this.handleKeydown)
    this.applyRegistrationPrefill()
    this.initializeTrendSelection()
    this.updateProgress(this.currentStepId())
    this.updateSkipVisibility(this.currentStepId())
  }

  applyRegistrationPrefill() {
    const prefill = loadRegistrationPrefill()
    if (!prefill) return

    if (!this.signedInValue) {
      if (prefill.username && this.hasUsernameTarget) {
        this.usernameTarget.value = prefill.username
        this.checkUsername()
      }

      if (prefill.age && this.hasAgeTarget) {
        this.ageTarget.value = prefill.age
      }
    }

    if (prefill.livingPlace && this.hasLivingPlaceTarget) {
      this.livingPlaceTarget.value = prefill.livingPlace
    }

    if (prefill.theme) {
      this.applyThemeSelection(prefill.theme)
    }

    if (prefill.trend) {
      this.applyTrendSelection(prefill.trend)
    }

    if (prefill.trendOpposite && this.hasTrendOppositeTarget) {
      this.trendOppositeTarget.value = prefill.trendOpposite
      this.toggleNextStepTrendButton()
    }

    if (prefill.narrativeStyle) {
      const style = this.findNarrativeStyle(prefill.narrativeStyle)
      if (style) this.applyStyleSelection(style)
    }
  }

  narrativeStyles() {
    if (this._narrativeStyles) return this._narrativeStyles

    const el = document.getElementById("writing-narrative-styles-json")
    if (!el) {
      this._narrativeStyles = []
      return this._narrativeStyles
    }

    try {
      this._narrativeStyles = JSON.parse(el.textContent)
    } catch {
      this._narrativeStyles = []
    }

    return this._narrativeStyles
  }

  findNarrativeStyle(id) {
    return this.narrativeStyles().find(style => style.id === id)
  }

  disconnect() {
    document.removeEventListener("keydown", this.handleKeydown)
  }

  handleKeydown = (event) => {
    if (!document.querySelector("#writing-tutorial-steps")) return

    if (event.key === "Enter") {
      const currentStep = this.stepTargets.find(step => step.style.display !== "none")
      const nextButton = currentStep?.querySelector('[data-action*="writing-tutorial#nextStep"]')

      if (nextButton && !nextButton.disabled) {
        event.preventDefault()
        nextButton.click()
      }
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

  updateSkipVisibility(activeStepId) {
    if (!this.hasSkipTarget) return

    this.skipTarget.hidden = activeStepId === "step-ready"
  }

  nextStep(event) {
    const nextStepId = event.currentTarget.dataset.nextStep
    const currentStepId = this.currentStepId()

    if (!this.validateCurrentStep(currentStepId)) return

    if (!this.signedInValue && (currentStepId === "step-username" || currentStepId === "step-age")) {
      this.persistPrefill()
    }

    if (currentStepId === "step-living-place") {
      this.persistLivingPlace()
    }

    if (currentStepId === "step-theme" && this.selectedTheme) {
      saveRegistrationPrefill({ theme: this.selectedTheme })
    }

    if (currentStepId === "step-trend") {
      this.persistTrend()
    }

    if (currentStepId === "step-style") {
      this.persistStyle()
    }

    if (nextStepId === "step-ready") {
      this.persistAllPrefill()
    }

    if (currentStepId === "step-freedom") {
      this.persistIdeaGenerator()
    }

    this.fadeTransition(currentStepId, nextStepId)
  }

  previousStep(event) {
    const currentStepId = this.currentStepId()
    const previousStepId = event.currentTarget.dataset.stepId
    this.fadeTransition(currentStepId, previousStepId)
  }

  skip() {
    clearRegistrationPrefill()
  }

  validateCurrentStep(currentStepId) {
    if (currentStepId === "step-trend") {
      return this.validateTrendStep()
    }

    if (currentStepId === "step-style") {
      return this.validateStyleStep()
    }

    if (currentStepId === "step-living-place") {
      const place = this.livingPlaceTarget.value.trim()

      if (!place) {
        this.livingPlaceErrorTarget.innerText = "Indique où tu vis en 2050."
        this.livingPlaceTarget.classList.add("border-red-500")
        return false
      }

      this.livingPlaceTarget.classList.remove("border-red-500")
      this.livingPlaceErrorTarget.innerText = ""
      return true
    }

    if (this.signedInValue) return true

    if (currentStepId === "step-username") {
      const username = this.usernameTarget.value.trim()

      if (!username) {
        this.usernameErrorTarget.innerText = "Le nom d'utilisateur ne peut pas être vide."
        this.usernameTarget.classList.add("border-red-500")
        return false
      }

      if (!this.usernameUnique) {
        return false
      }

      this.usernameTarget.classList.remove("border-red-500")
      this.usernameErrorTarget.innerText = ""
      return true
    }

    if (currentStepId === "step-age") {
      const age = this.ageTarget.value.trim()

      if (!age) {
        this.ageErrorTarget.innerText = "L'âge est obligatoire."
        this.ageTarget.classList.add("border-red-500")
        return false
      }

      if (!/^\d+$/.test(age) || parseInt(age, 10) < 0) {
        this.ageErrorTarget.innerText = "Veuillez entrer un âge valide."
        this.ageTarget.classList.add("border-red-500")
        return false
      }

      this.ageTarget.classList.remove("border-red-500")
      this.ageErrorTarget.innerText = ""
      return true
    }

    if (currentStepId === "step-theme") {
      if (!this.selectedTheme) {
        if (this.hasThemeErrorTarget) {
          this.themeErrorTarget.innerText = "Choisis un thème pour continuer."
        }
        return false
      }

      if (this.hasThemeErrorTarget) this.themeErrorTarget.innerText = ""
      return true
    }

    return true
  }

  validateTrendStep() {
    if (!this.selectedTrend) {
      if (this.hasTrendErrorTarget) {
        this.trendErrorTarget.innerText = "Choisis une tendance à inverser."
      }
      if (this.hasTrendPickerTarget) {
        this.trendPickerTarget.classList.add("border-red-500")
      }
      return false
    }

    if (this.hasTrendErrorTarget) this.trendErrorTarget.innerText = ""
    if (this.hasTrendPickerTarget) {
      this.trendPickerTarget.classList.remove("border-red-500")
    }

    const opposite = this.hasTrendOppositeTarget ? this.trendOppositeTarget.value.trim() : ""

    if (!opposite) {
      if (this.hasTrendOppositeErrorTarget) {
        this.trendOppositeErrorTarget.innerText = "Décris une approche radicalement opposée."
      }
      if (this.hasTrendOppositeTarget) {
        this.trendOppositeTarget.classList.add("border-red-500")
      }
      return false
    }

    if (this.hasTrendOppositeErrorTarget) this.trendOppositeErrorTarget.innerText = ""
    if (this.hasTrendOppositeTarget) {
      this.trendOppositeTarget.classList.remove("border-red-500")
    }

    return true
  }

  validateStyleStep() {
    if (!this.selectedStyleId) {
      if (this.hasStyleErrorTarget) {
        this.styleErrorTarget.innerText = "Choisis un style pour continuer."
      }
      return false
    }

    if (this.hasStyleErrorTarget) this.styleErrorTarget.innerText = ""
    return true
  }

  selectStyle(event) {
    const style = this.findNarrativeStyle(event.params.styleId)
    if (!style) return

    this.applyStyleSelection(style)
    this.persistStyle()
  }

  applyStyleSelection(style) {
    this.selectedStyleId = style.id
    this.selectedStyleLabel = `${style.title} — ${style.style}`
    this.refreshSelectedBodyTemplate()

    if (this.hasStyleOptionTarget) {
      this.styleOptionTargets.forEach(el => {
        const selected = el.getAttribute("data-writing-tutorial-style-id-param") === style.id
        el.classList.toggle("writing-tutorial-style--selected", selected)
        el.setAttribute("aria-checked", selected)
      })
    }

    if (this.hasNextStepStyleButtonTarget) {
      this.nextStepStyleButtonTarget.removeAttribute("disabled")
    }

    if (this.hasStyleErrorTarget) {
      this.styleErrorTarget.innerText = ""
    }
  }

  persistStyle() {
    this.refreshSelectedBodyTemplate()

    saveRegistrationPrefill({
      username: this.resolveUsername(),
      age: this.resolveAge(),
      livingPlace: this.hasLivingPlaceTarget ? this.livingPlaceTarget.value.trim() : undefined,
      narrativeStyle: this.selectedStyleId || undefined,
      narrativeStyleLabel: this.selectedStyleLabel || undefined,
      bodyTemplate: this.selectedBodyTemplate || undefined,
      bodyTemplateEdited: false
    })
  }

  buildNarrativePrefill() {
    const idea = this.collectIdeaGeneratorData()
    const stored = loadRegistrationPrefill() || {}
    const livingPlace = this.hasLivingPlaceTarget ? this.livingPlaceTarget.value.trim() : ""

    return {
      ...stored,
      username: this.resolveUsername() || stored.username,
      age: this.resolveAge() || stored.age,
      livingPlace: livingPlace || stored.livingPlace,
      phrase: idea.phrase || stored.phrase,
      noun: idea.noun || stored.noun,
      adjective: idea.adjective || stored.adjective,
      theme: this.selectedTheme || stored.theme,
      trend: this.selectedTrend || stored.trend,
      trendOpposite: (this.hasTrendOppositeTarget ? this.trendOppositeTarget.value.trim() : "") || stored.trendOpposite
    }
  }

  refreshSelectedBodyTemplate() {
    if (!this.selectedStyleId) return

    const style = this.findNarrativeStyle(this.selectedStyleId)
    if (!style) return

    this.selectedBodyTemplate = interpolateNarrativeTemplate(
      style.template,
      buildNarrativeContext(this.buildNarrativePrefill())
    )
  }

  trends() {
    if (this._trends) return this._trends

    const el = document.getElementById("writing-tutorial-trends-json")
    if (!el) {
      this._trends = []
      return this._trends
    }

    try {
      this._trends = JSON.parse(el.textContent)
    } catch {
      this._trends = []
    }

    return this._trends
  }

  currentTrendIndex() {
    const trends = this.trends()
    if (!trends.length) return 0

    const index = trends.indexOf(this.selectedTrend)
    return index >= 0 ? index : 0
  }

  initializeTrendSelection() {
    if (this.selectedTrend) return

    const first = this.trends()[0]
    if (first) this.applyTrendSelection(first, { animate: false })
  }

  previousTrend() {
    const trends = this.trends()
    if (!trends.length) return

    const index = (this.currentTrendIndex() - 1 + trends.length) % trends.length
    this.selectTrendAtIndex(index)
  }

  nextTrend() {
    const trends = this.trends()
    if (!trends.length) return

    const index = (this.currentTrendIndex() + 1) % trends.length
    this.selectTrendAtIndex(index)
  }

  selectTrendAtIndex(index) {
    const trend = this.trends()[index]
    if (!trend) return

    this.applyTrendSelection(trend)
    this.persistTrend()
    this.refreshSelectedBodyTemplate()
  }

  animateTrendLabel(trend) {
    if (!this.hasTrendLabelTarget) return

    const element = this.trendLabelTarget
    element.dataset.randomizeLetterAnimationTextValue = trend
    const controller = this.application.getControllerForElementAndIdentifier(
      element,
      "randomize-letter-animation"
    )
    controller?.connect()
  }

  applyTrendSelection(trend, { animate = true } = {}) {
    this.selectedTrend = trend

    if (animate) {
      this.animateTrendLabel(trend)
    } else if (this.hasTrendLabelTarget) {
      this.trendLabelTarget.textContent = trend
      this.trendLabelTarget.dataset.randomizeLetterAnimationTextValue = trend
    }

    if (this.hasTrendOppositePanelTarget) {
      this.trendOppositePanelTarget.hidden = false
    }

    if (this.hasTrendErrorTarget) {
      this.trendErrorTarget.innerText = ""
    }

    if (this.hasTrendPickerTarget) {
      this.trendPickerTarget.classList.remove("border-red-500")
    }

    this.toggleNextStepTrendButton()
  }

  updateTrendOpposite() {
    this.persistTrend()
    this.toggleNextStepTrendButton()
    this.refreshSelectedBodyTemplate()

    if (this.hasTrendOppositeErrorTarget && this.trendOppositeTarget.value.trim()) {
      this.trendOppositeErrorTarget.innerText = ""
      this.trendOppositeTarget.classList.remove("border-red-500")
    }
  }

  toggleNextStepTrendButton() {
    if (!this.hasNextStepTrendButtonTarget) return

    const ready = this.selectedTrend &&
      this.hasTrendOppositeTarget &&
      this.trendOppositeTarget.value.trim().length > 0

    if (ready) {
      this.nextStepTrendButtonTarget.removeAttribute("disabled")
    } else {
      this.nextStepTrendButtonTarget.setAttribute("disabled", "true")
    }
  }

  persistTrend() {
    saveRegistrationPrefill({
      trend: this.selectedTrend || undefined,
      trendOpposite: this.hasTrendOppositeTarget ? this.trendOppositeTarget.value.trim() : undefined
    })
  }

  selectTheme(event) {
    this.applyThemeSelection(event.params.theme)
    saveRegistrationPrefill({ theme: this.selectedTheme })
    this.refreshSelectedBodyTemplate()
  }

  applyThemeSelection(theme) {
    this.selectedTheme = theme

    if (!this.hasThemeOptionTarget) return

    this.themeOptionTargets.forEach(el => {
      const selected = el.getAttribute("data-writing-tutorial-theme-param") === theme
      el.classList.toggle("writing-tutorial-theme--selected", selected)
      el.setAttribute("aria-checked", selected)
    })

    if (this.hasNextStepThemeButtonTarget) {
      this.nextStepThemeButtonTarget.removeAttribute("disabled")
    }

    if (this.hasThemeErrorTarget) {
      this.themeErrorTarget.innerText = ""
    }
  }

  persistLivingPlace() {
    saveRegistrationPrefill({
      username: this.resolveUsername(),
      age: this.resolveAge(),
      livingPlace: this.hasLivingPlaceTarget ? this.livingPlaceTarget.value.trim() : undefined
    })
  }

  persistPrefill() {
    saveRegistrationPrefill({
      username: this.resolveUsername(),
      age: this.resolveAge(),
      livingPlace: this.hasLivingPlaceTarget ? this.livingPlaceTarget.value.trim() : undefined,
      theme: this.selectedTheme || undefined,
      trend: this.selectedTrend || undefined,
      trendOpposite: this.hasTrendOppositeTarget ? this.trendOppositeTarget.value.trim() : undefined,
      narrativeStyle: this.selectedStyleId || undefined,
      narrativeStyleLabel: this.selectedStyleLabel || undefined,
      bodyTemplate: this.selectedBodyTemplate || undefined
    })
  }

  persistAllPrefill() {
    const idea = this.collectIdeaGeneratorData()
    const stored = loadRegistrationPrefill() || {}
    this.refreshSelectedBodyTemplate()

    const bodyTemplate = stored.bodyTemplateEdited
      ? stored.bodyTemplate
      : (this.selectedBodyTemplate || stored.bodyTemplate)

    saveRegistrationPrefill({
      username: this.resolveUsername(),
      age: this.resolveAge(),
      livingPlace: this.hasLivingPlaceTarget ? this.livingPlaceTarget.value.trim() : undefined,
      theme: this.selectedTheme || undefined,
      trend: this.selectedTrend || undefined,
      trendOpposite: this.hasTrendOppositeTarget ? this.trendOppositeTarget.value.trim() : undefined,
      narrativeStyle: this.selectedStyleId || undefined,
      narrativeStyleLabel: this.selectedStyleLabel || undefined,
      bodyTemplate,
      bodyTemplateEdited: Boolean(stored.bodyTemplateEdited),
      noun: idea.noun,
      adjective: idea.adjective,
      phrase: idea.phrase
    })
  }

  persistIdeaGenerator() {
    const idea = this.collectIdeaGeneratorData()
    saveRegistrationPrefill(idea)
    this.refreshSelectedBodyTemplate()
  }

  resolveUsername() {
    if (this.signedInValue && this.usernameValue) return this.usernameValue
    return this.hasUsernameTarget ? this.usernameTarget.value.trim() : undefined
  }

  resolveAge() {
    if (this.signedInValue && this.ageValue) return String(this.ageValue)
    return this.hasAgeTarget ? this.ageTarget.value.trim() : undefined
  }

  collectIdeaGeneratorData() {
    const step = document.getElementById("step-freedom")
    if (!step) return {}

    const nounEl = step.querySelector('[data-idea-generator-target="noun"]')
    const adjectiveEl = step.querySelector('[data-idea-generator-target="adjective"]')
    const noun = this.wordFromElement(nounEl)
    const adjective = this.wordFromElement(adjectiveEl)
    const phrase = noun && adjective ? `${noun} ${adjective}` : ""

    return { noun, adjective, phrase }
  }

  wordFromElement(element) {
    if (!element) return ""
    return element.dataset.randomizeLetterAnimationTextValue || element.textContent.trim()
  }

  checkUsername() {
    const username = this.usernameTarget.value.trim().toLowerCase()

    if (username.length > 0) {
      fetch(`/users/check_username?username=${encodeURIComponent(username)}`)
        .then(response => response.json())
        .then(data => {
          if (data.exists) {
            this.usernameErrorTarget.innerText = "Ce nom d'utilisateur est déjà pris."
            this.usernameUnique = false
          } else {
            this.usernameErrorTarget.innerText = ""
            this.usernameUnique = true
          }
          this.toggleNextStepUsernameButton()
        })
    } else {
      this.usernameErrorTarget.innerText = "Le nom d'utilisateur ne peut pas être vide."
      this.usernameUnique = false
      this.toggleNextStepUsernameButton()
    }
  }

  toggleNextStepUsernameButton() {
    if (!this.hasNextStepUsernameButtonTarget) return

    if (this.usernameUnique) {
      this.nextStepUsernameButtonTarget.removeAttribute("disabled")
    } else {
      this.nextStepUsernameButtonTarget.setAttribute("disabled", "true")
    }
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
        this.updateSkipVisibility(nextStepId)

        gsap.fromTo(nextStep, { opacity: 0 }, {
          opacity: 1,
          duration: 0.3,
          onComplete: () => {
            if (nextStepId === "step-ready") {
              document.dispatchEvent(new CustomEvent("writing-tutorial:synthesis-update"))
            }
          }
        })
      }
    })
  }
}

import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"
import { saveRegistrationPrefill, loadRegistrationPrefill, clearRegistrationPrefill, forgetRegistrationPrefill } from "utils/registration_prefill"
import { interpolateNarrativeTemplate, buildNarrativeContext, buildEtincelle } from "utils/narrative_template"
import { step as stepMotion } from "utils/motion"

// Entonnoir d'écriture reconstruit sur le layout split .sp-* : une seule
// question visible à la fois dans .sp-stage (fondu horizontal doux), barre de
// nav .sp-nav stationnaire (Retour + CTA). Toute la logique métier (validation,
// unicité pseudo, thème/tendance/style, générateur d'étincelles, prefill
// sessionStorage) est conservée depuis l'ancienne version.
const SHIFT = 24
const TREND_CELL = 52

const CTA_LABELS = {
  intro: "Commencer",
  username: "Suivant",
  age: "Suivant",
  "living-place": "Suivant",
  positive: "Accepter",
  theme: "Suivant",
  etincelle: "Suivant",
  inversion: "Suivant",
  style: "Terminer",
}

// Phrases « cryptiques » (une machine qui prépare le récit) affichées en haut,
// scramblées à chaque étape via randomize-letter-animation.
const PROGRESS_PHRASES = {
  intro: "initialisation du récit",
  username: "identification de l'auteur·ice",
  age: "projection temporelle",
  "living-place": "cartographie du territoire",
  positive: "alignement des intentions",
  theme: "indexation des thèmes",
  etincelle: "génération des étincelles",
  inversion: "inversion des tendances",
  style: "compilation du style",
}

export default class extends Controller {
  static targets = [
    "step", "stage", "back", "next", "skip",
    "username", "age", "livingPlace",
    "usernameError", "ageError", "livingPlaceError",
    "themeOption", "themeError",
    "trendStrip", "trendStep", "trendOppositePanel", "trendOpposite", "trendError", "trendOppositeError",
    "styleOption", "styleError",
    "progressPhrase", "progressPercent",
  ]

  static values = { signedIn: Boolean, username: String, age: String, skipPath: String }

  connect() {
    this.index = 0
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    this.usernameUnique = false
    this.selectedTheme = null
    this.selectedTrend = null
    this.selectedStyleId = null
    this.selectedStyleLabel = null
    this.selectedBodyTemplate = null
    this._narrativeStyles = null
    this._trendsByTheme = null
    this._activeTrends = null

    this.stepTargets.forEach((step, i) => {
      step.style.display = i === 0 ? "block" : "none"
      step.style.opacity = ""
    })

    this.initTrendReel()
    this.applyRegistrationPrefill()
    this.updateNav()
    this.updateProgress()
    this._syncCoverPin()

    this._onKeydown = this.handleKeydown.bind(this)
    this.element.addEventListener("keydown", this._onKeydown)
  }

  disconnect() {
    this.element.removeEventListener("keydown", this._onKeydown)
    this._tween?.kill()
    this._trendTween?.kill()
  }

  get currentName() {
    return this.stepTargets[this.index]?.dataset.step
  }

  _scrollToTop() {
    const lenis = window.lenis
    if (lenis && typeof lenis.scrollTo === "function") {
      lenis.scrollTo(0, { immediate: true, force: true })
    }
    window.scrollTo(0, 0)
    const panel = this.element.querySelector(".sp-panel")
    if (panel) panel.scrollTop = 0
  }

  // Mobile : après l'intro, la couverture reste la barre blanche jusqu'au
  // choix du style. À cette étape, elle reprend sa hauteur.
  _syncCoverPin() {
    const cover = this.element.querySelector(".sp-cover")
    const kb = cover && this.application.getControllerForElementAndIdentifier(cover, "mobile-keyboard")
    if (!kb) {
      this._coverPinTries = (this._coverPinTries || 0) + 1
      if (this._coverPinTries <= 8) requestAnimationFrame(() => this._syncCoverPin())
      return
    }
    this._coverPinTries = 0
    const style = this.stepTargets.findIndex((step) => step.dataset.step === "style")
    const pinned = style !== -1 && this.index > 0 && this.index < style
    kb.setCoverPinned(pinned)
  }

  get isLast() {
    return this.index === this.stepTargets.length - 1
  }

  // --- Navigation --------------------------------------------------------

  handleCta() {
    if (this._animating) return
    if (this.isLast) this.finish()
    else this.next()
  }

  async next() {
    const name = this.currentName
    const ok = await this.validateStep(name)
    if (!ok) return

    this.persistForStep(name)
    this.go(this.index + 1, 1)
  }

  back() {
    if (this._animating || this.index === 0) return
    this.go(this.index - 1, -1)
  }

  finish() {
    if (!this.validateStyleStep()) return
    this.persistAllPrefill()
    this.persistCover()

    const navigate = () => { window.location.href = this.skipPathValue }
    if (this.reduceMotion) return navigate()
    gsap.to(this.element, { opacity: 0, duration: 0.3, ease: "power2.out", onComplete: navigate })
  }

  // Sérialise la couverture composée dans l'entonnoir → reprise dans l'éditeur.
  persistCover() {
    const cover = this.application.getControllerForElementAndIdentifier(this.element, "cover-editor")
    if (cover && cover.hasPatternSettingsTarget) {
      cover.savePatternSettings()
      saveRegistrationPrefill({ coverPatternSettings: cover.patternSettingsTarget.value })
    }
  }

  skip() {
    clearRegistrationPrefill()
  }

  go(toIndex, dir) {
    const from = this.stepTargets[this.index]
    const to = this.stepTargets[toIndex]
    this.index = toIndex
    this.updateNav()
    this.updateProgress()
    this._syncCoverPin()
    this._syncCoverIdentity()
    this._scrollToTop()

    if (this.reduceMotion) {
      from.style.display = "none"
      to.style.display = "block"
      to.style.opacity = "1"
      return
    }

    this._animating = true
    this._tween?.kill()
    this._tween = gsap.timeline({
      onComplete: () => { this._animating = false },
    })
    this._tween
      .to(from, { opacity: 0, x: -SHIFT * dir, duration: stepMotion.out.duration, ease: stepMotion.out.ease })
      .set(from, { display: "none", clearProps: "opacity,transform" })
      .set(to, { display: "block" })
      .fromTo(to,
        { opacity: 0, x: SHIFT * dir },
        { opacity: 1, x: 0, duration: stepMotion.in.duration, ease: stepMotion.in.ease, clearProps: "transform,opacity" })
  }

  updateNav() {
    // Intro : CTA seul, centré. Dès qu'on démarre : Retour à gauche / CTA à
    // droite (space-between), figés d'une étape à l'autre.
    const nav = this.element.querySelector(".sp-nav")
    if (nav) nav.classList.toggle("sp-nav--solo", this.index === 0)
    if (this.hasBackTarget) {
      this.backTarget.classList.toggle("sp-back--hidden", this.index === 0)
    }
    if (this.hasNextTarget) {
      const span = this.nextTarget.querySelector(".btn-animate-chars__text")
      const label = CTA_LABELS[this.currentName] || "Suivant"
      if (span && span.textContent.trim() !== label) {
        span.textContent = label
        // Re-scinde le libellé en lettres pour l'anim de stagger au survol.
        span.dataset.staggerInitialized = ""
        this.application
          .getControllerForElementAndIdentifier(this.nextTarget, "stagger-chars")
          ?.connect()
      }
    }
  }

  // Barre de progression : pourcentage croissant + phrase cryptique scramblée.
  updateProgress() {
    const n = this.stepTargets.length
    const pct = Math.round(12 + (this.index / Math.max(1, n - 1)) * 84)
    if (this.hasProgressPercentTarget) this.progressPercentTarget.textContent = `${pct}%`
    if (this.hasProgressPhraseTarget) {
      const phrase = PROGRESS_PHRASES[this.currentName] || "traitement en cours"
      this.progressPhraseTarget.dataset.randomizeLetterAnimationTextValue = phrase
      if (this.reduceMotion) {
        this.progressPhraseTarget.textContent = phrase
      } else {
        this.application
          .getControllerForElementAndIdentifier(this.progressPhraseTarget, "randomize-letter-animation")
          ?.connect()
      }
    }
  }

  handleKeydown(event) {
    if (event.key !== "Enter") return
    if (event.target.tagName === "TEXTAREA") return
    if (event.target.closest(".jackpot__reel, .jackpot__spin, .funnel-trend__arrow")) return
    event.preventDefault()
    this.handleCta()
  }

  persistForStep(name) {
    if (!this.signedInValue && (name === "username" || name === "age")) this.persistPrefill()
    if (name === "living-place") this.persistLivingPlace()
    if (name === "positive") saveRegistrationPrefill({ termsAccepted: true })
    if (name === "theme" && this.selectedTheme) saveRegistrationPrefill({ theme: this.selectedTheme })
    if (name === "etincelle") this.persistIdeaGenerator()
    if (name === "inversion") this.persistTrend()
  }

  // --- Validation --------------------------------------------------------

  async validateStep(name) {
    switch (name) {
      case "username": return this.validateUsername()
      case "age": return this.validateAge()
      case "living-place": return this.validateLivingPlace()
      case "theme": return this.validateTheme()
      case "inversion": return this.validateTrendStep()
      case "style": return this.validateStyleStep()
      default: return true
    }
  }

  async validateUsername() {
    if (this.signedInValue) return true
    const v = this.usernameTarget.value.trim()
    if (!v) return this.fail(this.usernameTarget, this.usernameErrorTarget, "Indique un nom pour le toi du futur.")
    try {
      const res = await fetch(`/users/check_username?username=${encodeURIComponent(v.toLowerCase())}`)
      const data = await res.json()
      if (data.exists) return this.fail(this.usernameTarget, this.usernameErrorTarget, "Ce nom est déjà pris.")
    } catch (_) { /* réseau : on laisse passer */ }
    return this.pass(this.usernameTarget, this.usernameErrorTarget)
  }

  validateAge() {
    if (this.signedInValue) return true
    const raw = this.ageTarget.value.trim()
    const age = Number.parseInt(raw, 10)
    if (!raw || Number.isNaN(age) || age < 1 || age > 150) {
      return this.fail(this.ageTarget, this.ageErrorTarget, "Indique un âge valide.")
    }
    return this.pass(this.ageTarget, this.ageErrorTarget)
  }

  validateLivingPlace() {
    const place = this.livingPlaceTarget.value.trim()
    if (!place) return this.fail(this.livingPlaceTarget, this.livingPlaceErrorTarget, "Indique où tu vis en 2050.")
    return this.pass(this.livingPlaceTarget, this.livingPlaceErrorTarget)
  }

  validateTheme() {
    if (!this.selectedTheme) {
      if (this.hasThemeErrorTarget) this.themeErrorTarget.textContent = "Choisis un thème pour continuer."
      return false
    }
    if (this.hasThemeErrorTarget) this.themeErrorTarget.textContent = ""
    return true
  }

  validateTrendStep() {
    if (!this.selectedTrend) {
      if (this.hasTrendErrorTarget) this.trendErrorTarget.textContent = "Choisis une tendance à inverser."
      return false
    }
    if (this.hasTrendErrorTarget) this.trendErrorTarget.textContent = ""
    const opposite = this.hasTrendOppositeTarget ? this.trendOppositeTarget.value.trim() : ""
    if (!opposite) {
      if (this.hasTrendOppositeErrorTarget) this.trendOppositeErrorTarget.textContent = "Raconte comment on inverse ça."
      if (this.hasTrendOppositeTarget) this.trendOppositeTarget.classList.add("sp-input--error")
      return false
    }
    if (this.hasTrendOppositeErrorTarget) this.trendOppositeErrorTarget.textContent = ""
    if (this.hasTrendOppositeTarget) this.trendOppositeTarget.classList.remove("sp-input--error")
    return true
  }

  validateStyleStep() {
    if (!this.selectedStyleId) {
      if (this.hasStyleErrorTarget) this.styleErrorTarget.textContent = "Choisis un style pour continuer."
      return false
    }
    if (this.hasStyleErrorTarget) this.styleErrorTarget.textContent = ""
    return true
  }

  fail(input, errorEl, message) {
    if (errorEl) errorEl.textContent = message
    input?.classList.add("sp-input--error")
    return false
  }

  pass(input, errorEl) {
    if (errorEl) errorEl.textContent = ""
    input?.classList.remove("sp-input--error")
    return true
  }

  clearFieldError(event) {
    event.target.classList.remove("sp-input--error")
    const step = event.target.closest('[data-writing-tutorial-target="step"]')
    const err = step?.querySelector(".sp-error")
    if (err) err.textContent = ""
  }

  // --- Pseudo (unicité live) --------------------------------------------

  checkUsername() {
    this.clearFieldError({ target: this.usernameTarget })
    const username = this.usernameTarget.value.trim().toLowerCase()
    if (!username) return
    fetch(`/users/check_username?username=${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(data => {
        this.usernameUnique = !data.exists
        if (data.exists && this.hasUsernameErrorTarget) {
          this.usernameErrorTarget.textContent = "Ce nom est déjà pris."
          this.usernameTarget.classList.add("sp-input--error")
        }
      })
      .catch(() => {})
  }

  // --- Thème -------------------------------------------------------------

  selectTheme(event) {
    const previousTheme = this.selectedTheme
    const keptTrend = this.applyThemeSelection(event.params.theme)
    if (previousTheme && previousTheme !== this.selectedTheme && !keptTrend) {
      forgetRegistrationPrefill("trendOpposite")
    }
    saveRegistrationPrefill({
      theme: this.selectedTheme,
      trend: this.selectedTrend || undefined,
    })
    this.refreshSelectedBodyTemplate()
  }

  applyThemeSelection(theme) {
    if (this.hasThemeOptionTarget) {
      const known = this.themeOptionTargets.some(
        el => el.getAttribute("data-writing-tutorial-theme-param") === theme
      )
      if (!known) return false
    }
    const changed = this.selectedTheme !== theme
    this.selectedTheme = theme
    if (this.hasThemeOptionTarget) {
      this.themeOptionTargets.forEach(el => {
        const selected = el.getAttribute("data-writing-tutorial-theme-param") === theme
        el.classList.toggle("funnel-chip--selected", selected)
        el.setAttribute("aria-checked", selected)
      })
    }
    if (this.hasThemeErrorTarget) this.themeErrorTarget.textContent = ""
    if (!changed) return true
    return this.syncTrendReelToTheme()
  }

  // --- Style -------------------------------------------------------------

  selectStyle(event) {
    const style = this.findNarrativeStyle(event.params.styleId)
    if (!style) return
    this.applyStyleSelection(style)
    this.persistStyle()
  }

  applyStyleSelection(style) {
    this.selectedStyleId = style.id
    this.selectedStyleLabel = style.title
    this.refreshSelectedBodyTemplate()
    if (this.hasStyleOptionTarget) {
      this.styleOptionTargets.forEach(el => {
        const selected = el.getAttribute("data-writing-tutorial-style-id-param") === style.id
        el.classList.toggle("funnel-style--selected", selected)
        el.setAttribute("aria-checked", selected)
      })
    }
    if (this.hasStyleErrorTarget) this.styleErrorTarget.textContent = ""
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
      bodyTemplateEdited: false,
    })
  }

  // --- Tendance (machine à sous) ----------------------------------------

  initTrendReel() {
    this.trendIndex = 0
    this._trendSpinning = false
    if (this.selectedTheme) this.syncTrendReelToTheme()
  }

  // Reconstruit le rouleau avec un tirage aléatoire du thème courant.
  // Renvoie true si la tendance déjà choisie appartient encore à ce thème.
  syncTrendReelToTheme() {
    this._trendTween?.kill()
    this._trendTween = null
    this._trendSpinning = false

    const previous = this.selectedTrend
    const list = this.shuffle(this.trendsFor(this.selectedTheme))
    this._activeTrends = list
    this.buildTrendStrip()

    if (!list.length) {
      this.selectedTrend = null
      if (this.hasTrendOppositePanelTarget) this.trendOppositePanelTarget.hidden = true
      this.updateTrendNav()
      return false
    }

    const keptIndex = previous ? list.indexOf(previous) : -1
    if (keptIndex >= 0) {
      this.placeTrend(keptIndex)
      this.updateTrendNav()
      return true
    }

    this.clearTrendAnswer()
    this.placeTrend(0)
    this.updateTrendNav()
    return false
  }

  clearTrendAnswer() {
    if (this.hasTrendOppositeTarget) {
      this.trendOppositeTarget.value = ""
      this.trendOppositeTarget.classList.remove("sp-input--error")
    }
    if (this.hasTrendOppositeErrorTarget) this.trendOppositeErrorTarget.textContent = ""
  }

  shuffle(items) {
    const list = items.slice()
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = list[i]
      list[i] = list[j]
      list[j] = tmp
    }
    return list
  }

  buildTrendStrip() {
    if (!this.hasTrendStripTarget) return
    const strip = this.trendStripTarget
    strip.textContent = ""
    const list = this.trends()
    for (let c = 0; c < 3; c++) {
      list.forEach(t => {
        const cell = document.createElement("div")
        cell.className = "jackpot__cell jackpot__cell--trend"
        cell.textContent = t
        strip.appendChild(cell)
      })
    }
  }

  placeTrend(index) {
    this.trendIndex = index
    if (this.hasTrendStripTarget) gsap.set(this.trendStripTarget, { y: -(index * TREND_CELL) })
    this.applyTrendSelection(this.trends()[index])
  }

  nextTrend() {
    this.stepTrend(1)
  }

  previousTrend() {
    this.stepTrend(-1)
  }

  // Avance ou recule d'une seule tendance. Le doublon du rouleau sert à
  // enchaîner le passage de la dernière à la première, et l'inverse.
  stepTrend(direction) {
    if (this._trendSpinning) return
    const list = this.trends()
    const n = list.length
    if (n < 2) return
    const target = (this.trendIndex + direction + n) % n

    if (this.reduceMotion) {
      this.placeTrend(target)
      this.persistTrend()
      this.refreshSelectedBodyTemplate()
      return
    }

    let from = this.trendIndex
    let to = target
    if (direction > 0 && this.trendIndex === n - 1) to = n
    if (direction < 0 && this.trendIndex === 0) from = n

    this._trendSpinning = true
    const strip = this.trendStripTarget
    gsap.set(strip, { y: -(from * TREND_CELL) })
    this._trendTween = gsap.to(strip, {
      y: -(to * TREND_CELL),
      duration: 0.32,
      ease: "power2.out",
      onComplete: () => {
        this._trendTween = null
        gsap.set(strip, { y: -(target * TREND_CELL) })
        this.trendIndex = target
        this._trendSpinning = false
        this.applyTrendSelection(list[target])
        this.persistTrend()
        this.refreshSelectedBodyTemplate()
      },
    })
  }

  updateTrendNav() {
    if (!this.hasTrendStepTarget) return
    const disabled = this.trends().length < 2
    this.trendStepTargets.forEach(button => { button.disabled = disabled })
  }

  applyTrendSelection(trend) {
    if (!trend) return
    this.selectedTrend = trend
    if (this.hasTrendOppositePanelTarget) this.trendOppositePanelTarget.hidden = false
    if (this.hasTrendErrorTarget) this.trendErrorTarget.textContent = ""
  }

  updateTrendOpposite() {
    this.persistTrend()
    this.refreshSelectedBodyTemplate()
    if (this.hasTrendOppositeErrorTarget && this.trendOppositeTarget.value.trim()) {
      this.trendOppositeErrorTarget.textContent = ""
      this.trendOppositeTarget.classList.remove("sp-input--error")
    }
  }

  persistTrend() {
    saveRegistrationPrefill({
      trend: this.selectedTrend || undefined,
      trendOpposite: this.hasTrendOppositeTarget ? this.trendOppositeTarget.value.trim() : undefined,
    })
  }

  trends() {
    if (this._activeTrends) return this._activeTrends
    return this.trendsFor(this.selectedTheme)
  }

  trendsByTheme() {
    if (this._trendsByTheme) return this._trendsByTheme
    const el = document.getElementById("writing-tutorial-trends-json")
    try { this._trendsByTheme = el ? JSON.parse(el.textContent) : {} } catch { this._trendsByTheme = {} }
    return this._trendsByTheme
  }

  trendsFor(theme) {
    if (!theme) return []
    const list = this.trendsByTheme()[theme]
    return Array.isArray(list) ? list : []
  }

  // --- Générateur d'étincelles ------------------------------------------

  collectIdeaGeneratorData() {
    const step = this.stepTargets.find(s => s.dataset.step === "etincelle")
    if (!step) return {}
    const noun = this.wordFromElement(step.querySelector('[data-idea-generator-target="noun"]'))
    const adjective = this.wordFromElement(step.querySelector('[data-idea-generator-target="adjective"]'))
    const phrase = noun && adjective ? `${noun} ${adjective}` : ""
    return { noun, adjective, phrase }
  }

  wordFromElement(element) {
    if (!element) return ""
    return element.dataset.randomizeLetterAnimationTextValue || element.textContent.trim()
  }

  persistIdeaGenerator() {
    saveRegistrationPrefill(this.collectIdeaGeneratorData())
    this.refreshSelectedBodyTemplate()
  }

  coverEditor() {
    return this.application.getControllerForElementAndIdentifier(this.element, "cover-editor")
  }

  // Nom et titre n'apparaissent sur la couverture qu'au choix du style.
  _syncCoverIdentity() {
    if (this.currentName === "style") {
      this.applyCoverUsername()
      this.applyCoverTitle()
    } else {
      this.clearCoverIdentity()
    }
  }

  clearCoverIdentity() {
    const cover = this.coverEditor()
    if (!cover) return
    if (cover.hasUserNameTarget) cover.userNameTarget.textContent = ""
    if (cover.hasTitleInputTarget) cover.titleInputTarget.value = ""
    cover.updateTitle()
  }

  applyCoverUsername() {
    const username = this.resolveUsername()
    const cover = this.coverEditor()
    if (!username || !cover?.hasUserNameTarget) return
    cover.userNameTarget.textContent = username
    cover.updateTitle()
  }

  applyCoverTitle() {
    const title = buildEtincelle(this.collectIdeaGeneratorData())
    const cover = this.coverEditor()
    if (!title || !cover?.hasTitleInputTarget) return
    cover.titleInputTarget.value = title
    cover.updateTitle()
  }

  // --- Prefill / template ------------------------------------------------

  applyRegistrationPrefill() {
    const prefill = loadRegistrationPrefill()
    if (!prefill) return
    if (!this.signedInValue) {
      if (prefill.username && this.hasUsernameTarget) { this.usernameTarget.value = prefill.username; this.checkUsername() }
      if (prefill.age && this.hasAgeTarget) this.ageTarget.value = prefill.age
    }
    if (prefill.livingPlace && this.hasLivingPlaceTarget) this.livingPlaceTarget.value = prefill.livingPlace
    if (prefill.theme) this.applyThemeSelection(prefill.theme)
    if (prefill.trend) {
      const idx = this.trends().indexOf(prefill.trend)
      if (idx >= 0) {
        this.placeTrend(idx)
        if (prefill.trendOpposite && this.hasTrendOppositeTarget) this.trendOppositeTarget.value = prefill.trendOpposite
      }
    }
    if (prefill.narrativeStyle) {
      const style = this.findNarrativeStyle(prefill.narrativeStyle)
      if (style) this.applyStyleSelection(style)
    }
  }

  narrativeStyles() {
    if (this._narrativeStyles) return this._narrativeStyles
    const el = document.getElementById("writing-narrative-styles-json")
    try { this._narrativeStyles = el ? JSON.parse(el.textContent) : [] } catch { this._narrativeStyles = [] }
    return this._narrativeStyles
  }

  findNarrativeStyle(id) {
    return this.narrativeStyles().find(style => style.id === id)
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
      trendOpposite: (this.hasTrendOppositeTarget ? this.trendOppositeTarget.value.trim() : "") || stored.trendOpposite,
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

  persistLivingPlace() {
    saveRegistrationPrefill({
      username: this.resolveUsername(),
      age: this.resolveAge(),
      livingPlace: this.hasLivingPlaceTarget ? this.livingPlaceTarget.value.trim() : undefined,
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
      bodyTemplate: this.selectedBodyTemplate || undefined,
    })
  }

  persistAllPrefill() {
    const idea = this.collectIdeaGeneratorData()
    const stored = loadRegistrationPrefill() || {}
    this.refreshSelectedBodyTemplate()
    const bodyTemplate = stored.bodyTemplateEdited ? stored.bodyTemplate : (this.selectedBodyTemplate || stored.bodyTemplate)
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
      phrase: idea.phrase,
    })
  }

  resolveUsername() {
    if (this.signedInValue && this.usernameValue) return this.usernameValue
    return this.hasUsernameTarget ? this.usernameTarget.value.trim() : undefined
  }

  resolveAge() {
    if (this.signedInValue && this.ageValue) return String(this.ageValue)
    return this.hasAgeTarget ? this.ageTarget.value.trim() : undefined
  }
}

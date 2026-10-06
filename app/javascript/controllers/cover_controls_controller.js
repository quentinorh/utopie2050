import { Controller } from "@hotwired/stimulus"

// Barre de réglages superposée à la couverture.
//
// Au repos, seuls le dé (aléatoire) et le bouton Paramètres sont visibles.
// Le clic sur Paramètres révèle les groupes en cascade vers la gauche — la
// barre étant ancrée à droite, les deux pastilles persistantes ne bougent pas :
// c'est la barre qui s'allonge. L'icône du bouton passe de « réglages » à « ✕ ».
//
// Chaque groupe ouvre son propre popover (un seul à la fois), recalé pour ne
// jamais déborder de la couverture.
export default class extends Controller {
  static targets = ["groups", "group", "trigger", "pop"]

  connect() {
    this._onDocumentClick = (event) => {
      if (this.element.contains(event.target)) return
      this.closeAllPops()
    }
    this._onKeydown = (event) => {
      if (event.key !== "Escape") return
      if (this.hasOpenPop) this.closeAllPops()
      else if (this.isOpen) this.close()
    }
    this._onResize = () => this.fitOpenPop()

    document.addEventListener("click", this._onDocumentClick)
    document.addEventListener("keydown", this._onKeydown)
    window.addEventListener("resize", this._onResize)
  }

  disconnect() {
    document.removeEventListener("click", this._onDocumentClick)
    document.removeEventListener("keydown", this._onKeydown)
    window.removeEventListener("resize", this._onResize)
  }

  get isOpen() {
    return this.element.dataset.controlsOpen === "true"
  }

  get hasOpenPop() {
    return this.popTargets.some((pop) => pop.classList.contains("is-open"))
  }

  // --- Barre : révélation / repli en cascade ------------------------------

  toggle(event) {
    event?.preventDefault()
    this.isOpen ? this.close() : this.open()
  }

  // La largeur de la barre est animée en CSS (grille 0fr↔1fr sur .cover-groups) :
  // on ne touche donc plus à l'attribut `hidden` (display:none couperait la
  // transition). L'état est piloté par data-controls-open.
  //
  // Pendant l'animation, la rangée est clippée horizontalement (sinon les
  // groupes déborderaient). Une fois OUVERTE et stabilisée, on retire le clip
  // (is-settled) pour que les popovers puissent déborder librement.
  open() {
    if (this._settleTimer) clearTimeout(this._settleTimer)
    this.element.dataset.controlsOpen = "true"
    this.toggleTriggerState(true)
    // Retire le clip quand la largeur a fini de s'ouvrir (transitionend +
    // filet de sécurité au cas où l'event ne se déclenche pas).
    const done = () => { this.element.classList.add("is-settled") }
    const groups = this.hasGroupsTarget ? this.groupsTarget : this.element.querySelector(".cover-groups")
    if (groups) {
      groups.addEventListener("transitionend", (e) => {
        if (e.propertyName === "grid-template-columns") done()
      }, { once: true })
    }
    this._settleTimer = setTimeout(done, 480)
  }

  close() {
    if (this._settleTimer) clearTimeout(this._settleTimer)
    this.closeAllPops()
    // Remet le clip AVANT de replier, pour que les groupes ne débordent pas.
    this.element.classList.remove("is-settled")
    this.element.dataset.controlsOpen = "false"
    this.toggleTriggerState(false)
  }

  toggleTriggerState(open) {
    const toggle = this.element.querySelector("[data-cover-controls-toggle]")
    if (toggle) toggle.setAttribute("aria-expanded", String(open))
  }

  // --- Groupes : popovers -------------------------------------------------

  togglePop(event) {
    const trigger = event.currentTarget
    const group = trigger.closest("[data-cover-controls-target~='group']")
    const pop = group.querySelector("[data-cover-controls-target~='pop']")
    if (!pop) return

    if (pop.classList.contains("is-open")) {
      this.closePop(group)
    } else {
      this.closeAllPops()
      trigger.setAttribute("aria-expanded", "true")
      pop.classList.add("is-open")
      this.fitPop(pop)
      // Les mini-grilles se positionnent en pixels : elles ont besoin d'une
      // mesure valide, donc d'être visibles. On prévient le générateur.
      this.dispatch("opened", { detail: { group } })
    }
  }

  closePop(group) {
    const trigger = group.querySelector("[data-cover-controls-target~='trigger']")
    const pop = group.querySelector("[data-cover-controls-target~='pop']")
    trigger?.setAttribute("aria-expanded", "false")
    pop?.classList.remove("is-open")
  }

  closeAllPops() {
    this.groupTargets.forEach((group) => this.closePop(group))
  }

  // --- Recalage horizontal des popovers -----------------------------------

  get boundsElement() {
    return this.element.closest(".form-cover-wrapper, .hero-stage") || document.documentElement
  }

  fitOpenPop() {
    this.popTargets.filter((pop) => pop.classList.contains("is-open")).forEach((pop) => this.fitPop(pop))
  }

  fitPop(pop) {
    const margin = 10
    pop.style.setProperty("--pop-shift", "0px")

    const popRect = pop.getBoundingClientRect()
    const bounds = this.boundsElement.getBoundingClientRect()

    let shift = 0
    if (popRect.right > bounds.right - margin) shift = bounds.right - margin - popRect.right
    if (popRect.left + shift < bounds.left + margin) shift = bounds.left + margin - popRect.left

    pop.style.setProperty("--pop-shift", `${Math.round(shift)}px`)
  }
}

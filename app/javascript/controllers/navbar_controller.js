import { Controller } from "@hotwired/stimulus"

export default class extends Controller {

  static targets = ["avatar", "menuDesktop", "username", "closeMenu"]

  static values = {
    transparent: { type: Boolean, default: false },
    scroll: { type: Boolean, default: false }
  }

  connect() {
    this.handleClickOutside = this.handleClickOutside.bind(this)
    document.addEventListener("click", this.handleClickOutside)

    if (this.transparentValue) {
      this.element.classList.add('navbar--transparent')
    }

    if (this.scrollValue) {
      this.handleScroll = this.handleScroll.bind(this)
      window.addEventListener("scroll", this.handleScroll, { passive: true })
      this.handleScroll()
    }

    this.syncCoverToolbarInset = this.syncCoverToolbarInset.bind(this)
    this.syncCoverToolbarInset()
    const actions = this.element.querySelector(".navbar-actions")
    if (actions && typeof ResizeObserver !== "undefined") {
      this.actionsObserver = new ResizeObserver(() => this.syncCoverToolbarInset())
      this.actionsObserver.observe(actions)
    }
    window.addEventListener("resize", this.syncCoverToolbarInset)
  }

  disconnect() {
    document.removeEventListener("click", this.handleClickOutside)
    if (this.scrollValue) {
      window.removeEventListener("scroll", this.handleScroll)
    }
    this.actionsObserver?.disconnect()
    window.removeEventListener("resize", this.syncCoverToolbarInset)
    document.documentElement.style.removeProperty("--cover-toolbar-safe-right")
  }

  // Sous lg, la cover-toolbar partage la ligne de la navbar. Son retrait droit
  // suit la largeur réelle des actions : icône seule (mobile), ou icône + CTA
  // (« Écrire le futur » / « Nouveau futur ») selon la session.
  syncCoverToolbarInset() {
    const actions = this.element.querySelector(".navbar-actions")
    const root = document.documentElement
    if (!actions || window.matchMedia("(min-width: 1024px)").matches) {
      root.style.removeProperty("--cover-toolbar-safe-right")
      return
    }

    const gap = 8
    const actionsLeft = actions.getBoundingClientRect().left
    const toolbar = document.querySelector(".cover-toolbar")
    const parent = toolbar?.offsetParent
    const rightEdge = parent
      ? parent.getBoundingClientRect().right
      : root.clientWidth
    const inset = Math.max(0, Math.round(rightEdge - actionsLeft + gap))
    root.style.setProperty("--cover-toolbar-safe-right", `${inset}px`)
  }

  handleScroll() {
    const scrollY = window.scrollY
    const threshold = window.innerHeight * 0.15

    if (scrollY > threshold) {
      this.element.classList.add('navbar--scrolled')
    } else {
      this.element.classList.remove('navbar--scrolled')
    }
  }

  toogleMenu(event) {
    event.stopPropagation()
    this.menuDesktopTarget.classList.toggle('is-open')
    this.usernameTarget.classList.toggle('hidden')
    this.closeMenuTarget.classList.toggle('hidden')
  }

  handleClickOutside(event) {
    if (this.hasMenuDesktopTarget && this.menuDesktopTarget.classList.contains('is-open')) {
      if (!this.menuDesktopTarget.contains(event.target)) {
        this.menuDesktopTarget.classList.remove('is-open')
        this.usernameTarget.classList.remove('hidden')
        this.closeMenuTarget.classList.add('hidden')
      }
    }
  }
}

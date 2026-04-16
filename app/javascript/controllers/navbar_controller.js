import { Controller } from "@hotwired/stimulus"

export default class extends Controller {

  static targets = ["avatar", "menuDesktop", "menuSignin", "username", "closeMenu", "signin"]

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

    this._setupDarkSectionObserver()
  }

  disconnect() {
    document.removeEventListener("click", this.handleClickOutside)
    if (this.scrollValue) {
      window.removeEventListener("scroll", this.handleScroll)
    }
    this._teardownDarkSectionObserver()
  }

  // ── Dark-section observer ───────────────────────────────────────
  // Any element on the page tagged with `data-navbar-dark` adds the
  // `navbar--dark` class while it overlaps the navbar's vertical band
  // (i.e. while it sits "behind" the navbar). Lets the typo-scroll
  // section (and any future dark section) flip the navbar to a black
  // bg / white text variant without touching the section's controller.
  //
  // We use an IntersectionObserver with a rootMargin that compresses
  // the viewport down to a thin strip just below the navbar — when a
  // section's top crosses into that strip the entry is `intersecting`,
  // when its bottom leaves the strip it isn't.
  _setupDarkSectionObserver() {
    const sections = document.querySelectorAll("[data-navbar-dark]")
    if (!sections.length) return

    const navHeight = this.element.offsetHeight || 75
    // Root effective box: top = navHeight, bottom = navHeight + 1px.
    // Anything that overlaps that 1-px line is "under the navbar".
    const bottomInset = window.innerHeight - navHeight - 1
    const rootMargin = `-${navHeight}px 0px -${Math.max(bottomInset, 0)}px 0px`

    this._darkState = new Map()
    this._darkObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => this._darkState.set(e.target, e.isIntersecting))
      const anyDark = Array.from(this._darkState.values()).some(Boolean)
      this.element.classList.toggle("navbar--dark", anyDark)
    }, { rootMargin, threshold: 0 })

    sections.forEach(s => this._darkObserver.observe(s))
  }

  _teardownDarkSectionObserver() {
    if (this._darkObserver) {
      this._darkObserver.disconnect()
      this._darkObserver = null
    }
    this._darkState = null
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

    if (this.hasMenuSigninTarget) {
      this.menuSigninTarget.classList.remove('is-open')
    }
  }

  toogleSignin(event) {
    event.stopPropagation()
    this.menuSigninTarget.classList.toggle('is-open')

    if (this.hasMenuDesktopTarget) {
      this.menuDesktopTarget.classList.remove('is-open')
    }
  }

  handleClickOutside(event) {
    if (this.hasMenuDesktopTarget && this.menuDesktopTarget.classList.contains('is-open')) {
      if (!this.menuDesktopTarget.contains(event.target)) {
        this.menuDesktopTarget.classList.remove('is-open')
        this.usernameTarget.classList.remove('hidden')
        this.closeMenuTarget.classList.add('hidden')
      }
    }

    if (this.hasMenuSigninTarget && this.menuSigninTarget.classList.contains('is-open')) {
      if (!this.menuSigninTarget.contains(event.target)) {
        this.menuSigninTarget.classList.remove('is-open')
      }
    }
  }
}

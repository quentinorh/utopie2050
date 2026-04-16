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
  }

  disconnect() {
    document.removeEventListener("click", this.handleClickOutside)
    if (this.scrollValue) {
      window.removeEventListener("scroll", this.handleScroll)
    }
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

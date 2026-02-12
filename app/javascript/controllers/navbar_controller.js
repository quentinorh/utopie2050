import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
 
  static targets = ["avatar", "menuDesktop", "menuSignin", "username", "closeMenu", "signin"]

  connect() {
    // Close menus when clicking outside
    this.handleClickOutside = this.handleClickOutside.bind(this)
    document.addEventListener("click", this.handleClickOutside)
  }

  disconnect() {
    document.removeEventListener("click", this.handleClickOutside)
  }

  toogleMenu(event) {
    event.stopPropagation()
    this.menuDesktopTarget.classList.toggle('is-open')
    this.usernameTarget.classList.toggle('hidden')
    this.closeMenuTarget.classList.toggle('hidden')

    // Close sign-in menu if open
    if (this.hasMenuSigninTarget) {
      this.menuSigninTarget.classList.remove('is-open')
    }
  } 

  toogleSignin(event) {
    event.stopPropagation()
    this.menuSigninTarget.classList.toggle('is-open')

    // Close desktop menu if open
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

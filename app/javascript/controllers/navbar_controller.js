import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
 
  static targets = ["avatar", "menuDesktop", "menuSignin", "username", "closeMenu", "signin"]

  toogleMenu(event) {
    this.menuDesktopTarget.classList.toggle('hidden')
    this.usernameTarget.classList.toggle('hidden')
    this.closeMenuTarget.classList.toggle('hidden')
  } 

  toogleSignin(event) {
    this.menuSigninTarget.classList.toggle('hidden')
  }
}


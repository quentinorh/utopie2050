import { Controller } from "@hotwired/stimulus"

// Téléphone : quand un champ du panneau prend le focus, le clavier virtuel
// recouvre le formulaire (la couverture empilée au-dessus mange déjà le haut).
// On replie la couverture et on cale le cadre sur le visual viewport, le temps
// de la saisie. Au-dessus de 1024px la couverture est à côté : rien à faire.
const STACKED = "(max-width: 1023px)"
const FIELD = "textarea, select, input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='file']):not([type='range']):not([type='button']):not([type='submit'])"

export default class extends Controller {
  connect() {
    this.auth = this.element.closest(".sp-auth")
    if (!this.auth) return

    this.panel = this.auth.querySelector(".sp-panel")
    this.mq = window.matchMedia(STACKED)
    this._on = false
    this._awaitingClose = false

    this._onFocusIn = (event) => this._focusIn(event)
    this._onFocusOut = (event) => this._focusOut(event)
    this._onVvResize = () => this._onViewportResize()
    this._onVvScroll = () => this._syncViewport()
    this._onMq = () => { if (!this.mq.matches) this._release() }
    this._onCache = () => this._release()

    this._onPointerDown = (event) => this._pointerDown(event)

    this.auth.addEventListener("focusin", this._onFocusIn)
    this.auth.addEventListener("focusout", this._onFocusOut)
    this.auth.addEventListener("pointerdown", this._onPointerDown)
    this.mq.addEventListener("change", this._onMq)
    document.addEventListener("turbo:before-cache", this._onCache)
  }

  disconnect() {
    this._release()
    this.auth?.removeEventListener("focusin", this._onFocusIn)
    this.auth?.removeEventListener("focusout", this._onFocusOut)
    this.auth?.removeEventListener("pointerdown", this._onPointerDown)
    this.mq?.removeEventListener("change", this._onMq)
    document.removeEventListener("turbo:before-cache", this._onCache)
    window.clearTimeout(this._blurTimer)
    window.clearTimeout(this._revealTimer)
    window.clearTimeout(this._revealLaterTimer)
  }

  _isField(node) {
    if (!(node instanceof Element) || !this.panel?.contains(node)) return false
    if (node.tabIndex < 0 && node.getAttribute("tabindex") === "-1") return false
    return node.matches(FIELD)
  }

  _focusIn(event) {
    if (!this.mq.matches || !this._isField(event.target)) return
    window.clearTimeout(this._blurTimer)
    this._awaitingClose = false
    this._stableSince = 0
    this._lastVvHeight = null
    this._focused = event.target
    this._engage()
  }

  // « Suite » / « Retour » : le champ suivant est focalisé après la sortie
  // d'étape (~500ms). On garde le cadre compact le temps que le focus revienne,
  // sinon la couverture se redéplie puis se replie.
  _pointerDown(event) {
    if (!this._on || !this.panel?.contains(event.target)) return
    if (event.target.closest("button, [role='radio'], a")) {
      this._holdUntil = Date.now() + 1400
    }
  }

  _focusOut(event) {
    if (!this._on) return
    if (event.relatedTarget && this._isField(event.relatedTarget)) {
      this._focused = event.relatedTarget
      return
    }
    this._focused = null
    this._awaitingClose = true
    window.clearTimeout(this._blurTimer)
    this._blurTimer = window.setTimeout(() => this._tryRelease(), 80)
  }

  _engage() {
    if (!this._on) {
      this._on = true
      this._stopLenis()
      this._lockPage()
      this.auth.classList.add("is-keyboard")
      this._bindViewport()
    }
    this._syncViewport()
    this._scheduleReveal()
  }

  _tryRelease() {
    if (!this._on) return
    if (this._isField(document.activeElement)) {
      this._focused = document.activeElement
      this._awaitingClose = false
      return
    }
    if (this._holdUntil && Date.now() < this._holdUntil) {
      window.clearTimeout(this._blurTimer)
      this._blurTimer = window.setTimeout(() => this._tryRelease(), this._holdUntil - Date.now() + 30)
      return
    }
    // Tant que le clavier ferme, la hauteur de viewport change. Lancer
    // l'animation maintenant la ferait viser un 30vh qui bouge encore :
    // la couverture grandit, s'arrête, puis repart. On attend qu'elle soit fixe.
    if (!this._viewportSettled()) {
      window.clearTimeout(this._blurTimer)
      this._blurTimer = window.setTimeout(() => this._tryRelease(), 60)
      return
    }
    this._release()
  }

  // Clavier considéré fermé, et plus aucun changement de hauteur depuis ~80ms.
  _viewportSettled() {
    if (this._keyboardInset() > 120) {
      this._stableSince = 0
      this._lastVvHeight = null
      return false
    }
    const height = Math.round(window.visualViewport?.height || window.innerHeight)
    if (this._lastVvHeight != null && Math.abs(height - this._lastVvHeight) > 1) {
      this._stableSince = 0
    }
    this._lastVvHeight = height
    if (!this._stableSince) this._stableSince = performance.now()
    return performance.now() - this._stableSince >= 80
  }

  _release() {
    if (!this._on) return
    this._on = false
    this._awaitingClose = false
    this._focused = null
    this._holdUntil = 0
    this._stableSince = 0
    this._lastVvHeight = null
    window.clearTimeout(this._blurTimer)
    window.clearTimeout(this._revealTimer)
    window.clearTimeout(this._revealLaterTimer)
    this._unbindViewport()
    this.auth.classList.remove("is-keyboard")
    this.auth.style.removeProperty("--sp-vvh")
    this.auth.style.removeProperty("--sp-vv-offset")
    this._unlockPage()
    this._startLenis()
  }

  _keyboardInset() {
    const vv = window.visualViewport
    if (!vv) return 0
    return Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
  }

  _bindViewport() {
    const vv = window.visualViewport
    if (!vv || this._bound) return
    this._bound = true
    vv.addEventListener("resize", this._onVvResize)
    vv.addEventListener("scroll", this._onVvScroll)
  }

  _unbindViewport() {
    if (!this._bound) return
    this._bound = false
    window.visualViewport?.removeEventListener("resize", this._onVvResize)
    window.visualViewport?.removeEventListener("scroll", this._onVvScroll)
  }

  _onViewportResize() {
    this._syncViewport()
    if (this._awaitingClose) this._tryRelease()
  }

  _syncViewport() {
    if (!this._on) return
    const vv = window.visualViewport
    const height = vv ? vv.height : window.innerHeight
    const offset = vv ? vv.offsetTop : 0
    this.auth.style.setProperty("--sp-vvh", `${Math.round(height)}px`)
    this.auth.style.setProperty("--sp-vv-offset", `${Math.round(offset)}px`)
  }

  _scheduleReveal() {
    window.clearTimeout(this._revealTimer)
    window.clearTimeout(this._revealLaterTimer)
    this._revealTimer = window.setTimeout(() => this._revealField(), 40)
    this._revealLaterTimer = window.setTimeout(() => this._revealField(), 340)
  }

  // Remonte le champ dans le panneau, en laissant le CTA visible au-dessus du clavier.
  _revealField() {
    const field = this._focused
    const panel = this.panel
    if (!this._on || !field || !panel || !panel.contains(field)) return

    const chrome = this.auth.querySelector(".sp-nav, .sp-cta")
    const reserve = chrome ? chrome.getBoundingClientRect().height + 12 : 16
    const panelRect = panel.getBoundingClientRect()
    const rect = field.getBoundingClientRect()
    const topLimit = panelRect.top + 8
    const bottomLimit = panelRect.bottom - reserve

    let delta = 0
    if (rect.bottom > bottomLimit) delta = rect.bottom - bottomLimit
    if (rect.top - delta < topLimit) delta = rect.top - topLimit
    if (Math.abs(delta) > 2) panel.scrollTop += delta
  }

  _lockPage() {
    this._scrollY = window.scrollY || document.documentElement.scrollTop || 0
    const body = document.body
    body.style.position = "fixed"
    body.style.top = `-${this._scrollY}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"
    document.documentElement.classList.add("sp-keyboard-lock")
  }

  _unlockPage() {
    const body = document.body
    body.style.position = ""
    body.style.top = ""
    body.style.left = ""
    body.style.right = ""
    body.style.width = ""
    document.documentElement.classList.remove("sp-keyboard-lock")
    const y = this._scrollY || 0
    this._scrollY = 0
    if (y) window.scrollTo(0, y)
  }

  _stopLenis() {
    const lenis = window.lenis
    if (lenis && typeof lenis.stop === "function") lenis.stop()
  }

  _startLenis() {
    const lenis = window.lenis
    if (lenis && typeof lenis.start === "function") lenis.start()
  }
}

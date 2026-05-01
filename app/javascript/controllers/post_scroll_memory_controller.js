import { Controller } from "@hotwired/stimulus"

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30

/** Sous cette distance du haut, on considère que c’est encore « en tête » d’article
 * (évite les micro-décalaages dûs au cookie + changements de scrollHeight après layout/fonts). */
const NEAR_TOP_PX = 56

/**
 * Mémorise la position de lecture (ratio de scroll) dans un cookie par article,
 * pour retrouver la même zone après rechargement. Attend text-reveal:lines-ready
 * quand le corps est découpé en lignes, sinon window load / premiers rAF.
 */
export default class extends Controller {
  static values = { postId: String }

  connect() {
    this._ratioFromCookie = null

    this._onScroll = this._throttle(() => this.persistScroll(), 200)
    this._onHide = () => this.persistScroll()
    this._onLinesReady = () => {
      this.restoreScroll()
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => this.restoreScroll())
      }
    }
    this._onLoad = () => this.restoreScroll()

    window.addEventListener("scroll", this._onScroll, { passive: true })
    window.addEventListener("pagehide", this._onHide)
    window.addEventListener("beforeunload", this._onHide)
    document.addEventListener("text-reveal:lines-ready", this._onLinesReady)
    window.addEventListener("load", this._onLoad)

    requestAnimationFrame(() => this.restoreScroll())
  }

  disconnect() {
    this.persistScroll()
    window.removeEventListener("scroll", this._onScroll)
    window.removeEventListener("pagehide", this._onHide)
    window.removeEventListener("beforeunload", this._onHide)
    document.removeEventListener("text-reveal:lines-ready", this._onLinesReady)
    window.removeEventListener("load", this._onLoad)
  }

  cookieName() {
    return `reading_scroll_${this.postIdValue}`
  }

  readRatio() {
    if (this._ratioFromCookie != null) return this._ratioFromCookie
    const raw = this._getCookie(this.cookieName())
    if (raw == null || raw === "") return null
    const r = parseFloat(raw)
    if (!Number.isFinite(r) || r < 0) return null
    this._ratioFromCookie = Math.min(1, r)
    return this._ratioFromCookie
  }

  persistScroll() {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    if (max < 16) return
    const y = window.scrollY
    if (y < NEAR_TOP_PX) {
      this._clearReadingCookie()
      return
    }

    const ratio = y / max

    const expires = new Date()
    expires.setTime(expires.getTime() + COOKIE_MAX_AGE_SEC * 1000)
    const secure = typeof window.isSecureContext === "boolean" && window.isSecureContext ? ";Secure" : ""
    document.cookie = `${this.cookieName()}=${ratio.toFixed(5)};path=/;expires=${expires.toUTCString()};SameSite=Lax${secure}`
  }

  restoreScroll() {
    const ratio = this.readRatio()
    if (ratio == null) return

    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    if (max <= 0) return

    const top = Math.max(0, Math.min(max, ratio * max))
    if (top === 0) {
      window.scrollTo(0, 0)
      return
    }
    if (top < NEAR_TOP_PX) {
      window.scrollTo(0, 0)
      this._clearReadingCookie()
      return
    }
    window.scrollTo(0, top)
  }

  _clearReadingCookie() {
    const secure = typeof window.isSecureContext === "boolean" && window.isSecureContext ? ";Secure" : ""
    document.cookie = `${this.cookieName()}=;path=/;max-age=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;SameSite=Lax${secure}`
    this._ratioFromCookie = null
  }

  _getCookie(name) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(";").shift()
  }

  _throttle(fn, ms) {
    let timeoutId = null
    let lastRun = 0
    return () => {
      const now = Date.now()
      const remaining = ms - (now - lastRun)
      if (remaining <= 0) {
        lastRun = now
        fn()
      } else if (timeoutId == null) {
        timeoutId = setTimeout(() => {
          timeoutId = null
          lastRun = Date.now()
          fn()
        }, remaining)
      }
    }
  }
}

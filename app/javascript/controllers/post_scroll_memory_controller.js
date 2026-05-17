import { Controller } from "@hotwired/stimulus"
import { captureTextReadingAnchor, measureScrollDeltaToCenterReadingAnchor } from "utils/reading_scroll_anchor"
import {
  parseReadingCookieValue,
  serializeReadingCookiePayload,
  midNormFromScroll,
  scrollYFromMidNorm,
  zoneMidProgressFromScroll,
  scrollYFromZoneMidProgress,
  readRawReadingScrollCookie
} from "utils/reading_scroll_cookie"

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30

/** Sous cette distance du haut, on considère que c’est encore « en tête » d’article
 * (évite les micro-décalaages dûs au cookie + changements de scrollHeight après layout/fonts). */
const NEAR_TOP_PX = 56

/**
 * Mémorise la position de lecture dans un cookie par article (milieu du viewport / hauteur doc).
 * Utilise Lenis (limit / scroll) quand il est là : même source que la molette desktop.
 */
export default class extends Controller {
  static values = { postId: String }

  connect() {
    this._parsedAnchorCache = null
    this._restoreBurstGen = 0
    this._scrollSilent = false
    this._suppressPersistUntil = 0

    this._onScroll = () => {
      if (!this._scrollSilent) this._restoreBurstGen++
      this._throttlePersist()
    }
    this._throttlePersist = this._throttle(() => this.persistScroll(), 200)
    this._onHide = () => this.persistScroll()
    this._onLinesReady = () => this._scheduleRestorePasses("lines-ready")
    this._onLinesReadyPersist = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => this.persistScroll(), 520)
        })
      })
    }
    this._onLoad = () => this._scheduleRestorePasses("load")
    this._onTurboLoad = () => this._scheduleRestorePasses("turbo:load")
    this._onTypographyChanged = () => {
      this._suppressPersistUntil = performance.now() + 1800
    }
    this._onLenisScroll = () => {
      if (!this._scrollSilent) this._restoreBurstGen++
      this._throttlePersist()
    }

    window.addEventListener("scroll", this._onScroll, { passive: true })
    window.addEventListener("pagehide", this._onHide)
    window.addEventListener("beforeunload", this._onHide)
    document.addEventListener("text-reveal:lines-ready", this._onLinesReady)
    document.addEventListener("text-reveal:lines-ready", this._onLinesReadyPersist)
    document.addEventListener("reading:typography-changed", this._onTypographyChanged)
    window.addEventListener("load", this._onLoad)
    document.addEventListener("turbo:load", this._onTurboLoad)

    const lenis = typeof window !== "undefined" ? window.lenis : null
    if (lenis && typeof lenis.on === "function") {
      lenis.on("scroll", this._onLenisScroll)
      this._lenisPersistHook = lenis
    } else {
      this._lenisPersistHook = null
    }
  }

  disconnect() {
    this.persistScroll()
    const lenis = this._lenisPersistHook
    if (lenis && typeof lenis.off === "function") lenis.off("scroll", this._onLenisScroll)
    this._lenisPersistHook = null
    window.removeEventListener("scroll", this._onScroll)
    window.removeEventListener("pagehide", this._onHide)
    window.removeEventListener("beforeunload", this._onHide)
    document.removeEventListener("text-reveal:lines-ready", this._onLinesReady)
    document.removeEventListener("text-reveal:lines-ready", this._onLinesReadyPersist)
    document.removeEventListener("reading:typography-changed", this._onTypographyChanged)
    window.removeEventListener("load", this._onLoad)
    document.removeEventListener("turbo:load", this._onTurboLoad)
  }

  cookieName() {
    return `reading_scroll_${this.postIdValue}`
  }

  readParsedAnchor() {
    if (this._parsedAnchorCache != null) return this._parsedAnchorCache
    const raw = readRawReadingScrollCookie(this.postIdValue)
    this._parsedAnchorCache = parseReadingCookieValue(raw)
    return this._parsedAnchorCache
  }

  /** Plusieurs passes : layout + ScrollTrigger après lines-ready, navigation Turbo sans `load`. */
  _scheduleRestorePasses() {
    const gen = ++this._restoreBurstGen
    const restoreIfCurrent = () => {
      if (gen !== this._restoreBurstGen) return
      this.restoreScroll()
    }

    restoreIfCurrent()
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(restoreIfCurrent)
    }

    requestAnimationFrame(() => {
      restoreIfCurrent()
      requestAnimationFrame(() => {
        restoreIfCurrent()
        setTimeout(restoreIfCurrent, 0)
        setTimeout(restoreIfCurrent, 50)
        setTimeout(restoreIfCurrent, 150)
        setTimeout(restoreIfCurrent, 400)
        setTimeout(restoreIfCurrent, 700)
        setTimeout(restoreIfCurrent, 1100)
      })
    })
  }

  /** Persistance : pas de resize Lenis (coûteux si appelé au scroll). */
  _maxScrollForPersist() {
    const lenis = typeof window !== "undefined" ? window.lenis : null
    if (lenis && typeof lenis.limit === "number" && Number.isFinite(lenis.limit)) {
      return Math.max(0, lenis.limit)
    }
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  }

  /** Restauration : recalcule les dimensions après reflow (text-reveal, ScrollTrigger). */
  _maxScrollForRestore() {
    const lenis = typeof window !== "undefined" ? window.lenis : null
    if (lenis && typeof lenis.resize === "function") lenis.resize()
    if (lenis && typeof lenis.limit === "number" && Number.isFinite(lenis.limit)) {
      return Math.max(0, lenis.limit)
    }
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  }

  _docScrollHeightPx() {
    return Math.max(1, document.documentElement.scrollHeight)
  }

  _readingZoneEl() {
    return this.element.querySelector(".post-body") ?? document.querySelector(".post-body")
  }

  _readScrollYPx() {
    const lenis = typeof window !== "undefined" ? window.lenis : null
    if (lenis && lenis.scroll != null && Number.isFinite(Number(lenis.scroll))) {
      return Number(lenis.scroll)
    }
    return window.scrollY
  }

  persistScroll() {
    if (performance.now() < this._suppressPersistUntil) return
    let max = this._maxScrollForPersist()
    if (max < 16) {
      const lenis = typeof window !== "undefined" ? window.lenis : null
      if (lenis && typeof lenis.resize === "function") lenis.resize()
      max = this._maxScrollForPersist()
      if (max < 16) return
    }
    const y = Math.round(this._readScrollYPx())
    if (y < NEAR_TOP_PX) {
      this._clearReadingCookie()
      return
    }

    const docH = this._docScrollHeightPx()
    const vh = window.innerHeight
    const zone = this._readingZoneEl()
    const zp = zoneMidProgressFromScroll(y, vh, zone)
    const tx = zone ? captureTextReadingAnchor(zone) : null
    const payload = serializeReadingCookiePayload(
      zp != null ? { mz: zp, tx } : { mid: midNormFromScroll(y, vh, docH), tx }
    )

    const expires = new Date()
    expires.setTime(expires.getTime() + COOKIE_MAX_AGE_SEC * 1000)
    const secure = typeof window.isSecureContext === "boolean" && window.isSecureContext ? ";Secure" : ""
    document.cookie = `${this.cookieName()}=${encodeURIComponent(payload)};path=/;expires=${expires.toUTCString()};SameSite=Lax${secure}`
    this._parsedAnchorCache = parseReadingCookieValue(payload)
  }

  restoreScroll() {
    const parsed = this.readParsedAnchor()
    if (parsed == null) return

    const max = this._maxScrollForRestore()
    if (max <= 0) return

    const docH = this._docScrollHeightPx()
    const vh = window.innerHeight

    const currentY = this._readScrollYPx()

    const zone = this._readingZoneEl()

    let top = null
    if (parsed.mz != null) {
      top = scrollYFromZoneMidProgress(parsed.mz, vh, zone, max, currentY)
      if (top == null) top = Math.max(0, Math.min(max, parsed.mz * max))
    }
    if (top == null && parsed.mid != null) {
      top = scrollYFromMidNorm(parsed.mid, vh, docH, max)
    }
    if (top == null && parsed.legacyRatio != null) {
      top = Math.max(0, Math.min(max, parsed.legacyRatio * max))
    }
    if (top == null) return

    /* Restaurations multiples : si l’utilisateur a déjà scrollé plus bas que la position cookie, ne pas le ramener en arrière. */
    if (currentY > top + 260) return
    if (top === 0) {
      this._scrollToY(0)
      return
    }
    if (top < NEAR_TOP_PX) {
      const deepEnough =
        (parsed.mz != null && parsed.mz > 0.12) ||
        (parsed.mid != null && parsed.mid * docH > vh * 0.22) ||
        (parsed.legacyRatio != null && parsed.legacyRatio > 0.04) ||
        (parsed.tx != null && (parsed.tx.blockIndex > 0 || parsed.tx.charOffset > 150))
      if (deepEnough) {
        this._scrollToY(top)
        this._scheduleRefineReadingAnchor(zone, parsed)
        return
      }
      this._scrollToY(0)
      this._clearReadingCookie()
      return
    }
    this._scrollToY(top)
    this._scheduleRefineReadingAnchor(zone, parsed)
  }

  /** Après scroll grossier (`mz` / `mid`), aligne le viewport sur l’ancre texte `tx:` si présente. */
  _scheduleRefineReadingAnchor(zone, parsed) {
    const anchor = parsed?.tx
    if (!zone || !anchor) return
    const run = () => {
      const max = this._maxScrollForRestore()
      const d = measureScrollDeltaToCenterReadingAnchor(zone, anchor)
      if (d == null || !Number.isFinite(d) || Math.abs(d) < 0.5) return
      const y = Math.round(this._readScrollYPx() + d)
      this._scrollToY(Math.max(0, Math.min(max, y)))
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(run)
    })
  }

  _scrollToY(y) {
    this._scrollSilent = true
    const lenis = typeof window !== "undefined" ? window.lenis : null
    if (lenis && typeof lenis.scrollTo === "function") {
      lenis.scrollTo(y, { immediate: true, force: true })
    } else {
      window.scrollTo(0, y)
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._scrollSilent = false
      })
    })
  }

  _clearReadingCookie() {
    const secure = typeof window.isSecureContext === "boolean" && window.isSecureContext ? ";Secure" : ""
    document.cookie = `${this.cookieName()}=;path=/;max-age=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;SameSite=Lax${secure}`
    this._parsedAnchorCache = null
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

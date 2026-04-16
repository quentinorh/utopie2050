import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

// Fullscreen welcoming-words loader inspired by Osmo's pattern.
// Cycles through translated greetings on a black screen, then fades out
// to reveal the hero. Runs once per session by default — set the
// `force` value to true to bypass the sessionStorage gate (useful for
// design iteration).
//
// Usage:
//   <div data-controller="welcoming-loader"
//        data-welcoming-loader-force-value="false"></div>
//
// The controller injects the markup it needs and removes itself once
// the timeline completes, so the host element can be empty.
export default class extends Controller {
  static values = {
    force: { type: Boolean, default: false },
    storageKey: { type: String, default: "sp2050:welcomed" }
  }

  connect() {
    // Avoid running twice in the same browser session unless forced.
    // We add the host element synchronously so the page never flashes
    // the hero before the loader covers it.
    if (!this.forceValue && this._hasGreetedThisSession()) {
      this.element.remove()
      return
    }

    this._buildMarkup()
    // Lock scroll while the loader is up — the page is invisible to
    // the user anyway, and any momentum scroll would jank the reveal.
    this._previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"

    // Defer the timeline by one frame so the inserted DOM has a chance
    // to lay out before GSAP starts measuring.
    requestAnimationFrame(() => this._run())
  }

  disconnect() {
    this._tl?.kill()
    document.documentElement.style.overflow = this._previousOverflow ?? ""
  }

  _hasGreetedThisSession() {
    try {
      return sessionStorage.getItem(this.storageKeyValue) === "1"
    } catch {
      return false
    }
  }

  _markGreeted() {
    try {
      sessionStorage.setItem(this.storageKeyValue, "1")
    } catch {
      // Private mode / disabled storage — fall back to per-page-load.
    }
  }

  _buildMarkup() {
    // Curated greeting list — short enough to feel like a heartbeat,
    // long enough to feel like a global welcome.
    this.greetings = [
      "Hello",
      "Bonjour",
      "स्वागत हे",
      "Ciao",
      "Olá",
      "おい",
      "Hallå",
      "Guten tag",
      "Hallo"
    ]

    this.element.classList.add("welcoming-loader")
    this.element.setAttribute("aria-hidden", "true")

    const stage = document.createElement("div")
    stage.className = "welcoming-loader__stage"
    this.element.appendChild(stage)
    this._stage = stage

    // Pre-build one span per word so GSAP can stagger across siblings
    // without any DOM churn during the timeline.
    this._words = this.greetings.map((text) => {
      const word = document.createElement("span")
      word.className = "welcoming-loader__word"
      word.textContent = text
      stage.appendChild(word)
      return word
    })
  }

  _run() {
    const tl = gsap.timeline({
      onComplete: () => {
        this._markGreeted()
        document.documentElement.style.overflow = this._previousOverflow ?? ""
        // Detach completely so we don't leave a 100vh sibling behind
        // the hero (it would catch pointer events otherwise).
        this.element.remove()
      }
    })
    this._tl = tl

    // Each word: rise into view, hold briefly, drop out.
    // Total per-word ≈ 0.55s — keeps the whole loader under ~5s for a
    // 9-word set and feels like a swift welcome rather than a wait.
    const stepIn = 0.45
    const hold = 0.18
    const stepOut = 0.45
    const overlap = 0.32 // how much the next word starts before the previous ends

    this._words.forEach((word, i) => {
      const start = i * (stepIn + hold + stepOut - overlap)

      tl.fromTo(
        word,
        { yPercent: 60, opacity: 0, filter: "blur(8px)" },
        {
          yPercent: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: stepIn,
          ease: "power3.out"
        },
        start
      )

      // The last greeting gets a longer hold — it's the final breath
      // before the curtain rises.
      const isLast = i === this._words.length - 1
      tl.to(
        word,
        {
          yPercent: -60,
          opacity: 0,
          filter: "blur(8px)",
          duration: stepOut,
          ease: "power3.in"
        },
        start + stepIn + (isLast ? hold * 2.6 : hold)
      )
    })

    // Curtain reveal: scale stage subtly, fade backdrop. The transform
    // origin is centred so the loader feels like it irises into the hero.
    tl.to(
      this.element,
      {
        opacity: 0,
        duration: 0.65,
        ease: "power2.inOut"
      },
      ">-0.1"
    )
  }
}

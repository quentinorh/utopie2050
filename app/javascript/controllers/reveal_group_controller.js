import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"
import scrollTriggerImport from "gsap/scrollTrigger"

// JSPM exposes ScrollTrigger differently depending on the build —
// sometimes as the default export (the class), sometimes as a module
// namespace `{ ScrollTrigger }`. Resolve once so `.create()` works.
const ScrollTrigger = scrollTriggerImport.ScrollTrigger || scrollTriggerImport
gsap.registerPlugin(ScrollTrigger)

// Staggered reveal-on-scroll for groups of elements.
//
// Apply `data-controller="reveal-group"` to the wrapper. Optional
// attributes on the wrapper:
//   data-stagger="100"       — ms between siblings (default 100)
//   data-distance="2em"      — y-offset before reveal (any CSS length)
//   data-start="top 80%"     — ScrollTrigger start position
//
// Direct children animate in sequence. A child can be a "nested"
// group by carrying `data-reveal-group-nested`; its children then
// animate with their own stagger inside the parent's slot. The
// nested parent is included in the stagger by default unless it (or
// its wrapper) carries `data-ignore="true"`.
//
// Children with `data-ignore="true"` are skipped.
//
// Honours `prefers-reduced-motion: reduce` — sets everything to its
// final state immediately.
export default class extends Controller {
  static values = {
    stagger:  { type: Number, default: 100 },   // ms
    distance: { type: String, default: "2em" },
    start:    { type: String, default: "top 80%" }
  }

  connect() {
    this._tweens = []
    this._scrollTriggers = []

    const groupEl = this.element

    // Allow overriding via data-* in addition to Stimulus values, so
    // markup that comes from the original snippet keeps working.
    const groupStaggerSec = (parseFloat(groupEl.getAttribute("data-stagger")) || this.staggerValue) / 1000
    const groupDistance   = groupEl.getAttribute("data-distance") || this.distanceValue
    const triggerStart    = groupEl.getAttribute("data-start")    || this.startValue

    const animDuration = 0.8
    const animEase     = "power4.inOut"

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(groupEl, { clearProps: "all", y: 0, autoAlpha: 1 })
      return
    }

    const directChildren = Array.from(groupEl.children).filter((el) => el.nodeType === 1)

    // No children — animate the wrapper itself.
    if (!directChildren.length) {
      gsap.set(groupEl, { y: groupDistance, autoAlpha: 0 })
      this._scrollTriggers.push(ScrollTrigger.create({
        trigger: groupEl,
        start: triggerStart,
        once: true,
        onEnter: () => this._tweens.push(gsap.to(groupEl, {
          y: 0,
          autoAlpha: 1,
          duration: animDuration,
          ease: animEase,
          onComplete: () => gsap.set(groupEl, { clearProps: "all" })
        }))
      }))
      return
    }

    // Build slots (item or nested).
    const slots = []
    directChildren.forEach((child) => {
      const nestedGroup = child.matches("[data-reveal-group-nested]")
        ? child
        : child.querySelector(":scope [data-reveal-group-nested]")

      if (nestedGroup) {
        const includeParent =
          child.getAttribute("data-ignore") !== "true" &&
          (
            child.getAttribute("data-ignore") === "false" ||
            nestedGroup.getAttribute("data-ignore") === "false"
          )

        const nestedChildren = Array.from(nestedGroup.children).filter(
          (el) => el.nodeType === 1 && el.getAttribute("data-ignore") !== "true"
        )

        slots.push({
          type: "nested",
          parentEl: child,
          nestedEl: nestedGroup,
          includeParent,
          nestedChildren
        })
      } else {
        if (child.getAttribute("data-ignore") === "true") return
        slots.push({ type: "item", el: child })
      }
    })

    // Initial hidden state.
    slots.forEach((slot) => {
      if (slot.type === "item") {
        const isNestedSelf = slot.el.matches("[data-reveal-group-nested]")
        const d = isNestedSelf ? groupDistance : (slot.el.getAttribute("data-distance") || groupDistance)
        gsap.set(slot.el, { y: d, autoAlpha: 0 })
      } else {
        if (slot.includeParent) gsap.set(slot.parentEl, { y: groupDistance, autoAlpha: 0 })
        const nestedD = slot.nestedEl.getAttribute("data-distance") || groupDistance
        slot.nestedChildren.forEach((target) => gsap.set(target, { y: nestedD, autoAlpha: 0 }))
      }
    })

    // If a nested parent is included, override its distance with the group's.
    slots.forEach((slot) => {
      if (slot.type === "nested" && slot.includeParent) {
        gsap.set(slot.parentEl, { y: groupDistance })
      }
    })

    // Reveal sequence.
    this._scrollTriggers.push(ScrollTrigger.create({
      trigger: groupEl,
      start: triggerStart,
      once: true,
      onEnter: () => {
        const tl = gsap.timeline()
        this._tweens.push(tl)

        slots.forEach((slot, slotIndex) => {
          const slotTime = slotIndex * groupStaggerSec

          if (slot.type === "item") {
            tl.to(slot.el, {
              y: 0,
              autoAlpha: 1,
              duration: animDuration,
              ease: animEase,
              onComplete: () => gsap.set(slot.el, { clearProps: "all" })
            }, slotTime)
          } else {
            if (slot.includeParent) {
              tl.to(slot.parentEl, {
                y: 0,
                autoAlpha: 1,
                duration: animDuration,
                ease: animEase,
                onComplete: () => gsap.set(slot.parentEl, { clearProps: "all" })
              }, slotTime)
            }
            const nestedMs = parseFloat(slot.nestedEl.getAttribute("data-stagger"))
            const nestedStaggerSec = isNaN(nestedMs) ? groupStaggerSec : nestedMs / 1000
            slot.nestedChildren.forEach((nestedChild, nestedIndex) => {
              tl.to(nestedChild, {
                y: 0,
                autoAlpha: 1,
                duration: animDuration,
                ease: animEase,
                onComplete: () => gsap.set(nestedChild, { clearProps: "all" })
              }, slotTime + nestedIndex * nestedStaggerSec)
            })
          }
        })
      }
    }))
  }

  disconnect() {
    this._tweens.forEach((t) => {
      if (t && typeof t.kill === "function") t.kill()
    })
    this._tweens = []
    this._scrollTriggers.forEach((st) => {
      if (st && typeof st.kill === "function") st.kill()
    })
    this._scrollTriggers = []
  }
}

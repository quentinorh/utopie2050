import { Controller } from "@hotwired/stimulus"
import { loadRegistrationPrefill } from "utils/registration_prefill"
import { buildDraftMarkup } from "utils/draft_markup"

// Propriétés recopiées du textarea vers le calque : toute différence de
// métrique décalerait le miroir d'un caractère.
const MIRRORED_STYLES = [
  "boxSizing",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontVariant",
  "fontStretch",
  "letterSpacing",
  "wordSpacing",
  "lineHeight",
  "textIndent",
  "textTransform",
  "textAlign",
  "whiteSpace",
  "wordBreak",
  "overflowWrap",
  "tabSize",
  "direction"
]

export default class extends Controller {
  static targets = ["field", "layer", "legend"]

  connect() {
    if (!this.hasFieldTarget || !this.hasLayerTarget) return

    this.prefill = loadRegistrationPrefill() || {}
    this.render = this.render.bind(this)
    this.syncScroll = this.syncScroll.bind(this)
    this.syncMetrics = this.syncMetrics.bind(this)
    this.reloadPrefill = this.reloadPrefill.bind(this)

    this.fieldTarget.addEventListener("input", this.render)
    this.fieldTarget.addEventListener("scroll", this.syncScroll)
    window.addEventListener("resize", this.syncMetrics)
    document.addEventListener("writing-tutorial:synthesis-update", this.reloadPrefill)

    this.resizeObserver = new ResizeObserver(this.syncMetrics)
    this.resizeObserver.observe(this.fieldTarget)

    this.syncMetrics()
    this.render()
  }

  disconnect() {
    if (!this.hasFieldTarget) return

    this.fieldTarget.removeEventListener("input", this.render)
    this.fieldTarget.removeEventListener("scroll", this.syncScroll)
    window.removeEventListener("resize", this.syncMetrics)
    document.removeEventListener("writing-tutorial:synthesis-update", this.reloadPrefill)
    this.resizeObserver?.disconnect()
  }

  reloadPrefill() {
    this.prefill = loadRegistrationPrefill() || {}
    this.render()
  }

  render() {
    const { html, hasValues, hasNotes } = buildDraftMarkup(this.fieldTarget.value, this.prefill)
    const decorated = hasValues || hasNotes

    this.layerTarget.innerHTML = decorated ? html : ""
    this.element.classList.toggle("is-decorated", decorated)

    if (this.hasLegendTarget) {
      this.legendTarget.hidden = !decorated
      this.legendTarget.querySelectorAll("[data-draft-legend]").forEach(item => {
        item.hidden = item.dataset.draftLegend === "note" ? !hasNotes : !hasValues
      })
    }

    // L'apparition de l'ascenseur rétrécit la zone de texte : il faut
    // reprendre les métriques avant de comparer les deux couches.
    if (this.fieldTarget.clientWidth !== this.fieldWidth) {
      this.syncMetrics()
    } else {
      this.syncScroll()
    }
  }

  syncScroll() {
    this.layerTarget.scrollTop = this.fieldTarget.scrollTop
    this.layerTarget.scrollLeft = this.fieldTarget.scrollLeft
  }

  // Le textarea réserve la place de son ascenseur : le calque doit l'imiter,
  // sinon les retours à la ligne divergent.
  syncMetrics() {
    const computed = window.getComputedStyle(this.fieldTarget)

    MIRRORED_STYLES.forEach(property => {
      this.layerTarget.style[property] = computed[property]
    })

    const gutter = this.fieldTarget.offsetWidth -
      this.fieldTarget.clientWidth -
      parseFloat(computed.borderLeftWidth) -
      parseFloat(computed.borderRightWidth)

    if (gutter > 0) {
      this.layerTarget.style.paddingRight = `${parseFloat(computed.paddingRight) + gutter}px`
    }

    this.fieldWidth = this.fieldTarget.clientWidth
    this.syncScroll()
  }
}

/**
 * Ajuste la largeur du bloc titre à la ligne la plus longue (fond pas trop large sur 2+ lignes).
 *
 * La mesure se fait dans un clone invisible pour éviter tout flicker visuel
 * (largeur qui "saute" puis revient à la normale) lors d'un resize ou d'un
 * toggle du panneau de paramètres.
 *
 * @param {HTMLElement} wrapper — élément dont le premier enfant est un nœud texte
 */
export function fitTitleWrapperToLongestLine(wrapper) {
  if (!wrapper || !wrapper.isConnected) return
  const parent = wrapper.parentElement
  if (!parent) return

  const text = wrapper.textContent
  if (!text || !text.trim()) {
    wrapper.style.width = ""
    return
  }

  const clone = wrapper.cloneNode(false)
  clone.textContent = text
  clone.removeAttribute("data-cover-editor-target")
  clone.removeAttribute("data-cover-target")
  clone.setAttribute("aria-hidden", "true")
  clone.style.position = "absolute"
  clone.style.visibility = "hidden"
  clone.style.pointerEvents = "none"
  clone.style.left = "0"
  clone.style.top = "0"
  clone.style.width = ""
  clone.style.transition = "none"
  parent.appendChild(clone)

  try {
    const textNode = clone.firstChild
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return

    const range = document.createRange()
    const len = text.length
    let maxWidth = 0
    let lineStart = 0
    let lastBottom = null

    for (let i = 1; i <= len; i++) {
      range.setStart(textNode, 0)
      range.setEnd(textNode, i)
      const rect = range.getBoundingClientRect()
      if (lastBottom !== null && rect.bottom > lastBottom) {
        range.setStart(textNode, lineStart)
        range.setEnd(textNode, i - 1)
        maxWidth = Math.max(maxWidth, range.getBoundingClientRect().width)
        lineStart = i
      }
      lastBottom = rect.bottom
    }
    range.setStart(textNode, lineStart)
    range.setEnd(textNode, len)
    maxWidth = Math.max(maxWidth, range.getBoundingClientRect().width)

    const style = getComputedStyle(clone)
    const padding =
      (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)

    const finalWidth = Math.ceil(maxWidth) + padding
    wrapper.style.transition = "none"
    wrapper.style.width = `${finalWidth}px`
  } finally {
    parent.removeChild(clone)
  }
}

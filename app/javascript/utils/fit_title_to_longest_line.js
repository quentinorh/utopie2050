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
  // Les blancs de bord (indentation ERB autour de <%= post.title %>) ne sont pas
  // rendus mais seraient comptés dans la largeur de la première / dernière ligne.
  clone.textContent = text.replace(/\s+/g, " ").trim()
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
    range.setStart(textNode, 0)
    range.setEnd(textNode, textNode.length)

    // getClientRects() renvoie un rectangle par ligne : le plus large donne la
    // largeur utile du bloc, sans compter les espaces repliés en fin de ligne.
    let maxWidth = 0
    for (const rect of range.getClientRects()) {
      maxWidth = Math.max(maxWidth, rect.width)
    }
    if (maxWidth === 0) return

    const style = getComputedStyle(clone)
    // En content-box la largeur appliquée exclut déjà le padding.
    const padding =
      style.boxSizing === "border-box"
        ? (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
        : 0

    const finalWidth = Math.ceil(maxWidth) + padding
    wrapper.style.transition = "none"
    wrapper.style.width = `${finalWidth}px`
  } finally {
    parent.removeChild(clone)
  }
}

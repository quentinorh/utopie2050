/**
 * Ajuste la largeur du bloc titre à la ligne la plus longue (fond pas trop large sur 2+ lignes).
 * @param {HTMLElement} wrapper — élément dont le premier enfant est un nœud texte
 */
export function fitTitleWrapperToLongestLine(wrapper) {
  if (!wrapper || !wrapper.isConnected) return
  const parent = wrapper.parentElement
  const maxW = parent?.offsetWidth ?? 250
  const cap = maxW * 0.8
  wrapper.style.transition = "none"
  wrapper.style.width = `${cap}px`
  wrapper.offsetHeight
  const textNode = wrapper.firstChild
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !textNode.textContent.trim()) return
  const text = textNode.textContent
  const len = text.length
  if (len === 0) return
  const range = document.createRange()
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
      const lineRect = range.getBoundingClientRect()
      maxWidth = Math.max(maxWidth, lineRect.width)
      lineStart = i
    }
    lastBottom = rect.bottom
  }
  range.setStart(textNode, lineStart)
  range.setEnd(textNode, len)
  const lastRect = range.getBoundingClientRect()
  maxWidth = Math.max(maxWidth, lastRect.width)
  const style = getComputedStyle(wrapper)
  const padding =
    (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
  wrapper.style.transition = "width 0.15s ease-out"
  wrapper.style.width = `${Math.min(maxWidth + padding, cap)}px`
}

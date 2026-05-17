/** Blocs de lecture (même ordre que text_reveal `LINE_BLOCK_SELECTOR`). */
export const READING_LINE_BLOCKS_SELECTOR = ".body-content, h2.chapter-title, .chapter-content"

function caretRangeFromViewportCenter() {
  const margin = 12
  const x = Math.min(Math.max(margin, window.innerWidth / 2), window.innerWidth - margin)
  const y = Math.min(Math.max(margin, window.innerHeight / 2), window.innerHeight - margin)
  if (document.caretRangeFromPoint) {
    try {
      return document.caretRangeFromPoint(x, y)
    } catch {
      return null
    }
  }
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y)
    if (!p?.offsetNode) return null
    const r = document.createRange()
    const node = p.offsetNode
    const maxOff = node.nodeType === Node.TEXT_NODE ? node.nodeValue.length : 0
    const off = Math.min(Math.max(0, p.offset), maxOff)
    try {
      r.setStart(node, off)
      r.collapse(true)
      return r
    } catch {
      return null
    }
  }
  return null
}

function closestReadingBlock(startContainer, postBodyRoot) {
  let el = startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentElement : startContainer
  while (el && postBodyRoot.contains(el)) {
    if (
      el.matches?.(".body-content") ||
      el.matches?.("h2.chapter-title") ||
      el.matches?.(".chapter-content")
    ) {
      return el
    }
    el = el.parentElement
  }
  return null
}

/** Recule l’offset au début du « mot » sous le curseur (lettres / chiffres / apostrophe tiret). */
export function snapCharOffsetToWordStart(blockPlainText, offset) {
  const o = Math.max(0, Math.min(offset, blockPlainText.length))
  if (o === 0) return 0
  const before = blockPlainText.slice(0, o)
  const m = before.match(/[\p{L}\p{N}_'-]+$/u)
  if (!m) return o
  return o - m[0].length
}

/**
 * Ancre lecture : index du bloc + offset caractère (UTF-16, comme Range) depuis le début du bloc.
 * @returns {{ blockIndex: number, charOffset: number } | null}
 */
export function captureTextReadingAnchor(postBodyRoot) {
  if (!postBodyRoot) return null
  const rng = caretRangeFromViewportCenter()
  if (!rng?.startContainer) return null

  let block = closestReadingBlock(rng.startContainer, postBodyRoot)
  if (!block) {
    const margin = 12
    const x = Math.min(Math.max(margin, window.innerWidth / 2), window.innerWidth - margin)
    const y = Math.min(Math.max(margin, window.innerHeight / 2), window.innerHeight - margin)
    const hit = document.elementFromPoint(x, y)
    if (hit) block = closestReadingBlock(hit, postBodyRoot)
  }
  if (!block) return null

  const blocks = Array.from(postBodyRoot.querySelectorAll(READING_LINE_BLOCKS_SELECTOR))
  const blockIndex = blocks.indexOf(block)
  if (blockIndex < 0) return null

  let charOffset = 0
  try {
    const pre = document.createRange()
    pre.selectNodeContents(block)
    pre.setEnd(rng.startContainer, rng.startOffset)
    charOffset = pre.toString().length
  } catch {
    return null
  }

  const plain = block.textContent ?? ""
  charOffset = snapCharOffsetToWordStart(plain, charOffset)

  return { blockIndex, charOffset }
}

function rangeCaretRect(range) {
  const rects = range.getClientRects()
  if (rects.length > 0) return rects[rects.length - 1]
  const br = range.getBoundingClientRect()
  if (br.width > 0 || br.height > 0) return br
  return null
}

/**
 * Range au caractère `charOffset` dans le bloc `blockIndex`, puis premier rectangle client valide.
 */
export function getCaretRectForReadingAnchor(postBodyRoot, anchor) {
  if (!postBodyRoot || !anchor) return null
  const blocks = Array.from(postBodyRoot.querySelectorAll(READING_LINE_BLOCKS_SELECTOR))
  const block = blocks[anchor.blockIndex]
  if (!block) return null

  let remaining = Math.max(0, anchor.charOffset)
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null)
  let node
  while ((node = walker.nextNode())) {
    const len = node.nodeValue.length
    if (remaining <= len) {
      const r = document.createRange()
      const off = Math.min(remaining, len)
      try {
        r.setStart(node, off)
        r.collapse(true)
      } catch {
        return null
      }
      const rect = rangeCaretRect(r)
      if (rect && (rect.height > 0 || rect.width > 0)) return rect
      const parent = node.parentElement
      if (parent) return parent.getBoundingClientRect()
      return null
    }
    remaining -= len
  }

  try {
    const r = document.createRange()
    r.selectNodeContents(block)
    r.collapse(false)
    const rect = rangeCaretRect(r)
    if (rect) return rect
  } catch {
    /* ignore */
  }
  return null
}

/** Delta vertical (px) pour amener l’ancre au milieu du viewport. */
export function measureScrollDeltaToCenterReadingAnchor(postBodyRoot, anchor) {
  const rect = getCaretRectForReadingAnchor(postBodyRoot, anchor)
  if (!rect) return null
  const cy = window.innerHeight / 2
  return rect.top + rect.height / 2 - cy
}

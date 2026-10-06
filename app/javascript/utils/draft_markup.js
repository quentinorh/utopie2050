import { narrativeValueVariants } from "utils/narrative_template"

// Un conseil d'écriture est un bloc entre crochets contenant au moins une
// espace : les renvois courts du type [1] ou [sic] restent du texte normal.
const NOTE_SOURCE = "\\[[^\\[\\]]*\\s[^\\[\\]]*\\]"

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Repère les réponses du didacticiel dans un fragment hors conseil.
function markValues(text, variants, state) {
  if (!text) return ""
  if (variants.length === 0) return escapeHtml(text)

  const pattern = new RegExp(variants.map(escapeRegExp).join("|"), "g")
  let html = ""
  let cursor = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    html += escapeHtml(text.slice(cursor, match.index))
    html += `<span class="draft-chip">${escapeHtml(match[0])}</span>`
    cursor = match.index + match[0].length
    state.hasValues = true
  }

  return html + escapeHtml(text.slice(cursor))
}

// Rend le miroir affiché derrière le textarea : les réponses du didacticiel
// deviennent des étiquettes, les conseils entre crochets des notes.
export function buildDraftMarkup(text, prefill = {}) {
  const state = { hasValues: false, hasNotes: false }
  if (!text) return { html: "", ...state }

  const variants = narrativeValueVariants(prefill)
  const notes = new RegExp(NOTE_SOURCE, "g")
  let html = ""
  let cursor = 0
  let match

  while ((match = notes.exec(text)) !== null) {
    html += markValues(text.slice(cursor, match.index), variants, state)
    html += `<span class="draft-note">${escapeHtml(match[0])}</span>`
    cursor = match.index + match[0].length
    state.hasNotes = true
  }

  html += markValues(text.slice(cursor), variants, state)

  // `white-space: pre-wrap` avale la dernière ligne vide : on la restitue pour
  // que le miroir reste calé sur le textarea.
  return { html: `${html}\n`, ...state }
}

const PLACEHOLDER_PATTERN = /%\{(?:(cap|lower|upper|title):)?(pseudo|age|lieu|etincelle|theme|tendance|inversion)\}/g

const FORMATTABLE_KEYS = new Set(["lieu", "etincelle", "theme", "tendance", "inversion"])
const HIGHLIGHT_MODIFIERS = ["cap", "lower", "upper", "title", null]

export function capitalizeEtincelle(text) {
  if (!text) return ""
  return String(text).replace(/(?:^|\s)\S/g, char => char.toLocaleUpperCase("fr-FR"))
}

export function buildEtincelleRaw(prefill = {}) {
  return prefill.phrase ||
    (prefill.noun && prefill.adjective ? `${prefill.noun} ${prefill.adjective}` : "")
}

export function buildEtincelle(prefill = {}) {
  return capitalizeEtincelle(buildEtincelleRaw(prefill))
}

export function defaultNarrativeModifier(key) {
  if (key === "lieu") return "cap"
  if (key === "etincelle") return "title"
  return null
}

export function formatNarrativeValue(value, modifier, key) {
  if (!value) return ""

  const text = String(value)
  const resolvedModifier = modifier || defaultNarrativeModifier(key)

  switch (resolvedModifier) {
    case "cap":
      return text.charAt(0).toLocaleUpperCase("fr-FR") + text.slice(1)
    case "lower":
      return text.charAt(0).toLocaleLowerCase("fr-FR") + text.slice(1)
    case "upper":
      return text.toLocaleUpperCase("fr-FR")
    case "title":
      return capitalizeEtincelle(text)
    default:
      return text
  }
}

export function buildNarrativeContext(prefill = {}) {
  return {
    pseudo: prefill.username || prefill.pseudo || "",
    age: prefill.age != null && prefill.age !== "" ? String(prefill.age) : "",
    lieu: prefill.livingPlace || prefill.lieu || "",
    etincelle: buildEtincelleRaw(prefill),
    theme: prefill.theme || "",
    tendance: prefill.trend || "",
    inversion: prefill.trendOpposite || ""
  }
}

export function interpolateNarrativeTemplate(template, context = {}) {
  if (!template) return ""

  return String(template).replace(
    PLACEHOLDER_PATTERN,
    (_, modifier, key) => formatNarrativeValue(context[key] ?? "", modifier, key)
  )
}

export function resolveBodyTemplate(style, prefill = {}) {
  if (!style?.template) return ""
  return interpolateNarrativeTemplate(style.template, buildNarrativeContext(prefill))
}

export function findNarrativeStyleById(id) {
  if (!id) return null

  const el = document.getElementById("writing-narrative-styles-json")
  if (!el) return null

  try {
    return JSON.parse(el.textContent).find(style => style.id === id) || null
  } catch {
    return null
  }
}

export function resolveBodyTemplateFromPrefill(prefill = {}) {
  if (prefill.bodyTemplate) return prefill.bodyTemplate

  if (!prefill.narrativeStyle) return ""

  const style = findNarrativeStyleById(prefill.narrativeStyle)
  if (!style) return ""

  return resolveBodyTemplate(style, prefill)
}

export function regenerateBodyTemplateFromPrefill(prefill = {}) {
  if (prefill.bodyTemplateEdited) return prefill.bodyTemplate || ""

  if (!prefill.narrativeStyle) return prefill.bodyTemplate || ""

  const style = findNarrativeStyleById(prefill.narrativeStyle)
  if (!style) return prefill.bodyTemplate || ""

  return resolveBodyTemplate(style, prefill)
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function highlightVariantsForContext(context = {}) {
  const variants = new Set()

  Object.entries(context).forEach(([key, value]) => {
    if (!value) return

    variants.add(String(value))

    if (!FORMATTABLE_KEYS.has(key)) return

    HIGHLIGHT_MODIFIERS.forEach(modifier => {
      variants.add(formatNarrativeValue(value, modifier, key))
    })
  })

  return [...variants].sort((a, b) => b.length - a.length)
}

export function highlightNarrativeValues(text, prefill = {}) {
  if (!text) return ""

  const context = buildNarrativeContext(prefill)
  const values = highlightVariantsForContext(context)

  let html = escapeHtml(text)

  for (const value of values) {
    const escaped = escapeHtml(value)
    if (!escaped) continue
    html = html.split(escaped).join(`<strong class="draft-value">${escaped}</strong>`)
  }

  return html.replace(/\n/g, "<br>")
}

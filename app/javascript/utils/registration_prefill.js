import { buildEtincelle, findNarrativeStyleById } from "utils/narrative_template"

const STORAGE_KEY = "sp2050_registration_prefill"

export const SYNTHESIS_LABELS = {
  username: "Pseudo",
  age: "Âge en 2050",
  livingPlace: "Lieu de vie",
  spark: "Étincelle",
  theme: "Thème",
  trendOpposite: "Tendance inversée",
  narrativeStyle: "Style"
}

export function saveRegistrationPrefill({
  username, age, livingPlace, theme, noun, adjective, phrase,
  trend, trendOpposite, narrativeStyle, narrativeStyleLabel, bodyTemplate, bodyTemplateEdited,
  coverPatternSettings, termsAccepted
} = {}) {
  const existing = loadRegistrationPrefill() || {}
  const data = { ...existing }

  if (username !== undefined && username !== null) {
    const value = String(username).trim()
    if (value) data.username = value
  }

  if (age !== undefined && age !== null) {
    const value = String(age).trim()
    if (value) data.age = value
  }

  if (livingPlace !== undefined && livingPlace !== null) {
    const value = String(livingPlace).trim()
    if (value) data.livingPlace = value
  }

  if (theme !== undefined && theme !== null) {
    const value = String(theme).trim()
    if (value) data.theme = value
  }

  if (noun !== undefined && noun !== null) {
    const value = String(noun).trim()
    if (value) data.noun = value
  }

  if (adjective !== undefined && adjective !== null) {
    const value = String(adjective).trim()
    if (value) data.adjective = value
  }

  if (phrase !== undefined && phrase !== null) {
    const value = String(phrase).trim()
    if (value) data.phrase = value
  }

  if (trend !== undefined && trend !== null) {
    const value = String(trend).trim()
    if (value) data.trend = value
  }

  if (trendOpposite !== undefined && trendOpposite !== null) {
    const value = String(trendOpposite).trim()
    if (value) data.trendOpposite = value
  }

  if (narrativeStyle !== undefined && narrativeStyle !== null) {
    const value = String(narrativeStyle).trim()
    if (value) data.narrativeStyle = value
  }

  if (narrativeStyleLabel !== undefined && narrativeStyleLabel !== null) {
    const value = String(narrativeStyleLabel).trim()
    if (value) data.narrativeStyleLabel = value
  }

  if (bodyTemplate !== undefined && bodyTemplate !== null) {
    const value = String(bodyTemplate).trim()
    if (value) data.bodyTemplate = value
  }

  if (bodyTemplateEdited !== undefined && bodyTemplateEdited !== null) {
    data.bodyTemplateEdited = Boolean(bodyTemplateEdited)
  }

  if (coverPatternSettings !== undefined && coverPatternSettings !== null) {
    const value = String(coverPatternSettings).trim()
    if (value) data.coverPatternSettings = value
  }

  if (termsAccepted !== undefined && termsAccepted !== null) {
    data.termsAccepted = Boolean(termsAccepted)
  }

  if (Object.keys(data).length > 0) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}

export function loadRegistrationPrefill() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearRegistrationPrefill() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    document.dispatchEvent(new CustomEvent("writing-tutorial:synthesis-update"))
  } catch {
    // sessionStorage indisponible
  }
}

export function syncRegistrationPrefillFromAccount(username, age) {
  const data = { ...(loadRegistrationPrefill() || {}) }
  let changed = false

  if (username) {
    const value = String(username).trim()
    if (value && data.username !== value) {
      data.username = value
      changed = true
    }
  }

  if (age !== undefined && age !== null && age !== "") {
    const value = String(age).trim()
    if (value && data.age !== value) {
      data.age = value
      changed = true
    }
  }

  if (changed) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    document.dispatchEvent(new CustomEvent("writing-tutorial:synthesis-update"))
  }

  return data
}

export function buildSynthesisItems(prefill, { username, age, editable = false } = {}) {
  const items = []
  const resolvedUsername = username || prefill?.username
  const resolvedAge = age || prefill?.age

  if (resolvedUsername) {
    items.push({
      key: "username",
      label: SYNTHESIS_LABELS.username,
      value: sentenceCase(resolvedUsername),
      editable,
      field: "username"
    })
  }

  if (resolvedAge) {
    items.push({
      key: "age",
      label: SYNTHESIS_LABELS.age,
      value: sentenceCase(editable ? String(resolvedAge) : `${resolvedAge} ans`),
      editable,
      field: "age"
    })
  }

  if (prefill?.livingPlace) {
    items.push({
      key: "livingPlace",
      label: SYNTHESIS_LABELS.livingPlace,
      value: sentenceCase(prefill.livingPlace),
      editable,
      field: "livingPlace"
    })
  }

  const phrase = prefill?.phrase ||
    (prefill?.noun && prefill?.adjective ? `${prefill.noun} ${prefill.adjective}` : null)

  if (phrase) {
    items.push({
      key: "spark",
      label: SYNTHESIS_LABELS.spark,
      value: sentenceCase(buildEtincelle(prefill)),
      editable,
      field: "spark"
    })
  }

  if (prefill?.theme) {
    items.push({
      key: "theme",
      label: SYNTHESIS_LABELS.theme,
      value: sentenceCase(prefill.theme),
      editable,
      field: "theme"
    })
  }

  if (editable) {
    if (prefill?.trend) {
      items.push({
        key: "trend",
        label: "Tendance",
        value: sentenceCase(prefill.trend),
        editable: true,
        field: "trend"
      })
    }

    if (prefill?.trendOpposite) {
      items.push({
        key: "trendOpposite",
        label: "Inversion",
        value: sentenceCase(prefill.trendOpposite),
        editable: true,
        field: "trendOpposite"
      })
    }
  } else if (prefill?.trend && prefill?.trendOpposite) {
    items.push({
      key: "trendInverted",
      label: SYNTHESIS_LABELS.trendOpposite,
      value: sentenceCase(`${prefill.trend} / ${prefill.trendOpposite}`),
      editable: false
    })
  } else if (prefill?.trendOpposite) {
    items.push({
      key: "trendInverted",
      label: SYNTHESIS_LABELS.trendOpposite,
      value: sentenceCase(prefill.trendOpposite),
      editable: false
    })
  } else if (prefill?.trend) {
    items.push({
      key: "trendInverted",
      label: SYNTHESIS_LABELS.trendOpposite,
      value: sentenceCase(prefill.trend),
      editable: false
    })
  }

  const styleTitle = narrativeStyleTitle(prefill)
  if (styleTitle) {
    items.push({
      key: "narrativeStyle",
      label: SYNTHESIS_LABELS.narrativeStyle,
      value: sentenceCase(styleTitle),
      editable: false
    })
  }

  return items
}

export function buildSynthesisSummary(prefill, options = {}) {
  const items = buildSynthesisItems(prefill, options)
  const parts = []

  const trend = sentenceCase(prefill?.trend)
  const theme = items.find(item => item.key === "theme")
  const style = items.find(item => item.key === "narrativeStyle")

  if (trend) parts.push(trend)
  if (theme?.value) parts.push(theme.value)
  if (style?.value) parts.push(style.value)

  return parts.join(" · ")
}

function sentenceCase(text) {
  const value = String(text ?? "").trim()
  if (!value) return ""

  const lower = value.toLocaleLowerCase("fr-FR")
  return lower.charAt(0).toLocaleUpperCase("fr-FR") + lower.slice(1)
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function escapeAttribute(text) {
  return escapeHtml(text).replace(/'/g, "&#39;")
}

function narrativeStyleTitle(prefill) {
  const fromCatalog = findNarrativeStyleById(prefill?.narrativeStyle)?.title
  if (fromCatalog) return fromCatalog

  const label = String(prefill?.narrativeStyleLabel || "").trim()
  if (!label) return ""

  const separator = label.indexOf(" — ")
  return separator === -1 ? label : label.slice(0, separator).trim()
}

function renderSynthesisValue(item, editable) {
  if (!editable || !item.editable) {
    return `<dd class="writing-tutorial-synthesis__value">${escapeHtml(item.value)}</dd>`
  }

  const field = escapeAttribute(item.field)
  const value = escapeAttribute(item.value)

  return `<dd class="writing-tutorial-synthesis__value">
    <input type="text"
           class="writing-tutorial-synthesis__input"
           data-synthesis-field="${field}"
           value="${value}"
           aria-label="${escapeAttribute(item.label)}" />
  </dd>`
}

export function prefillUpdatesFromSynthesisField(field, value) {
  switch (field) {
    case "username":
      return { username: value }
    case "age":
      return { age: value }
    case "livingPlace":
      return { livingPlace: value }
    case "spark":
      return { phrase: value }
    case "theme":
      return { theme: value }
    case "trend":
      return { trend: value }
    case "trendOpposite":
      return { trendOpposite: value }
    default:
      return {}
  }
}

export function renderWritingTutorialSynthesis(listElement, panelElement, prefill, options = {}) {
  if (!listElement || !panelElement) return

  const { summaryElement, editable = false } = options
  const items = buildSynthesisItems(prefill, options)

  if (items.length === 0) {
    panelElement.hidden = true
    listElement.innerHTML = ""
    if (summaryElement) {
      summaryElement.textContent = ""
      summaryElement.hidden = true
    }
    return
  }

  listElement.innerHTML = items.map(item => `
    <div class="writing-tutorial-synthesis__item">
      <dt class="writing-tutorial-synthesis__label">${escapeHtml(item.label)}</dt>
      ${renderSynthesisValue(item, editable)}
    </div>
  `).join("")

  if (summaryElement) {
    const summary = buildSynthesisSummary(prefill, options)
    summaryElement.textContent = summary
    summaryElement.hidden = !summary
  }

  panelElement.hidden = false
}

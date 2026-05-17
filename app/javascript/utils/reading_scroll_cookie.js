/** Cookie lecture : segments `|` — `mz:` zone `.post-body`, `tx:b:o` ancrage caractère, `mid:` doc entier, ou nombre seul (legacy ratio). */

export const READING_COOKIE_ZONE_PREFIX = "mz:"
export const READING_COOKIE_TX_PREFIX = "tx:"
export const READING_COOKIE_MID_PREFIX = "mid:"

/**
 * @typedef {{ mz: number | null, tx: { blockIndex: number, charOffset: number } | null, mid: number | null, legacyRatio: number | null }} ReadingCookieParsed
 */

/** @returns {ReadingCookieParsed | null} */
export function parseReadingCookieValue(raw) {
  if (raw == null || raw === "") return null
  const v = String(raw).trim()
  /** @type {ReadingCookieParsed} */
  const out = { mz: null, tx: null, mid: null, legacyRatio: null }

  const chunks = v.includes("|") ? v.split("|").map((s) => s.trim()).filter(Boolean) : [v]
  for (const chunk of chunks) {
    applyReadingCookieSegment(out, chunk)
  }

  if (out.mz == null && out.tx == null && out.mid == null && out.legacyRatio == null) return null
  return out
}

/** @param {ReadingCookieParsed} out */
function applyReadingCookieSegment(out, seg) {
  if (!seg) return

  if (seg.startsWith(READING_COOKIE_ZONE_PREFIX)) {
    const z = parseFloat(seg.slice(READING_COOKIE_ZONE_PREFIX.length))
    if (Number.isFinite(z) && z >= 0) out.mz = Math.min(1, z)
    return
  }

  if (seg.startsWith(READING_COOKIE_TX_PREFIX)) {
    const m = /^tx:(\d+):(\d+)$/.exec(seg)
    if (m) {
      const bi = parseInt(m[1], 10)
      const co = parseInt(m[2], 10)
      if (Number.isFinite(bi) && Number.isFinite(co) && co >= 0) out.tx = { blockIndex: bi, charOffset: co }
    }
    return
  }

  if (seg.startsWith(READING_COOKIE_MID_PREFIX)) {
    const midNorm = parseFloat(seg.slice(READING_COOKIE_MID_PREFIX.length))
    if (Number.isFinite(midNorm) && midNorm >= 0) out.mid = Math.min(1, midNorm)
    return
  }

  const r = parseFloat(seg)
  if (!seg.includes(":") && Number.isFinite(r) && r >= 0) out.legacyRatio = Math.min(1, r)
}

/** @param {{ mz?: number | null, tx?: { blockIndex: number, charOffset: number } | null, mid?: number | null }} parts */
export function serializeReadingCookiePayload(parts) {
  const segs = []
  if (parts.mz != null && Number.isFinite(parts.mz)) segs.push(`${READING_COOKIE_ZONE_PREFIX}${parts.mz.toFixed(6)}`)
  if (parts.mid != null && Number.isFinite(parts.mid)) segs.push(`${READING_COOKIE_MID_PREFIX}${parts.mid.toFixed(6)}`)
  if (parts.tx != null && Number.isFinite(parts.tx.blockIndex) && Number.isFinite(parts.tx.charOffset)) {
    segs.push(`${READING_COOKIE_TX_PREFIX}${parts.tx.blockIndex}:${parts.tx.charOffset}`)
  }
  return segs.join("|")
}

export function midNormFromScroll(yPx, vhPx, docScrollHeightPx) {
  if (!(docScrollHeightPx > 0)) return 0
  const midDoc = yPx + vhPx / 2
  return Math.min(1, Math.max(0, midDoc / docScrollHeightPx))
}

export function scrollYFromMidNorm(midNorm, vhPx, docScrollHeightPx, maxScrollPx) {
  const midTarget = midNorm * docScrollHeightPx
  const y = midTarget - vhPx / 2
  return Math.max(0, Math.min(maxScrollPx, y))
}

export function zoneMidProgressFromScroll(yPx, vhPx, zoneEl) {
  if (!zoneEl || zoneEl.scrollHeight < 24) return null
  const zr = zoneEl.getBoundingClientRect()
  const zoneTopDoc = zr.top + yPx
  const centerDoc = yPx + vhPx / 2
  const zh = Math.max(1, zoneEl.scrollHeight)
  const prog = (centerDoc - zoneTopDoc) / zh
  return Math.min(1, Math.max(0, prog))
}

export function scrollYFromZoneMidProgress(progress, vhPx, zoneEl, maxScrollPx, currentScrollYPx) {
  if (!zoneEl || zoneEl.scrollHeight < 24) return null
  const zr = zoneEl.getBoundingClientRect()
  const zoneTopDoc = zr.top + currentScrollYPx
  const centerTarget = zoneTopDoc + progress * Math.max(1, zoneEl.scrollHeight)
  const y = centerTarget - vhPx / 2
  return Math.max(0, Math.min(maxScrollPx, y))
}

/** @param {ReadingCookieParsed | null} parsed */
export function cookieIndicatesDeepReading(parsed, docScrollHeightPx, vhPx) {
  if (!parsed) return false
  if (parsed.tx != null && (parsed.tx.blockIndex > 0 || parsed.tx.charOffset > 80)) return true
  if (parsed.legacyRatio != null) return parsed.legacyRatio >= 0.02
  if (parsed.mz != null) return parsed.mz >= 0.06
  if (parsed.mid != null) return parsed.mid * docScrollHeightPx > vhPx * 0.35
  return false
}

export function readRawReadingScrollCookie(postId) {
  const name = `reading_scroll_${postId}`
  const prefixed = `; ${document.cookie}`
  const parts = prefixed.split(`; ${name}=`)
  if (parts.length !== 2) return undefined
  const raw = parts.pop().split(";").shift()?.trim()
  if (!raw) return undefined
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

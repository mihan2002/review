/**
 * Cataloguing helpers.
 *
 * Everything here is derived on the client from facts the API already returned.
 * Nothing in this file invents a value the backend does not know: the call
 * number is a display encoding of the entry's own date and id, not a stored
 * field, and the counts describe only the entries currently in hand.
 */

const TAB_POSITIONS = 4

/** A stable 0..n-1 slot so a date's guide tab always stands in the same place. */
export function tabPosition(key: string, slots = TAB_POSITIONS): number {
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0
  }
  return hash % slots
}

/**
 * The card's call number, e.g. "DY·2026.09.18·7K".
 * The date is the filing date; the suffix is the first characters of the entry
 * id, so two cards filed on one day are still distinguishable on the drawer.
 */
export function callNumber(entryDate: string, id: string): string {
  const filed = entryDate.replaceAll('-', '.')
  const suffix = id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '00'
  return `DY·${filed}·${suffix}`
}

export function wordCount(text: string): number {
  const trimmed = text.trim()
  if (trimmed === '') return 0
  return trimmed.split(/\s+/).length
}

/** Minutes at a steady 220 words per minute, floored at one. */
export function readingMinutes(text: string): number {
  return Math.max(1, Math.round(wordCount(text) / 220))
}

/** Pads a count the way a typed catalog does: 007, not 7. */
export function typedCount(value: number, width = 3): string {
  return String(Math.max(0, value)).padStart(width, '0')
}

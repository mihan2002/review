const LONG_DATE = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const SHORT_TIME = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const MONTH_SHORT = new Intl.DateTimeFormat(undefined, { month: 'short' })

/** Parses a backend LocalDate ("2026-09-18") without timezone drift. */
function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? null : date
}

/** "September 18, 2026" from a LocalDate string. */
export function formatEntryDate(value: string): string {
  const date = parseLocalDate(value)
  return date ? LONG_DATE.format(date) : value
}

/** "September 18, 2026 at 8:04 PM" from an ISO instant. */
export function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : DATE_TIME.format(date)
}

/** "20:04" — the time a card was typed, in the catalog's clipped register. */
export function formatClockTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '--:--' : SHORT_TIME.format(date)
}

/** "MON" — the weekday of a LocalDate, for the guide tab. */
export function weekdayLabel(value: string): string {
  const date = parseLocalDate(value)
  return date ? WEEKDAY.format(date).toUpperCase().slice(0, 3) : '---'
}

/** "18" — the day of the month, set large on the card header. */
export function dayOfMonth(value: string): string {
  const date = parseLocalDate(value)
  return date ? String(date.getDate()).padStart(2, '0') : '--'
}

/** "SEP 2026" — the drawer this card is filed in. */
export function drawerLabel(value: string): string {
  const date = parseLocalDate(value)
  if (!date) return value
  return `${MONTH_SHORT.format(date).toUpperCase()} ${date.getFullYear()}`
}

export function monthShortLabel(monthIndex: number): string {
  return MONTH_SHORT.format(new Date(2000, monthIndex, 1)).toUpperCase()
}

/** Today's date as a backend-compatible LocalDate string. */
export function todayAsIsoDate(): string {
  return toIsoDate(new Date())
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function isIsoDate(value: string): boolean {
  return parseLocalDate(value) !== null
}

export function yearOf(value: string): number | null {
  const date = parseLocalDate(value)
  return date ? date.getFullYear() : null
}

/** "Today" / "Yesterday" / null — only for the two days a writer thinks about. */
export function relativeDayLabel(value: string): string | null {
  const date = parseLocalDate(value)
  if (!date) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === -1) return 'Yesterday'
  return null
}

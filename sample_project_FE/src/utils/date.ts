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

/** Today's date as a backend-compatible LocalDate string. */
export function todayAsIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function isIsoDate(value: string): boolean {
  return parseLocalDate(value) !== null
}

/** "Good morning" / "Good afternoon" / "Good evening" */
export function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

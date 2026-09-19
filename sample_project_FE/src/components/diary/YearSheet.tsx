import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { useYearIndex } from '../../hooks/useYearIndex'
import { typedCount } from '../../utils/catalog'
import { formatEntryDate, monthShortLabel, toIsoDate, todayAsIsoDate } from '../../utils/date'
import { cn } from '../../utils/cn'
import { Skeleton } from '../common/Skeleton'

interface YearSheetProps {
  year: number
  onYearChange: (year: number) => void
  /** Pulling a single day's drawer. */
  onPickDay: (isoDate: string) => void
  selectedFrom: string
  selectedTo: string
}

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const MONTHS = Array.from({ length: 12 }, (_, index) => index)

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Consecutive days filed, counting back from today. Only within this year. */
function currentStreak(counts: Record<string, number>, year: number): number {
  const today = new Date()
  if (today.getFullYear() !== year) return 0

  let streak = 0
  const cursor = new Date(today)
  while (counts[toIsoDate(cursor)]) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/**
 * The year sheet pinned inside the drawer: one mark per day filed.
 * It reports exactly how much of the year it actually read.
 */
export function YearSheet({ year, onYearChange, onPickDay, selectedFrom, selectedTo }: YearSheetProps) {
  const { data, isPending, isError } = useYearIndex(year)
  const today = todayAsIsoDate()
  const thisYear = new Date().getFullYear()

  const streak = useMemo(() => (data ? currentStreak(data.counts, year) : 0), [data, year])
  const daysFiled = useMemo(() => (data ? Object.keys(data.counts).length : 0), [data])

  return (
    <section aria-label={`Year sheet for ${year}`} className="card card-fiber file-in px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            aria-label={`Year ${year - 1}`}
            className="btn btn-card min-h-8 px-2"
          >
            <ChevronLeft className="size-3.5" strokeWidth={2} aria-hidden="true" />
          </button>
          <p className="record text-base leading-none font-bold tracking-[0.1em] text-ink">{year}</p>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            disabled={year >= thisYear}
            aria-label={`Year ${year + 1}`}
            className="btn btn-card min-h-8 px-2"
          >
            <ChevronRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {data && (
          <p className="record text-ink-soft">
            {typedCount(daysFiled)} days filed &middot; {typedCount(data.entriesRead)} cards
            {streak > 0 && (
              <>
                {' · '}
                <span className="font-bold text-stamp">{streak}-day run</span>
              </>
            )}
          </p>
        )}
      </div>

      {isPending && (
        <div className="mt-5 space-y-1.5" aria-busy="true">
          <span className="sr-only">Reading the year sheet…</span>
          {MONTHS.map((month) => (
            <Skeleton key={month} className="h-3.5 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <p role="alert" className="record mt-5 font-bold text-stamp">
          The year sheet could not be read.
        </p>
      )}

      {data && (
        <>
          {/* Scales rather than wraps: one unbroken row per month, always. */}
          <div className="mt-5 -mx-1 overflow-x-auto px-1 pb-1">
            <div className="min-w-[34rem]">
              <div
                className="grid gap-y-[3px]"
                style={{ gridTemplateColumns: '2.5rem repeat(31, minmax(0, 1fr))' }}
              >
                <span aria-hidden="true" />
                {DAYS.map((day) => (
                  <span
                    key={day}
                    aria-hidden="true"
                    className="record-sm pb-1 text-center text-[0.5rem] tracking-normal text-ink-soft"
                  >
                    {day % 5 === 0 || day === 1 ? day : ''}
                  </span>
                ))}

                {MONTHS.map((month) => {
                  const length = daysInMonth(year, month)
                  return (
                    <div key={month} className="contents">
                      <span className="record-sm self-center pr-2 text-right text-ink-soft">
                        {monthShortLabel(month)}
                      </span>
                      {DAYS.map((day) => {
                        if (day > length) {
                          return <span key={day} aria-hidden="true" className="mx-[1px] h-3.5" />
                        }

                        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const count = data.counts[iso] ?? 0
                        const selected = selectedFrom === iso && selectedTo === iso
                        const isToday = iso === today

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => onPickDay(iso)}
                            aria-pressed={selected}
                            title={
                              count > 0
                                ? `${formatEntryDate(iso)} — ${count} ${count === 1 ? 'card' : 'cards'}`
                                : `${formatEntryDate(iso)} — nothing filed`
                            }
                            className={cn(
                              'mx-[1px] h-3.5 rounded-[1px] transition-colors',
                              count === 0 && 'bg-[color-mix(in_oklab,var(--color-rule)_38%,transparent)]',
                              count === 1 && 'bg-brass',
                              count > 1 && 'bg-stamp',
                              selected && 'ring-2 ring-ink ring-offset-1 ring-offset-[var(--color-card)]',
                              isToday && !selected && 'ring-1 ring-ink/55',
                              'hover:brightness-110',
                            )}
                          >
                            <span className="sr-only">
                              {formatEntryDate(iso)}: {count === 0 ? 'nothing filed' : `${count} filed`}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-dashed border-rule pt-3">
            <span className="record-sm flex items-center gap-1.5 text-ink-soft">
              <span className="h-2.5 w-4 rounded-[1px] bg-brass" aria-hidden="true" /> one card
            </span>
            <span className="record-sm flex items-center gap-1.5 text-ink-soft">
              <span className="h-2.5 w-4 rounded-[1px] bg-stamp" aria-hidden="true" /> more than one
            </span>
            <span className="record-sm text-ink-soft">click a day to pull its drawer</span>
          </div>

          {data.partial && (
            <p className="record-sm mt-3 text-stamp">
              Read the first {typedCount(data.entriesRead)} of {typedCount(data.entriesInYear)} cards in {year}. Days
              beyond that are not marked here.
            </p>
          )}
        </>
      )}
    </section>
  )
}

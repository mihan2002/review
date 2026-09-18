import { CalendarRange, Search, X } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '../../utils/cn'
import { Button } from '../common/Button'
import { inputClasses } from '../common/TextField'

export interface DateRange {
  from: string
  to: string
}

interface DiaryFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  range: DateRange
  onRangeChange: (range: DateRange) => void
  isFetching: boolean
}

const EMPTY_RANGE: DateRange = { from: '', to: '' }

interface DateRangeFormProps {
  range: DateRange
  onApply: (range: DateRange) => void
  isFetching: boolean
}

/**
 * Edits a date range before it is applied. Mounted with the applied range as its
 * key, so an external change (clearing the filters) resets the draft.
 */
function DateRangeForm({ range, onApply, isFetching }: DateRangeFormProps) {
  const fromId = useId()
  const toId = useId()
  const [draft, setDraft] = useState<DateRange>(range)

  const hasRange = range.from !== '' || range.to !== ''
  const hasDraft = draft.from !== '' || draft.to !== ''
  const invalidRange = draft.from !== '' && draft.to !== '' && draft.from > draft.to

  return (
    <form
      className="animate-rise rounded-card border border-line bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!invalidRange) onApply(draft)
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor={fromId} className="block text-sm font-medium text-ink">
            From
          </label>
          <input
            id={fromId}
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
            className={cn(inputClasses, 'border-line focus:border-accent')}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={toId} className="block text-sm font-medium text-ink">
            To
          </label>
          <input
            id={toId}
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
            className={cn(inputClasses, 'border-line focus:border-accent')}
          />
        </div>

        <Button type="submit" disabled={invalidRange} isLoading={isFetching && hasRange}>
          Apply
        </Button>
      </div>

      {invalidRange && (
        <p role="alert" className="mt-2 text-xs text-danger">
          The start date must come before the end date.
        </p>
      )}

      {(hasRange || hasDraft) && (
        <button
          type="button"
          onClick={() => {
            setDraft(EMPTY_RANGE)
            onApply(EMPTY_RANGE)
          }}
          className="mt-3 text-xs text-muted underline underline-offset-4 transition-colors hover:text-ink"
        >
          Clear filters
        </button>
      )}
    </form>
  )
}

export function DiaryFilters({ search, onSearchChange, range, onRangeChange, isFetching }: DiaryFiltersProps) {
  const searchId = useId()
  const hasRange = range.from !== '' || range.to !== ''
  const [showDates, setShowDates] = useState(hasRange)

  return (
    <section aria-label="Search and filter" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            Search your diary
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search your diary…"
            className={cn(inputClasses, 'border-line pr-10 pl-10 focus:border-accent')}
          />
          {search !== '' && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <Button
          variant={showDates || hasRange ? 'primary' : 'secondary'}
          onClick={() => setShowDates((current) => !current)}
          aria-expanded={showDates}
          className="sm:w-auto"
        >
          <CalendarRange className="size-4" aria-hidden="true" />
          Date filter
        </Button>
      </div>

      {showDates && (
        <DateRangeForm
          key={`${range.from}|${range.to}`}
          range={range}
          onApply={onRangeChange}
          isFetching={isFetching}
        />
      )}
    </section>
  )
}

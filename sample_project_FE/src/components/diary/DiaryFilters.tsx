import { CalendarDays, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { FOCUS_SEARCH_EVENT } from '../../hooks/useShortcuts'
import { Button } from '../common/Button'

export interface DateRange {
  from: string
  to: string
}

const EMPTY_RANGE: DateRange = { from: '', to: '' }

interface DrawerRangeFormProps {
  range: DateRange
  onApply: (range: DateRange) => void
  onClearAll: () => void
  isFetching: boolean
  /** True while a keyword is active: the search endpoint takes no dates. */
  setAside: boolean
}

/**
 * Edits a drawer range before it is pulled. Mounted with the applied range as
 * its key, so an external change (a cleared slip, a day picked off the year
 * sheet) resets the draft.
 */
function DrawerRangeForm({ range, onApply, onClearAll, isFetching, setAside }: DrawerRangeFormProps) {
  const fromId = useId()
  const toId = useId()
  const [draft, setDraft] = useState<DateRange>(range)

  const hasRange = range.from !== '' || range.to !== ''
  const hasDraft = draft.from !== '' || draft.to !== ''
  const invalidRange = draft.from !== '' && draft.to !== '' && draft.from > draft.to

  return (
    <form
      className="mt-5 border-t border-dashed border-rule pt-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!invalidRange) onApply(draft)
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="record text-ink-soft">Drawer range</p>
        {setAside && (
          <p className="record-sm max-w-md text-right text-stamp">Set aside — a keyword reads the whole cabinet</p>
        )}
      </div>

      <fieldset
        disabled={setAside}
        className="mt-2.5 grid gap-3 transition-opacity disabled:opacity-45 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <legend className="sr-only">Filter by the date an entry is about</legend>

        <div>
          <label htmlFor={fromId} className="record-sm block text-ink-soft">
            From
          </label>
          <input
            id={fromId}
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor={toId} className="record-sm block text-ink-soft">
            To
          </label>
          <input
            id={toId}
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
            className="field mt-1"
          />
        </div>

        <Button
          type="submit"
          variant="card"
          disabled={invalidRange}
          isLoading={isFetching && hasRange}
          loadingText="Pulling"
        >
          Pull drawer
        </Button>
      </fieldset>

      {invalidRange && (
        <p role="alert" className="record-sm mt-2.5 font-bold text-stamp">
          The first date has to come before the second.
        </p>
      )}

      {(hasRange || hasDraft || setAside) && (
        <button
          type="button"
          onClick={() => {
            setDraft(EMPTY_RANGE)
            onClearAll()
          }}
          className="record mt-4 text-ink-soft underline decoration-dotted decoration-from-font underline-offset-4 transition-colors hover:text-ink"
        >
          Close the slip
        </button>
      )}
    </form>
  )
}

interface DiaryFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  range: DateRange
  onRangeChange: (range: DateRange) => void
  onClearAll: () => void
  isFetching: boolean
  yearSheetOpen: boolean
  onToggleYearSheet: () => void
}

/**
 * The enquiry slip. Keyword and drawer range are separate requests to the
 * catalog, and the slip says so: the search endpoint takes no date bounds, so
 * a keyword reads the whole cabinet and the drawer range steps aside.
 */
export function DiaryFilters({
  search,
  onSearchChange,
  range,
  onRangeChange,
  onClearAll,
  isFetching,
  yearSheetOpen,
  onToggleYearSheet,
}: DiaryFiltersProps) {
  const searchId = useId()
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const focus = () => searchRef.current?.focus()
    window.addEventListener(FOCUS_SEARCH_EVENT, focus)
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, focus)
  }, [])

  const keywordActive = search.trim() !== ''

  return (
    <section aria-label="Search the catalog" className="card card-fiber px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="record text-ink-soft">Enquiry slip</p>
        <button
          type="button"
          onClick={onToggleYearSheet}
          aria-expanded={yearSheetOpen}
          className="record inline-flex items-center gap-1.5 text-ink-soft underline decoration-dotted decoration-from-font underline-offset-4 transition-colors hover:text-ink"
        >
          <CalendarDays className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
          {yearSheetOpen ? 'Hide year sheet' : 'Year sheet'}
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor={searchId} className="record block text-ink-soft">
          Subject / keyword
        </label>
        <div className="relative mt-1.5">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="a word you remember writing"
            className="field pr-11 pl-10"
          />
          {search !== '' && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear the keyword"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-[1px] p-2 text-ink-soft transition-colors hover:bg-[color-mix(in_oklab,var(--color-rule)_50%,transparent)] hover:text-ink"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <DrawerRangeForm
        key={`${range.from}|${range.to}`}
        range={range}
        onApply={onRangeChange}
        onClearAll={onClearAll}
        isFetching={isFetching}
        setAside={keywordActive}
      />
    </section>
  )
}

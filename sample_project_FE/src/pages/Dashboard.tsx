import { useQuery } from '@tanstack/react-query'
import { Archive, PenLine, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { diaryApi } from '../api/diaryApi'
import { Button } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Pagination } from '../components/common/Pagination'
import { DiaryCard } from '../components/diary/DiaryCard'
import { DiaryFilters, type DateRange } from '../components/diary/DiaryFilters'
import { DiaryListSkeleton } from '../components/diary/DiaryListSkeleton'
import { GuideTab } from '../components/diary/GuideTab'
import { YearSheet } from '../components/diary/YearSheet'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useDeleteDiary, useDiaryList } from '../hooks/useDiaries'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import type { DiaryEntry } from '../types/api'
import { typedCount } from '../utils/catalog'
import { dayOfMonth, drawerLabel, formatEntryDate, todayAsIsoDate, weekdayLabel } from '../utils/date'
import { getErrorMessage } from '../utils/errors'

const EMPTY_RANGE: DateRange = { from: '', to: '' }

/** Entries arrive newest-first, so grouping preserves that order. */
function groupByDate(entries: DiaryEntry[]): Array<[string, DiaryEntry[]]> {
  const groups = new Map<string, DiaryEntry[]>()
  for (const entry of entries) {
    const bucket = groups.get(entry.entryDate)
    if (bucket) bucket.push(entry)
    else groups.set(entry.entryDate, [entry])
  }
  return [...groups.entries()]
}

/** One tiny request: has anything been filed under today's date? */
function useTodayCount() {
  const today = todayAsIsoDate()
  return useQuery({
    queryKey: ['diaries', 'today-count', today],
    queryFn: () => diaryApi.getDiaries({ from: today, to: today, page: 0, size: 1 }),
    select: (page) => page.totalElements,
    staleTime: 30_000,
  })
}

export function Dashboard() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE)
  const [page, setPage] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<DiaryEntry | null>(null)
  const [yearSheetOpen, setYearSheetOpen] = useState(false)
  const [year, setYear] = useState(() => new Date().getFullYear())

  const debouncedSearch = useDebouncedValue(search)

  // Any change of criteria starts again at the first tray.
  const changeSearch = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const changeRange = (next: DateRange) => {
    setRange(next)
    setPage(0)
  }

  const pickDay = (isoDate: string) => {
    setSearch('')
    setRange({ from: isoDate, to: isoDate })
    setPage(0)
  }

  const { data, isPending, isFetching, isError, error, refetch } = useDiaryList({
    keyword: debouncedSearch,
    from: range.from || undefined,
    to: range.to || undefined,
    page,
  })

  const todayCount = useTodayCount()
  const deleteDiary = useDeleteDiary()

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteDiary.mutate(pendingDelete.id, {
      onSuccess: () => {
        setPendingDelete(null)
        showToast('Card withdrawn.')
      },
      onError: (deleteError) => {
        setPendingDelete(null)
        showToast(getErrorMessage(deleteError, 'The card could not be withdrawn.'), 'error')
      },
    })
  }

  const groups = useMemo(() => groupByDate(data?.content ?? []), [data])

  const keyword = debouncedSearch.trim()
  const isFiltering = keyword !== '' || range.from !== '' || range.to !== ''
  const isEmpty = data !== undefined && data.content.length === 0
  const singleDay = range.from !== '' && range.from === range.to

  const clearAll = () => {
    setSearch('')
    setRange(EMPTY_RANGE)
    setPage(0)
  }

  const filedToday = todayCount.data ?? 0

  return (
    <div>
      {/* ---- The drawer front ------------------------------------------- */}
      <section className="drawer rail relative px-5 pt-6 pb-11 sm:px-9 sm:pt-8 sm:pb-12">
        <div className="grid gap-8 sm:grid-cols-[1fr_minmax(0,17rem)] sm:items-end">
          <div>
            {/* The brass label holder on the front of today's drawer. */}
            <span className="brass-plate inline-flex items-center gap-2.5 px-3 py-1.5">
              <span className="block h-3.5 w-[3px] rounded-full bg-[rgb(26_18_4/0.3)]" aria-hidden="true" />
              <span className="record font-bold">Today &middot; {drawerLabel(todayAsIsoDate())}</span>
            </span>

            {/* The drawer identifies itself. This is the catalog speaking, so
                it speaks in the typewriter, not in the author's hand. */}
            <h1 className="record mt-5 text-[1.75rem] leading-[1.1] font-bold tracking-[0.06em] text-deep-ink sm:text-[2.375rem]">
              {weekdayLabel(todayAsIsoDate())} {dayOfMonth(todayAsIsoDate())}{' '}
              {drawerLabel(todayAsIsoDate())}
            </h1>

            <p className="record-prose mt-4 max-w-prose text-[0.9375rem] text-deep-ink/85">
              {todayCount.isPending
                ? 'Checking today’s slot…'
                : filedToday === 0
                  ? 'Nothing filed under today yet.'
                  : `${filedToday} ${filedToday === 1 ? 'card' : 'cards'} filed under today.`}
              {!isFiltering && data && <> {typedCount(data.totalElements)} cards in the cabinet.</>}
            </p>

            {user && (
              <p className="record-sm mt-4 text-deep-ink-soft">Cabinet open &middot; holder {user.username}</p>
            )}
          </div>

          {/* Today's blank card, waiting to be typed. */}
          <button
            type="button"
            onClick={() => navigate('/diary/new')}
            title="New card (N)"
            className="blank-card card-punch w-full"
          >
            <span className="record font-bold opacity-70">{drawerLabel(todayAsIsoDate())}</span>
            <span className="flex items-center gap-2.5">
              <PenLine className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span className="record text-[0.75rem] font-bold">Type today&rsquo;s card</span>
            </span>
          </button>
        </div>

        {/* The drawer pull. */}
        <span
          aria-hidden="true"
          className="brass-plate absolute bottom-3.5 left-1/2 h-2.5 w-28 -translate-x-1/2 rounded-full"
        />
      </section>

      {/* ---- The enquiry slip -------------------------------------------- */}
      <div className="mt-10 space-y-4">
        <DiaryFilters
          search={search}
          onSearchChange={changeSearch}
          range={range}
          onRangeChange={changeRange}
          onClearAll={clearAll}
          isFetching={isFetching}
          yearSheetOpen={yearSheetOpen}
          onToggleYearSheet={() => setYearSheetOpen((current) => !current)}
        />

        {yearSheetOpen && (
          <YearSheet
            year={year}
            onYearChange={setYear}
            onPickDay={pickDay}
            selectedFrom={range.from}
            selectedTo={range.to}
          />
        )}
      </div>

      {/* ---- What the enquiry returned ----------------------------------- */}
      {!isPending && !isError && data && (
        <p className="record mt-10 text-case-ink-soft" aria-live="polite">
          {keyword !== '' ? (
            <>
              Whole cabinet, keyword &ldquo;{keyword}&rdquo; &middot; {typedCount(data.totalElements)} matched
            </>
          ) : singleDay ? (
            <>
              Drawer {formatEntryDate(range.from)} &middot; {typedCount(data.totalElements)} filed
            </>
          ) : range.from !== '' || range.to !== '' ? (
            <>
              Drawer {range.from ? formatEntryDate(range.from) : 'the beginning'} to{' '}
              {range.to ? formatEntryDate(range.to) : 'today'} &middot; {typedCount(data.totalElements)} filed
            </>
          ) : (
            <>Whole cabinet &middot; {typedCount(data.totalElements)} cards filed</>
          )}
        </p>
      )}

      {/* ---- The drawer --------------------------------------------------- */}
      <div className="mt-4">
        {isPending && (
          <div className="drawer rail p-4 sm:p-6">
            <DiaryListSkeleton />
          </div>
        )}

        {isError && (
          <ErrorState
            title="The drawer will not open"
            message={getErrorMessage(error, 'Please try again.')}
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        )}

        {!isPending && !isError && isEmpty && isFiltering && (
          <EmptyState
            icon={SearchX}
            title="Nothing answers that enquiry"
            description="No card matches the keyword or the drawer range. Try a different word, or open the drawer wider."
            action={
              <Button variant="case" onClick={clearAll}>
                Close the slip
              </Button>
            }
          />
        )}

        {!isPending && !isError && isEmpty && !isFiltering && (
          <EmptyState
            icon={Archive}
            title="Nothing is filed yet"
            description="The drawer is waiting. Type a card about today and it will be the first one in."
            action={
              <Button variant="brass" onClick={() => navigate('/diary/new')}>
                <PenLine className="size-4" strokeWidth={2} aria-hidden="true" />
                Type the first card
              </Button>
            }
          />
        )}

        {!isError && data && data.content.length > 0 && (
          <div
            className={
              isFetching
                ? 'drawer rail p-4 opacity-60 transition-opacity sm:p-6'
                : 'drawer rail p-4 transition-opacity sm:p-6'
            }
          >
            <div className="space-y-9">
              {groups.map(([date, entries], groupIndex) => (
                <section key={date} className="space-y-0">
                  <GuideTab date={date} count={entries.length} />
                  <div className="space-y-3.5">
                    {entries.map((entry, entryIndex) => (
                      <DiaryCard
                        key={entry.id}
                        entry={entry}
                        onDelete={setPendingDelete}
                        index={groupIndex + entryIndex}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-10">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                pageSize={data.size}
                itemsOnPage={data.content.length}
                onPageChange={(nextPage) => {
                  setPage(nextPage)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Withdraw this card?"
        description={
          <>
            <span className="font-semibold text-ink">&ldquo;{pendingDelete?.title}&rdquo;</span> leaves the cabinet for
            good. There is no second copy.
          </>
        }
        isLoading={deleteDiary.isPending}
        loadingText="Withdrawing"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

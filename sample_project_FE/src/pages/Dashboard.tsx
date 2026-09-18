import { NotebookPen, Plus, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Pagination } from '../components/common/Pagination'
import { DiaryCard } from '../components/diary/DiaryCard'
import { DiaryFilters, type DateRange } from '../components/diary/DiaryFilters'
import { DiaryListSkeleton } from '../components/diary/DiaryListSkeleton'
import { useDeleteDiary, useDiaryList } from '../hooks/useDiaries'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import type { DiaryEntry } from '../types/api'
import { formatEntryDate, greeting } from '../utils/date'
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

export function Dashboard() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE)
  const [page, setPage] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<DiaryEntry | null>(null)

  const debouncedSearch = useDebouncedValue(search)

  // Any change of criteria starts again at the first page.
  const changeSearch = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const changeRange = (next: DateRange) => {
    setRange(next)
    setPage(0)
  }

  const { data, isPending, isFetching, isError, error, refetch } = useDiaryList({
    keyword: debouncedSearch,
    from: range.from || undefined,
    to: range.to || undefined,
    page,
  })

  const deleteDiary = useDeleteDiary()

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteDiary.mutate(pendingDelete.id, {
      onSuccess: () => {
        setPendingDelete(null)
        showToast('Entry deleted.')
      },
      onError: (deleteError) => {
        setPendingDelete(null)
        showToast(getErrorMessage(deleteError, 'Unable to delete this entry.'), 'error')
      },
    })
  }

  const groups = useMemo(() => groupByDate(data?.content ?? []), [data])

  const isFiltering = debouncedSearch.trim() !== '' || range.from !== '' || range.to !== ''
  const isEmpty = data !== undefined && data.content.length === 0

  const clearAll = () => {
    setSearch('')
    setRange(EMPTY_RANGE)
    setPage(0)
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h1 className="font-serif text-2xl text-ink sm:text-3xl">
            {greeting()}
            {user ? `, ${user.username}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted">Capture your thoughts and memories.</p>
        </div>

        <Button onClick={() => navigate('/diary/new')} className="w-full sm:w-auto">
          <Plus className="size-4" aria-hidden="true" />
          New Entry
        </Button>
      </section>

      <DiaryFilters
        search={search}
        onSearchChange={changeSearch}
        range={range}
        onRangeChange={changeRange}
        isFetching={isFetching}
      />

      {isPending && <DiaryListSkeleton />}

      {isError && (
        <ErrorState
          title="Unable to load your diary entries"
          message={getErrorMessage(error, 'Please try again.')}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      )}

      {!isPending && !isError && isEmpty && isFiltering && (
        <EmptyState
          icon={SearchX}
          title="No entries found"
          description="No entries match your search or date filter. Try different words or a wider range."
          action={
            <Button variant="secondary" onClick={clearAll}>
              Clear filters
            </Button>
          }
        />
      )}

      {!isPending && !isError && isEmpty && !isFiltering && (
        <EmptyState
          icon={NotebookPen}
          title="Your diary is empty"
          description="Start writing about your day, your thoughts, or something you learned."
          action={
            <Button onClick={() => navigate('/diary/new')}>
              <Plus className="size-4" aria-hidden="true" />
              Write your first entry
            </Button>
          }
        />
      )}

      {!isError && data && data.content.length > 0 && (
        <div className={isFetching ? 'space-y-8 opacity-60 transition-opacity' : 'space-y-8 transition-opacity'}>
          {groups.map(([date, entries]) => (
            <section key={date} className="space-y-3">
              <h2 className="text-xs font-medium tracking-wide text-muted uppercase">{formatEntryDate(date)}</h2>
              <div className="space-y-4">
                {entries.map((entry) => (
                  <DiaryCard key={entry.id} entry={entry} onDelete={setPendingDelete} />
                ))}
              </div>
            </section>
          ))}

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
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete diary entry?"
        description={
          <>
            Are you sure you want to delete <span className="font-medium text-ink">“{pendingDelete?.title}”</span>? This
            action cannot be undone.
          </>
        }
        isLoading={deleteDiary.isPending}
        loadingText="Deleting…"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

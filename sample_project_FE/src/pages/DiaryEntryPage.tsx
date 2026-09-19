import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { ErrorState } from '../components/common/ErrorState'
import { Skeleton } from '../components/common/Skeleton'
import { useDeleteDiary, useDiary } from '../hooks/useDiaries'
import { useToast } from '../hooks/useToast'
import { callNumber, readingMinutes, wordCount } from '../utils/catalog'
import { dayOfMonth, drawerLabel, formatTimestamp, weekdayLabel } from '../utils/date'
import { getErrorMessage, getErrorStatus } from '../utils/errors'

function EntrySkeleton() {
  return (
    <div className="card card-fiber card-punch px-5 pt-6 pb-12 sm:px-10 sm:pt-9 sm:pb-14" aria-busy="true">
      <span className="sr-only">Lifting the card…</span>
      <Skeleton className="h-2.5 w-40" />
      <Skeleton className="mt-5 h-9 w-3/4" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

/** The card lifted out of the drawer and laid flat under the lamp. */
export function DiaryEntryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data: entry, isPending, isError, error, refetch, isFetching } = useDiary(id)
  const deleteDiary = useDeleteDiary()

  const notFound = getErrorStatus(error) === 404

  const handleDelete = () => {
    if (!id) return
    deleteDiary.mutate(id, {
      onSuccess: () => {
        showToast('Card withdrawn.')
        navigate('/dashboard', { replace: true })
      },
      onError: (deleteError) => {
        setConfirmingDelete(false)
        showToast(getErrorMessage(deleteError, 'The card could not be withdrawn.'), 'error')
      },
    })
  }

  const amended = entry ? entry.updatedAt !== entry.createdAt : false

  return (
    <div>
      <Link
        to="/dashboard"
        className="record inline-flex items-center gap-2 text-case-ink-soft transition-colors hover:text-case-ink"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden="true" />
        Back to the drawer
      </Link>

      <div className="mt-6">
        {isPending && <EntrySkeleton />}

        {isError && (
          <ErrorState
            title={notFound ? 'No such card' : 'The card will not come out'}
            message={
              notFound
                ? 'Nothing is filed under that number, or it belongs to another cabinet.'
                : getErrorMessage(error, 'Please try again.')
            }
            onRetry={notFound ? undefined : () => void refetch()}
            isRetrying={isFetching}
          />
        )}

        {entry && (
          <article className="card card-fiber card-punch file-in px-5 pt-6 pb-12 sm:px-10 sm:pt-9 sm:pb-14">
            {/* The typed header block, ruled off from the author's hand. */}
            <header className="border-b border-dashed border-rule pb-6">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="flex items-baseline gap-4">
                  <span className="record text-[2.5rem] leading-none font-bold tracking-[0.02em] text-ink">
                    {dayOfMonth(entry.entryDate)}
                  </span>
                  <span className="record text-ink-soft">
                    {weekdayLabel(entry.entryDate)}
                    <br />
                    {drawerLabel(entry.entryDate)}
                  </span>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <p className="record text-ink-soft">{callNumber(entry.entryDate, entry.id)}</p>
                  {amended && <span className="stamp">Amended</span>}
                </div>
              </div>

              <h1 className="hand mt-6 text-[2rem] leading-[1.12] font-semibold text-ink sm:text-[2.5rem]">
                {entry.title}
              </h1>
            </header>

            {/* The author's hand, sitting on the card's own ruled lines. */}
            <div
              className="hand card-ruled-faint mt-8 max-w-[68ch] text-[1.0625rem] whitespace-pre-wrap text-ink"
              style={{ lineHeight: 'var(--rule-step)' }}
            >
              {entry.content}
            </div>

            <footer className="mt-10 border-t border-dashed border-rule pt-6">
              <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-3">
                <div>
                  <dt className="record-sm text-ink-soft">Typed</dt>
                  <dd className="record mt-0.5 text-ink">{formatTimestamp(entry.createdAt)}</dd>
                </div>
                {amended && (
                  <div>
                    <dt className="record-sm text-ink-soft">Amended</dt>
                    <dd className="record mt-0.5 text-ink">{formatTimestamp(entry.updatedAt)}</dd>
                  </div>
                )}
                <div>
                  <dt className="record-sm text-ink-soft">Length</dt>
                  <dd className="record mt-0.5 text-ink">
                    {wordCount(entry.content)} words &middot; {readingMinutes(entry.content)} min
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button variant="card" onClick={() => navigate(`/diary/${entry.id}/edit`)}>
                  <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  Amend this card
                </Button>
                <Button variant="stamp" onClick={() => setConfirmingDelete(true)}>
                  <Trash2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  Withdraw
                </Button>
              </div>
            </footer>
          </article>
        )}
      </div>

      {entry && (
        <ConfirmDialog
          open={confirmingDelete}
          title="Withdraw this card?"
          description={
            <>
              <span className="font-semibold text-ink">&ldquo;{entry.title}&rdquo;</span> leaves the cabinet for good.
              There is no second copy.
            </>
          }
          isLoading={deleteDiary.isPending}
          loadingText="Withdrawing"
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}

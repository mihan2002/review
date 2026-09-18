import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { ErrorState } from '../components/common/ErrorState'
import { Skeleton } from '../components/common/Skeleton'
import { useDeleteDiary, useDiary } from '../hooks/useDiaries'
import { useToast } from '../hooks/useToast'
import { formatEntryDate, formatTimestamp } from '../utils/date'
import { getErrorMessage, getErrorStatus } from '../utils/errors'

function EntrySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only">Loading entry…</span>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-8 w-3/4" />
      <div className="space-y-2.5 pt-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

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
        showToast('Entry deleted.')
        navigate('/dashboard', { replace: true })
      },
      onError: (deleteError) => {
        setConfirmingDelete(false)
        showToast(getErrorMessage(deleteError, 'Unable to delete this entry.'), 'error')
      },
    })
  }

  return (
    <div className="space-y-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to diary
      </Link>

      {isPending && <EntrySkeleton />}

      {isError && (
        <ErrorState
          title={notFound ? 'Entry not found' : 'Unable to load this entry'}
          message={
            notFound
              ? 'This entry no longer exists, or it belongs to another account.'
              : getErrorMessage(error, 'Please try again.')
          }
          onRetry={notFound ? undefined : () => void refetch()}
          isRetrying={isFetching}
        />
      )}

      {entry && (
        <article className="animate-rise">
          <p className="text-sm text-muted">{formatEntryDate(entry.entryDate)}</p>
          <h1 className="mt-2 font-serif text-2xl leading-snug text-ink sm:text-3xl">{entry.title}</h1>

          <div className="mt-8 text-[17px] leading-8 whitespace-pre-wrap text-ink/90">{entry.content}</div>

          <footer className="mt-10 border-t border-line pt-6">
            <p className="text-xs text-muted">
              Created {formatTimestamp(entry.createdAt)}
              {entry.updatedAt !== entry.createdAt && <> · Edited {formatTimestamp(entry.updatedAt)}</>}
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => navigate(`/diary/${entry.id}/edit`)}>
                <Pencil className="size-4" aria-hidden="true" />
                Edit
              </Button>
              <Button variant="ghost" onClick={() => setConfirmingDelete(true)} className="text-danger hover:bg-danger-soft hover:text-danger">
                <Trash2 className="size-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </footer>
        </article>
      )}

      {entry && (
        <ConfirmDialog
          open={confirmingDelete}
          title="Delete diary entry?"
          description={
            <>
              Are you sure you want to delete <span className="font-medium text-ink">“{entry.title}”</span>? This action
              cannot be undone.
            </>
          }
          isLoading={deleteDiary.isPending}
          loadingText="Deleting…"
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}

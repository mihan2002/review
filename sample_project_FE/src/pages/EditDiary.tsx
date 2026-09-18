import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/common/ErrorState'
import { Skeleton } from '../components/common/Skeleton'
import { DiaryForm } from '../components/diary/DiaryForm'
import { useDiary, useUpdateDiary } from '../hooks/useDiaries'
import { useToast } from '../hooks/useToast'
import { getErrorMessage, getErrorStatus } from '../utils/errors'

export function EditDiary() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { data: entry, isPending, isError, error, refetch, isFetching } = useDiary(id)
  const updateDiary = useUpdateDiary(id)

  const notFound = getErrorStatus(error) === 404

  return (
    <div className="space-y-8">
      <Link
        to={entry ? `/diary/${entry.id}` : '/dashboard'}
        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {entry ? 'Back to entry' : 'Back to diary'}
      </Link>

      <div>
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">Edit entry</h1>
        <p className="mt-1 text-sm text-muted">Update the title, date or what you wrote.</p>
      </div>

      {isPending && (
        <div className="space-y-5" aria-busy="true">
          <span className="sr-only">Loading entry…</span>
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

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
        <DiaryForm
          defaultValues={{ title: entry.title, content: entry.content, entryDate: entry.entryDate }}
          submitLabel="Save changes"
          loadingText="Saving…"
          isSubmitting={updateDiary.isPending}
          onCancel={() => navigate(`/diary/${entry.id}`)}
          onSubmit={(values) =>
            updateDiary.mutate(values, {
              onSuccess: (updated) => {
                showToast('Entry updated.')
                navigate(`/diary/${updated.id}`, { replace: true })
              },
              onError: (updateError) =>
                showToast(getErrorMessage(updateError, 'Unable to save your changes.'), 'error'),
            })
          }
        />
      )}
    </div>
  )
}

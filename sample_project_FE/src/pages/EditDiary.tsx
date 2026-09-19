import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/common/ErrorState'
import { Skeleton } from '../components/common/Skeleton'
import { DiaryForm } from '../components/diary/DiaryForm'
import { useDiary, useUpdateDiary } from '../hooks/useDiaries'
import { useToast } from '../hooks/useToast'
import { callNumber } from '../utils/catalog'
import { getErrorMessage, getErrorStatus } from '../utils/errors'

export function EditDiary() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { data: entry, isPending, isError, error, refetch, isFetching } = useDiary(id)
  const updateDiary = useUpdateDiary(id)

  const notFound = getErrorStatus(error) === 404

  return (
    <div>
      <Link
        to={entry ? `/diary/${entry.id}` : '/dashboard'}
        className="record inline-flex items-center gap-2 text-case-ink-soft transition-colors hover:text-case-ink"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden="true" />
        {entry ? 'Back to the card' : 'Back to the drawer'}
      </Link>

      <div className="mt-6">
        <h1 className="record text-[1.5rem] leading-tight font-bold tracking-[0.06em] text-case-ink sm:text-[1.875rem]">
          Retype this card
        </h1>
        <p className="record-prose mt-3 max-w-[52ch] text-[0.9375rem] text-balance text-case-ink-soft">
          The card keeps its place in the drawer. Only what is typed on it changes.
          {entry && <> Filed as {callNumber(entry.entryDate, entry.id)}.</>}
        </p>
      </div>

      <div className="mt-8">
        {isPending && (
          <div className="card card-fiber card-punch space-y-5 px-5 pt-6 pb-12 sm:px-8" aria-busy="true">
            <span className="sr-only">Lifting the card…</span>
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

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
          <DiaryForm
            draftKey={entry.id}
            defaultValues={{ title: entry.title, content: entry.content, entryDate: entry.entryDate }}
            submitLabel="Refile the card"
            loadingText="Refiling"
            isSubmitting={updateDiary.isPending}
            onCancel={() => navigate(`/diary/${entry.id}`)}
            onSubmit={(values) =>
              updateDiary.mutate(values, {
                onSuccess: (updated) => {
                  showToast('Card amended.')
                  navigate(`/diary/${updated.id}`, { replace: true })
                },
                onError: (updateError) =>
                  showToast(getErrorMessage(updateError, 'The amendment could not be filed.'), 'error'),
              })
            }
          />
        )}
      </div>
    </div>
  )
}

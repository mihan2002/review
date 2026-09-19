import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { DiaryForm } from '../components/diary/DiaryForm'
import { useCreateDiary } from '../hooks/useDiaries'
import { useToast } from '../hooks/useToast'
import { getErrorMessage } from '../utils/errors'

export function CreateDiary() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const createDiary = useCreateDiary()

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
        <h1 className="record text-[1.5rem] leading-tight font-bold tracking-[0.06em] text-case-ink sm:text-[1.875rem]">
          Type a new card
        </h1>
        <p className="record-prose mt-3 max-w-[52ch] text-[0.9375rem] text-balance text-case-ink-soft">
          It is filed under the date it is about, not the moment you wrote it.
        </p>
      </div>

      <div className="mt-8">
        <DiaryForm
          draftKey="new"
          submitLabel="File this card"
          loadingText="Filing"
          isSubmitting={createDiary.isPending}
          onCancel={() => navigate('/dashboard')}
          onSubmit={(values) =>
            createDiary.mutate(values, {
              onSuccess: (entry) => {
                showToast('Card filed.')
                navigate(`/diary/${entry.id}`, { replace: true })
              },
              onError: (error) => showToast(getErrorMessage(error, 'The card could not be filed.'), 'error'),
            })
          }
        />
      </div>
    </div>
  )
}

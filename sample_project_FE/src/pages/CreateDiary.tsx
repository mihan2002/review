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
    <div className="space-y-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to diary
      </Link>

      <div>
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">New entry</h1>
        <p className="mt-1 text-sm text-muted">What would you like to remember about today?</p>
      </div>

      <DiaryForm
        submitLabel="Save Entry"
        loadingText="Saving…"
        isSubmitting={createDiary.isPending}
        onCancel={() => navigate('/dashboard')}
        onSubmit={(values) =>
          createDiary.mutate(values, {
            onSuccess: (entry) => {
              showToast('Entry saved.')
              navigate(`/diary/${entry.id}`, { replace: true })
            },
            onError: (error) => showToast(getErrorMessage(error, 'Unable to save this entry.'), 'error'),
          })
        }
      />
    </div>
  )
}

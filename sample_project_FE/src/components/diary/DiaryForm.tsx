import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useDraft } from '../../hooks/useDraft'
import type { DiaryEntryRequest } from '../../types/api'
import { typedCount, wordCount } from '../../utils/catalog'
import { formatClockTime, isIsoDate, todayAsIsoDate } from '../../utils/date'
import { Button } from '../common/Button'
import { TextArea } from '../common/TextArea'
import { TextField } from '../common/TextField'

/** Mirrors the backend validation on DiaryEntryRequest. */
const diarySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'A card needs a heading before it can be filed.')
    .max(200, 'The heading has to stay under 200 characters.'),
  content: z
    .string()
    .trim()
    .min(1, 'There is nothing typed on this card yet.')
    .max(20000, 'A card holds 20,000 characters. This one is over.'),
  entryDate: z
    .string()
    .min(1, 'Which day is this card about?')
    .refine(isIsoDate, 'That is not a date the cabinet recognises.'),
})

export type DiaryFormValues = z.infer<typeof diarySchema>

interface DiaryFormProps {
  defaultValues?: Partial<DiaryFormValues>
  submitLabel: string
  loadingText: string
  isSubmitting: boolean
  /** Scopes the held draft, e.g. "new" or the entry id. */
  draftKey: string
  onSubmit: (values: DiaryEntryRequest) => void
  onCancel: () => void
}

const CONTENT_LIMIT = 20000

export function DiaryForm({
  defaultValues,
  submitLabel,
  loadingText,
  isSubmitting,
  draftKey,
  onSubmit,
  onCancel,
}: DiaryFormProps) {
  const base: DiaryFormValues = {
    title: defaultValues?.title ?? '',
    content: defaultValues?.content ?? '',
    entryDate: defaultValues?.entryDate ?? todayAsIsoDate(),
  }

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    reset,
    formState: { errors, isDirty },
  } = useForm<DiaryFormValues>({ resolver: zodResolver(diarySchema), defaultValues: base })

  // Only the body re-renders the form, because only the counters need it.
  const content = watch('content') ?? ''
  const { restored, savedAt, save, clear } = useDraft<DiaryFormValues>(draftKey, isDirty)
  const [heldDraft, setHeldDraft] = useState(restored)
  const cleared = useRef(false)

  // Hold the typing every so often, so a closed tab does not lose the card.
  useEffect(() => {
    const subscription = watch(() => save(getValues()))
    return () => subscription.unsubscribe()
  }, [watch, getValues, save])

  const submit = (submitted: DiaryFormValues) => {
    cleared.current = true
    clear()
    onSubmit(submitted)
  }

  const words = wordCount(content)
  const characters = content.length

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="card card-fiber card-punch px-5 pt-6 pb-12 sm:px-8 sm:pt-8 sm:pb-14"
      noValidate
    >
      {heldDraft && !cleared.current && (
        <div
          role="status"
          className="mb-6 flex flex-col gap-3 border border-dashed border-stamp/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="record text-stamp">
            A draft was held at {formatClockTime(new Date(heldDraft.savedAt).toISOString())}
          </p>
          <div className="flex gap-2">
            <Button
              variant="card"
              size="sm"
              onClick={() => {
                reset(heldDraft.values, { keepDefaultValues: true })
                setHeldDraft(null)
              }}
            >
              Restore it
            </Button>
            <Button
              variant="quiet"
              size="sm"
              onClick={() => {
                clear()
                setHeldDraft(null)
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <TextField
          label="Heading"
          placeholder="what this day was"
          autoComplete="off"
          error={errors.title?.message}
          {...register('title')}
        />
        <TextField
          label="Filed under (date)"
          type="date"
          error={errors.entryDate?.message}
          {...register('entryDate')}
        />
      </div>

      <div className="mt-6">
        <TextArea
          label="The card"
          rows={16}
          placeholder="Write the day down."
          error={errors.content?.message}
          status={
            <>
              {typedCount(words, 4)} words &middot; {typedCount(characters, 5)}/{CONTENT_LIMIT}
              {savedAt !== null && !heldDraft && (
                <>
                  {' · '}
                  <span className="text-stamp">held {formatClockTime(new Date(savedAt).toISOString())}</span>
                </>
              )}
            </>
          }
          {...register('content')}
        />
      </div>

      <div className="mt-7 flex flex-col-reverse gap-2 border-t border-dashed border-rule pt-5 sm:flex-row sm:justify-end">
        <Button variant="quiet" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} loadingText={loadingText}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

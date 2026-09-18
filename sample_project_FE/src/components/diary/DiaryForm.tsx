import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { DiaryEntryRequest } from '../../types/api'
import { isIsoDate, todayAsIsoDate } from '../../utils/date'
import { Button } from '../common/Button'
import { TextArea } from '../common/TextArea'
import { TextField } from '../common/TextField'

/** Mirrors the backend validation on DiaryEntryRequest. */
const diarySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Please give your entry a title.')
    .max(200, 'Title must not exceed 200 characters.'),
  content: z
    .string()
    .trim()
    .min(1, 'Please write something before saving.')
    .max(20000, 'Content must not exceed 20000 characters.'),
  entryDate: z
    .string()
    .min(1, 'Please choose the date this entry is about.')
    .refine(isIsoDate, 'Please choose a valid date.'),
})

export type DiaryFormValues = z.infer<typeof diarySchema>

interface DiaryFormProps {
  defaultValues?: Partial<DiaryFormValues>
  submitLabel: string
  loadingText: string
  isSubmitting: boolean
  onSubmit: (values: DiaryEntryRequest) => void
  onCancel: () => void
}

export function DiaryForm({
  defaultValues,
  submitLabel,
  loadingText,
  isSubmitting,
  onSubmit,
  onCancel,
}: DiaryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DiaryFormValues>({
    resolver: zodResolver(diarySchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      content: defaultValues?.content ?? '',
      entryDate: defaultValues?.entryDate ?? todayAsIsoDate(),
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <TextField
          label="Title"
          placeholder="A productive day"
          autoComplete="off"
          error={errors.title?.message}
          {...register('title')}
        />
        <TextField label="Entry date" type="date" error={errors.entryDate?.message} {...register('entryDate')} />
      </div>

      <TextArea
        label="Content"
        rows={14}
        placeholder="Write about your day…"
        error={errors.content?.message}
        {...register('content')}
      />

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} loadingText={loadingText}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

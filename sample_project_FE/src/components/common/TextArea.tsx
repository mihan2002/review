import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const textAreaId = id ?? generatedId
  const errorId = `${textAreaId}-error`

  return (
    <div className="space-y-1.5">
      <label htmlFor={textAreaId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        ref={ref}
        id={textAreaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'w-full rounded-lg border bg-surface px-3.5 py-3 text-[15px] leading-7 text-ink placeholder:text-muted/70 transition-colors duration-150',
          error ? 'border-danger focus:border-danger' : 'border-line focus:border-accent',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
})

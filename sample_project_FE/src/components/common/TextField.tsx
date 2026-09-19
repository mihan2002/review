import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  /** Rendered inside the field, e.g. a show/hide password toggle. */
  trailing?: ReactNode
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, trailing, className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  return (
    <div>
      <label htmlFor={inputId} className="record block text-ink-soft">
        {label}
      </label>

      <div className="relative mt-1.5">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(error ? errorId : undefined, hint ? hintId : undefined) || undefined}
          className={cn('field', trailing ? 'pr-12' : undefined, className)}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>

      {hint && !error && (
        <p id={hintId} className="record-sm mt-1.5 text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="record-sm mt-1.5 font-bold text-stamp">
          {error}
        </p>
      )}
    </div>
  )
})

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  /** Rendered inside the field, e.g. a show/hide password toggle. */
  trailing?: ReactNode
}

export const inputClasses =
  'w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-paper'

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, trailing, className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        {label}
      </label>

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(error ? errorId : undefined, hint ? hintId : undefined) || undefined}
          className={cn(
            inputClasses,
            error ? 'border-danger focus:border-danger' : 'border-line focus:border-accent',
            trailing ? 'pr-11' : undefined,
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
})

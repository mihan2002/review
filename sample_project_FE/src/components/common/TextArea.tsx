import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  /** Typed status shown at the foot of the card, e.g. word count. */
  status?: ReactNode
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, status, className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const textAreaId = id ?? generatedId
  const errorId = `${textAreaId}-error`

  return (
    <div>
      <label htmlFor={textAreaId} className="record block text-ink-soft">
        {label}
      </label>

      {/* The author writes on ruled card stock, in the author's own face. */}
      <textarea
        ref={ref}
        id={textAreaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'hand card-ruled mt-1.5 w-full resize-y rounded-[1px] border-0 border-b bg-[color-mix(in_oklab,var(--color-card-sunk)_55%,transparent)] px-4 py-[0.35rem] text-[1.0625rem] text-ink transition-colors placeholder:text-ink-soft/70 focus:outline-none',
          error ? 'border-b-2 border-stamp' : 'border-ink-soft focus:border-b-2 focus:border-ink',
          className,
        )}
        style={{ lineHeight: 'var(--rule-step)' }}
        {...props}
      />

      <div className="mt-1.5 flex items-start justify-between gap-4">
        <div>
          {error && (
            <p id={errorId} role="alert" className="record-sm font-bold text-stamp">
              {error}
            </p>
          )}
        </div>
        {status && <div className="record-sm shrink-0 text-ink-soft">{status}</div>}
      </div>
    </div>
  )
})

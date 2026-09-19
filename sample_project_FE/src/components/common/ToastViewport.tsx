import { X } from 'lucide-react'
import type { Toast } from '../../context/toastContext'
import { cn } from '../../utils/cn'

interface ToastViewportProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

/** Receipts: a slip stamped and dropped on the desk after each transaction. */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'card card-fiber stamp-in pointer-events-auto flex w-full max-w-sm items-start gap-3 py-3 pr-2 pl-4',
            toast.variant === 'error' && 'shadow-[0_0_0_1.5px_var(--color-stamp),var(--shadow-card)]',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'record-sm mt-[0.2rem] shrink-0 font-bold',
              toast.variant === 'error' ? 'text-stamp' : 'text-ink-soft',
            )}
          >
            {toast.variant === 'error' ? 'REJ' : 'REC'}
          </span>
          <p className="hand flex-1 text-[0.9375rem] leading-snug text-ink">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notice"
            className="rounded-[1px] p-1.5 text-ink-soft transition-colors hover:bg-[color-mix(in_oklab,var(--color-rule)_45%,transparent)] hover:text-ink"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}

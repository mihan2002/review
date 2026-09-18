import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import type { Toast } from '../../context/toastContext'
import { cn } from '../../utils/cn'

interface ToastViewportProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

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
            'animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface px-4 py-3 shadow-lg shadow-ink/5',
            toast.variant === 'error' ? 'border-danger/30' : 'border-line',
          )}
        >
          {toast.variant === 'error' ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          )}
          <p className="flex-1 text-sm text-ink">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="rounded-md p-1 text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}

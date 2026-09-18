import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  isRetrying?: boolean
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, isRetrying }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-card border border-line bg-surface px-6 py-12 text-center"
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <h2 className="font-serif text-lg text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry} isLoading={isRetrying} loadingText="Retrying…">
          Try again
        </Button>
      )}
    </div>
  )
}

import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  isRetrying?: boolean
}

/** A misfiled card: stamped in the corner, explained, and re-filable. */
export function ErrorState({ title = 'Something went wrong', message, onRetry, isRetrying }: ErrorStateProps) {
  return (
    <div role="alert" className="card card-fiber file-in relative px-5 py-8 sm:px-8 sm:py-10">
      {/* The stamp lands where a stamp lands: in the corner, not in the
          reading order above the heading. */}
      <span className="stamp absolute top-5 right-5 sm:top-6 sm:right-7" aria-hidden="true">
        Misfiled
      </span>

      <h2 className="record-prose max-w-[26rem] text-xl leading-tight font-bold text-ink">{title}</h2>
      <p className="record-prose mt-2.5 max-w-prose text-[0.9375rem] text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="card" className="mt-6" onClick={onRetry} isLoading={isRetrying} loadingText="Refiling">
          Try again
        </Button>
      )}
    </div>
  )
}

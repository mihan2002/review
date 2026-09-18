import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  loadingText?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A modal confirmation built on <dialog>, so focus trapping, Esc and the
 * backdrop come from the platform.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isLoading = false,
  loadingText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!isLoading) onCancel()
      }}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) dismisses it.
        if (event.target === dialogRef.current && !isLoading) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/30"
    >
      <div className="space-y-3 p-6">
        <h2 id="confirm-dialog-title" className="font-serif text-lg text-ink">
          {title}
        </h2>
        <div className="text-sm leading-6 text-muted">{description}</div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading} loadingText={loadingText}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}

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
 * A withdrawal slip: the one interruption the cabinet permits, because pulling
 * a card out for good cannot be undone. Built on <dialog>, so focus trapping,
 * Esc and the backdrop come from the platform.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Withdraw card',
  cancelLabel = 'Keep it filed',
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
      className="card card-fiber m-auto w-[calc(100%-2rem)] max-w-md p-0 backdrop:bg-[rgb(10_7_3/0.72)] backdrop:backdrop-blur-[2px]"
    >
      <div className="px-6 pt-6 pb-5">
        <h2 id="confirm-dialog-title" className="record-prose text-xl leading-tight font-bold text-ink">
          {title}
        </h2>
        <div className="record-prose mt-2.5 text-[0.9375rem] text-ink-soft">{description}</div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-dashed border-rule px-6 py-4 sm:flex-row sm:justify-end">
        <Button variant="quiet" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button variant="stamp" onClick={onConfirm} isLoading={isLoading} loadingText={loadingText}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}

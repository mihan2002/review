import { useEffect, useRef } from 'react'

interface ShortcutsSheetProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS: Array<[string, string]> = [
  ['N', 'Type a new card'],
  ['/', 'Jump to the enquiry slip'],
  ['G then D', 'Back to the drawer'],
  ['T', 'Turn the lamp on or off'],
  ['?', 'Show this card'],
  ['ESC', 'Close whatever is open'],
]

/** The instruction card taped inside the cabinet door. */
export function ShortcutsSheet({ open, onClose }: ShortcutsSheetProps) {
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
      aria-labelledby="shortcuts-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
      className="card card-fiber m-auto w-[calc(100%-2rem)] max-w-sm p-0 backdrop:bg-[rgb(10_7_3/0.72)] backdrop:backdrop-blur-[2px]"
    >
      <div className="px-6 pt-6 pb-2">
        <h2 id="shortcuts-title" className="record-prose text-xl leading-tight font-bold text-ink">
          Cabinet keyboard
        </h2>
      </div>

      <dl className="px-6 pb-4">
        {SHORTCUTS.map(([keys, description]) => (
          <div key={keys} className="flex items-baseline gap-4 border-b border-dashed border-rule py-2.5 last:border-0">
            <dt className="record w-24 shrink-0 font-bold text-ink">{keys}</dt>
            <dd className="record-prose text-[0.875rem] text-ink-soft">{description}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-dashed border-rule px-6 py-3">
        <button type="button" onClick={onClose} className="btn btn-quiet min-h-9 w-full px-3">
          Close
        </button>
      </div>
    </dialog>
  )
}

import { Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DiaryEntry } from '../../types/api'
import { formatEntryDate, formatTimestamp } from '../../utils/date'
import { preview } from '../../utils/text'

interface DiaryCardProps {
  entry: DiaryEntry
  onDelete: (entry: DiaryEntry) => void
}

export function DiaryCard({ entry, onDelete }: DiaryCardProps) {
  const edited = entry.updatedAt !== entry.createdAt

  return (
    <article className="group relative rounded-card border border-line bg-surface p-5 transition-shadow duration-200 hover:shadow-md hover:shadow-ink/5 sm:p-6">
      <h3 className="font-serif text-lg leading-snug text-ink">
        {/* The stretched link makes the whole card clickable while keeping one accessible link. */}
        <Link to={`/diary/${entry.id}`} className="before:absolute before:inset-0 before:rounded-card">
          {entry.title}
        </Link>
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted">{preview(entry.content)}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {formatEntryDate(entry.entryDate)}
          <span className="hidden sm:inline">
            {' · '}
            {edited ? 'Edited' : 'Written'} {formatTimestamp(edited ? entry.updatedAt : entry.createdAt)}
          </span>
        </p>

        {/* Raised above the stretched link so the actions stay clickable. */}
        <div className="relative z-10 flex items-center gap-1">
          <Link
            to={`/diary/${entry.id}/edit`}
            aria-label={`Edit ${entry.title}`}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-accent-soft hover:text-ink"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(entry)}
            aria-label={`Delete ${entry.title}`}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
}

import { Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DiaryEntry } from '../../types/api'
import { callNumber, readingMinutes } from '../../utils/catalog'
import { formatClockTime } from '../../utils/date'
import { preview } from '../../utils/text'

interface DiaryCardProps {
  entry: DiaryEntry
  onDelete: (entry: DiaryEntry) => void
  /** Staggers the settle so a page of cards files itself in order. */
  index?: number
}

/** One filed card: typed header, the author's hand, a rod hole at the foot. */
export function DiaryCard({ entry, onDelete, index = 0 }: DiaryCardProps) {
  const amended = entry.updatedAt !== entry.createdAt
  const stamped = amended ? entry.updatedAt : entry.createdAt

  return (
    <article
      className="card card-fiber card-punch liftable file-in group relative px-5 pt-4 pb-10 sm:px-6"
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="record text-ink-soft">{callNumber(entry.entryDate, entry.id)}</p>
        {amended && <span className="stamp shrink-0">Amended</span>}
      </div>

      <h3 className="hand mt-2.5 text-[1.375rem] leading-tight font-semibold text-ink sm:text-2xl">
        {/* One accessible link, stretched across the card. */}
        <Link to={`/diary/${entry.id}`} className="before:absolute before:inset-0 before:rounded-[inherit]">
          {entry.title}
        </Link>
      </h3>

      <p
        className="hand card-ruled-faint mt-2 max-w-prose text-[0.9375rem] text-ink-soft"
        style={{ lineHeight: 'var(--rule-step)' }}
      >
        {preview(entry.content)}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="record-sm text-ink-soft">
          {amended ? 'Amended' : 'Typed'} {formatClockTime(stamped)}
          <span className="hidden sm:inline">
            {' · '}
            {readingMinutes(entry.content)} min read
          </span>
        </p>

        {/* Raised above the stretched link so the actions stay clickable. */}
        <div className="relative z-10 flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Link
            to={`/diary/${entry.id}/edit`}
            aria-label={`Amend ${entry.title}`}
            className="rounded-[1px] p-2 text-ink-soft transition-colors hover:bg-[color-mix(in_oklab,var(--color-rule)_50%,transparent)] hover:text-ink"
          >
            <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(entry)}
            aria-label={`Withdraw ${entry.title}`}
            className="rounded-[1px] p-2 text-ink-soft transition-colors hover:bg-[color-mix(in_oklab,var(--color-stamp)_16%,transparent)] hover:text-stamp"
          >
            <Trash2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils/cn'

interface PaginationProps {
  /** Zero-based, as the backend reports it. */
  page: number
  totalPages: number
  totalElements: number
  pageSize: number
  itemsOnPage: number
  onPageChange: (page: number) => void
}

const MAX_NUMBERED = 5

/** A compact window of page numbers around the current page. */
function pageWindow(page: number, totalPages: number): number[] {
  const count = Math.min(MAX_NUMBERED, totalPages)
  const start = Math.max(0, Math.min(page - Math.floor(count / 2), totalPages - count))
  return Array.from({ length: count }, (_, index) => start + index)
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  itemsOnPage,
  onPageChange,
}: PaginationProps) {
  if (totalElements === 0) return null

  const firstItem = page * pageSize + 1
  const lastItem = page * pageSize + itemsOnPage

  return (
    <nav
      aria-label="Diary entry pages"
      className="flex flex-col items-center gap-4 border-t border-line pt-6 sm:flex-row sm:justify-between"
    >
      <p className="text-xs text-muted" aria-live="polite">
        Showing {firstItem}&ndash;{lastItem} of {totalElements} {totalElements === 1 ? 'entry' : 'entries'}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-muted transition-colors hover:bg-accent-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {pageWindow(page, totalPages).map((index) => (
            <button
              key={index}
              type="button"
              onClick={() => onPageChange(index)}
              aria-current={index === page ? 'page' : undefined}
              aria-label={`Page ${index + 1}`}
              className={cn(
                'size-9 rounded-lg text-sm transition-colors',
                index === page ? 'bg-accent text-white' : 'text-muted hover:bg-accent-soft hover:text-ink',
              )}
            >
              {index + 1}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-muted transition-colors hover:bg-accent-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  )
}

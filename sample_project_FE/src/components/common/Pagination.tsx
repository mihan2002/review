import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils/cn'
import { typedCount } from '../../utils/catalog'

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

/** A compact window of tray numbers around the current tray. */
function pageWindow(page: number, totalPages: number): number[] {
  const count = Math.min(MAX_NUMBERED, totalPages)
  const start = Math.max(0, Math.min(page - Math.floor(count / 2), totalPages - count))
  return Array.from({ length: count }, (_, index) => start + index)
}

/** The drawer's foot: which tray you are in, and the brass pulls either side. */
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
      aria-label="Card trays"
      className="flex flex-col items-center gap-5 border-t border-brass/30 pt-6 sm:flex-row sm:justify-between"
    >
      <p className="record text-deep-ink-soft" aria-live="polite">
        Cards {typedCount(firstItem)}&ndash;{typedCount(lastItem)} of {typedCount(totalElements)}
        {totalPages > 1 && (
          <>
            {' · '}Tray {page + 1}/{totalPages}
          </>
        )}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className="btn btn-case min-h-9 px-2.5"
          >
            <ChevronLeft className="size-4" strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {pageWindow(page, totalPages).map((index) => (
            <button
              key={index}
              type="button"
              onClick={() => onPageChange(index)}
              aria-current={index === page ? 'page' : undefined}
              aria-label={`Tray ${index + 1}`}
              className={cn(
                'btn min-h-9 min-w-9 px-0 text-[0.625rem]',
                index === page ? 'btn-brass' : 'btn-case',
              )}
            >
              {index + 1}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="btn btn-case min-h-9 px-2.5"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  )
}

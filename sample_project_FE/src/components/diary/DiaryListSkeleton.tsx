import { Skeleton } from '../common/Skeleton'

export function DiaryListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading diary entries…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-card border border-line bg-surface p-5 sm:p-6">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="mt-4 h-3.5 w-full" />
          <Skeleton className="mt-2 h-3.5 w-11/12" />
          <Skeleton className="mt-2 h-3.5 w-3/5" />
          <Skeleton className="mt-5 h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

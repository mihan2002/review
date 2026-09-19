import { Skeleton } from '../common/Skeleton'

/** Cards arriving on the rail, before their typing is legible. */
export function DiaryListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Reading the drawer…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card card-fiber card-punch px-5 pt-4 pb-10 sm:px-6">
          <Skeleton className="h-2.5 w-36" />
          <Skeleton className="mt-4 h-5 w-2/5" />
          <Skeleton className="mt-4 h-3.5 w-full" />
          <Skeleton className="mt-2 h-3.5 w-11/12" />
          <Skeleton className="mt-5 h-2.5 w-28" />
        </div>
      ))}
    </div>
  )
}

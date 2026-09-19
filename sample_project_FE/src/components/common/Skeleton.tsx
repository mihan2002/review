import { cn } from '../../utils/cn'

/** A line of typing that has not arrived yet. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-[1px] bg-[color-mix(in_oklab,var(--color-rule)_70%,transparent)] motion-safe:animate-pulse',
        className,
      )}
    />
  )
}

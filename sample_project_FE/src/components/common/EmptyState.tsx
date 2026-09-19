import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

/** An empty drawer: the rails are there, the cards are not. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="drawer rail file-in px-5 py-14 sm:px-8">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <Icon className="size-7 text-brass" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="record-prose mt-5 text-xl leading-tight font-bold text-deep-ink">{title}</h2>
        <p className="record-prose mt-2.5 max-w-sm text-[0.9375rem] text-deep-ink/85">{description}</p>
        {action && <div className="mt-7">{action}</div>}
      </div>
    </div>
  )
}

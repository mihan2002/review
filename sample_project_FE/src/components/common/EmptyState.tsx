import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="animate-rise flex flex-col items-center rounded-card border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="font-serif text-lg text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

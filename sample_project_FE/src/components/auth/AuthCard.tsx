import { BookOpen } from 'lucide-react'
import type { ReactNode } from 'react'

interface AuthCardProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

/** Centred card shared by the login and registration screens. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="animate-rise w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <h1 className="font-serif text-2xl text-ink">My Diary</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-6 shadow-sm shadow-ink/5 sm:p-7">
          <h2 className="sr-only">{title}</h2>
          {children}
        </div>

        <div className="mt-6 text-center text-sm text-muted">{footer}</div>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'

interface AuthCardProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

/** The cabinet, closed. One drawer front, one brass plate, one card. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="file-in w-full max-w-md">
        {/* The drawer front */}
        <div className="drawer rail flex flex-col items-center px-6 py-7">
          <span className="brass-plate flex items-center gap-2.5 px-4 py-2">
            <span className="block h-4 w-[3px] rounded-full bg-[rgb(26_18_4/0.3)]" aria-hidden="true" />
            <span className="record text-sm leading-none font-bold">My Diary</span>
            <span className="block h-4 w-[3px] rounded-full bg-[rgb(26_18_4/0.3)]" aria-hidden="true" />
          </span>
          <p className="record-sm mt-3.5 text-center text-deep-ink-soft">{subtitle}</p>
          {/* The drawer pull */}
          <span
            aria-hidden="true"
            className="brass-plate mt-5 h-2.5 w-24 rounded-full"
          />
        </div>

        <div className="card card-fiber -mt-3 px-6 py-7 sm:px-7">
          <h1 className="record-prose mb-6 text-[1.5rem] leading-tight font-bold text-ink">{title}</h1>
          {children}
        </div>

        <div className="record-prose mt-6 text-center text-[0.8125rem] text-case-ink-soft">{footer}</div>
      </div>
    </div>
  )
}

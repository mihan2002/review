import { HelpCircle, Lamp, LampDesk, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'

interface HeaderProps {
  onLogout: () => void
  onShowShortcuts: () => void
}

/** The cabinet's top rail: a brass label holder, and the holder's own card. */
export function Header({ onLogout, onShowShortcuts }: HeaderProps) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 border-b border-brass/35 bg-deep/92 backdrop-blur-[3px]">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          to="/dashboard"
          className="group flex items-center gap-3 rounded-[2px]"
          aria-label="My Diary — back to the drawer"
        >
          {/* The brass label holder screwed to the drawer front. */}
          <span className="brass-plate flex items-center gap-2 py-1.5 pr-3 pl-2.5 transition-[filter] group-hover:brightness-110">
            <span className="block h-4 w-[3px] rounded-full bg-[rgb(26_18_4/0.3)]" aria-hidden="true" />
            <span className="record font-bold">My Diary</span>
          </span>
          <span className="record-sm hidden text-deep-ink-soft sm:inline">Card Catalog</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {user && (
            <span
              className="record hidden max-w-[11rem] truncate border border-brass/40 px-2.5 py-1 text-deep-ink-soft md:inline-block"
              title={user.username}
            >
              {user.username}
            </span>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'night' ? 'Turn the room light on' : 'Turn the desk lamp on'}
            title={theme === 'night' ? 'Room light (T)' : 'Desk lamp (T)'}
            className="btn btn-case min-h-9 px-2.5"
          >
            {theme === 'night' ? (
              <LampDesk className="size-4" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Lamp className="size-4" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onShowShortcuts}
            aria-label="Cabinet instructions"
            title="Instructions (?)"
            className="btn btn-case min-h-9 hidden px-2.5 sm:inline-flex"
          >
            <HelpCircle className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>

          <button type="button" onClick={onLogout} className="btn btn-case min-h-9 px-2.5" aria-label="Lock the cabinet">
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />
            <span className="hidden sm:inline">Lock</span>
          </button>
        </div>
      </div>
    </header>
  )
}

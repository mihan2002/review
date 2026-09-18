import { BookOpen, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  onLogout: () => void
}

export function Header({ onLogout }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 rounded-lg text-ink transition-opacity hover:opacity-80"
        >
          <BookOpen className="size-5 text-accent" aria-hidden="true" />
          <span className="font-serif text-lg">My Diary</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-3">
          {user && (
            <span className="hidden max-w-[12rem] truncate text-sm text-muted sm:inline" title={user.username}>
              {user.username}
            </span>
          )}
          <button
            type="button"
            onClick={onLogout}
            aria-label="Logout"
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-accent-soft hover:text-ink"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}

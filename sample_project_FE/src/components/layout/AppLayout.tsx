import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { FOCUS_SEARCH_EVENT, useShortcuts } from '../../hooks/useShortcuts'
import { useTheme } from '../../hooks/useTheme'
import { useToast } from '../../hooks/useToast'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ShortcutsSheet } from '../common/ShortcutsSheet'
import { Header } from './Header'

/** The cabinet itself: top rail, the working surface, and the maker's plate. */
export function AppLayout() {
  const { logout } = useAuth()
  const { toggleTheme } = useTheme()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [showingShortcuts, setShowingShortcuts] = useState(false)

  const handleLogout = () => {
    setConfirmingLogout(false)
    logout()
    showToast('The cabinet is locked.')
    navigate('/login', { replace: true })
  }

  useShortcuts({
    onNewEntry: () => navigate('/diary/new'),
    onDashboard: () => navigate('/dashboard'),
    onFocusSearch: () => {
      if (location.pathname !== '/dashboard') navigate('/dashboard')
      // The dashboard's enquiry field listens for this and takes focus.
      window.setTimeout(() => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT)), 60)
    },
    onToggleLight: toggleTheme,
    onToggleHelp: () => setShowingShortcuts((current) => !current),
    onEscape: () => {
      setShowingShortcuts(false)
      setConfirmingLogout(false)
    },
  })

  return (
    <div className="flex min-h-dvh flex-col">
      <Header onLogout={() => setConfirmingLogout(true)} onShowShortcuts={() => setShowingShortcuts(true)} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
        <Outlet />
      </main>

      {/* The maker's plate at the foot of the case. */}
      <footer className="border-t border-brass/25">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-1.5 px-4 py-6 sm:flex-row sm:justify-between sm:px-6">
          <p className="record text-case-ink-soft">One holder &middot; one cabinet &middot; no readers but you</p>
          <button
            type="button"
            onClick={() => setShowingShortcuts(true)}
            className="record text-case-ink-soft underline decoration-brass/50 transition-colors hover:text-case-ink"
          >
            Keyboard &#63;
          </button>
        </div>
      </footer>

      <ConfirmDialog
        open={confirmingLogout}
        title="Lock the cabinet?"
        description="You will need your key again to read or file anything."
        confirmLabel="Lock it"
        cancelLabel="Stay"
        onConfirm={handleLogout}
        onCancel={() => setConfirmingLogout(false)}
      />

      <ShortcutsSheet open={showingShortcuts} onClose={() => setShowingShortcuts(false)} />
    </div>
  )
}

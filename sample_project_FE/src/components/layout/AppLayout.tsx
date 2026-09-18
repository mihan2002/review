import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { Header } from './Header'

/** Shell for every authenticated page: header, centred column, logout flow. */
export function AppLayout() {
  const { logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [confirmingLogout, setConfirmingLogout] = useState(false)

  const handleLogout = () => {
    setConfirmingLogout(false)
    logout()
    showToast('You have been signed out.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header onLogout={() => setConfirmingLogout(true)} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        Written by you, kept for you.
      </footer>

      <ConfirmDialog
        open={confirmingLogout}
        title="Sign out?"
        description="You will need to sign in again to read or write entries."
        confirmLabel="Sign out"
        onConfirm={handleLogout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </div>
  )
}

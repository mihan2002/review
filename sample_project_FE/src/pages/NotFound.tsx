import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { useAuth } from '../hooks/useAuth'

/** A drawer that was never cut into the cabinet. */
export function NotFound() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="file-in w-full max-w-md">
        <div className="card card-fiber card-punch relative px-6 py-8 pb-12 sm:px-8">
          <span className="stamp absolute top-6 right-6" aria-hidden="true">
            No such drawer
          </span>
          <h1 className="record text-[2rem] leading-none font-bold tracking-[0.08em] text-ink">404</h1>
          <p className="record-prose mt-4 max-w-[26rem] text-[0.9375rem] text-ink-soft">
            The cabinet has no drawer at that address. Nothing was lost — there was never anything here.
          </p>
          <Button className="mt-7" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
            {isAuthenticated ? 'Back to the drawer' : 'Unlock the cabinet'}
          </Button>
        </div>
      </div>
    </div>
  )
}

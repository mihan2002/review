import { Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { useAuth } from '../hooks/useAuth'

export function NotFound() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4">
      <div className="w-full">
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="The page you were looking for doesn't exist or has moved."
          action={
            <Button onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
              {isAuthenticated ? 'Back to diary' : 'Go to sign in'}
            </Button>
          }
        />
      </div>
    </div>
  )
}

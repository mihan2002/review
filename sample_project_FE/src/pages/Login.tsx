import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/common/Button'
import { PasswordField } from '../components/common/PasswordField'
import { TextField } from '../components/common/TextField'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getErrorMessage } from '../utils/errors'

// The backend authenticates by username, not email (see LoginRequest).
const loginSchema = z.object({
  username: z.string().trim().min(1, 'The cabinet needs your username.'),
  password: z.string().min(1, 'The cabinet needs your key.'),
})

type LoginValues = z.infer<typeof loginSchema>

interface LocationState {
  from?: { pathname?: string }
}

export function Login() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard'

  const onSubmit = async (values: LoginValues) => {
    setFormError(null)
    try {
      await login(values)
      showToast('The cabinet is open.')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setFormError(getErrorMessage(error, 'The cabinet would not open. Please try again.'))
    }
  }

  return (
    <AuthCard
      title="Unlock the cabinet"
      subtitle="Card Catalog &middot; one holder only"
      footer={
        <>
          No cabinet yet?{' '}
          <Link to="/register" className="font-bold text-case-ink underline decoration-brass underline-offset-4">
            Open one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {formError && (
          <p role="alert" className="record border border-dashed border-stamp/70 px-3 py-2.5 font-bold text-stamp">
            {formError}
          </p>
        )}

        <TextField
          label="Username"
          autoComplete="username"
          autoFocus
          error={errors.username?.message}
          {...register('username')}
        />

        <PasswordField
          label="Key"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Unlocking">
          Unlock
        </Button>
      </form>
    </AuthCard>
  )
}

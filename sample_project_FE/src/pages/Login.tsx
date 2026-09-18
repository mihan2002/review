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
  username: z.string().trim().min(1, 'Please enter your username.'),
  password: z.string().min(1, 'Please enter your password.'),
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
      showToast('Welcome back.')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to sign in. Please try again.'))
    }
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back"
      footer={
        <>
          Don&rsquo;t have an account?{' '}
          <Link to="/register" className="font-medium text-accent underline-offset-4 hover:underline">
            Create account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
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
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Signing in…">
          Login
        </Button>
      </form>
    </AuthCard>
  )
}

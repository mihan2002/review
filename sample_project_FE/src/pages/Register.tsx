import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/common/Button'
import { PasswordField } from '../components/common/PasswordField'
import { TextField } from '../components/common/TextField'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getErrorMessage } from '../utils/errors'

/** Mirrors the backend validation on RegisterRequest. */
const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be between 3 and 50 characters.')
      .max(50, 'Username must be between 3 and 50 characters.'),
    email: z.string().trim().min(1, 'Please enter your email.').email('Please enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must not exceed 72 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

type RegisterValues = z.infer<typeof registerSchema>

export function Register() {
  const { register: registerUser, login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null)
    try {
      await registerUser({ username: values.username, email: values.email, password: values.password })

      // Registration returns the new user, not a token, so sign in straight after.
      try {
        await login({ username: values.username, password: values.password })
        showToast('Your diary is ready.')
        navigate('/dashboard', { replace: true })
      } catch {
        showToast('Account created. Please sign in.')
        navigate('/login', { replace: true })
      }
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to create your account. Please try again.'))
    }
  }

  return (
    <AuthCard
      title="Create account"
      subtitle="Start your diary"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent underline-offset-4 hover:underline">
            Sign in
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

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Creating account…">
          Register
        </Button>
      </form>
    </AuthCard>
  )
}

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
      .min(3, 'A username is between 3 and 50 characters.')
      .max(50, 'A username is between 3 and 50 characters.'),
    email: z.string().trim().min(1, 'The cabinet needs an email address.').email('That address does not look right.'),
    password: z
      .string()
      .min(8, 'A key is at least 8 characters.')
      .max(72, 'A key is at most 72 characters.'),
    confirmPassword: z.string().min(1, 'Type the key once more.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two keys do not match.',
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
        showToast('Your cabinet is ready.')
        navigate('/dashboard', { replace: true })
      } catch {
        showToast('Cabinet opened. Sign in to start filing.')
        navigate('/login', { replace: true })
      }
    } catch (error) {
      setFormError(getErrorMessage(error, 'The cabinet could not be opened. Please try again.'))
    }
  }

  return (
    <AuthCard
      title="Open a cabinet"
      subtitle="Card Catalog &middot; nobody reads it but you"
      footer={
        <>
          Already have one?{' '}
          <Link to="/login" className="font-bold text-case-ink underline decoration-brass underline-offset-4">
            Unlock it
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

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordField
          label="Key"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordField
          label="Key again"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Opening">
          Open the cabinet
        </Button>
      </form>
    </AuthCard>
  )
}

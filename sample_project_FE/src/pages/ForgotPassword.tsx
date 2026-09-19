import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { authApi } from '../api/authApi'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/common/Button'
import { PasswordField } from '../components/common/PasswordField'
import { TextField } from '../components/common/TextField'
import { useToast } from '../hooks/useToast'
import { getErrorMessage } from '../utils/errors'

/**
 * Three steps on one screen: ask for the email, check the PIN that was emailed,
 * then set the new password. Keeping it on one route means the email and PIN
 * survive a step back without ever being carried through the URL.
 */
type Step = 'email' | 'pin' | 'password'

const emailSchema = z.object({
  email: z.string().trim().min(1, 'Please enter your email.').email('Please enter a valid email address.'),
})

// Mirrors the backend @Pattern on the PIN fields.
const pinSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^[0-9]{4,8}$/, 'Enter the 4 to 8 digit PIN from the email.'),
})

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must not exceed 72 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

type EmailValues = z.infer<typeof emailSchema>
type PinValues = z.infer<typeof pinSchema>
type PasswordValues = z.infer<typeof passwordSchema>

const SUBTITLES: Record<Step, string> = {
  email: 'Reset your password',
  pin: 'Check your email',
  password: 'Choose a new password',
}

export function ForgotPassword() {
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const pinForm = useForm<PinValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: { pin: '' },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const submitEmail = async (values: EmailValues) => {
    setFormError(null)
    try {
      await authApi.forgotPassword({ email: values.email })
      setEmail(values.email)
      pinForm.reset({ pin: '' })
      setStep('pin')
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to send a reset PIN. Please try again.'))
    }
  }

  const submitPin = async (values: PinValues) => {
    setFormError(null)
    try {
      await authApi.verifyResetPin({ email, pin: values.pin })
      setPin(values.pin)
      passwordForm.reset({ newPassword: '', confirmPassword: '' })
      setStep('password')
    } catch (error) {
      setFormError(getErrorMessage(error, 'That PIN is invalid or has expired.'))
    }
  }

  const submitPassword = async (values: PasswordValues) => {
    setFormError(null)
    try {
      await authApi.resetPassword({ email, pin, newPassword: values.newPassword })
      showToast('Password changed. Please sign in.')
      navigate('/login', { replace: true })
    } catch (error) {
      // A burned or expired PIN can only be fixed by starting over.
      setFormError(getErrorMessage(error, 'Unable to change your password. Please try again.'))
    }
  }

  const resend = async () => {
    setFormError(null)
    try {
      await authApi.forgotPassword({ email })
      showToast('A new PIN is on its way.')
      pinForm.reset({ pin: '' })
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to send a new PIN. Please try again.'))
    }
  }

  const goBackToEmail = () => {
    setFormError(null)
    setPin('')
    setStep('email')
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle={SUBTITLES[step]}
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-medium text-accent underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to sign in
        </Link>
      }
    >
      {formError && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {formError}
        </p>
      )}

      {step === 'email' && (
        <form onSubmit={emailForm.handleSubmit(submitEmail)} className="space-y-4" noValidate>
          <p className="text-sm text-muted">
            Enter the email on your account and we&rsquo;ll send you a one-time PIN.
          </p>

          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            error={emailForm.formState.errors.email?.message}
            {...emailForm.register('email')}
          />

          <Button
            type="submit"
            className="w-full"
            isLoading={emailForm.formState.isSubmitting}
            loadingText="Sending PIN…"
          >
            Send reset PIN
          </Button>
        </form>
      )}

      {step === 'pin' && (
        <form onSubmit={pinForm.handleSubmit(submitPin)} className="space-y-4" noValidate>
          <p className="text-sm text-muted">
            If <span className="font-medium text-ink">{email}</span> has an account, a PIN is on its way.
            It expires shortly and can be used once.
          </p>

          <TextField
            label="Reset PIN"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            error={pinForm.formState.errors.pin?.message}
            {...pinForm.register('pin')}
          />

          <Button
            type="submit"
            className="w-full"
            isLoading={pinForm.formState.isSubmitting}
            loadingText="Checking PIN…"
          >
            Continue
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={goBackToEmail}
              className="font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={resend}
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Send another PIN
            </button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={passwordForm.handleSubmit(submitPassword)} className="space-y-4" noValidate>
          <p className="text-sm text-muted">PIN accepted. Choose a new password for your account.</p>

          <PasswordField
            label="New password"
            autoComplete="new-password"
            autoFocus
            hint="At least 8 characters."
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />

          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />

          <Button
            type="submit"
            className="w-full"
            isLoading={passwordForm.formState.isSubmitting}
            loadingText="Saving…"
          >
            Change password
          </Button>
        </form>
      )}
    </AuthCard>
  )
}

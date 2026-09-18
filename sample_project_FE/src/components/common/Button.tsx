import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  loadingText?: string
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent/90 disabled:bg-accent/50',
  secondary: 'bg-surface text-ink border border-line hover:bg-paper',
  ghost: 'text-muted hover:text-ink hover:bg-accent-soft',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  className,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-70',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {isLoading && loadingText ? loadingText : children}
    </button>
  )
}

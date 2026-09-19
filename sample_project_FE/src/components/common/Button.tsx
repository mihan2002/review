import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

/**
 * `brass` is the cabinet's own hardware and carries the primary action.
 * `card` sits on card stock, `case` sits on the bare oak, `quiet` recedes,
 * `stamp` is the red ribbon reserved for destruction.
 */
type Variant = 'brass' | 'card' | 'case' | 'quiet' | 'stamp'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  loadingText?: string
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  brass: 'btn-brass',
  card: 'btn-card',
  case: 'btn-case',
  quiet: 'btn-quiet',
  stamp: 'btn-stamp',
}

const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-[0.625rem]',
  md: 'min-h-11 px-[1.15rem]',
  lg: 'min-h-13 px-6 text-xs',
}

/** Three dots typed one after another — the machine working. */
function Working() {
  return (
    <span className="inline-flex gap-[3px]" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-[3px] rounded-full bg-current opacity-40 motion-safe:animate-pulse"
          style={{ animationDelay: `${index * 160}ms`, animationDuration: '900ms' }}
        />
      ))}
    </span>
  )
}

export function Button({
  variant = 'brass',
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
      className={cn('btn', VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {isLoading && <Working />}
      {isLoading && loadingText ? loadingText : children}
    </button>
  )
}

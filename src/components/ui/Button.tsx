import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

const variants = {
  primary: 'bg-cs-primary text-white hover:bg-cs-primary-dark focus:ring-cs-primary/50',
  secondary: 'bg-cs-secondary text-white hover:bg-cs-secondary/90 focus:ring-cs-secondary/50',
  danger: 'bg-cs-danger text-white hover:bg-cs-danger/90 focus:ring-cs-danger/50',
  ghost: 'bg-transparent text-cs-text hover:bg-cs-border/50 focus:ring-cs-primary/30',
  outline: 'border border-cs-border text-cs-text hover:bg-cs-border/30 focus:ring-cs-primary/30',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={twMerge(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
)

Button.displayName = 'Button'

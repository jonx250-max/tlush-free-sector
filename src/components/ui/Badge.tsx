import { twMerge } from 'tailwind-merge'

const variants = {
  critical: 'bg-cs-danger/10 text-cs-danger border-cs-danger/20',
  warning: 'bg-cs-warning/10 text-cs-warning border-cs-warning/20',
  info: 'bg-cs-primary/10 text-cs-primary border-cs-primary/20',
  success: 'bg-cs-success/10 text-cs-success border-cs-success/20',
} as const

interface BadgeProps {
  variant: keyof typeof variants
  children: React.ReactNode
  className?: string
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

import type { HTMLAttributes, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        'rounded-2xl border border-cs-border bg-cs-surface p-6 shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={twMerge('mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={twMerge('font-heading text-lg font-bold text-cs-text', className)} {...props}>
      {children}
    </h3>
  )
}

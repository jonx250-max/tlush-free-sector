import { type InputHTMLAttributes, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.replace(/\s+/g, '-')

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-cs-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={twMerge(
            'w-full rounded-lg border border-cs-border bg-cs-surface px-3 py-2 text-cs-text',
            'placeholder:text-cs-muted/60 focus:border-cs-primary focus:outline-none focus:ring-2 focus:ring-cs-primary/30',
            'disabled:opacity-50',
            error && 'border-cs-danger focus:border-cs-danger focus:ring-cs-danger/30',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-cs-danger">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'

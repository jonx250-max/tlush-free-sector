import { type SelectHTMLAttributes, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id ?? label?.replace(/\s+/g, '-')

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-cs-muted">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={twMerge(
            'w-full rounded-lg border border-cs-border bg-cs-surface px-3 py-2 text-cs-text',
            'focus:border-cs-primary focus:outline-none focus:ring-2 focus:ring-cs-primary/30',
            error && 'border-cs-danger',
            className,
          )}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-cs-danger">{error}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'

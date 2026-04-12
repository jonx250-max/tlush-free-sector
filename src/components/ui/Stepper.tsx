import { twMerge } from 'tailwind-merge'
import { Check } from 'lucide-react'

interface StepperProps {
  steps: string[]
  currentStep: number
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav aria-label="שלבים" className="mb-8">
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep

          return (
            <li key={step} className="flex items-center gap-2">
              <div
                className={twMerge(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors',
                  isComplete && 'bg-cs-success text-white',
                  isCurrent && 'bg-cs-primary text-white',
                  !isComplete && !isCurrent && 'bg-cs-border text-cs-muted',
                )}
              >
                {isComplete ? <Check size={16} /> : index + 1}
              </div>
              <span
                className={twMerge(
                  'text-sm hidden sm:inline',
                  isCurrent ? 'font-medium text-cs-text' : 'text-cs-muted',
                )}
              >
                {step}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={twMerge(
                    'mx-2 h-0.5 w-8 sm:w-12',
                    isComplete ? 'bg-cs-success' : 'bg-cs-border',
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

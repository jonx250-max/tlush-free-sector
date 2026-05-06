/**
 * Stage H4 — <Toaster/> renders the active toast queue.
 *
 * Uses `aria-live="polite"` so screen readers announce new toasts
 * without interrupting the user. Each toast is dismissible with the
 * keyboard via Esc.
 */

import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { subscribeToasts, dismissToast, type Toast } from '../../lib/toast'

const VARIANT_STYLE: Record<Toast['variant'], { bg: string; ring: string; text: string; Icon: typeof Info }> = {
  info:    { bg: 'bg-cs-bg',                ring: 'ring-cs-border',         text: 'text-cs-text',    Icon: Info },
  success: { bg: 'bg-cs-success/10',        ring: 'ring-cs-success/40',     text: 'text-cs-success', Icon: CheckCircle },
  warning: { bg: 'bg-cs-warning/10',        ring: 'ring-cs-warning/40',     text: 'text-cs-warning', Icon: AlertTriangle },
  error:   { bg: 'bg-cs-danger/10',         ring: 'ring-cs-danger/40',      text: 'text-cs-danger',  Icon: XCircle },
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toasts.length > 0) {
        dismissToast(toasts[toasts.length - 1].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toasts])

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="התראות"
      className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-col-reverse gap-2 sm:left-auto sm:right-4 sm:w-96"
    >
      {toasts.map(t => {
        const { bg, ring, text, Icon } = VARIANT_STYLE[t.variant]
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-lg ${bg} px-4 py-3 shadow-lg ring-1 ${ring}`}
          >
            <Icon size={20} className={`mt-0.5 shrink-0 ${text}`} aria-hidden="true" />
            <p className={`flex-1 text-sm ${text}`}>{t.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className={`shrink-0 rounded p-1 hover:bg-black/5 ${text}`}
              aria-label="סגור התראה"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

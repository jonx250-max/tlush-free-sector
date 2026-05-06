/**
 * Stage H4 — toast notification system, no global state library.
 *
 * Module-level pub/sub. `pushToast()` emits, `subscribeToasts()` listens.
 * The <Toaster/> component subscribes; pages call pushToast() to fire.
 *
 * Avoids Zustand for this single use case (Stage F3 will introduce
 * Zustand for richer client state).
 */

export type ToastVariant = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  /** ms until auto-dismiss; 0 = sticky */
  durationMs: number
}

type Listener = (toasts: Toast[]) => void

let toasts: Toast[] = []
const listeners = new Set<Listener>()
let nextId = 1

function emit() {
  for (const fn of listeners) fn(toasts.slice())
}

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn)
  fn(toasts.slice())  // hydrate immediately
  return () => { listeners.delete(fn) }
}

export interface PushToastInput {
  message: string
  variant?: ToastVariant
  durationMs?: number
}

export function pushToast(input: PushToastInput): string {
  const id = String(nextId++)
  const toast: Toast = {
    id,
    message: input.message,
    variant: input.variant ?? 'info',
    durationMs: input.durationMs ?? 4000,
  }
  toasts = [...toasts, toast]
  emit()
  if (toast.durationMs > 0) {
    setTimeout(() => dismissToast(id), toast.durationMs)
  }
  return id
}

export function dismissToast(id: string): void {
  toasts = toasts.filter(t => t.id !== id)
  emit()
}

export function _resetToastsForTests(): void {
  toasts = []
  nextId = 1
  listeners.clear()
}

// Convenience helpers
export const toast = {
  info: (message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) =>
    pushToast({ message, variant: 'info', ...opts }),
  success: (message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) =>
    pushToast({ message, variant: 'success', ...opts }),
  warning: (message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) =>
    pushToast({ message, variant: 'warning', ...opts }),
  error: (message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) =>
    pushToast({ message, variant: 'error', ...opts }),
}

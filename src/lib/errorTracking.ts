import { supabase } from './supabase'

interface ErrorPayload {
  message: string
  stack?: string
  url?: string
  userAgent?: string
  release?: string
  context?: Record<string, unknown>
}

export function buildPayload(err: unknown, extra?: Record<string, unknown>): ErrorPayload {
  const e = err instanceof Error ? err : new Error(String(err))
  return {
    message: e.message.slice(0, 2000),
    stack: e.stack?.slice(0, 8000),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : undefined,
    release: import.meta.env.VITE_APP_RELEASE,
    context: extra,
  }
}

export async function reportError(err: unknown, extra?: Record<string, unknown>) {
  const payload = buildPayload(err, extra)
  if (!supabase) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('error_logs').insert({
      user_id: user?.id ?? null,
      message: payload.message,
      stack: payload.stack,
      url: payload.url,
      user_agent: payload.userAgent,
      release: payload.release,
      context: payload.context ?? null,
    })
  } catch {
    // never let the reporter itself throw — it would create a feedback loop
  }
}

export function installGlobalHandlers() {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (ev) => {
    reportError(ev.error ?? ev.message, { source: 'window.error', filename: ev.filename, lineno: ev.lineno })
  })
  window.addEventListener('unhandledrejection', (ev) => {
    reportError(ev.reason, { source: 'unhandledrejection' })
  })
}

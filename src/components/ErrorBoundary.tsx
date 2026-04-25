import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { reportError } from '../lib/errorTracking'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    reportError(error, { source: 'ErrorBoundary', componentStack: info.componentStack })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-screen items-center justify-center bg-cs-bg p-8" dir="rtl">
          <div className="max-w-md rounded-2xl bg-cs-surface p-8 text-center shadow-lg">
            <h1 className="mb-4 font-heading text-2xl font-bold text-cs-danger">
              משהו השתבש
            </h1>
            <p className="mb-6 text-cs-muted">
              אירעה שגיאה בלתי צפויה. נסה לרענן את הדף.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-cs-primary px-6 py-3 text-white transition hover:bg-cs-primary-dark"
            >
              רענן דף
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

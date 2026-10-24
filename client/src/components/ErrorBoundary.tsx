import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the console useful without exposing stack traces in the UI.
    console.error('[ui] render error', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg px-6">
          <div className="max-w-md border-t border-line pt-8">
            <p className="eyebrow">WatchKITA</p>
            <h1 className="mt-4 font-serif text-3xl text-white">This view stopped responding.</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Reload the page to continue. Your watchlist is stored in this browser and will be
              restored.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 bg-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

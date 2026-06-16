import { Component, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[100dvh] flex items-center justify-center bg-bg">
          <div className="text-center p-8 max-w-md">
            <h1 className="text-2xl font-bold text-ink mb-2">Something went wrong</h1>
            <p className="text-muted mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-ink text-bg rounded-md hover:opacity-80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

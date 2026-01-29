import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // TODO: Log to error reporting service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb', padding: 20 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <h2 style={{ color: '#1f2937', marginBottom: 10 }}>문제가 발생했습니다</h2>
            <p style={{ color: '#6b7280', marginBottom: 20 }}>앱에서 오류가 발생했습니다. 페이지를 새로고침해 주세요.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#6366F1', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 16, cursor: 'pointer' }}
            >
              새로고침
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details style={{ marginTop: 20, textAlign: 'left' }}>
                <summary>오류 상세 정보</summary>
                <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, overflow: 'auto', fontSize: 12 }}>{this.state.error.toString()}</pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

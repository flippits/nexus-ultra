import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'var(--bg-primary)', padding: 40
      }}>
        <div style={{ fontSize: 36, color: 'var(--accent-red)' }}>⚠</div>
        <div style={{ color: 'var(--accent-red)', fontSize: 14, fontWeight: 700, letterSpacing: 2 }}>
          MODULE FAILURE
        </div>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--accent-red)44',
          padding: '12px 20px', maxWidth: 500, width: '100%'
        }}>
          <pre style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error.message}
          </pre>
        </div>
        <button
          className="cyber-btn cyber-btn-red"
          onClick={() => this.setState({ error: null })}
        >
          RELOAD MODULE
        </button>
      </div>
    )
  }
}

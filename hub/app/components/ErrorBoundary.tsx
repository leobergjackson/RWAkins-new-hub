// Built by vsrupeshkumar
'use client'

import React from 'react'

type Props = { children: React.ReactNode; label?: string }
type State = { hasError: boolean; error?: Error }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    if (typeof console !== 'undefined') console.error('Kubryx ErrorBoundary:', error)
  }

  reset = () => this.setState({ hasError: false, error: undefined })

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="card" style={{ borderColor: '#F5C518' }}>
        <h3 className="gold-text">Something went wrong with this module.</h3>
        <p>The rest of Kubryx is still running.</p>
        {this.props.label && <p style={{ opacity: 0.6, fontSize: 12 }}>Module: {this.props.label}</p>}
        <button className="btn-outline" onClick={this.reset}>Retry</button>
      </div>
    )
  }
}

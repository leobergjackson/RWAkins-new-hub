import React from 'react'

interface ErrorStateProps {
  message?: string
  onRetry: () => void
}

export function ErrorState({ message = 'Failed to load data', onRetry }: ErrorStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)',
      border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', margin: '20px 0'
    }} className="error-state">
      <span style={{ fontSize: '32px', marginBottom: '16px' }} role="img" aria-label="Error">⚠️</span>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#EF4444', marginBottom: '8px', fontFamily: "'Syne', sans-serif" }}>
        Something went wrong
      </h3>
      <p style={{ fontSize: '14px', color: 'rgba(10, 15, 46, 0.6)', marginBottom: '24px', fontFamily: "'DM Sans', sans-serif" }}>
        {message}
      </p>
      <button 
        onClick={onRetry} 
        className="btn-outline" 
        style={{ padding: '10px 24px', borderRadius: '99px', borderColor: '#EF4444', color: '#EF4444', cursor: 'pointer', background: 'transparent' }}
      >
        Retry Request
      </button>
    </div>
  )
}

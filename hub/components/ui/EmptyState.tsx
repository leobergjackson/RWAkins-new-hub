import React from 'react'

interface EmptyStateProps {
  icon?: string
  title?: string
  message?: string
}

export function EmptyState({ 
  icon = '📭', 
  title = 'No Data Found', 
  message = 'There is currently nothing to display here.' 
}: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 20px', textAlign: 'center', background: 'rgba(10, 15, 46, 0.02)',
      border: '1px dashed rgba(10, 15, 46, 0.1)', borderRadius: '12px', margin: '20px 0'
    }} className="empty-state">
      <span style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.8 }} role="img" aria-label="Empty">
        {icon}
      </span>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(10, 15, 46, 0.9)', marginBottom: '8px', fontFamily: "'Syne', sans-serif" }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: 'rgba(10, 15, 46, 0.5)', margin: 0, fontFamily: "'DM Sans', sans-serif", maxWidth: '300px' }}>
        {message}
      </p>
    </div>
  )
}

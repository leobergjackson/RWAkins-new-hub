'use client'

import { ReactNode } from 'react'

export default function EmptyState({
  icon = '—',
  title,
  subtitle,
  action,
}: {
  icon?: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', opacity: 0.7 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{title}</p>
      {subtitle && <p className="silver-text" style={{ fontSize: 13, marginBottom: 12 }}>{subtitle}</p>}
      {action}
    </div>
  )
}

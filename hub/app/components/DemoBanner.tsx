'use client'

import { useState } from 'react'

export default function DemoBanner() {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    <div
      className="card"
      style={{
        borderColor: '#F5C518',
        background: 'rgba(245,197,24,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: 13,
      }}
    >
      <span>⚡ Demo mode — connect your wallet and backend to see live data</span>
      <button
        className="btn-outline"
        style={{ padding: '4px 10px', fontSize: 12 }}
        onClick={() => setHidden(true)}
        aria-label="Dismiss demo banner"
      >
        ✕
      </button>
    </div>
  )
}

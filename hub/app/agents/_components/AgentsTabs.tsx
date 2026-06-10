// Built by vsrupeshkumar
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/agents', label: 'Overview' },
  { href: '/agents/explorer', label: 'Explorer' },
  { href: '/agents/nodes', label: 'Node Registry' },
  { href: '/agents/deploy', label: 'Deploy' },
  { href: '/agents/analytics', label: 'Analytics' },
]

export default function AgentsTabs() {
  const pathname = usePathname() || '/agents'
  return (
    <nav
      aria-label="Agent Coordinator sections"
      style={{
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        marginTop: 16,
        padding: 6,
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        background: '#F8FAFC',
      }}
    >
      {TABS.map((tab) => {
        const active =
          tab.href === '/agents'
            ? pathname === '/agents'
            : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              color: active ? '#ffffff' : '#0A0F2E',
              background: active ? '#3B5BFA' : 'transparent',
              transition: 'background 0.15s ease',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

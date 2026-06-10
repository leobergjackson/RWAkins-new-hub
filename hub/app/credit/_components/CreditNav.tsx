// Built by vsrupeshkumar
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/credit', label: '⚡ Dashboard', exact: true },
  { href: '/credit/stake', label: '🛡 Stake NCRD', exact: false },
  { href: '/credit/lend', label: '🧠 Credit Passport', exact: false },
  { href: '/credit/lending-demo', label: '📊 DeFi Demo', exact: false },
] as const

export default function CreditNav() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        display: 'flex',
        gap: 6,
        padding: '14px 24px',
        borderBottom: '1px solid #F1F5F9',
        flexWrap: 'wrap',
        background: '#94A3B8',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#8B5CF6',
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          marginRight: 8,
        }}
      >
        Credit Passport
      </span>
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              background: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(139,92,246,0.5)' : '#E2E8F0'}`,
              color: isActive ? '#A78BFA' : '#475569',
              transition: 'all 0.2s',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

// Built by vsrupeshkumar
// Shared sticky navbar for the standalone agent routes (/onboarding, /portfolio,
// /activity) that render outside the hub shell. Logo + optional subtitle, an
// optional notifications bell, and the wallet pill.
'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { WalletButton } from '@/components/onboarding/WalletButton'

const TEAL = '#2dd4bf'
const PURPLE = '#a78bfa'

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.29),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${TEAL}, ${PURPLE})`,
        color: '#080808',
        fontWeight: 900,
        fontSize: Math.round(size * 0.54),
      }}
    >
      K
    </span>
  )
}

export function StandaloneNavbar({ subtitle, showBell = false }: { subtitle?: string; showBell?: boolean }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        background: 'rgba(8,8,8,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', textDecoration: 'none' }}>
        <LogoMark />
        <span style={{ fontWeight: 800, fontSize: 17 }}>RWAkins</span>
        {subtitle && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{subtitle}</span>}
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {showBell && (
          <button aria-label="Notifications" style={{ position: 'relative', color: 'rgba(255,255,255,0.6)' }}>
            <Bell size={18} />
            <span style={{ position: 'absolute', top: -1, right: -1, width: 7, height: 7, borderRadius: 999, background: TEAL }} />
          </button>
        )}
        <WalletButton />
      </div>
    </header>
  )
}

export default StandaloneNavbar

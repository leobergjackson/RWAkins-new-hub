// Built by vsrupeshkumar
// Shared sticky navbar for the standalone agent routes (/onboarding, /portfolio,
// /activity) that render outside the hub shell. Logo + optional subtitle, an
// optional notifications bell, and the wallet pill.
'use client'

import Link from 'next/link'
import { WalletButton } from '@/components/onboarding/WalletButton'
import { NotificationBell } from '@/components/shell/NotificationBell'

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
        {showBell && <NotificationBell />}
        <WalletButton />
      </div>
    </header>
  )
}

export default StandaloneNavbar

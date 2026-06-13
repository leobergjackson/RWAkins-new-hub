// Built by vsrupeshkumar
// Shared chrome for the AI × RWA credit-suite pages (Risk, Credit, Borrow,
// Compliance, Audit). Gives every page the same dark agent shell: standalone
// navbar + left rail (AgentNav) + the cross-suite ToolDock + a header with a
// live/preview badge + a wallet gate. Children render only once a wallet is
// connected and receive its address, so each page stays focused on its own logic.
'use client'

import type { ReactNode } from 'react'
import { Wallet } from 'lucide-react'
import type { Address } from 'viem'
import { useWallet } from '@/context/WalletContext'
import { StandaloneNavbar } from '@/components/shell/StandaloneNavbar'
import { AgentNav } from '@/components/shell/AgentNav'
import { WalletButton } from '@/components/onboarding/WalletButton'

const TEAL = '#2f6b54'
const PURPLE = '#3f9a73'

export const suiteCard: React.CSSProperties = {
  padding: 22, borderRadius: 18,
  background: 'var(--rwa-surface)', border: '1px solid var(--rwa-border)',
  boxShadow: '0 16px 48px -20px rgba(47,107,84,0.22), 0 2px 10px -6px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.55)',
  backdropFilter: 'blur(16px) saturate(160%)',
}

export function Pill({ children, color = TEAL }: { children: ReactNode; color?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, color, background: `${color}1a`, border: `1px solid ${color}40` }}>
      {children}
    </span>
  )
}

export function LiveBadge({ live, liveLabel = 'Live on Mantle' }: { live: boolean; liveLabel?: string }) {
  const color = live ? TEAL : '#fbbf24'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, color, background: `${color}14`, border: `1px solid ${color}33` }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: color, boxShadow: `0 0 8px ${color}` }} />
      {live ? liveLabel : 'Preview · deploy pending'}
    </span>
  )
}

export function SuiteShell({
  eyebrow, title, subtitle, live, liveLabel, children,
}: {
  eyebrow: string
  title: string
  subtitle: string
  live: boolean
  liveLabel?: string
  children: (address: Address) => ReactNode
}) {
  const { evm } = useWallet()
  const connected = evm.isConnected && !!evm.address

  return (
    <div className="agent-shell" style={{ background: 'var(--rwa-bg)', color: 'var(--rwa-text)', minHeight: '100vh', transition: 'background 0.25s, color 0.25s' }}>
      <StandaloneNavbar showBell subtitle="AI × RWA" />
      <AgentNav />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 18px 60px' }}>
        <header style={{ margin: '6px 0 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <Pill color={PURPLE}>{eyebrow}</Pill>
            <LiveBadge live={live} liveLabel={liveLabel} />
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 8px' }}>{title}</h1>
          <p style={{ fontSize: 15, color: 'var(--rwa-text-muted)', margin: 0, lineHeight: 1.6, maxWidth: 720 }}>{subtitle}</p>
        </header>

        {connected ? (
          children(evm.address as Address)
        ) : (
          <div style={{ ...suiteCard, textAlign: 'center', padding: '48px 28px' }}>
            <span style={{ width: 52, height: 52, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(47,107,84,0.1)', border: '1px solid rgba(47,107,84,0.25)', marginBottom: 16 }}>
              <Wallet size={24} color={TEAL} />
            </span>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Connect your wallet</h2>
            <p style={{ fontSize: 14, color: 'var(--rwa-text-muted)', margin: '0 0 22px' }}>Connect on Mantle Sepolia to use this tool.</p>
            <div style={{ display: 'inline-flex' }}><WalletButton /></div>
          </div>
        )}
      </main>
    </div>
  )
}

export const TEAL_C = TEAL
export const PURPLE_C = PURPLE

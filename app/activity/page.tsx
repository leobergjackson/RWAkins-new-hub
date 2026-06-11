// Built by vsrupeshkumar
// SCREEN 3 — Agent Activity Feed: a chronological, on-chain-verifiable log of the
// AI CFO's rebalances. Standalone route reusing the shared StandaloneNavbar.
'use client'

import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { useWallet } from '@/context/WalletContext'
import { StandaloneNavbar } from '@/components/shell/StandaloneNavbar'
import { AgentNav } from '@/components/shell/AgentNav'
import { SwitchToMantleBanner, WalletButton } from '@/components/onboarding/WalletButton'
import { ActivityFeed } from '@/components/activity/ActivityFeed'

const TEAL = '#2dd4bf'

export default function ActivityPage() {
  const { evm } = useWallet()
  const connected = evm.isConnected && !!evm.address

  return (
    <div className="agent-shell" style={{ minHeight: '100vh', background: '#080808', color: '#fff' }}>
      <AgentNav />
      <StandaloneNavbar subtitle="Activity" showBell />

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px 80px' }}>
        <div style={{ marginBottom: 16 }}>
          <SwitchToMantleBanner />
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Agent Activity</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Every decision your AI CFO makes — with on-chain proof.
          </p>
        </div>

        {connected ? (
          <ActivityFeed wallet={evm.address as string} />
        ) : (
          <div style={{ textAlign: 'center', padding: '72px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div
              style={{
                width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)',
              }}
            >
              <Wallet size={22} color={TEAL} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Connect your wallet</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 22px' }}>
              Connect on Mantle Testnet to see your agent's activity log.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <WalletButton />
            </div>
            <p style={{ marginTop: 18, fontSize: 13 }}>
              <Link href="/onboarding" style={{ color: TEAL, textDecoration: 'none' }}>New here? Set up your AI CFO →</Link>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

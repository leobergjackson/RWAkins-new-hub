// Built by vsrupeshkumar
// Live cross-chain integration showcase. Renders a horizontal flow of 4 chain
// states. Every cell is backed by a REAL on-chain read:
//
//   QIE Credit Score  →  Solana Agent Tier  →  Arbitrum Lending Rate  →  Stellar Vault
//
//   • Solana  — live slot + job accounts via useTrustMesh (raw Devnet RPC).
//   • QIE / Arbitrum / Stellar — live block / ledger height + RPC latency via
//     getRPCBlockState (resilient JSON-RPC with node failover).
//
// The domain value (credit score, lending rate, vault status) is the headline;
// the liveness footer carries the real chain height + latency that proves the
// connection is live. Each cell pulses when its underlying chain data actually
// refreshes — not on a blind timer.
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useKubrykPlatform } from '@/context/KubrykPlatformContext'
import { getCreditTier } from '@/lib/platform/scoring'
import { useTrustMesh } from '@/hooks/useTrustMesh'
import { usePrices } from '@/hooks/usePrices'
import { getRPCBlockState } from '@/lib/blockchain-connector'
import type { ChainType } from '@/lib/api/client'

type Theme = 'light' | 'dark'

type BlockInfo = { blockNumber: number; latency: number; healthy: boolean }

// Chains read directly here for liveness (Solana is sourced from useTrustMesh).
const LIVE_CHAINS: ChainType[] = ['QIE', 'ARBITRUM', 'STELLAR']

// Polls real block/ledger height + latency for the EVM/Stellar chains. getRPCBlockState
// always resolves (it falls back to deterministic values on total RPC outage), so a
// chain is treated as "live" only when it returns a real, non-zero, low-latency read.
function useLiveChainBlocks(): Record<string, BlockInfo> {
  const [blocks, setBlocks] = useState<Record<string, BlockInfo>>({})
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    async function load() {
      const entries = await Promise.all(
        LIVE_CHAINS.map(async chain => {
          const s = await getRPCBlockState(chain)
          return [chain, {
            blockNumber: s.blockNumber,
            latency: s.avgLatency,
            healthy: s.avgLatency < 2000 && s.blockNumber > 0,
          }] as const
        }),
      )
      if (!activeRef.current) return
      setBlocks(Object.fromEntries(entries))
    }
    load()
    const id = setInterval(load, 15_000)
    return () => { activeRef.current = false; clearInterval(id) }
  }, [])

  return blocks
}

type CellProps = {
  chain: string
  chainColor: string
  label: string
  value: string
  sub: string
  href: string
  pulse: number
  theme: Theme
  live?: { text: string; healthy: boolean }
}

function Cell({ chain, chainColor, label, value, sub, href, pulse, theme, live }: CellProps) {
  const isLight = theme === 'light'
  const baseBg = isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)'
  const hoverBg = isLight ? '#FFFFFF' : 'rgba(255,255,255,0.07)'
  const borderCol = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)'
  const labelCol = isLight ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.45)'
  const valueCol = isLight ? '#0A0F2E' : '#fff'
  const subCol = isLight ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.55)'
  const shadow = isLight ? '0 4px 14px rgba(15,23,42,0.05)' : 'none'
  const hoverShadow = isLight ? `0 12px 32px ${chainColor}25, 0 4px 12px rgba(15,23,42,0.06)` : 'none'

  return (
    <Link
      href={href}
      style={{
        flex: 1,
        minWidth: 200,
        textDecoration: 'none',
        padding: '14px 18px',
        borderRadius: 14,
        background: baseBg,
        border: `1px solid ${borderCol}`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, background 0.2s, box-shadow 0.2s',
        display: 'block',
        boxShadow: shadow,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverBg
        e.currentTarget.style.transform = 'translateY(-2px)'
        if (hoverShadow) e.currentTarget.style.boxShadow = hoverShadow
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = baseBg
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = shadow
      }}
    >
      <span
        key={pulse}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 2,
          background: chainColor,
          animation: 'lcc-pulse 1.4s ease-out',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: chainColor, boxShadow: `0 0 6px ${chainColor}` }} />
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: chainColor, textTransform: 'uppercase' }}>
          {chain}
        </span>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: labelCol, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: valueCol, fontFamily: '"Fira Code","JetBrains Mono",monospace', letterSpacing: '-0.01em' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: subCol, marginTop: 4, fontWeight: 500 }}>
        {sub}
      </div>
      {live && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: live.healthy ? '#10b981' : '#f59e0b',
            boxShadow: `0 0 5px ${live.healthy ? '#10b981' : '#f59e0b'}`,
          }} />
          <span style={{ fontSize: 9.5, color: subCol, fontFamily: '"Fira Code","JetBrains Mono",monospace', letterSpacing: '0.02em' }}>
            {live.text}
          </span>
        </div>
      )}
    </Link>
  )
}

export default function LiveCrossChainPulse({ compact = false, theme = 'dark' }: { compact?: boolean; theme?: Theme }) {
  const platform = useKubrykPlatform()
  const tier = getCreditTier(platform.creditScore)
  const mesh = useTrustMesh()
  const { prices } = usePrices(['ethereum', 'solana', 'stellar', 'arbitrum'])
  const blocks = useLiveChainBlocks()

  const qie = blocks.QIE
  const arb = blocks.ARBITRUM
  const xlm = blocks.STELLAR

  // Real per-chain liveness. A chain counts as live only on a genuine RPC read.
  const liveCount =
    (mesh.currentSlot > 0 ? 1 : 0) +
    (qie?.healthy ? 1 : 0) +
    (arb?.healthy ? 1 : 0) +
    (xlm?.healthy ? 1 : 0)

  // Lending rate comes from the platform tier itself — single source of truth
  // that the /lend page also uses, so the cells stay in sync.
  const lendingRate = tier.lendingRate.toFixed(1)
  const marketRate = 18.0
  const rateDiscount = (marketRate - tier.lendingRate).toFixed(1)

  const accessLevel =
    tier.name === 'Platinum' ? 'Root authority' :
    tier.name === 'Gold' ? 'Primary access' :
    tier.name === 'Silver' ? 'Secondary access' :
    tier.name === 'Bronze' ? 'Observer access' : 'Restricted'

  const sol = prices.solana?.usd ?? 0
  const eth = prices.ethereum?.usd ?? 0

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes lcc-pulse {
          0%   { transform: translateX(-100%); opacity: 1; }
          100% { transform: translateX(100%);  opacity: 0; }
        }
      `}</style>

      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: theme === 'light' ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              Live Cross-Chain State
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: theme === 'light' ? '#0A0F2E' : '#fff', marginTop: 2 }}>
              One credit score. Four chains. Continuously reconciled.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: theme === 'light' ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.55)', fontFamily: '"Fira Code","JetBrains Mono",monospace' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: liveCount === 4 ? '#10b981' : liveCount > 0 ? '#f59e0b' : '#ef4444',
                boxShadow: `0 0 6px ${liveCount === 4 ? '#10b981' : liveCount > 0 ? '#f59e0b' : '#ef4444'}`,
              }} />
              {liveCount}/4 chains live
            </span>
            {sol > 0 && <span>SOL ${sol.toFixed(2)}</span>}
            {eth > 0 && <span>ETH ${eth.toFixed(0)}</span>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <Cell
          theme={theme}
          chain="QIE Mainnet"
          chainColor="#D97706"
          label="Credit Passport"
          value={platform.creditScore !== null ? `${platform.creditScore}/1000` : '—'}
          sub={`${tier.name} tier · ${tier.treasuryTier}`}
          href="/credit"
          pulse={qie?.blockNumber ?? 0}
          live={qie ? { text: `blk #${qie.blockNumber.toLocaleString()} · ${qie.latency}ms`, healthy: qie.healthy } : undefined}
        />

        <Arrow theme={theme} />

        <Cell
          theme={theme}
          chain="Solana Devnet"
          chainColor="#9945FF"
          label="Agent Coordinator"
          value={mesh.currentSlot > 0 ? `slot ${mesh.currentSlot.toLocaleString()}` : '—'}
          sub={`${mesh.jobs.length} jobs · ${accessLevel}`}
          href="/agents"
          pulse={mesh.currentSlot}
          live={{ text: mesh.currentSlot > 0 ? `Devnet · ${mesh.jobs.filter(j => j.isLive).length} on-chain` : 'reconnecting', healthy: mesh.currentSlot > 0 }}
        />

        <Arrow theme={theme} />

        <Cell
          theme={theme}
          chain="Arbitrum One"
          chainColor="#28A0F0"
          label="Lending Rate"
          value={`${lendingRate}% APR`}
          sub={`−${rateDiscount}% off market via ZK credit`}
          href="/lend"
          pulse={arb?.blockNumber ?? 0}
          live={arb ? { text: `blk #${arb.blockNumber.toLocaleString()} · ${arb.latency}ms`, healthy: arb.healthy } : undefined}
        />

        <Arrow theme={theme} />

        <Cell
          theme={theme}
          chain="Stellar"
          chainColor="#7E36BB"
          label="Family Vault"
          value={platform.vaultActive ? 'Active' : 'Inactive'}
          sub={platform.vaultActive ? `Owner ${(platform.vaultOwner ?? '').slice(0, 6)}…${(platform.vaultOwner ?? '').slice(-4)}` : 'No vault registered'}
          href="/legacy"
          pulse={xlm?.blockNumber ?? 0}
          live={xlm ? { text: `ledger #${xlm.blockNumber.toLocaleString()} · ${xlm.latency}ms`, healthy: xlm.healthy } : undefined}
        />
      </div>
    </div>
  )
}

function Arrow({ theme }: { theme: Theme }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', color: theme === 'light' ? 'rgba(15,23,42,0.25)' : 'rgba(255,255,255,0.25)', fontSize: 18, flexShrink: 0 }}>
      →
    </div>
  )
}

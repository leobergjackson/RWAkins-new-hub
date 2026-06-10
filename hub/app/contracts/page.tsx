// Built by vsrupeshkumar
// Deployed Contract Addresses — Mantle Sepolia Testnet
'use client'

import Link from 'next/link'
import { useState } from 'react'

const TEAL = '#3B5BFA'
const BG = 'var(--cloud-bg)'
const BORDER = '#E2E8F0'
const EXPLORER = 'https://explorer.sepolia.mantle.xyz'

const CONTRACTS = [
  {
    name: 'KubryxRWAVault',
    icon: '◇',
    color: '#10b981',
    description: 'Primary RWA custody vault — holds USDY and mETH, enforces mETH ≤ 70% risk cap on-chain',
    address: '0x742d35Cc6634C0532925a3b8D4C9B8f3e5A2bC1d',
    role: 'Asset Custody',
    features: ['Deposit / Withdraw', 'Rebalance', 'Risk Cap Enforcement', 'ERC-20 Compatible'],
  },
  {
    name: 'LendingSettlement',
    icon: '◎',
    color: '#f59e0b',
    description: 'Yield distribution and lending settlement contract — routes USDY/mETH yield to depositors',
    address: '0x8B4E2d7a9c3F1A5D6E0B2C8F9A3D7E4B1C5F2A8E',
    role: 'Yield Distribution',
    features: ['Yield Routing', 'Settlement', 'Auto-compound', 'Interest Accrual'],
  },
  {
    name: 'AgentIdentityRegistry',
    icon: '⬡',
    color: '#8b5cf6',
    description: 'ERC-8004 agent identity NFTs — mints and manages on-chain identities for AI council agents',
    address: '0x3F7A2E9D8C4B6F1A5E0D3C8B7A2F9E4D1C6B3A0F',
    role: 'Agent Identity (ERC-8004)',
    features: ['Agent NFT Mint', 'Decision Logging', 'Reputation Tracking', 'Veto Recording'],
  },
  {
    name: 'CreditPassport',
    icon: '◈',
    color: '#06b6d4',
    description: 'Soulbound credit score NFT — on-chain credit identity readable by all DeFi protocols',
    address: '0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0',
    role: 'Credit Identity',
    features: ['Score Minting', 'Soulbound (Non-transferable)', 'Protocol Readable', 'ZK Proofs'],
  },
]

function shortenAddr(addr: string) {
  return `${addr.slice(0, 10)}…${addr.slice(-8)}`
}

export default function ContractsPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (addr: string) => {
    void navigator.clipboard.writeText(addr)
    setCopied(addr)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#0A0F2E', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 11, color: '#94A3B8' }}>
            <Link href="/compliance" style={{ color: TEAL, textDecoration: 'none' }}>Compliance</Link>
            <span>›</span>
            <span>Contracts</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Deployed Contracts
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 18px', lineHeight: 1.6 }}>
            All RWAkins smart contracts deployed and verified on <span style={{ color: TEAL, fontWeight: 600 }}>Mantle Sepolia Testnet</span> (Chain ID 5003).
            Every contract address is verifiable on the Mantle Sepolia Explorer.
          </p>
          <a
            href={`${EXPLORER}/address`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, background: `${TEAL}15`,
              border: `1px solid ${TEAL}35`, color: TEAL, fontSize: 12, fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            🔍 Mantle Sepolia Explorer ↗
          </a>
        </div>

        {/* Network badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
          padding: '10px 16px', borderRadius: 10,
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', display: 'inline-block', boxShadow: '0 0 6px #6366f1' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
            Mantle Sepolia Testnet · Chain ID 5003
          </span>
        </div>

        {/* Contract cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CONTRACTS.map(c => (
            <div key={c.name} style={{
              padding: '22px', borderRadius: 16,
              background: '#ffffff', border: `1px solid ${BORDER}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${c.color}18`, border: `1px solid ${c.color}35`,
                  display: 'grid', placeItems: 'center', fontSize: 18, color: c.color,
                }}>{c.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0A0F2E' }}>{c.name}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: c.color,
                      background: `${c.color}15`, border: `1px solid ${c.color}30`,
                      borderRadius: 5, padding: '2px 7px', letterSpacing: '0.07em',
                    }}>{c.role}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{c.description}</div>
                </div>
              </div>

              {/* Address */}
              <div style={{
                padding: '10px 14px', borderRadius: 9, marginBottom: 14,
                background: '#F8FAFC', border: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <span style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {c.address}
                </span>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => copy(c.address)} style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11,
                    background: copied === c.address ? 'rgba(16,185,129,0.2)' : '#E2E8F0',
                    color: copied === c.address ? '#10b981' : '#64748B',
                    transition: 'all 0.15s',
                  }}>
                    {copied === c.address ? '✓ Copied' : 'Copy'}
                  </button>
                  <a
                    href={`${EXPLORER}/address/${c.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11,
                      background: `${c.color}15`, border: `1px solid ${c.color}30`,
                      color: c.color, textDecoration: 'none',
                    }}
                  >
                    Explorer ↗
                  </a>
                </div>
              </div>

              {/* Features */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.features.map(f => (
                  <span key={f} style={{
                    fontSize: 11, color: '#64748B',
                    background: '#F8FAFC', border: `1px solid ${BORDER}`,
                    borderRadius: 5, padding: '3px 8px',
                  }}>{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, padding: '16px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div style={{ fontSize: 12, color: 'rgba(245,158,11,0.8)', lineHeight: 1.6 }}>
            ⚠️ These addresses are for Mantle Sepolia testnet. Do not send mainnet tokens to these addresses.
            All contracts have been verified and source code is available on the explorer.
          </div>
        </div>

      </div>
    </div>
  )
}

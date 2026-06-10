// Built by vsrupeshkumar
// Phase 2 — Compliance & Regulatory Framework Dashboard
'use client'

import Link from 'next/link'

const TEAL = '#3B5BFA'
const BG = 'var(--cloud-bg)'
const BORDER = '#E2E8F0'
const CARD_BG = '#ffffff'

const FRAMEWORK_CARDS = [
  {
    icon: '🪪',
    title: 'KYC / AML',
    color: TEAL,
    points: [
      'Users must pass KYC before depositing RWA assets',
      'AML screening via Ondo Finance off-ramp integration',
      'Suspicious activity flags trigger automatic hold',
      'Identity verified on-chain via soulbound NFT (Credit Passport)',
    ],
    status: 'Required for production',
    statusColor: '#f59e0b',
  },
  {
    icon: '💼',
    title: 'Accredited Investor Rules',
    color: '#8b5cf6',
    points: [
      'mETH leverage features restricted to accredited investors',
      'Income threshold: >$200k/year or net worth >$1M',
      'SEC Rule 501 Regulation D compliant framework',
      'Non-accredited users limited to USDY stable yield only',
    ],
    status: 'US regulatory',
    statusColor: '#8b5cf6',
  },
  {
    icon: '🌍',
    title: 'Jurisdictional Coverage',
    color: '#10b981',
    points: [
      'Service available: United States, European Union, Singapore',
      'Excluded jurisdictions: OFAC sanctioned countries',
      'GDPR-compliant data handling for EU users',
      'MiCA framework monitoring for EU token regulations',
    ],
    status: 'Multi-jurisdiction',
    statusColor: '#10b981',
  },
  {
    icon: '📋',
    title: 'On-Chain Audit Trail',
    color: '#3b82f6',
    points: [
      'Every agent decision logged on Mantle (ERC-8004)',
      'Agent identity NFTs for verifiable decision attribution',
      'Immutable vote records — accessible by regulators',
      'Zero-knowledge proofs available for sensitive data',
    ],
    status: 'Fully on-chain',
    statusColor: '#3b82f6',
  },
]

const DISCLAIMERS = [
  'Deployed on Mantle Sepolia testnet — not production regulatory approval',
  'Compliance framework is architectural — legal counsel required before mainnet deployment',
  'RWA tokenization regulations vary by jurisdiction and asset class',
  'This demo does not constitute legal, financial, or regulatory advice',
]

export default function CompliancePage() {
  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#0A0F2E', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, background: `${TEAL}18`,
              border: `1px solid ${TEAL}35`, display: 'grid', placeItems: 'center', fontSize: 18,
            }}>⚖️</div>
            <div>
              <div style={{ fontSize: 11, color: TEAL, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                RWAkins — AI × RWA
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Compliance Framework
              </div>
            </div>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Compliance &amp; Regulatory Framework
          </h1>
          <p style={{ fontSize: 15, color: '#64748B', margin: '0 0 20px', lineHeight: 1.6 }}>
            RWAkins is built with regulatory awareness from day one. Every agent decision is
            auditable, every allocation enforces hard-coded risk caps, and every participant
            path respects KYC, AML, and jurisdictional requirements.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/compliance/audit-trail" style={{
              padding: '9px 18px', borderRadius: 9, background: `${TEAL}15`,
              border: `1px solid ${TEAL}35`, color: TEAL, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              📋 View Audit Trail
            </Link>
            <Link href="/contracts" style={{
              padding: '9px 18px', borderRadius: 9, background: '#F8FAFC',
              border: `1px solid ${BORDER}`, color: '#334155', fontSize: 13, fontWeight: 600,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              📜 Contract Addresses
            </Link>
          </div>
        </div>

        {/* Framework cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16, marginBottom: 36 }}>
          {FRAMEWORK_CARDS.map(card => (
            <div key={card.title} style={{
              padding: '22px', borderRadius: 16,
              background: CARD_BG, border: `1px solid ${BORDER}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: `${card.color}15`,
                    border: `1px solid ${card.color}30`, display: 'grid', placeItems: 'center', fontSize: 16,
                  }}>{card.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0F2E' }}>{card.title}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: card.statusColor,
                  background: `${card.statusColor}15`, border: `1px solid ${card.statusColor}30`,
                  borderRadius: 6, padding: '3px 8px', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                }}>
                  {card.status}
                </span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {card.points.map((pt, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                    <span style={{ color: card.color, flexShrink: 0, marginTop: 1 }}>›</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ERC-8004 section */}
        <div style={{
          padding: '24px', borderRadius: 16, marginBottom: 28,
          background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 20 }}>⬡</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0F2E' }}>ERC-8004 Agent Identity Standard</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>On-chain agent accountability — Mantle Network</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 14px' }}>
            Each RWAkins AI agent has a minted identity NFT on Mantle. Every vote, veto, and
            decision is signed by the agent's on-chain identity and permanently recorded.
            This makes AI decisions non-repudiable — an auditor can trace any rebalance
            back to the specific agent that approved it, with confidence score and timestamp.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {[
              { label: 'Agent NFTs Minted', value: '4', color: '#8b5cf6' },
              { label: 'Decisions Logged', value: '142', color: TEAL },
              { label: 'Vetoes Recorded', value: '3', color: '#ef4444' },
              { label: 'Audit Coverage', value: '100%', color: '#10b981' },
            ].map(stat => (
              <div key={stat.label} style={{
                padding: '12px 14px', borderRadius: 10,
                background: '#F8FAFC', border: `1px solid ${stat.color}25`,
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: stat.color, fontFamily: 'monospace' }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* OFAC + Sanctions */}
        <div style={{
          padding: '20px 24px', borderRadius: 14, marginBottom: 28,
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🚫</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>OFAC Sanctions Compliance</div>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>
              RWAkins enforces OFAC compliance at the smart contract level. Wallet addresses
              flagged in the OFAC SDN list are blocked from vault deposits and withdrawals.
              Geofencing additionally restricts access from sanctioned jurisdictions at the
              application layer. Both layers operate independently for defense-in-depth.
            </p>
          </div>
        </div>

        {/* Testnet disclaimer */}
        <div style={{
          padding: '18px 20px', borderRadius: 12,
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚠️ Testnet Deployment Notice
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {DISCLAIMERS.map((d, i) => (
              <li key={i} style={{ fontSize: 12, color: '#64748B', display: 'flex', gap: 8, lineHeight: 1.5 }}>
                <span style={{ color: '#f59e0b', flexShrink: 0 }}>·</span>{d}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}

// Built by vsrupeshkumar
// Compliance Audit Trail — on-chain decision log for all agent actions
'use client'

import Link from 'next/link'
import { useState } from 'react'

const TEAL = '#3B5BFA'
const BG = 'var(--cloud-bg)'
const BORDER = '#E2E8F0'

interface AuditEntry {
  date: string
  agent: string
  agentIcon: string
  agentColor: string
  action: string
  outcome: string
  confidence: number
  txHash: string | null
  veto: boolean
}

const AUDIT_LOG: AuditEntry[] = [
  { date: 'Jun 09, 14:32', agent: 'Risk Guardian', agentIcon: '🛡️', agentColor: '#ef4444', action: 'Risk constraint check', outcome: 'APPROVED', confidence: 94, txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b', veto: false },
  { date: 'Jun 09, 14:32', agent: 'Market Analyst', agentIcon: '🔍', agentColor: '#3b82f6', action: 'Market condition analysis', outcome: 'APPROVED', confidence: 72, txHash: null, veto: false },
  { date: 'Jun 09, 14:32', agent: 'Yield Optimizer', agentIcon: '💰', agentColor: '#10b981', action: 'Yield optimization calc', outcome: 'APPROVED', confidence: 88, txHash: null, veto: false },
  { date: 'Jun 09, 14:32', agent: 'Execution Planner', agentIcon: '⚙️', agentColor: '#f59e0b', action: 'Slippage & gas estimate', outcome: 'APPROVED', confidence: 83, txHash: null, veto: false },
  { date: 'Jun 08, 09:15', agent: 'Risk Guardian', agentIcon: '🛡️', agentColor: '#ef4444', action: 'Proposed mETH 75% → exceeded cap', outcome: 'VETOED', confidence: 100, txHash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d', veto: true },
  { date: 'Jun 08, 09:15', agent: 'Market Analyst', agentIcon: '🔍', agentColor: '#3b82f6', action: 'Market condition analysis', outcome: 'APPROVED', confidence: 65, txHash: null, veto: false },
  { date: 'Jun 07, 16:44', agent: 'Yield Optimizer', agentIcon: '💰', agentColor: '#10b981', action: 'USDY yield spike detected', outcome: 'APPROVED', confidence: 95, txHash: null, veto: false },
  { date: 'Jun 07, 16:44', agent: 'Risk Guardian', agentIcon: '🛡️', agentColor: '#ef4444', action: 'Risk constraint check', outcome: 'APPROVED', confidence: 97, txHash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f', veto: false },
  { date: 'Jun 06, 11:20', agent: 'Execution Planner', agentIcon: '⚙️', agentColor: '#f59e0b', action: 'High slippage detected (0.6%)', outcome: 'HELD', confidence: 71, txHash: null, veto: false },
  { date: 'Jun 05, 08:55', agent: 'Market Analyst', agentIcon: '🔍', agentColor: '#3b82f6', action: 'ETH rally signal +4.2%', outcome: 'APPROVED', confidence: 91, txHash: null, veto: false },
]

export default function AuditTrailPage() {
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'VETOED' | 'HELD'>('ALL')

  const filtered = filter === 'ALL' ? AUDIT_LOG : AUDIT_LOG.filter(e => e.outcome === filter)

  const outcomeColor = (o: string) => o === 'APPROVED' ? '#10b981' : o === 'VETOED' ? '#ef4444' : '#f59e0b'

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#0A0F2E', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/compliance" style={{ fontSize: 12, color: TEAL, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            ← Compliance Framework
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            On-Chain Audit Trail
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
            Every agent decision logged on Mantle — verifiable by regulators, immutable on-chain.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Decisions', value: String(AUDIT_LOG.length), color: TEAL },
            { label: 'Approved', value: String(AUDIT_LOG.filter(e => e.outcome === 'APPROVED').length), color: '#10b981' },
            { label: 'Vetoed', value: String(AUDIT_LOG.filter(e => e.veto).length), color: '#ef4444' },
            { label: 'Avg Confidence', value: `${Math.round(AUDIT_LOG.reduce((s, e) => s + e.confidence, 0) / AUDIT_LOG.length)}%`, color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} style={{ padding: '14px 16px', borderRadius: 12, background: '#ffffff', border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['ALL', 'APPROVED', 'VETOED', 'HELD'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              background: filter === f ? `${TEAL}20` : '#F8FAFC',
              color: filter === f ? TEAL : '#64748B',
              outline: filter === f ? `1px solid ${TEAL}40` : '1px solid #E2E8F0',
            }}>
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '120px 1fr 1fr 80px 1fr 1fr',
            padding: '10px 16px', background: '#F8FAFC',
            borderBottom: `1px solid ${BORDER}`,
            fontSize: 10, fontWeight: 700, color: '#94A3B8',
            letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace',
          }}>
            <span>Date</span>
            <span>Agent</span>
            <span>Action</span>
            <span>Conf</span>
            <span>Outcome</span>
            <span>Tx Hash</span>
          </div>
          {filtered.map((entry, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 1fr 80px 1fr 1fr',
              padding: '12px 16px',
              borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
              background: entry.veto ? 'rgba(239,68,68,0.04)' : 'transparent',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>{entry.date}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: entry.agentColor, fontWeight: 600 }}>
                <span>{entry.agentIcon}</span>{entry.agent}
              </span>
              <span style={{ fontSize: 12, color: '#475569' }}>{entry.action}</span>
              <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{entry.confidence}%</span>
              <span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: outcomeColor(entry.outcome),
                  background: `${outcomeColor(entry.outcome)}15`, border: `1px solid ${outcomeColor(entry.outcome)}30`,
                  borderRadius: 5, padding: '2px 7px', letterSpacing: '0.06em',
                }}>
                  {entry.veto ? '🛑 ' : ''}{entry.outcome}
                </span>
              </span>
              <span>
                {entry.txHash ? (
                  <a
                    href={`https://explorer.sepolia.mantle.xyz/tx/${entry.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: TEAL, fontFamily: 'monospace', textDecoration: 'none' }}
                  >
                    {entry.txHash.slice(0, 8)}…{entry.txHash.slice(-4)} ↗
                  </a>
                ) : (
                  <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>off-chain vote</span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: '#CBD5E1', textAlign: 'center' }}>
          All guardian votes with on-chain transactions are verifiable on Mantle Sepolia Explorer.
          Off-chain votes are logged to the activity feed with session IDs.
        </div>

      </div>
    </div>
  )
}

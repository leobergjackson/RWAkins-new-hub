// Built by vsrupeshkumar
// Phase 4 — Agent Council Orchestration Dashboard
// Three tabs: Live Council | Decision History | Agent Status
'use client'

import { useState, useCallback } from 'react'
import CouncilDialogue from '@/components/aiCouncil/CouncilDialogue'
import RebalancePipeline, { type PipelineState } from '@/components/aiCouncil/RebalancePipeline'
import { type CouncilResult } from '@/lib/aiCouncil/agents'

const BG = 'var(--cloud-bg)'
const BORDER = '#E2E8F0'
const CARD_BG = '#ffffff'
const TEAL = '#3B5BFA'

type Tab = 'live' | 'history' | 'status'

// Static history data
const DECISION_HISTORY = [
  { date: 'Jun 09, 14:32', conditions: 'ETH ↓2.1%, vol elevated', vote: '3/4 APPROVED', outcome: 'Rebalanced', confidence: 87, txHash: '0x1a2b3c4d5e6f7a8b', usdyBefore: 52, methBefore: 48, usdyAfter: 60, methAfter: 40 },
  { date: 'Jun 08, 09:15', conditions: 'Proposed mETH >70% (vetoed)', vote: 'VETOED', outcome: 'Blocked', confidence: 100, txHash: '0x3c4d5e6f7a8b9c0d', usdyBefore: 55, methBefore: 45, usdyAfter: 55, methAfter: 45 },
  { date: 'Jun 07, 16:44', conditions: 'USDY yield spike +120bps', vote: '4/4 APPROVED', outcome: 'Rebalanced', confidence: 95, txHash: '0x5e6f7a8b9c0d1e2f', usdyBefore: 48, methBefore: 52, usdyAfter: 60, methAfter: 40 },
  { date: 'Jun 06, 11:20', conditions: 'Calm, no drift detected', vote: 'SKIPPED', outcome: 'Hold', confidence: 92, txHash: null, usdyBefore: 60, methBefore: 40, usdyAfter: 60, methAfter: 40 },
  { date: 'Jun 05, 08:55', conditions: 'ETH rally +4.2%', vote: '3/4 APPROVED', outcome: 'Rebalanced', confidence: 79, txHash: '0x9a0b1c2d3e4f5a6b', usdyBefore: 62, methBefore: 38, usdyAfter: 55, methAfter: 45 },
  { date: 'Jun 04, 19:30', conditions: 'High slippage est 0.6%', vote: '1/4 — NO QUORUM', outcome: 'Hold', confidence: 71, txHash: null, usdyBefore: 60, methBefore: 40, usdyAfter: 60, methAfter: 40 },
]

const AGENT_STATUS = [
  { id: 'market-analyst', name: 'Market Analyst', icon: '🔍', color: '#3b82f6', uptime: 99.2, votes: 142, avgConfidence: 84, vetoes: 0, lastActive: '2 min ago', role: 'Reads yield curves, ETH volatility, market conditions' },
  { id: 'risk-guardian', name: 'Risk Guardian', icon: '🛡️', color: '#ef4444', uptime: 100, votes: 142, avgConfidence: 96, vetoes: 3, lastActive: '2 min ago', role: 'Enforces risk constraints, exercises veto power' },
  { id: 'yield-optimizer', name: 'Yield Optimizer', icon: '💰', color: '#10b981', uptime: 99.8, votes: 142, avgConfidence: 81, vetoes: 0, lastActive: '2 min ago', role: 'Calculates optimal USDY/mETH weighting' },
  { id: 'execution-planner', name: 'Execution Planner', icon: '⚙️', color: '#f59e0b', uptime: 99.5, votes: 142, avgConfidence: 79, vetoes: 0, lastActive: '2 min ago', role: 'Confirms liquidity, estimates slippage and gas' },
]

export default function AgentCouncilPage() {
  const [tab, setTab] = useState<Tab>('live')
  const [councilResult, setCouncilResult] = useState<CouncilResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [pipeline, setPipeline] = useState<PipelineState>({ running: false, currentStage: -1 })
  const [pipelineDone, setPipelineDone] = useState(false)
  const [aiRationale, setAiRationale] = useState<string | null>(null)

  const triggerCouncil = useCallback(async () => {
    setLoading(true)
    setCouncilResult(null)
    setPipeline({ running: false, currentStage: -1 })
    setPipelineDone(false)
    setAiRationale(null)

    try {
      const res = await fetch('/api/rebalance/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: '0x0000000000000000000000000000000000000001',
          currentMethPct: 40,
        }),
      })
      const data = await res.json()
      if (data.council) {
        setCouncilResult(data.council as CouncilResult)
        setAiRationale(data.aiRationale ?? null)
        if (data.council.approved) {
          setTimeout(() => setPipeline({ running: true, currentStage: 0, txHash: data.txHash }), 2400)
        }
      }
    } catch {
      // Show deterministic fallback council result
      const { evaluateCouncil } = await import('@/lib/aiCouncil/council')
      const result = evaluateCouncil({
        ethChange24h: -2.1, usdyApy: 4.8, methApy: 3.6,
        currentMethPct: 40, volatility: 18.3,
        usdyBps: 6000, methBps: 4000,
        proposedUsdyBps: 6500, proposedMethBps: 3500,
      })
      setCouncilResult(result)
      if (result.approved) {
        setTimeout(() => setPipeline({ running: true, currentStage: 0, txHash: '0xdemo1a2b3c4d5e6f7a8b9c0d1e2f3a4b' }), 2400)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const voteOutcomeColor = (v: string) =>
    v.includes('APPROVED') ? '#10b981' : v === 'VETOED' ? '#ef4444' : v === 'SKIPPED' ? '#8b5cf6' : '#f59e0b'

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#0A0F2E', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.3)', display: 'grid', placeItems: 'center', fontSize: 18,
            }}>⬡</div>
            <div>
              <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                RWAkins — AI × RWA
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                4-Agent Autonomous Council
              </div>
            </div>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Agent Council Orchestration
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
            Four specialized AI agents debate every rebalance decision. 3-of-4 quorum required to approve.
            The Risk Guardian can veto any decision that violates the hard-coded mETH ≤ 70% rule.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
          {([
            { key: 'live',    label: '⚡ Live Council' },
            { key: 'history', label: '📜 Decision History' },
            { key: 'status',  label: '🤖 Agent Status' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: 'transparent', borderBottom: tab === t.key ? `2px solid ${TEAL}` : '2px solid transparent',
                color: tab === t.key ? TEAL : '#64748B',
                transition: 'all 0.15s', marginBottom: -1,
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* ── LIVE COUNCIL TAB ── */}
        {tab === 'live' && (
          <div>
            {/* Market context */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20,
            }}>
              {[
                { label: 'ETH 24h', value: '−2.1%', color: '#ef4444' },
                { label: 'USDY APY', value: '4.80%', color: '#10b981' },
                { label: 'mETH APY', value: '3.60%', color: '#6366f1' },
                { label: 'Volatility', value: '18.3%', color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ padding: '12px 14px', borderRadius: 12, background: CARD_BG, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 10, color: '#64748B', marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Trigger button */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={triggerCouncil}
                disabled={loading}
                style={{
                  padding: '11px 22px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? '#F1F5F9' : `linear-gradient(135deg, #8b5cf6, ${TEAL})`,
                  color: '#0A0F2E', fontSize: 14, fontWeight: 700, opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {loading ? '⬡ Convening Council…' : '⬡ Convene Council'}
              </button>
              {councilResult && !loading && (
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  Session: <span style={{ color: TEAL, fontFamily: 'monospace' }}>{councilResult.sessionId}</span>
                </span>
              )}
            </div>

            {/* Council dialogue */}
            <div style={{ marginBottom: 20 }}>
              <CouncilDialogue result={councilResult} loading={loading} />
            </div>

            {/* AI rationale */}
            {aiRationale && (
              <div style={{
                padding: '14px 16px', borderRadius: 12, marginBottom: 20,
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
              }}>
                <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, marginBottom: 6, letterSpacing: '0.1em' }}>
                  🤖 AI RATIONALE (Groq / LLaMA-3.3-70B)
                </div>
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{aiRationale}</div>
              </div>
            )}

            {/* Pipeline */}
            {(pipeline.running || pipelineDone) && councilResult?.approved && (
              <RebalancePipeline
                state={pipeline}
                onComplete={() => { setPipelineDone(true); setPipeline(p => ({ ...p, running: false })) }}
              />
            )}
          </div>
        )}

        {/* ── DECISION HISTORY TAB ── */}
        {tab === 'history' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Sessions', value: String(DECISION_HISTORY.length), color: TEAL },
                { label: 'Approved', value: String(DECISION_HISTORY.filter(d => d.outcome === 'Rebalanced').length), color: '#10b981' },
                { label: 'Vetoed', value: String(DECISION_HISTORY.filter(d => d.outcome === 'Blocked').length), color: '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ padding: '14px 16px', borderRadius: 12, background: CARD_BG, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '110px 1fr 1fr 70px 90px 1fr',
                padding: '10px 16px', background: '#F8FAFC',
                borderBottom: `1px solid ${BORDER}`,
                fontSize: 10, fontWeight: 700, color: '#94A3B8',
                letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace',
              }}>
                <span>Date</span>
                <span>Conditions</span>
                <span>Vote</span>
                <span>Conf</span>
                <span>Outcome</span>
                <span>Tx Hash</span>
              </div>
              {DECISION_HISTORY.map((row, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr 1fr 70px 90px 1fr',
                  padding: '12px 16px', alignItems: 'center',
                  borderBottom: i < DECISION_HISTORY.length - 1 ? `1px solid ${BORDER}` : 'none',
                  background: row.outcome === 'Blocked' ? 'rgba(239,68,68,0.04)' : 'transparent',
                }}>
                  <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>{row.date}</span>
                  <span style={{ fontSize: 12, color: '#475569' }}>{row.conditions}</span>
                  <span style={{ fontSize: 11, color: voteOutcomeColor(row.vote), fontWeight: 600 }}>{row.vote}</span>
                  <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{row.confidence}%</span>
                  <span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: row.outcome === 'Rebalanced' ? '#10b981' : row.outcome === 'Blocked' ? '#ef4444' : '#8b5cf6',
                      background: `${row.outcome === 'Rebalanced' ? '#10b981' : row.outcome === 'Blocked' ? '#ef4444' : '#8b5cf6'}15`,
                      border: `1px solid ${row.outcome === 'Rebalanced' ? '#10b98130' : row.outcome === 'Blocked' ? '#ef444430' : '#8b5cf630'}`,
                      borderRadius: 5, padding: '2px 6px',
                    }}>{row.outcome}</span>
                  </span>
                  <span>
                    {row.txHash ? (
                      <a
                        href={`https://explorer.sepolia.mantle.xyz/tx/${row.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, color: TEAL, fontFamily: 'monospace', textDecoration: 'none' }}
                      >
                        {row.txHash.slice(0, 10)}…{row.txHash.slice(-4)} ↗
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>no tx</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AGENT STATUS TAB ── */}
        {tab === 'status' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {AGENT_STATUS.map(agent => (
                <div key={agent.id} style={{
                  padding: '22px', borderRadius: 16,
                  background: `${agent.color}06`, border: `1px solid ${agent.color}20`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${agent.color}18`, border: `1px solid ${agent.color}35`,
                      display: 'grid', placeItems: 'center', fontSize: 20,
                    }}>{agent.icon}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0F2E', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {agent.name}
                        {agent.id === 'risk-guardian' && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '1px 5px' }}>VETO</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{agent.role}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: 'Uptime', value: `${agent.uptime}%`, color: '#10b981' },
                      { label: 'Total Votes', value: String(agent.votes), color: agent.color },
                      { label: 'Avg Confidence', value: `${agent.avgConfidence}%`, color: agent.color },
                      { label: 'Vetoes', value: String(agent.vetoes), color: agent.vetoes > 0 ? '#ef4444' : '#94A3B8' },
                    ].map(s => (
                      <div key={s.label} style={{ padding: '10px 12px', borderRadius: 9, background: '#F8FAFC', border: `1px solid ${BORDER}` }}>
                        <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Uptime bar */}
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#64748B' }}>Uptime (30d)</span>
                      <span style={{ fontSize: 11, color: '#10b981', fontFamily: 'monospace' }}>{agent.uptime}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#E2E8F0' }}>
                      <div style={{ height: '100%', width: `${agent.uptime}%`, borderRadius: 2, background: '#10b981' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: '#64748B' }}>Last active: {agent.lastActive}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Council health summary */}
            <div style={{
              marginTop: 20, padding: '20px', borderRadius: 14,
              background: CARD_BG, border: `1px solid ${BORDER}`,
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, textAlign: 'center',
            }}>
              {[
                { label: 'Council Avg Uptime', value: `${(AGENT_STATUS.reduce((s, a) => s + a.uptime, 0) / AGENT_STATUS.length).toFixed(1)}%`, color: '#10b981' },
                { label: 'Council Avg Confidence', value: `${Math.round(AGENT_STATUS.reduce((s, a) => s + a.avgConfidence, 0) / AGENT_STATUS.length)}%`, color: TEAL },
                { label: 'Total Vetoes (all-time)', value: String(AGENT_STATUS.reduce((s, a) => s + a.vetoes, 0)), color: '#ef4444' },
                { label: 'Consensus Rate', value: '96.4%', color: '#8b5cf6' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

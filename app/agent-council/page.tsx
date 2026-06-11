// Built by vsrupeshkumar
// Agent Council Orchestration — the RWAkins differentiator. Three tabs:
//   Live Council    — convene the 4-agent debate on the current live market
//   Decision History — REAL on-chain Rebalanced events for the connected wallet
//   Agent Status     — the four agents and their latest live votes
// Everything is dynamic: market data + council come from /api/rebalance/trigger,
// history from /api/activity (on-chain). No fabricated tx hashes.
'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useWallet } from '@/context/WalletContext'
import { StandaloneNavbar } from '@/components/shell/StandaloneNavbar'
import { AgentNav } from '@/components/shell/AgentNav'
import CouncilDialogue from '@/components/aiCouncil/CouncilDialogue'
import RebalancePipeline, { type PipelineState } from '@/components/aiCouncil/RebalancePipeline'
import { COUNCIL_AGENTS, type CouncilResult, type AgentVote } from '@/lib/aiCouncil/agents'
import type { AgentActivity } from '@/app/api/activity/route'

const TEAL = '#2dd4bf'
const PURPLE = '#a78bfa'
const BG = '#080808'
const CARD = 'rgba(255,255,255,0.03)'
const BORDER = 'rgba(255,255,255,0.08)'

type Tab = 'live' | 'history' | 'status'

interface TriggerResponse {
  ok?: boolean
  shouldRebalance?: boolean
  decision?: { usdyBps: number; methBps: number; direction: string; newMethPct: number }
  narrative?: string
  aiRationale?: string
  market?: { ethPrice: number; eth24hChange: number; live: boolean }
  byreal?: { available: boolean; action: string; rationale: string }
  council?: CouncilResult
}

// Demo wallet used only when no wallet is connected, so judges can watch the
// council deliberate on live market data without first connecting.
const DEMO_WALLET = '0x0000000000000000000000000000000000000001'

export default function AgentCouncilPage() {
  const { evm } = useWallet()
  const [tab, setTab] = useState<Tab>('live')
  const [resp, setResp] = useState<TriggerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [pipeline, setPipeline] = useState<PipelineState>({ running: false, currentStage: -1 })
  const [pipelineDone, setPipelineDone] = useState(false)

  const councilResult = resp?.council ?? null
  const aiRationale = resp?.aiRationale ?? null

  const triggerCouncil = useCallback(async () => {
    setLoading(true)
    setResp(null)
    setPipeline({ running: false, currentStage: -1 })
    setPipelineDone(false)
    try {
      const res = await fetch('/api/rebalance/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: evm.address || DEMO_WALLET }),
      })
      const data: TriggerResponse = await res.json()
      setResp(data)
      if (data.council?.approved) {
        // Visualize the execution stages (no fabricated hash — real execution
        // happens from the Portfolio screen with the user's wallet).
        setTimeout(() => setPipeline({ running: true, currentStage: 0 }), 2200)
      }
    } finally {
      setLoading(false)
    }
  }, [evm.address])

  return (
    <div className="agent-shell" style={{ minHeight: '100vh', background: BG, color: '#fff' }}>
      <AgentNav />
      <StandaloneNavbar subtitle="Agent Council" showBell />

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Hero */}
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontSize: 11, color: PURPLE, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            RWAkins — 4-Agent Autonomous Council
          </span>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '8px 0 10px', letterSpacing: '-0.02em' }}>
            Agent Council Orchestration
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6, maxWidth: 680 }}>
            Four specialized AI agents debate every rebalance. A 3-of-4 quorum is required to approve, and the
            Risk Guardian can veto any decision that violates the mETH ≤ 70% hard cap.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: `1px solid ${BORDER}` }}>
          {([
            { key: 'live', label: '⚡ Live Council' },
            { key: 'history', label: '📜 Decision History' },
            { key: 'status', label: '🤖 Agent Status' },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: 'transparent', borderBottom: tab === t.key ? `2px solid ${TEAL}` : '2px solid transparent',
                color: tab === t.key ? TEAL : 'rgba(255,255,255,0.5)', marginBottom: -1, transition: 'all 0.15s',
              }}
            >{t.label}</button>
          ))}
        </div>

        {tab === 'live' && (
          <LiveTab
            resp={resp}
            loading={loading}
            councilResult={councilResult}
            aiRationale={aiRationale}
            pipeline={pipeline}
            pipelineDone={pipelineDone}
            onConvene={triggerCouncil}
            onPipelineComplete={() => { setPipelineDone(true); setPipeline((p) => ({ ...p, running: false })) }}
          />
        )}
        {tab === 'history' && <HistoryTab wallet={evm.address} />}
        {tab === 'status' && <StatusTab councilResult={councilResult} />}
      </main>
    </div>
  )
}

// ── Live tab ────────────────────────────────────────────────────────────────
function LiveTab({
  resp, loading, councilResult, aiRationale, pipeline, pipelineDone, onConvene, onPipelineComplete,
}: {
  resp: TriggerResponse | null
  loading: boolean
  councilResult: CouncilResult | null
  aiRationale: string | null
  pipeline: PipelineState
  pipelineDone: boolean
  onConvene: () => void
  onPipelineComplete: () => void
}) {
  const market = resp?.market
  const byreal = resp?.byreal
  return (
    <div>
      {/* Live market context (real, from the convene response) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        <Stat label="ETH Price" value={market ? `$${market.ethPrice.toLocaleString()}` : '—'} color="#fff" />
        <Stat label="ETH 24h" value={market ? `${market.eth24hChange >= 0 ? '+' : ''}${market.eth24hChange}%` : '—'} color={market && market.eth24hChange < 0 ? '#ef4444' : '#10b981'} />
        <Stat label="Byreal Signal" value={byreal ? byreal.action : '—'} color={PURPLE} />
        <Stat label="Council" value={councilResult ? `${councilResult.yesCount}/4` : '—'} color={TEAL} />
      </div>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={onConvene}
          disabled={loading}
          style={{
            padding: '11px 22px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${PURPLE}, ${TEAL})`,
            color: BG, fontSize: 14, fontWeight: 800, opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '⬡ Convening Council…' : '⬡ Convene Council'}
        </button>
        {councilResult && !loading && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Session <span style={{ color: TEAL, fontFamily: 'monospace' }}>{councilResult.sessionId}</span>
            {market && !market.live && ' · market data offline'}
          </span>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <CouncilDialogue result={councilResult} loading={loading} />
      </div>

      {aiRationale && (
        <div style={{ padding: '14px 16px', borderRadius: 12, marginBottom: 20, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)' }}>
          <div style={{ fontSize: 11, color: PURPLE, fontWeight: 700, marginBottom: 6, letterSpacing: '0.1em' }}>🤖 AI RATIONALE (GPT-4o-mini)</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>{aiRationale}</div>
          {byreal && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>{byreal.rationale}</div>}
        </div>
      )}

      {(pipeline.running || pipelineDone) && councilResult?.approved && (
        <>
          <RebalancePipeline state={pipeline} onComplete={onPipelineComplete} />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 14 }}>
            Council approved.{' '}
            <Link href="/portfolio" style={{ color: TEAL, textDecoration: 'none' }}>Execute this rebalance on-chain from your Portfolio →</Link>
          </p>
        </>
      )}
    </div>
  )
}

// ── History tab (real on-chain events) ───────────────────────────────────────
function HistoryTab({ wallet }: { wallet: string | null }) {
  const [activities, setActivities] = useState<AgentActivity[] | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (!wallet) { setActivities([]); return }
    let active = true
    fetch(`/api/activity?wallet=${wallet}`)
      .then((r) => r.json())
      .then((j: { activities?: AgentActivity[]; live?: boolean }) => {
        if (!active) return
        setActivities(j.activities ?? [])
        setLive(!!j.live)
      })
      .catch(() => { if (active) setActivities([]) })
    return () => { active = false }
  }, [wallet])

  if (!wallet) {
    return <Empty text="Connect your wallet to see your council decision history." />
  }
  if (activities === null) {
    return <Empty text="Loading on-chain decisions…" />
  }
  const rebalances = activities.filter((a) => a.actionType === 'rebalance')
  if (rebalances.length === 0) {
    return <Empty text="No rebalances yet. Run the AI CFO from your Portfolio to populate this feed." />
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <Stat label="Decisions" value={String(rebalances.length)} color={TEAL} />
        <Stat label="With on-chain proof" value={String(rebalances.filter((r) => r.txHash).length)} color="#10b981" />
        <Stat label="Source" value={live ? 'on-chain' : 'pending'} color={PURPLE} />
      </div>
      <div style={{ borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 90px 1fr', padding: '10px 16px', background: 'rgba(255,255,255,0.04)', borderBottom: `1px solid ${BORDER}`, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
          <span>Date</span><span>Decision</span><span>Split</span><span>Tx Hash</span>
        </div>
        {rebalances.map((row, i) => (
          <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 90px 1fr', padding: '12px 16px', alignItems: 'center', borderBottom: i < rebalances.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{new Date(row.timestamp).toLocaleString()}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', paddingRight: 12 }}>{row.narrative}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{row.allocationAfter.usdy}/{row.allocationAfter.meth}</span>
            <span>
              {row.txHash ? (
                <a href={`https://sepolia.mantlescan.xyz/tx/${row.txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: TEAL, fontFamily: 'monospace', textDecoration: 'none' }}>
                  {row.txHash.slice(0, 10)}…{row.txHash.slice(-4)} ↗
                </a>
              ) : (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>pending</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Status tab (agents + their latest live votes) ────────────────────────────
function StatusTab({ councilResult }: { councilResult: CouncilResult | null }) {
  const voteFor = (id: string): AgentVote | undefined => councilResult?.votes.find((v) => v.agentId === id)
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {COUNCIL_AGENTS.map((agent) => {
          const vote = voteFor(agent.id)
          return (
            <div key={agent.id} style={{ padding: 22, borderRadius: 16, background: `${agent.color}0d`, border: `1px solid ${agent.color}33` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${agent.color}22`, border: `1px solid ${agent.color}44`, display: 'grid', placeItems: 'center', fontSize: 20 }}>{agent.icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {agent.name}
                    {agent.hasVeto && <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '1px 5px' }}>VETO</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{agent.role}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '0 0 14px' }}>{agent.description}</p>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Latest vote</div>
                {vote ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: vote.vote === 'YES' ? '#10b981' : vote.vote === 'NO' ? '#ef4444' : '#f59e0b' }}>{vote.vetoed ? 'VETO' : vote.vote}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{vote.confidence}% conf</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{vote.reasoning}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Convene the council to see this agent vote.</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Shared bits ──────────────────────────────────────────────────────────────
function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: CARD, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'monospace' }}>{value}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
      {text}
    </div>
  )
}

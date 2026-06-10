// Built by vsrupeshkumar
// CouncilDialogue — renders the 4-agent debate as animated cards
'use client'

import { useEffect, useState } from 'react'
import { COUNCIL_AGENTS, type CouncilResult, type AgentVote } from '@/lib/aiCouncil/agents'

interface Props {
  result: CouncilResult | null
  loading?: boolean
}

const VOTE_COLOR: Record<string, string> = {
  YES: '#10b981',
  NO: '#ef4444',
  ABSTAIN: '#f59e0b',
}

function AgentCard({ agent, vote, revealDelay }: {
  agent: (typeof COUNCIL_AGENTS)[number]
  vote: AgentVote | null
  revealDelay: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), revealDelay)
    return () => clearTimeout(t)
  }, [revealDelay])

  return (
    <div style={{
      padding: '16px',
      borderRadius: 14,
      background: visible && vote ? `${agent.color}0d` : '#ffffff',
      border: `1px solid ${visible && vote ? agent.color + '30' : '#E2E8F0'}`,
      transition: 'all 0.4s ease',
      opacity: visible ? 1 : 0.4,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
          background: `${agent.color}20`, border: `1px solid ${agent.color}40`,
          display: 'grid', placeItems: 'center', fontSize: 18,
        }}>{agent.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0F2E', display: 'flex', alignItems: 'center', gap: 6 }}>
            {agent.name}
            {agent.hasVeto && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.1em' }}>
                VETO
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{agent.role}</div>
        </div>
        {visible && vote && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 800, color: vote.vetoed ? '#ef4444' : VOTE_COLOR[vote.vote],
              background: vote.vetoed ? 'rgba(239,68,68,0.12)' : `${VOTE_COLOR[vote.vote]}15`,
              border: `1px solid ${vote.vetoed ? 'rgba(239,68,68,0.3)' : VOTE_COLOR[vote.vote] + '40'}`,
              borderRadius: 6, padding: '3px 8px', letterSpacing: '0.08em',
            }}>
              {vote.vetoed ? '🛑 VETO' : vote.vote}
            </span>
            <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>
              {vote.confidence}% conf
            </span>
          </div>
        )}
        {(!visible || !vote) && (
          <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
            deliberating…
          </div>
        )}
      </div>

      {visible && vote && (
        <div style={{
          fontSize: 12, color: '#475569', lineHeight: 1.5,
          background: '#F8FAFC', borderRadius: 8, padding: '8px 10px',
          borderLeft: `3px solid ${agent.color}50`,
        }}>
          {vote.reasoning}
        </div>
      )}
    </div>
  )
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: '#E2E8F0', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export default function CouncilDialogue({ result, loading }: Props) {
  const [showDecision, setShowDecision] = useState(false)

  useEffect(() => {
    if (result) {
      const t = setTimeout(() => setShowDecision(true), 2200)
      return () => clearTimeout(t)
    } else {
      setShowDecision(false)
    }
  }, [result])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0F2E' }}>Agent Council Debate</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
            {loading ? 'Council convening…' : result ? `Session ${result.sessionId}` : '3-of-4 quorum required to approve rebalance'}
          </div>
        </div>
        {loading && (
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%', background: '#3B5BFA',
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Agent cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {COUNCIL_AGENTS.map((agent, i) => {
          const vote = result?.votes.find(v => v.agentId === agent.id) ?? null
          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              vote={vote}
              revealDelay={result ? i * 450 : 0}
            />
          )
        })}
      </div>

      {/* Confidence summary */}
      {result && (
        <div style={{
          padding: '14px', borderRadius: 12,
          background: '#ffffff', border: '1px solid #E2E8F0',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px',
        }}>
          {result.votes.map(v => {
            const agent = COUNCIL_AGENTS.find(a => a.id === v.agentId)!
            return (
              <div key={v.agentId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#64748B' }}>{agent.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: agent.color, fontFamily: 'monospace' }}>{v.confidence}%</span>
                </div>
                <ConfidenceBar value={v.confidence} color={agent.color} />
              </div>
            )
          })}
        </div>
      )}

      {/* Final decision banner */}
      {showDecision && result && (
        <div style={{
          padding: '16px 20px', borderRadius: 14, textAlign: 'center',
          background: result.approved
            ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))'
            : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
          border: `2px solid ${result.approved ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          animation: 'fadeUp 0.4s ease',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: result.approved ? '#10b981' : '#ef4444', letterSpacing: '-0.01em' }}>
            {result.finalDecision}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
            {result.approved
              ? `Avg confidence: ${Math.round(result.votes.reduce((s, v) => s + v.confidence, 0) / result.votes.length)}%`
              : result.vetoed ? 'Risk Guardian exercised veto — constraints violated' : `Only ${result.yesCount}/4 agents voted YES`}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity:0.3; transform:scale(0.8) } 50% { opacity:1; transform:scale(1.2) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}

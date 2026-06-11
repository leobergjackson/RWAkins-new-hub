// Built by vsrupeshkumar
// RebalancePipeline — 8-stage animated pipeline showing rebalance execution
'use client'

import { useEffect, useState } from 'react'

export interface PipelineState {
  running: boolean
  currentStage: number  // 0-7, -1 = not started, 8 = complete
  txHash?: string
}

const STAGES = [
  { id: 0, icon: '📊', label: 'ANALYZE',    desc: 'Market data, yield curves, volatility' },
  { id: 1, icon: '💡', label: 'PROPOSE',    desc: 'Optimal allocation calculated' },
  { id: 2, icon: '🛡️', label: 'RISK-CHECK', desc: 'Guardian constraint validation' },
  { id: 3, icon: '✅', label: 'APPROVE',    desc: 'Council 3/4 quorum + reasoning' },
  { id: 4, icon: '⚡', label: 'EXECUTE',    desc: 'Tx broadcast to Mantle' },
  { id: 5, icon: '🔗', label: 'CONFIRM',    desc: 'Tx mined, state updated' },
  { id: 6, icon: '📝', label: 'LOG',        desc: 'Agent reputation recorded (ERC-8004)' },
  { id: 7, icon: '🔔', label: 'RECORD',     desc: 'Activity feed updated' },
]

const STAGE_DURATION = 500  // ms per stage

interface Props {
  state: PipelineState
  onComplete?: () => void
}

export default function RebalancePipeline({ state, onComplete }: Props) {
  const [stageIndex, setStageIndex] = useState<number>(-1)

  useEffect(() => {
    if (!state.running) {
      setStageIndex(-1)
      return
    }
    setStageIndex(0)
    let current = 0
    const advance = () => {
      current += 1
      if (current >= STAGES.length) {
        setStageIndex(STAGES.length) // all complete
        onComplete?.()
        return
      }
      setStageIndex(current)
      setTimeout(advance, STAGE_DURATION)
    }
    const t = setTimeout(advance, STAGE_DURATION)
    return () => clearTimeout(t)
  }, [state.running, onComplete])

  const allDone = stageIndex >= STAGES.length

  return (
    <div style={{ padding: '16px', borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0F2E', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Rebalance Pipeline</span>
        {state.running && !allDone && (
          <span style={{ fontSize: 10, color: '#3B5BFA', background: '#ffffff', border: '1px solid rgba(59,91,250,0.3)', borderRadius: 20, padding: '2px 8px', fontWeight: 700, letterSpacing: '0.06em' }}>
            RUNNING
          </span>
        )}
        {allDone && (
          <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '2px 8px', fontWeight: 700, letterSpacing: '0.06em' }}>
            COMPLETE
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {STAGES.map((stage, i) => {
          const done = stageIndex > i
          const active = stageIndex === i
          const pending = stageIndex < i

          const color = done ? '#10b981' : active ? '#3B5BFA' : '#CBD5E1'
          const bg = done ? 'rgba(16,185,129,0.1)' : active ? 'rgba(59,91,250,0.1)' : '#F8FAFC'
          const border = done ? 'rgba(16,185,129,0.3)' : active ? 'rgba(59,91,250,0.3)' : '#F1F5F9'

          return (
            <div key={stage.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 10,
              background: bg, border: `1px solid ${border}`,
              transition: 'all 0.3s ease',
              opacity: pending && !state.running ? 0.4 : 1,
            }}>
              {/* Stage number */}
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                background: done ? 'rgba(16,185,129,0.2)' : active ? 'rgba(59,91,250,0.15)' : '#F8FAFC',
                border: `1px solid ${color}40`,
                display: 'grid', placeItems: 'center',
                fontSize: done ? 12 : 14, color,
              }}>
                {done ? '✓' : stage.icon}
              </div>

              {/* Label */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                  {stage.label}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                  {stage.desc}
                </div>
              </div>

              {/* Status indicator */}
              <div style={{ flexShrink: 0 }}>
                {done && <span style={{ fontSize: 11, color: '#10b981', fontFamily: 'monospace' }}>done</span>}
                {active && (
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{
                        width: 4, height: 4, borderRadius: '50%', background: '#3B5BFA',
                        animation: `dot 1s ease ${j * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                )}
                {pending && <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>—</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 14, height: 3, borderRadius: 2, background: '#F1F5F9' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${Math.max(0, (stageIndex / STAGES.length) * 100)}%`,
          background: allDone ? '#10b981' : 'linear-gradient(90deg, #8b5cf6, #3B5BFA)',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Tx hash link */}
      {allDone && state.txHash && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>On-chain proof</div>
          <a
            href={`https://explorer.sepolia.mantle.xyz/tx/${state.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#10b981', fontFamily: 'monospace', wordBreak: 'break-all', textDecoration: 'none' }}
          >
            {state.txHash.slice(0, 18)}…{state.txHash.slice(-6)} ↗
          </a>
        </div>
      )}

      <style>{`
        @keyframes dot { 0%,100%{ opacity:0.3; transform:scale(0.7) } 50%{ opacity:1; transform:scale(1.2) } }
      `}</style>
    </div>
  )
}

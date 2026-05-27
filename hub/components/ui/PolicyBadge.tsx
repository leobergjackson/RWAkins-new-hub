// Built by vsrupeshkumar
// Inline pill showing an agent's policy summary: spend limit, daily quota,
// human-approval flag. Drop on each AgentCard in the Stealth Suite so
// judges see the guardrails *before* they click Trigger Action.
'use client'

import type { AgentPolicy } from '@/lib/agent-policies'

export default function PolicyBadge({
  policy,
  color,
  dense = false,
}: {
  policy: AgentPolicy
  color: string
  dense?: boolean
}) {
  const spend = policy.maxSpendUSD === 0
    ? 'read-only'
    : `$${policy.maxSpendUSD.toLocaleString()}/tx`
  return (
    <div
      title={policy.description}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: dense ? '3px 8px' : '4px 10px',
        borderRadius: 999,
        background: `${color}12`,
        border: `1px solid ${color}40`,
        color,
        fontSize: dense ? 9 : 10,
        fontWeight: 800,
        letterSpacing: '0.06em',
        fontFamily: '"Fira Code","JetBrains Mono",monospace',
      }}
    >
      <span style={{ fontSize: dense ? 9 : 10 }}>🛡</span>
      <span>POLICY</span>
      <span style={{ opacity: 0.7 }}>·</span>
      <span>{spend}</span>
      <span style={{ opacity: 0.7 }}>·</span>
      <span>{policy.dailyTxLimit}/24h</span>
      {policy.requiresHumanApproval && (
        <>
          <span style={{ opacity: 0.7 }}>·</span>
          <span style={{ color: '#F59E0B' }}>✋ HUMAN</span>
        </>
      )}
    </div>
  )
}

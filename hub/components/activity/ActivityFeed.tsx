// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { Activity, ShieldCheck } from 'lucide-react'
import { ActivityCard } from './ActivityCard'
import type { AgentActivity } from '@/app/api/activity/route'

const TEAL = '#2dd4bf'
const PAGE = 10

/**
 * Reverse-chronological agent action feed for a wallet. Pulls from
 * /api/activity?wallet=, which returns real on-chain Rebalanced events
 * (live:true) once the vault is deployed, or a demo feed (live:false) before.
 * Re-fetches whenever the wallet changes (e.g. account switch).
 */
export function ActivityFeed({ wallet }: { wallet: string }) {
  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [live, setLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(PAGE)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/activity?wallet=${wallet}`)
      .then((r) => r.json())
      .then((j: { activities?: AgentActivity[]; live?: boolean }) => {
        if (!active) return
        setActivities(j.activities ?? [])
        setLive(Boolean(j.live))
        setVisible(PAGE)
      })
      .catch(() => { if (active) setActivities([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [wallet])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px', borderRadius: 18, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div
          style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)',
          }}
        >
          <Activity size={22} color={TEAL} />
        </div>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
          Your CFO is watching the market. Actions will appear here when the agent rebalances your portfolio.
        </p>
      </div>
    )
  }

  const shown = activities.slice(0, visible)

  return (
    <div>
      {/* Live / demo provenance banner */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 14px', borderRadius: 10,
          fontSize: 12,
          color: live ? '#34d399' : '#fbbf24',
          background: live ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
          border: `1px solid ${live ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
        }}
      >
        <ShieldCheck size={14} />
        {live
          ? 'Live — every action below links a verifiable Mantle Sepolia transaction.'
          : 'Demo feed — deploy the RWA vault to replace these with real on-chain rebalances.'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shown.map((a) => (
          <ActivityCard key={a.id} action={a} />
        ))}
      </div>

      {visible < activities.length && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <button
            onClick={() => setVisible((v) => v + PAGE)}
            style={{
              padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
            }}
          >
            Load more ({activities.length - visible})
          </button>
        </div>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="animate-pulse">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ width: 96, height: 18, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ width: 80, height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <div style={{ width: '90%', height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.07)', marginBottom: 8 }} />
        <div style={{ width: '60%', height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }} />
        <div style={{ width: '100%', height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.05)', marginBottom: 6 }} />
        <div style={{ width: '100%', height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
      </div>
    </div>
  )
}

export default ActivityFeed

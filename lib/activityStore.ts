// Shared server-side store for agent activities (manual trigger + autonomous
// heartbeat). Written by /api/rebalance/trigger client-side POST and the
// heartbeat; read by /api/activity. Durable when a KV store is configured, with
// an in-memory fallback for local dev. Async because the KV backend is async.
// Shape mirrors AgentActivity from the activity route (no cross-import to avoid cycles).
import { getRedis } from '@/lib/kv'

export interface StoredActivity {
  id: string
  timestamp: string
  actionType: 'rebalance' | 'monitor' | 'alert'
  narrative: string
  assetFrom: 'USDY' | 'mETH' | null
  assetTo: 'USDY' | 'mETH' | null
  amountFrom: string | null
  amountTo: string | null
  txHash: string | null
  allocationBefore: { usdy: number; meth: number }
  allocationAfter: { usdy: number; meth: number }
}

const mem = new Map<string, StoredActivity[]>()
const MAX = 100
const KEY = (wallet: string) => `rwakins:activity:${wallet.toLowerCase()}`

export async function logActivity(wallet: string, activity: StoredActivity): Promise<void> {
  const redis = getRedis()
  if (redis) {
    // Newest-first list, capped at MAX entries.
    await redis.lpush(KEY(wallet), activity)
    await redis.ltrim(KEY(wallet), 0, MAX - 1)
    return
  }
  const key = wallet.toLowerCase()
  const existing = mem.get(key) ?? []
  mem.set(key, [activity, ...existing].slice(0, MAX))
}

export async function getStoredActivities(wallet: string): Promise<StoredActivity[]> {
  const redis = getRedis()
  if (redis) return (await redis.lrange<StoredActivity>(KEY(wallet), 0, MAX - 1)) ?? []
  return mem.get(wallet.toLowerCase()) ?? []
}

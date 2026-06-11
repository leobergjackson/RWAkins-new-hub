// Built by vsrupeshkumar
// Per-wallet notification store — how the autonomous agent reports back. The
// heartbeat drops a notification here when it acts on a user's behalf; the navbar
// bell shows the unread count and the user reads what happened while they were
// away. Durable when a KV store is configured, with an in-memory fallback for
// local dev. Async because the KV backend is async.
import { getRedis } from '@/lib/kv'

/** What kind of thing the agent is telling the user. */
export type NotificationType = 'rebalance' | 'recommendation' | 'info'

export interface AgentNotification {
  id: string
  timestamp: string // ISO
  message: string
  txHash: string | null // real Mantle hash when the action executed on-chain
  read: boolean
  type: NotificationType
  /** Stable signature of the underlying condition; used to suppress duplicates. */
  dedupeKey?: string
}

const mem = new Map<string, AgentNotification[]>()
const MAX = 50
const KEY = (wallet: string) => `rwakins:ntf:${wallet.toLowerCase()}`

/**
 * Add a notification — UNLESS it would just repeat a reminder the user hasn't
 * dealt with yet. When `dedupeKey` is set and an UNREAD notification with the
 * same key already exists, we skip (return that existing one). This is what makes
 * the bell a meaningful reminder rather than nagging every cron tick: a standing
 * recommendation is shown once until the user reads/acts on it; a NEW condition
 * (different key) or a fresh occurrence after they've read it notifies again.
 * Executed rebalances pass no dedupeKey — every real on-chain action is distinct.
 */
export async function addNotification(
  wallet: string,
  input: {
    message: string
    txHash?: string | null
    timestamp?: string
    type?: NotificationType
    dedupeKey?: string
  },
): Promise<{ entry: AgentNotification; created: boolean }> {
  if (input.dedupeKey) {
    const existing = await getNotifications(wallet)
    const dup = existing.find((n) => !n.read && n.dedupeKey === input.dedupeKey)
    if (dup) return { entry: dup, created: false }
  }

  const entry: AgentNotification = {
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: input.timestamp || new Date().toISOString(),
    message: input.message.slice(0, 280),
    txHash: input.txHash ?? null,
    read: false,
    type: input.type ?? 'info',
    dedupeKey: input.dedupeKey,
  }
  const redis = getRedis()
  if (redis) {
    await redis.lpush(KEY(wallet), entry)
    await redis.ltrim(KEY(wallet), 0, MAX - 1)
    return { entry, created: true }
  }
  const key = wallet.toLowerCase()
  const existing = mem.get(key) ?? []
  mem.set(key, [entry, ...existing].slice(0, MAX))
  return { entry, created: true }
}

export async function getNotifications(wallet: string): Promise<AgentNotification[]> {
  const redis = getRedis()
  if (redis) return (await redis.lrange<AgentNotification>(KEY(wallet), 0, MAX - 1)) ?? []
  return mem.get(wallet.toLowerCase()) ?? []
}

export async function unreadCount(wallet: string): Promise<number> {
  return (await getNotifications(wallet)).filter((n) => !n.read).length
}

/** Mark every notification for a wallet as read; returns how many changed. */
export async function markAllRead(wallet: string): Promise<number> {
  const redis = getRedis()
  if (redis) {
    const list = await getNotifications(wallet)
    const unread = list.filter((n) => !n.read).length
    if (unread === 0) return 0
    const updated = list.map((n) => ({ ...n, read: true }))
    // Rewrite the list preserving newest-first order (rpush appends in order).
    await redis.del(KEY(wallet))
    if (updated.length) await redis.rpush(KEY(wallet), ...updated)
    return unread
  }
  const list = mem.get(wallet.toLowerCase())
  if (!list) return 0
  let changed = 0
  for (const n of list) {
    if (!n.read) { n.read = true; changed++ }
  }
  return changed
}

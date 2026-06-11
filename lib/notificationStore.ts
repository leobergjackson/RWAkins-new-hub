// Built by vsrupeshkumar
// Per-wallet notification store — how the autonomous agent reports back. The
// heartbeat drops a notification here when it acts on a user's behalf; the navbar
// bell shows the unread count and the user reads what happened while they were
// away. Durable when a KV store is configured, with an in-memory fallback for
// local dev. Async because the KV backend is async.
import { getRedis } from '@/lib/kv'

export interface AgentNotification {
  id: string
  timestamp: string // ISO
  message: string
  txHash: string | null // real Mantle hash when the action executed on-chain
  read: boolean
}

const mem = new Map<string, AgentNotification[]>()
const MAX = 50
const KEY = (wallet: string) => `rwakins:ntf:${wallet.toLowerCase()}`

export async function addNotification(
  wallet: string,
  input: { message: string; txHash?: string | null; timestamp?: string },
): Promise<AgentNotification> {
  const entry: AgentNotification = {
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: input.timestamp || new Date().toISOString(),
    message: input.message.slice(0, 280),
    txHash: input.txHash ?? null,
    read: false,
  }
  const redis = getRedis()
  if (redis) {
    await redis.lpush(KEY(wallet), entry)
    await redis.ltrim(KEY(wallet), 0, MAX - 1)
    return entry
  }
  const key = wallet.toLowerCase()
  const existing = mem.get(key) ?? []
  mem.set(key, [entry, ...existing].slice(0, MAX))
  return entry
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

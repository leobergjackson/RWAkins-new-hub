// Shared server-side store for wallet wealth rules.
// /api/saveIntent, /api/rebalance/trigger and /api/agent/heartbeat all import
// from here. Durable when a KV store is configured (so the heartbeat sees every
// active wallet across serverless instances); falls back to an in-memory Map for
// local dev. All functions are async because the KV backend is async.
import type { WealthRules } from '@/lib/intent'
import { getRedis } from '@/lib/kv'

const mem = new Map<string, WealthRules>()
const KEY = (addr: string) => `rwakins:intent:${addr.toLowerCase()}`
const INDEX = 'rwakins:intent:index' // set of every wallet that has rules

export async function setIntent(address: string, rules: WealthRules): Promise<void> {
  const addr = address.toLowerCase()
  const redis = getRedis()
  if (redis) {
    await Promise.all([redis.set(KEY(addr), rules), redis.sadd(INDEX, addr)])
    return
  }
  mem.set(addr, rules)
}

export async function getIntent(address: string): Promise<WealthRules | null> {
  const addr = address.toLowerCase()
  const redis = getRedis()
  if (redis) return (await redis.get<WealthRules>(KEY(addr))) ?? null
  return mem.get(addr) ?? null
}

/**
 * Every wallet that currently has an active wealth policy, as [address, rules]
 * pairs. The autonomous heartbeat iterates these to evaluate each active user.
 */
export async function listIntents(): Promise<Array<[string, WealthRules]>> {
  const redis = getRedis()
  if (redis) {
    const addrs = await redis.smembers(INDEX)
    if (!addrs.length) return []
    const rulesList = await redis.mget<WealthRules[]>(...addrs.map(KEY))
    const out: Array<[string, WealthRules]> = []
    addrs.forEach((addr, i) => {
      const r = rulesList[i]
      if (r) out.push([addr, r])
    })
    return out
  }
  return [...mem.entries()]
}

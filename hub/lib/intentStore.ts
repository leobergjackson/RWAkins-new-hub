// Shared server-side store for wallet wealth rules.
// Both /api/saveIntent and /api/rebalance/trigger import from here so they
// operate on the same in-memory Map within a single Node process.
import type { WealthRules } from '@/lib/intent'

const store = new Map<string, WealthRules>()

export function setIntent(address: string, rules: WealthRules): void {
  store.set(address.toLowerCase(), rules)
}

export function getIntent(address: string): WealthRules | null {
  return store.get(address.toLowerCase()) ?? null
}

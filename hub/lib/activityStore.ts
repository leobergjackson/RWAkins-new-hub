// Shared server-side store for manually triggered agent activities.
// Written by /api/rebalance/trigger, read by /api/activity.
// Shape mirrors AgentActivity from the activity route (no cross-import to avoid cycles).

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

const store = new Map<string, StoredActivity[]>()

export function logActivity(wallet: string, activity: StoredActivity): void {
  const key = wallet.toLowerCase()
  const existing = store.get(key) ?? []
  store.set(key, [activity, ...existing].slice(0, 100))
}

export function getStoredActivities(wallet: string): StoredActivity[] {
  return store.get(wallet.toLowerCase()) ?? []
}

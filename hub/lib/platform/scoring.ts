// Built by vsrupeshkumar
// Platform-wide credit tier + cross-module scoring logic.

export type CreditTier = {
  name:         'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Unrated'
  color:        string
  bg:           string
  border:       string
  lendingRate:  number   // APR %
  vaultLTV:     number   // loan-to-value %
  treasuryTier: string
  splitTrust:   string
  minScore:     number
}

export const CREDIT_TIERS: CreditTier[] = [
  { name:'Platinum', color:'#A855F7', bg:'rgba(168,85,247,0.10)', border:'rgba(168,85,247,0.30)', lendingRate:3.0,  vaultLTV:80, minScore:900, treasuryTier:'Elite — priority agent routing',  splitTrust:'Instant settlement, no escrow hold'   },
  { name:'Gold',     color:'#EAB308', bg:'rgba(234,179,8,0.10)',  border:'rgba(234,179,8,0.30)',  lendingRate:5.2,  vaultLTV:75, minScore:750, treasuryTier:'Premium — AI-optimised routes',    splitTrust:'Trusted — 1h escrow release'           },
  { name:'Silver',   color:'#94A3B8', bg:'rgba(148,163,184,0.10)',border:'rgba(148,163,184,0.25)',lendingRate:8.0,  vaultLTV:66, minScore:600, treasuryTier:'Standard — balanced routing',       splitTrust:'Standard — 24h escrow hold'            },
  { name:'Bronze',   color:'#CD7F32', bg:'rgba(205,127,50,0.10)', border:'rgba(205,127,50,0.30)', lendingRate:12.0, vaultLTV:60, minScore:400, treasuryTier:'Basic — manual approval required',  splitTrust:'Verified — 48h escrow hold'            },
  { name:'Unrated',  color:'#EF4444', bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.25)',  lendingRate:18.0, vaultLTV:50, minScore:0,   treasuryTier:'Restricted — identity required',    splitTrust:'Restricted — full escrow + review'     },
]

export function getCreditTier(score: number | null): CreditTier {
  if (score === null) return CREDIT_TIERS[4]
  return CREDIT_TIERS.find(t => score >= t.minScore) ?? CREDIT_TIERS[4]
}

// How much each module contributes to the platform identity score
export function getVaultBoost(vaultActive: boolean | null): number {
  return vaultActive === true ? 85 : 0
}
export function getStellarBoost(payments: number | null): number {
  if (!payments) return 0
  if (payments >= 50) return 60
  if (payments >= 10) return 40
  return 20
}
export function getTreasuryBoost(value: number | null): number {
  if (!value) return 0
  if (value >= 1_000_000) return 80
  if (value >= 100_000)   return 50
  if (value >= 10_000)    return 30
  return 10
}

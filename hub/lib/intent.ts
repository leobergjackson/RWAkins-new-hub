// Built by vsrupeshkumar
// Shared "wealth rules" model for the AI CFO onboarding flow.
//
// A user describes their financial goals in plain English on /onboarding. That
// free text is turned into a structured, on-chain-safe allocation policy here.
// The SAME parser is the deterministic fallback inside /api/saveIntent, so the
// client confirmation and the server-persisted rules can never disagree, and the
// resulting mETH share can never exceed the vault's on-chain MAX_RISK_BPS cap.

export type RiskLevel = 'low' | 'medium' | 'high'

export interface WealthRules {
  riskLevel: RiskLevel
  defaultAsset: 'USDY' | 'mETH'
  targetUsdyBps: number // sums to 10_000 with targetMethBps
  targetMethBps: number // hard-capped at MAX_RISK_BPS (mirrors RWAkinsRWAVault)
  autoRebalance: boolean
  rebalanceThresholdPct: number
  rawIntent: string
  updatedAt: string
}

/** Mirror of RWAkinsRWAVault.MAX_RISK_BPS — mETH can never exceed 70%. */
export const MAX_RISK_BPS = 7000
const TOTAL_BPS = 10_000

const RISK_TO_METH_BPS: Record<RiskLevel, number> = {
  low: 2000, // 20% mETH / 80% USDY — capital preservation
  medium: 4000, // 40% mETH / 60% USDY — balanced
  high: 7000, // 70% mETH / 30% USDY — growth, at the on-chain ceiling
}

/** Clamp any allocation to the on-chain invariants: sum == 100%, mETH <= cap. */
export function clampAllocation(methBps: number): { usdyBps: number; methBps: number } {
  let m = Math.round(Number.isFinite(methBps) ? methBps : 4000)
  if (m < 0) m = 0
  if (m > MAX_RISK_BPS) m = MAX_RISK_BPS
  return { usdyBps: TOTAL_BPS - m, methBps: m }
}

/**
 * Deterministic plain-English → WealthRules parser. Intentionally simple and
 * dependency-free so the flow works with no AI key configured.
 */
export function parseIntent(text: string): WealthRules {
  const t = (text || '').toLowerCase()

  let riskLevel: RiskLevel = 'medium'
  if (/\b(aggressive|high risk|high-risk|maximi[sz]e|max yield|risky|growth|degen)\b/.test(t)) {
    riskLevel = 'high'
  } else if (/\b(safe|conservative|low risk|low-risk|preserve|capital preservation|stable|protect|cautious)\b/.test(t)) {
    riskLevel = 'low'
  }

  const { usdyBps, methBps } = clampAllocation(RISK_TO_METH_BPS[riskLevel])

  // Explicit asset preference can nudge the default, but never past the cap.
  let defaultAsset: 'USDY' | 'mETH' = methBps > usdyBps ? 'mETH' : 'USDY'
  if (/\b(meth|m-eth|staking|staked eth| eth\b|ethereum)\b/.test(t) && !/\bstable|usdy|dollar\b/.test(t)) {
    defaultAsset = 'mETH'
  } else if (/\b(usdy|stable|dollar|yield|income|t-?bill)\b/.test(t)) {
    defaultAsset = 'USDY'
  }

  const autoRebalance = !/\b(manual|no rebalanc|don'?t rebalance|never rebalance)\b/.test(t)
  let rebalanceThresholdPct = 5
  if (/\b(tight|frequent|aggressive rebalanc)\b/.test(t)) rebalanceThresholdPct = 3
  else if (/\b(loose|rare|infrequent|hands off|hands-off)\b/.test(t)) rebalanceThresholdPct = 10

  return {
    riskLevel,
    defaultAsset,
    targetUsdyBps: usdyBps,
    targetMethBps: methBps,
    autoRebalance,
    rebalanceThresholdPct,
    rawIntent: (text || '').trim().slice(0, 600),
    updatedAt: new Date().toISOString(),
  }
}

/** Validate + clamp an arbitrary (e.g. AI-produced) rules object into a safe one. */
export function normalizeRules(input: Partial<WealthRules>, rawIntent: string): WealthRules {
  const risk: RiskLevel =
    input.riskLevel === 'low' || input.riskLevel === 'high' ? input.riskLevel : 'medium'
  const methSource =
    typeof input.targetMethBps === 'number' ? input.targetMethBps : RISK_TO_METH_BPS[risk]
  const { usdyBps, methBps } = clampAllocation(methSource)
  return {
    riskLevel: risk,
    defaultAsset: input.defaultAsset === 'mETH' ? 'mETH' : 'USDY',
    targetUsdyBps: usdyBps,
    targetMethBps: methBps,
    autoRebalance: input.autoRebalance !== false,
    rebalanceThresholdPct:
      typeof input.rebalanceThresholdPct === 'number' && input.rebalanceThresholdPct > 0
        ? Math.min(50, Math.round(input.rebalanceThresholdPct))
        : 5,
    rawIntent: (rawIntent || input.rawIntent || '').trim().slice(0, 600),
    updatedAt: new Date().toISOString(),
  }
}

/** One-line human summary used for the chat confirmation and the dashboard panel. */
export function summarizeRules(r: WealthRules): string {
  const usdyPct = Math.round(r.targetUsdyBps / 100)
  const methPct = Math.round(r.targetMethBps / 100)
  const reb = r.autoRebalance ? `auto-rebalance at ${r.rebalanceThresholdPct}% drift` : 'manual rebalance'
  return `${r.riskLevel} risk · default ${r.defaultAsset} · target ${usdyPct}% USDY / ${methPct}% mETH · ${reb}`
}

// ── Client-side persistence (no off-chain DB; keyed by wallet) ────────────────

export const intentStorageKey = (address: string) => `rwakins:intent:${address.toLowerCase()}`

export function loadIntent(address: string | null | undefined): WealthRules | null {
  if (!address || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(intentStorageKey(address))
    return raw ? (JSON.parse(raw) as WealthRules) : null
  } catch {
    return null
  }
}

export function saveIntentLocal(address: string, rules: WealthRules): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(intentStorageKey(address), JSON.stringify(rules))
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

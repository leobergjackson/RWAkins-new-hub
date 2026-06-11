// Built by vsrupeshkumar
// Tiny in-memory record of the LAST observed USDY APY, so the agent's
// "yield-defence" check can ask: has the stable yield DROPPED since we last
// looked? A drop in treasury yield while crypto is also falling is the double
// signal to de-risk into whatever yield remains.
//
// In-memory by design (matches intentStore / activityStore): within a warm
// server instance the delta is exact; on a cold start there is simply no prior
// reading, so the defence check holds rather than firing a false positive.
let lastUsdyApy: number | null = null

/** Most recent USDY APY we evaluated against, or null if this is the first look. */
export function getLastUsdyApy(): number | null {
  return lastUsdyApy
}

/** Record the USDY APY observed in the current evaluation for next time. */
export function recordUsdyApy(apy: number): void {
  if (Number.isFinite(apy)) lastUsdyApy = apy
}

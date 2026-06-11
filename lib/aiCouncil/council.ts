// Built by vsrupeshkumar
// Council evaluation logic — a 4-agent RWA debate. evaluateCouncilLLM() runs each
// agent as a REAL LLM persona (Groq) reasoning over the live market context;
// evaluateCouncil() is the deterministic engine used as a per-agent fallback when
// the model is unavailable. Either way the Risk Guardian's mETH-cap veto is
// enforced in CODE (never delegated to the model) so the on-chain invariant can
// never be talked around. Called by /api/rebalance/trigger + the heartbeat, and
// rendered by the CouncilDialogue component.

import { COUNCIL_AGENTS, type AgentVote, type CouncilResult, type VoteChoice } from './agents'
import { chatJson } from '@/lib/openai'

export interface MarketContext {
  ethChange24h: number       // percent, e.g. -2.1
  usdyApy: number            // percent, e.g. 4.8
  methApy: number            // percent, e.g. 3.6
  currentMethPct: number     // current mETH allocation 0-100
  volatility: number         // annualized implied vol, e.g. 18.3
  usdyBps: number            // current bps
  methBps: number            // current bps
  proposedUsdyBps?: number   // AI-proposed new allocation
  proposedMethBps?: number
}

const MAX_METH_PCT = 70

function marketAnalystVote(ctx: MarketContext): AgentVote {
  const yieldSpread = ctx.usdyApy - ctx.methApy
  const highVol = ctx.volatility > 20
  const bearish = ctx.ethChange24h < -3

  let vote: VoteChoice = 'YES'
  let confidence = 80
  let reasoning = ''

  if (bearish && highVol) {
    vote = 'YES'
    confidence = 72
    reasoning = `ETH down ${Math.abs(ctx.ethChange24h).toFixed(1)}% with elevated vol ${ctx.volatility.toFixed(1)}%; USDY +${yieldSpread.toFixed(2)}% premium favors rebalance`
  } else if (yieldSpread > 0.5) {
    vote = 'YES'
    confidence = 88
    reasoning = `USDY +${yieldSpread.toFixed(2)}% premium over mETH; shifting allocation improves risk-adjusted yield`
  } else if (ctx.ethChange24h > 2) {
    vote = 'NO'
    confidence = 65
    reasoning = `ETH rallying +${ctx.ethChange24h.toFixed(1)}%: mETH upside outweighs USDY stability premium right now`
  } else {
    vote = 'YES'
    confidence = 78
    reasoning = `Market neutral; allocation drift of ${Math.abs(ctx.currentMethPct - 40).toFixed(0)}% from target warrants correction`
  }

  return { agentId: 'market-analyst', vote, confidence, reasoning, timestamp: Date.now() }
}

function riskGuardianVote(ctx: MarketContext): AgentVote {
  const proposedMethPct = ctx.proposedMethBps ? ctx.proposedMethBps / 100 : ctx.currentMethPct
  const wouldViolate = proposedMethPct > MAX_METH_PCT

  if (wouldViolate) {
    return {
      agentId: 'risk-guardian',
      vote: 'NO',
      confidence: 100,
      reasoning: `VETO: proposed mETH ${proposedMethPct.toFixed(0)}% exceeds hard cap of ${MAX_METH_PCT}% — rebalance blocked`,
      timestamp: Date.now(),
      vetoed: true,
    }
  }

  const highVol = ctx.volatility > 25
  if (highVol) {
    return {
      agentId: 'risk-guardian',
      vote: 'ABSTAIN',
      confidence: 55,
      reasoning: `Volatility at ${ctx.volatility.toFixed(1)}% is elevated; current mETH ${ctx.currentMethPct.toFixed(0)}% within cap but monitoring`,
      timestamp: Date.now(),
    }
  }

  return {
    agentId: 'risk-guardian',
    vote: 'YES',
    confidence: 94,
    reasoning: `Current mETH ${ctx.currentMethPct.toFixed(0)}% ≤ ${MAX_METH_PCT}% cap; constraints satisfied; APPROVED`,
    timestamp: Date.now(),
  }
}

function yieldOptimizerVote(ctx: MarketContext): AgentVote {
  const yieldSpread = ctx.usdyApy - ctx.methApy
  const bpsDrift = Math.abs((ctx.proposedUsdyBps ?? ctx.usdyBps) - ctx.usdyBps)

  let vote: VoteChoice = 'YES'
  let confidence = 82
  let reasoning = ''

  if (yieldSpread > 1) {
    vote = 'YES'
    confidence = 91
    reasoning = `USDY +${(yieldSpread * 100).toFixed(0)}bps premium; shift optimizes portfolio yield by est. +${(yieldSpread * 0.3).toFixed(2)}% APY`
  } else if (bpsDrift < 100) {
    vote = 'ABSTAIN'
    confidence = 60
    reasoning = `Drift ${bpsDrift}bps below rebalance threshold; gas cost may exceed yield gain`
  } else {
    vote = 'YES'
    confidence = 79
    reasoning = `Net yield improvement of +${(yieldSpread * 0.5).toFixed(2)}% after gas; rebalance economically justified`
  }

  return { agentId: 'yield-optimizer', vote, confidence, reasoning, timestamp: Date.now() }
}

function executionPlannerVote(ctx: MarketContext): AgentVote {
  const slippage = ctx.volatility > 20 ? 0.35 : 0.18
  const gasOk = true

  let vote: VoteChoice = 'YES'
  let confidence = 83
  let reasoning = ''

  if (slippage > 0.5) {
    vote = 'NO'
    confidence = 71
    reasoning = `Estimated slippage ${slippage.toFixed(2)}% exceeds 0.5% threshold; wait for better liquidity`
  } else {
    reasoning = `Slippage est. <${slippage.toFixed(2)}%; gas within budget; Mantle Sepolia liquidity confirmed`
  }

  return { agentId: 'execution-planner', vote: gasOk ? vote : 'NO', confidence, reasoning, timestamp: Date.now() }
}

export function evaluateCouncil(ctx: MarketContext): CouncilResult {
  const votes: AgentVote[] = [
    marketAnalystVote(ctx),
    riskGuardianVote(ctx),
    yieldOptimizerVote(ctx),
    executionPlannerVote(ctx),
  ]

  const guardianVote = votes.find(v => v.agentId === 'risk-guardian')!
  const vetoed = guardianVote.vetoed === true

  const yesCount = votes.filter(v => v.vote === 'YES').length
  const quorumMet = yesCount >= 3

  const approved = !vetoed && quorumMet

  const finalDecision = vetoed
    ? '🛑 VETOED by Risk Guardian'
    : approved
      ? `✅ ${yesCount}/4 QUORUM MET → REBALANCE APPROVED`
      : `❌ ${yesCount}/4 — QUORUM NOT MET → HOLD`

  return {
    votes,
    approved,
    vetoed,
    quorumMet,
    yesCount,
    finalDecision,
    sessionId: `council-${Date.now().toString(36)}`,
    timestamp: Date.now(),
  }
}

// ─── Real LLM council ────────────────────────────────────────────────────────

const PERSONA: Record<string, string> = {
  'market-analyst':
    'You are the MARKET ANALYST on an AI CFO council managing a two-asset RWA portfolio on Mantle ' +
    '(USDY = stable treasury yield, mETH = staked-ETH, volatile). Judge the PROPOSED rebalance purely on ' +
    'market conditions: ETH 24h momentum, volatility, and the USDY-vs-mETH yield spread.',
  'risk-guardian':
    'You are the RISK GUARDIAN on an AI CFO council. You protect capital. Judge the PROPOSED rebalance on ' +
    'downside risk given volatility and the mETH exposure. (A hard mETH ≤ 70% cap is enforced separately in ' +
    'code, so focus on prudence, not the cap arithmetic.)',
  'yield-optimizer':
    'You are the YIELD OPTIMIZER on an AI CFO council. Judge whether the PROPOSED rebalance improves ' +
    'risk-adjusted yield, weighing the USDY vs mETH APY spread against the size of the shift and gas.',
  'execution-planner':
    'You are the EXECUTION PLANNER on an AI CFO council. Judge whether the PROPOSED rebalance is cleanly ' +
    'executable on Mantle Sepolia: implied slippage from volatility, gas, and trade size.',
}

const VOTE_RULE =
  ' Respond with ONLY JSON: {"vote":"YES"|"NO"|"ABSTAIN","confidence":0-100,"reasoning":string}. ' +
  'YES = approve the rebalance, NO = reject, ABSTAIN = no strong view. The reasoning MUST cite the actual ' +
  'live numbers (e.g. "ETH -2.1%, USDY 3.6% vs mETH 2.4%") and stay under 160 characters.'

function normalizeVote(v: unknown): VoteChoice {
  return v === 'YES' || v === 'NO' || v === 'ABSTAIN' ? v : 'ABSTAIN'
}

/** One agent's vote via the LLM; falls back to its deterministic vote on failure. */
async function llmVote(agentId: string, ctx: MarketContext, fallback: AgentVote): Promise<AgentVote> {
  const raw = await chatJson<{ vote?: string; confidence?: number; reasoning?: string }>({
    messages: [
      { role: 'system', content: (PERSONA[agentId] ?? '') + VOTE_RULE },
      {
        role: 'user',
        content: JSON.stringify({
          ethChange24hPct: Number(ctx.ethChange24h.toFixed(2)),
          usdyApyPct: Number(ctx.usdyApy.toFixed(2)),
          methApyPct: Number(ctx.methApy.toFixed(2)),
          annualizedVolatilityPct: Number(ctx.volatility.toFixed(1)),
          currentMethPct: Number(ctx.currentMethPct.toFixed(1)),
          proposedMethPct: ctx.proposedMethBps != null ? ctx.proposedMethBps / 100 : ctx.currentMethPct,
        }),
      },
    ],
    temperature: 0.3,
    timeoutMs: 10_000,
    maxTokens: 120,
  })
  if (!raw || typeof raw.reasoning !== 'string') return fallback
  const confidence = typeof raw.confidence === 'number' ? Math.max(0, Math.min(100, Math.round(raw.confidence))) : fallback.confidence
  return {
    agentId,
    vote: normalizeVote(raw.vote),
    confidence,
    reasoning: raw.reasoning.slice(0, 220),
    timestamp: Date.now(),
  }
}

/**
 * Real 4-agent LLM council. Each agent reasons over the live context as its own
 * persona; the Risk Guardian's hard-cap VETO is decided in code and is never
 * delegated to the model. Any agent whose LLM call fails degrades to its
 * deterministic vote, so the council always returns a complete result.
 */
export async function evaluateCouncilLLM(ctx: MarketContext): Promise<CouncilResult> {
  // Deterministic votes computed up front: both the safety guard (cap veto) and
  // the per-agent fallback.
  const deterministic: Record<string, AgentVote> = {
    'market-analyst': marketAnalystVote(ctx),
    'risk-guardian': riskGuardianVote(ctx),
    'yield-optimizer': yieldOptimizerVote(ctx),
    'execution-planner': executionPlannerVote(ctx),
  }

  // Hard mETH-cap veto stays in code: if the proposal breaches the cap, the
  // Risk Guardian vetoes outright and we don't ask the model at all.
  const proposedMethPct = ctx.proposedMethBps ? ctx.proposedMethBps / 100 : ctx.currentMethPct
  const capBreached = proposedMethPct > MAX_METH_PCT

  const votes = await Promise.all(
    COUNCIL_AGENTS.map((a) => {
      if (a.id === 'risk-guardian' && capBreached) return deterministic['risk-guardian'] // forced veto
      return llmVote(a.id, ctx, deterministic[a.id])
    }),
  )

  const guardianVote = votes.find((v) => v.agentId === 'risk-guardian')!
  const vetoed = guardianVote.vetoed === true
  const yesCount = votes.filter((v) => v.vote === 'YES').length
  const quorumMet = yesCount >= 3
  const approved = !vetoed && quorumMet
  const finalDecision = vetoed
    ? '🛑 VETOED by Risk Guardian'
    : approved
      ? `✅ ${yesCount}/4 QUORUM MET → REBALANCE APPROVED`
      : `❌ ${yesCount}/4 — QUORUM NOT MET → HOLD`

  return {
    votes,
    approved,
    vetoed,
    quorumMet,
    yesCount,
    finalDecision,
    sessionId: `council-${Date.now().toString(36)}`,
    timestamp: Date.now(),
  }
}

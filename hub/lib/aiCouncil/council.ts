// Built by vsrupeshkumar
// Council evaluation logic — deterministic simulation of 4-agent RWA debate.
// Called by /api/rebalance/trigger and rendered by CouncilDialogue component.

import { type AgentVote, type CouncilResult, type VoteChoice } from './agents'

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

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI Intent Detection & Tip Refusal (extracted from ai.service.ts)
// Contains: INTENT_RULES, regexDetectIntent, shouldRefuseTip, ruleBasedAutonomousDecision

import { logger } from '../utils/logger.js';
import type { ChatIntent, ExtractedEntities, TipRefusal } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════
// INTENT RULES — Pattern-based intent classification
// ══════════════════════════════════════════════════════════════════

/** Intent rule definition for pattern-matching */
export interface IntentRule {
  intent: ChatIntent['intent'];
  patterns: RegExp[];
  weight: number;
  description: string;
}

export const INTENT_RULES: IntentRule[] = [
  {
    intent: 'tip',
    patterns: [
      /\b(?:send|tip|transfer|pay|give|donate|reward|support)\b/,
      /\b(?:tip)\s+(?:\d|@|\$|0x)/,
      /\bsend\s+\d/,
      /\$\s*\d+\s*(?:to|for)/,
    ],
    weight: 1.0,
    description: 'Send a tip or payment to a creator',
  },
  {
    intent: 'check_balance',
    patterns: [
      /\b(?:balance|how much|funds|wallet balance|my wallet|check wallet|remaining|available)\b/,
      /\bhow\s+much\s+(?:do i have|is left|in my)/,
      /\bshow\s+(?:my\s+)?balance/,
    ],
    weight: 0.9,
    description: 'Check wallet balances across chains',
  },
  {
    intent: 'view_history',
    patterns: [
      /\b(?:history|past tips|transactions|recent tips|previous|log|activity|ledger)\b/,
      /\bshow\s+(?:my\s+)?(?:tips|transactions|history)/,
      /\blast\s+(?:\d+\s+)?tips/,
    ],
    weight: 0.85,
    description: 'View tip and transaction history',
  },
  {
    intent: 'find_creator',
    patterns: [
      /\b(?:find|search|lookup|discover|who is|show me)\s+(?:a\s+)?(?:creator|channel|streamer)/,
      /\b(?:creator|channel)\s+(?:info|details|profile|stats)/,
      /\bwho\s+(?:is|are)\s+@?\w+/,
    ],
    weight: 0.85,
    description: 'Find or lookup a content creator',
  },
  {
    intent: 'set_policy',
    patterns: [
      /\b(?:set|change|update|configure|adjust)\s+(?:policy|rule|limit|budget|threshold|setting)/,
      /\b(?:daily\s+limit|spending\s+limit|auto.?tip|max.?tip|min.?tip)\b/,
      /\b(?:enable|disable|turn on|turn off)\s+(?:auto|autonomous)/,
    ],
    weight: 0.9,
    description: 'Set or update agent tipping policies',
  },
  {
    intent: 'check_status',
    patterns: [
      /\b(?:status|health|alive|running|uptime|ping|agent status|system)\b/,
      /\bare\s+you\s+(?:ok|running|working|alive)/,
      /\bhow\s+(?:are\s+)?you\b/,
    ],
    weight: 0.7,
    description: 'Check agent and system status',
  },
  {
    intent: 'help',
    patterns: [
      /\b(?:help|what can you do|commands|how to|how do i|capabilities|guide|tutorial|getting started)\b/,
      /\bwhat\s+(?:are\s+)?(?:your|the)\s+(?:features|commands|options)/,
      /\bshow\s+(?:me\s+)?help\b/,
    ],
    weight: 0.8,
    description: 'Get help and available commands',
  },
  {
    intent: 'analytics',
    patterns: [
      /\b(?:analytics|stats|statistics|metrics|report|dashboard|performance|roi|summary)\b/,
      /\bhow\s+(?:many|much)\s+(?:tips|have i|did i)/,
      /\bshow\s+(?:me\s+)?(?:stats|analytics|metrics|report)/,
    ],
    weight: 0.85,
    description: 'View analytics and performance metrics',
  },
  {
    intent: 'bridge',
    patterns: [
      /\b(?:bridge|cross.?chain|move|transfer)\s+(?:to|from|between)\s+(?:eth|ton|tron|polygon)/,
      /\b(?:bridge)\s+\d/,
      /\bcross.?chain\b/,
    ],
    weight: 0.9,
    description: 'Bridge tokens across chains',
  },
  {
    intent: 'swap',
    patterns: [
      /\b(?:swap|exchange|convert|trade)\b/,
      /\b(?:swap)\s+\d/,
      /\bconvert\s+(?:\d|my)/,
    ],
    weight: 0.85,
    description: 'Swap or exchange tokens',
  },
  {
    intent: 'lend',
    patterns: [
      /\b(?:lend|borrow|lending|yield|stake|staking|earn|apy|deposit)\b/,
      /\b(?:lend|deposit)\s+\d/,
      /\bearn\s+(?:interest|yield|apy)/,
    ],
    weight: 0.85,
    description: 'Lending, staking, and yield operations',
  },
  {
    intent: 'fees',
    patterns: [
      /\b(?:fee|fees|cost|gas|cheapest|compare|estimate|gas price)\b/,
      /\bhow\s+much\s+(?:does it cost|are fees|is gas)/,
    ],
    weight: 0.8,
    description: 'Check and compare transaction fees',
  },
  {
    intent: 'address',
    patterns: [
      /\b(?:address|addresses|wallet address|my address|receive|deposit address)\b/,
      /\bshow\s+(?:my\s+)?address/,
      /\bwhere\s+(?:can i|do i)\s+receive/,
    ],
    weight: 0.75,
    description: 'Show wallet addresses for receiving',
  },
];

// ══════════════════════════════════════════════════════════════════
// RULE-BASED INTENT DETECTION
// ══════════════════════════════════════════════════════════════════

/** Rule-based regex intent detection with reasoning traces and confidence */
export function regexDetectIntent(
  lower: string,
  original: string,
  extractEntitiesFn: (text: string) => ExtractedEntities,
): ChatIntent {
  const entities = extractEntitiesFn(original);
  const reasoning: string[] = [];
  let bestIntent: ChatIntent['intent'] = 'unknown';
  let bestScore = 0;
  let matchedPatternCount = 0;

  // Score each intent rule
  for (const rule of INTENT_RULES) {
    let ruleScore = 0;
    let matched = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(lower)) {
        ruleScore += rule.weight;
        matched++;
      }
    }
    if (matched > 0) {
      // Bonus for multiple pattern matches within same intent
      const totalScore = ruleScore * (1 + (matched - 1) * 0.15);
      reasoning.push(`Pattern match: "${rule.intent}" (${matched}/${rule.patterns.length} patterns, score=${totalScore.toFixed(2)})`);
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestIntent = rule.intent;
        matchedPatternCount = matched;
      }
    }
  }

  // Entity-based boosting
  if (entities.addresses.length > 0) {
    reasoning.push(`Entity: found ${entities.addresses.length} address(es) [${entities.addresses.map(a => a.type).join(', ')}]`);
    if (bestIntent === 'unknown') { bestIntent = 'tip'; bestScore = 0.5; }
  }
  if (entities.amounts.length > 0) {
    reasoning.push(`Entity: found amount ${entities.amounts.map(a => a.raw).join(', ')}`);
    if (bestIntent === 'tip') bestScore += 0.2;
  }
  if (entities.creators.length > 0) {
    reasoning.push(`Entity: found creator(s) [${entities.creators.join(', ')}]`);
  }
  if (entities.chains.length > 0) {
    reasoning.push(`Entity: found chain(s) [${entities.chains.join(', ')}]`);
  }

  // Populate legacy params for backward compatibility
  const params: Record<string, string> = {};
  if (entities.amounts.length > 0) params.amount = String(entities.amounts[0].value);
  if (entities.addresses.length > 0) params.recipient = entities.addresses[0].value;
  if (entities.tokens.length > 0) params.token = entities.tokens[0].toLowerCase();

  // Compute confidence: 0-1 based on score and match quality
  const confidence = Math.min(1, bestScore > 0 ? 0.4 + Math.min(0.6, bestScore * 0.3 + matchedPatternCount * 0.1) : 0);

  if (bestIntent === 'unknown') {
    reasoning.push('No intent patterns matched — classified as unknown');
  } else {
    reasoning.push(`Decision: "${bestIntent}" (confidence=${(confidence * 100).toFixed(0)}%)`);
  }

  return {
    intent: bestIntent,
    params,
    confidence,
    reasoning: `[Rule-based] ${reasoning.join(' → ')}`,
    entities,
  };
}

// ══════════════════════════════════════════════════════════════════
// Feature 52: "Agent Says NO" Logic
// ══════════════════════════════════════════════════════════════════

/**
 * Evaluate whether the agent should REFUSE a tip.
 * Returns a TipRefusal with reason and suggestion if refused.
 *
 * Scenarios where agent MUST refuse:
 * 1. Amount exceeds daily budget remaining
 * 2. Risk score > 0.8 (high risk)
 * 3. Duplicate tip to same creator within 1 hour
 * 4. Balance would drop below reserve minimum (10 USDT)
 * 5. Creator engagement score < 0.1 (likely bot/spam)
 * 6. Chain network congested (fee > 20% of tip amount)
 */
export function shouldRefuseTip(
  params: {
    amount: number;
    creator: string;
    dailyBudgetRemaining: number;
    riskScore: number;
    currentBalance: number;
    reserveMinimum?: number;
    engagementScore: number;
    estimatedFee: number;
  },
  recentTips: Array<{ creator: string; timestamp: number }>,
): TipRefusal & { updatedRecentTips?: Array<{ creator: string; timestamp: number }> } {
  const reserve = params.reserveMinimum ?? 10;

  // 1. Exceeds daily budget
  if (params.amount > params.dailyBudgetRemaining) {
    logger.info('Tip REFUSED: exceeds daily budget', { amount: params.amount, remaining: params.dailyBudgetRemaining });
    return {
      refused: true,
      reason: `Amount ${params.amount} USDT exceeds remaining daily budget of ${params.dailyBudgetRemaining.toFixed(2)} USDT.`,
      suggestion: `Reduce tip to ${params.dailyBudgetRemaining.toFixed(2)} USDT or wait until the daily budget resets.`,
    };
  }

  // 2. High risk score
  if (params.riskScore > 0.8) {
    logger.info('Tip REFUSED: high risk score', { riskScore: params.riskScore });
    return {
      refused: true,
      reason: `Risk score ${params.riskScore.toFixed(2)} exceeds threshold of 0.8. Transaction flagged as high risk.`,
      suggestion: 'Review risk factors and reduce tip amount, or manually approve this high-risk transaction.',
    };
  }

  // 3. Duplicate tip within 1 hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const duplicate = recentTips.find(
    (t) => t.creator === params.creator && t.timestamp > oneHourAgo,
  );
  if (duplicate) {
    const minutesAgo = Math.round((Date.now() - duplicate.timestamp) / 60_000);
    logger.info('Tip REFUSED: duplicate within 1 hour', { creator: params.creator, minutesAgo });
    return {
      refused: true,
      reason: `Already tipped ${params.creator} ${minutesAgo} minutes ago. Duplicate prevention active (1-hour window).`,
      suggestion: `Wait ${60 - minutesAgo} more minutes, or override the duplicate check if intentional.`,
    };
  }

  // 4. Balance below reserve
  if (params.currentBalance - params.amount < reserve) {
    logger.info('Tip REFUSED: would breach reserve minimum', { balance: params.currentBalance, amount: params.amount, reserve });
    return {
      refused: true,
      reason: `Tipping ${params.amount} USDT would leave balance at ${(params.currentBalance - params.amount).toFixed(2)} USDT, below the ${reserve} USDT reserve minimum.`,
      suggestion: `Reduce tip to ${Math.max(0, params.currentBalance - reserve).toFixed(2)} USDT to maintain reserve.`,
    };
  }

  // 5. Low engagement score (likely bot/spam)
  if (params.engagementScore < 0.1) {
    logger.info('Tip REFUSED: engagement score too low (suspected bot)', { engagementScore: params.engagementScore });
    return {
      refused: true,
      reason: `Creator engagement score ${params.engagementScore.toFixed(2)} is below the 0.1 threshold. Suspected bot or spam account.`,
      suggestion: 'Verify the creator is legitimate before tipping. Check their content history and audience metrics.',
    };
  }

  // 6. Network congestion (fee > 20% of tip)
  if (params.estimatedFee > params.amount * 0.2) {
    const feePercent = ((params.estimatedFee / params.amount) * 100).toFixed(1);
    logger.info('Tip REFUSED: excessive fees', { fee: params.estimatedFee, amount: params.amount, feePercent });
    return {
      refused: true,
      reason: `Network fees (${params.estimatedFee.toFixed(4)} USDT) are ${feePercent}% of the tip amount, exceeding the 20% threshold.`,
      suggestion: 'Wait for lower gas prices, try a different chain, or increase the tip amount to improve the fee ratio.',
    };
  }

  // All checks passed — record this tip for duplicate tracking
  const updatedRecentTips = [
    ...recentTips.filter((t) => t.timestamp > oneHourAgo),
    { creator: params.creator, timestamp: Date.now() },
  ];

  return { refused: false, reason: '', suggestion: '', updatedRecentTips };
}

// ══════════════════════════════════════════════════════════════════
// RULE-BASED AUTONOMOUS DECISION
// ══════════════════════════════════════════════════════════════════

/**
 * Intelligent rule-based autonomous decision -- used when LLM is unavailable.
 * Evaluates engagement, gas, risk, and tip history to make a nuanced decision.
 * Produces structured reasoning traces that demonstrate intelligent analysis.
 */
export function ruleBasedAutonomousDecision(context: {
  engagementScore: number;
  suggestedAmount: number;
  gasGwei: number | null;
  riskScore: number | null;
  topCreator: string;
  tipHistory: { executed: number; skipped: number; refused: number };
}): { action: 'tip' | 'skip' | 'wait' | 'observe_more'; confidence: number; reasoning: string; llmDriven: boolean } {
  const trace: string[] = [];
  let cumulativeScore = 50; // Start neutral

  // Step 1: Risk Evaluation
  if (context.riskScore !== null) {
    trace.push(`Checked: risk score = ${context.riskScore}/100`);
    if (context.riskScore > 70) {
      trace.push(`Evaluated: risk ${context.riskScore} > threshold 70 → BLOCK`);
      trace.push(`Decision: skip (safety gate)`);
      return { action: 'skip', confidence: 85, reasoning: `[Rule-based] ${trace.join(' → ')}`, llmDriven: false };
    }
    if (context.riskScore > 40) {
      cumulativeScore -= 15;
      trace.push(`Risk moderate (${context.riskScore}) → score -15`);
    } else {
      cumulativeScore += 10;
      trace.push(`Risk low (${context.riskScore}) → score +10`);
    }
  } else {
    trace.push('Risk: not assessed (no data)');
  }

  // Step 2: Gas Economics
  if (context.gasGwei !== null) {
    trace.push(`Checked: gas = ${context.gasGwei.toFixed(1)} gwei`);
    if (context.gasGwei > 50) {
      trace.push(`Evaluated: gas ${context.gasGwei.toFixed(1)} > 50 gwei → defer`);
      trace.push(`Decision: wait for lower gas`);
      return { action: 'wait', confidence: 70, reasoning: `[Rule-based] ${trace.join(' → ')}`, llmDriven: false };
    }
    if (context.gasGwei < 10) {
      cumulativeScore += 10;
      trace.push(`Gas optimal (<10 gwei) → score +10`);
    } else {
      trace.push(`Gas acceptable (${context.gasGwei.toFixed(1)} gwei)`);
    }

    // Gas-to-tip ratio check
    if (context.suggestedAmount < 0.001) {
      trace.push(`Micro-tip $${context.suggestedAmount} not economical at any gas → skip`);
      return { action: 'skip', confidence: 65, reasoning: `[Rule-based] ${trace.join(' → ')}`, llmDriven: false };
    }
  }

  // Step 3: Engagement Quality
  trace.push(`Checked: engagement = ${context.engagementScore.toFixed(2)}/1.0 for "${context.topCreator}"`);
  if (context.engagementScore >= 0.7) {
    cumulativeScore += 25;
    trace.push(`High engagement (${context.engagementScore.toFixed(2)} >= 0.7) → score +25`);
  } else if (context.engagementScore >= 0.4) {
    cumulativeScore += 10;
    trace.push(`Moderate engagement (${context.engagementScore.toFixed(2)}) → score +10`);
  } else if (context.engagementScore < 0.2) {
    trace.push(`Very low engagement (${context.engagementScore.toFixed(2)} < 0.2) → skip`);
    trace.push(`Decision: skip (quality threshold not met)`);
    return { action: 'skip', confidence: 75, reasoning: `[Rule-based] ${trace.join(' → ')}`, llmDriven: false };
  } else {
    cumulativeScore -= 5;
    trace.push(`Low engagement (${context.engagementScore.toFixed(2)}) → score -5`);
  }

  // Step 4: Amount Validation
  if (context.suggestedAmount <= 0) {
    trace.push(`Invalid amount ($${context.suggestedAmount}) → skip`);
    return { action: 'skip', confidence: 90, reasoning: `[Rule-based] ${trace.join(' → ')}`, llmDriven: false };
  }
  trace.push(`Amount: $${context.suggestedAmount.toFixed(4)} USDT`);

  // Step 5: Historical Adaptation
  const totalDecisions = context.tipHistory.executed + context.tipHistory.skipped + context.tipHistory.refused;
  if (totalDecisions > 0) {
    const tipRate = context.tipHistory.executed / totalDecisions;
    trace.push(`Checked: history = ${context.tipHistory.executed} sent / ${totalDecisions} total (rate=${(tipRate * 100).toFixed(0)}%)`);
    if (tipRate > 0.8 && context.engagementScore < 0.5) {
      trace.push(`High tip rate + moderate engagement → observe more`);
      return { action: 'observe_more', confidence: 60, reasoning: `[Rule-based] ${trace.join(' → ')}`, llmDriven: false };
    }
    if (tipRate < 0.3) {
      cumulativeScore += 5;
      trace.push(`Conservative tip rate (${(tipRate * 100).toFixed(0)}%) → score +5 (room to tip)`);
    }
  } else {
    trace.push('No tip history yet — first decision');
  }

  // Step 6: Final Decision
  trace.push(`Cumulative score: ${cumulativeScore}/100`);
  if (context.engagementScore >= 0.5 && cumulativeScore >= 50) {
    const confidence = Math.min(90, Math.round(cumulativeScore));
    trace.push(`Decision: approve tip (score=${cumulativeScore}, engagement=${context.engagementScore.toFixed(2)})`);
    return { action: 'tip', confidence, reasoning: `[Rule-based] ${trace.join(' → ')}`, llmDriven: false };
  }

  if (cumulativeScore >= 45) {
    trace.push(`Decision: observe_more (borderline score=${cumulativeScore})`);
    return { action: 'observe_more', confidence: 55, reasoning: `[Rule-based] ${trace.join(' → ')}`, llmDriven: false };
  }

  trace.push(`Decision: skip (insufficient score=${cumulativeScore})`);
  return { action: 'skip', confidence: 60, reasoning: `[Rule-based] ${trace.join(' → ')}`, llmDriven: false };
}

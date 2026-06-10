// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Loop Cycle Phases (extracted from autonomous-loop.service.ts)
// Contains: observePhase, reasonPhase, actPhase, reflectPhase

import { logger } from '../utils/logger.js';
import type { SimulatedEvent } from './event-simulator.service.js';
import type { MemoryService } from './memory.service.js';
import type { OrchestratorService } from './orchestrator.service.js';
import type { RumbleService } from './rumble.service.js';
import type { OpenClawService, ReActTrace } from './openclaw.service.js';
import type { WalletService } from './wallet.service.js';
import type { SafetyService, PolicyValidation } from './safety.service.js';
import type { AIService } from './ai.service.js';
import type { DecisionLogService } from './decision-log.service.js';
import type { MultiStrategyService, StrategyDecision } from './multi-strategy.service.js';
import type { FinancialPulse, WalletMoodState } from './financial-pulse.js';
import type { MoodModifiers } from './financial-pulse.js';
import type { LoopCycleResult, LLMLoopDecision } from './loop-learning.js';
import {
  findBestEvent as doFindBestEvent,
  extractToolResults as doExtractToolResults,
} from './loop-helpers.js';
import { DeduplicationService } from './loop-helpers.js';

// ── Shared deps passed into each phase ─────────────────────────

export interface CycleDeps {
  ai: AIService;
  memory: MemoryService;
  orchestrator: OrchestratorService;
  decisionLog: DecisionLogService;
  rumble: RumbleService | null;
  openClaw: OpenClawService | null;
  walletService: WalletService | null;
  safetyService: SafetyService | null;
  multiStrategy: MultiStrategyService | null;
  dedup: DeduplicationService;

  // State accessors (reads from AutonomousLoopService fields)
  tipsExecuted: number;
  tipsSkipped: number;
  tipsRefused: number;
  lastFinancialPulse: FinancialPulse | null;
  lastWalletMood: WalletMoodState | null;
  trustedCreators: Set<string>;
  explorationRate: number;

  // Methods delegated from the service
  getMoodBatchSize: () => number;
  getMoodRiskTolerance: () => number;
  getMoodModifiers: () => MoodModifiers;
  getMoodPreferredChain: () => string;
  getMoodAutoTipThreshold: () => number;
  getFinancialPulse: () => Promise<FinancialPulse>;
  getWalletMood: (pulse: FinancialPulse) => WalletMoodState;
  getLearnedInsights: () => string;
  learnedGasThreshold: number | null;
  learnedBestHours: number[];
}

export interface ObserveResult {
  newEvents: SimulatedEvent[];
  allNewEvents: SimulatedEvent[];
  eventSource: string;
  lastEventTimestamp: string | null;
  lastDataSource: 'live' | 'simulated' | 'none';
  observation: string;
  creators: Array<{ name: string; walletAddress?: string; totalTipsReceived: number; totalTipAmount: number }>;
  creatorContext: string;
}

// ── PHASE 2: REASON ────────────────────────────────────────────

export interface ReasonResult {
  llmDecision: LLMLoopDecision | null;
  lastOpenClawTrace: ReActTrace | null;
  lastStrategyDecisions: StrategyDecision[];
  currentCycleExplored: boolean;
}

/**
 * Phase 2: Reason — OpenClaw ReAct + LLM fallback.
 * Selects a creator and decides whether to tip, skip, wait, or observe.
 */
export async function reasonPhase(
  deps: CycleDeps,
  newEvents: SimulatedEvent[],
  _observation: string,
  _pulse: FinancialPulse | undefined,
  _moodState: WalletMoodState | undefined,
): Promise<ReasonResult> {
  let llmDecision: LLMLoopDecision | null = null;
  let lastOpenClawTrace: ReActTrace | null = null;
  let currentCycleExplored = false;

  if (deps.openClaw && newEvents.length > 0) {
    try {
      // Mood-driven creator selection
      const moodMods = deps.getMoodModifiers();
      let bestEvent: SimulatedEvent;
      if (moodMods.creatorSelectionStrategy === 'favor_new' && newEvents.length > 1) {
        const untrusted = newEvents.filter(e => !deps.trustedCreators.has(e.creatorName));
        if (untrusted.length > 0) {
          bestEvent = untrusted.reduce((a, b) => b.engagementQuality > a.engagementQuality ? b : a, untrusted[0]);
          currentCycleExplored = true;
          logger.info('Generous mood: favoring new/undiscovered creator', { creator: bestEvent.creatorName, strategy: 'favor_new' });
        } else {
          bestEvent = newEvents.reduce((a, b) => b.engagementQuality > a.engagementQuality ? b : a, newEvents[0]);
        }
      } else if (moodMods.creatorSelectionStrategy === 'trusted_only' && newEvents.length > 1) {
        const trusted = newEvents.filter(e => deps.trustedCreators.has(e.creatorName));
        if (trusted.length > 0) {
          bestEvent = trusted.reduce((a, b) => b.engagementQuality > a.engagementQuality ? b : a, trusted[0]);
          logger.info('Cautious mood: selecting trusted creator only', { creator: bestEvent.creatorName, strategy: 'trusted_only' });
        } else {
          bestEvent = newEvents.reduce((a, b) => b.engagementQuality > a.engagementQuality ? b : a, newEvents[0]);
          logger.info('Cautious mood: no trusted creators, using best engagement', { creator: bestEvent.creatorName });
        }
      } else if (newEvents.length > 1 && Math.random() < deps.explorationRate) {
        const randomIndex = Math.floor(Math.random() * newEvents.length);
        bestEvent = newEvents[randomIndex];
        currentCycleExplored = true;
        logger.info('Exploration: randomly selected creator for discovery', { creator: bestEvent.creatorName, explorationRate: deps.explorationRate });
      } else {
        bestEvent = newEvents.reduce((a, b) => b.engagementQuality > a.engagementQuality ? b : a, newEvents[0]);
        logger.info('Exploitation: selected top creator', { creator: bestEvent.creatorName, engagementScore: bestEvent.engagementQuality });
      }

      const goal = `Analyze engagement: ${bestEvent.creatorName} has ${bestEvent.type} event with quality ${bestEvent.engagementQuality}. Check price conditions and gas costs to decide whether to tip.`;
      const trace = await deps.openClaw.executeGoal(goal, 'tip_agent', 4);
      lastOpenClawTrace = trace;

      if (trace.status === 'completed' && trace.toolsUsed.length > 0) {
        const toolResults = doExtractToolResults(trace);
        const gasGwei = toolResults.gasGwei;
        const riskScore = toolResults.riskScore;
        const tokenPriceUsd = toolResults.tokenPriceUsd;

        // Adaptive thresholds from memory
        const chainPerfMemory = deps.memory.recall('chain_perf_ethereum-sepolia');
        let GAS_THRESHOLD_GWEI = 50;
        if (chainPerfMemory) {
          try {
            const perf = JSON.parse(chainPerfMemory.value) as { avgFee: number; successRate: number };
            if (perf.avgFee < 0.0005) GAS_THRESHOLD_GWEI = 30;
            else if (perf.avgFee > 0.01) GAS_THRESHOLD_GWEI = 80;
          } catch { /* use default */ }
        }

        const gasMod = deps.getMoodModifiers();
        GAS_THRESHOLD_GWEI = Math.round(GAS_THRESHOLD_GWEI * gasMod.gasPriceTolerance);
        logger.debug('Gas threshold adjusted by mood', { mood: gasMod.mood, tolerance: gasMod.gasPriceTolerance, threshold: GAS_THRESHOLD_GWEI });

        let RISK_THRESHOLD = deps.getMoodRiskTolerance();
        const tipRateMemory = deps.memory.recall('context_agent_tip_rate');
        if (tipRateMemory) {
          try {
            const rate = parseFloat(tipRateMemory.value);
            if (rate < 0.05) RISK_THRESHOLD = Math.min(RISK_THRESHOLD + 15, 80);
            else if (rate > 0.3) RISK_THRESHOLD = Math.max(RISK_THRESHOLD - 10, 40);
          } catch { /* use default */ }
        }

        const reasoningParts: string[] = [];
        reasoningParts.push(`engagement=${bestEvent.engagementQuality}`);
        if (gasGwei !== null) reasoningParts.push(`gas=${gasGwei.toFixed(1)}gwei`);
        if (riskScore !== null) reasoningParts.push(`risk=${riskScore}/100`);
        if (tokenPriceUsd !== null) reasoningParts.push(`USDT=$${tokenPriceUsd.toFixed(4)}`);

        // PRIMARY: LLM decision using OpenClaw data
        try {
          const memoryCtx = deps.memory.buildContextForLLM();
          const llmResult = await deps.ai.makeAutonomousDecision({
            observation: `OpenClaw analyzed ${bestEvent.creatorName}: ${reasoningParts.join(', ')}. Tools used: ${trace.toolsUsed.join(', ')}. ${trace.totalSteps} reasoning steps.`,
            topCreator: bestEvent.creatorName,
            engagementScore: bestEvent.engagementQuality,
            suggestedAmount: bestEvent.suggestedTipAmount,
            gasGwei,
            riskScore,
            tokenPrice: tokenPriceUsd,
            tipHistory: { executed: deps.tipsExecuted, skipped: deps.tipsSkipped, refused: deps.tipsRefused },
            memoryContext: memoryCtx,
          });

          if (llmResult.llmDriven) {
            llmDecision = {
              action: llmResult.action,
              creatorName: bestEvent.creatorName,
              creatorId: bestEvent.creatorId,
              amount: llmResult.action === 'tip' ? bestEvent.suggestedTipAmount : undefined,
              reason: `${llmResult.reasoning} | Data: ${reasoningParts.join(', ')} | Proof: ${trace.executionProof.slice(0, 16)}`,
              confidence: llmResult.confidence,
              engagementAssessment: `LLM decision informed by OpenClaw pipeline (${trace.toolsUsed.join(' → ')})`,
            };
            logger.info('LLM made decision using OpenClaw data', { action: llmResult.action, confidence: llmResult.confidence, creator: bestEvent.creatorName, tools: trace.toolsUsed });
          }
        } catch (err) {
          logger.warn('LLM decision with OpenClaw data failed, using rule-based fallback', { error: String(err) });
        }

        // FALLBACK: Rule-based decision matrix
        if (!llmDecision) {
          llmDecision = ruleBasedOpenClawDecision(bestEvent, riskScore, RISK_THRESHOLD, gasGwei, GAS_THRESHOLD_GWEI, tokenPriceUsd, reasoningParts, trace);
        }

        logger.info(`OpenClaw reasoning: ${llmDecision!.action} for ${bestEvent.creatorName}`, {
          engagement: bestEvent.engagementQuality, gasGwei, riskScore, tokenPriceUsd,
          steps: trace.totalSteps, proof: trace.executionProof.slice(0, 12),
        });
      }
    } catch (err) {
      logger.warn('OpenClaw reasoning failed, falling back to LLM/rule-based', { error: String(err) });
    }
  }

  return { llmDecision, lastOpenClawTrace, lastStrategyDecisions: [], currentCycleExplored };
}

/**
 * Rule-based decision when LLM is unavailable during OpenClaw reasoning.
 */
function ruleBasedOpenClawDecision(
  bestEvent: SimulatedEvent,
  riskScore: number | null,
  RISK_THRESHOLD: number,
  gasGwei: number | null,
  GAS_THRESHOLD_GWEI: number,
  tokenPriceUsd: number | null,
  reasoningParts: string[],
  trace: ReActTrace,
): LLMLoopDecision {
  if (riskScore !== null && riskScore > RISK_THRESHOLD) {
    return {
      action: 'skip',
      creatorName: bestEvent.creatorName,
      reason: `[OpenClaw] SKIP — risk too high (${riskScore}/100 > ${RISK_THRESHOLD} threshold). ${reasoningParts.join(', ')}. Tools: ${trace.toolsUsed.join(', ')}`,
      confidence: 80,
      engagementAssessment: `Risk score ${riskScore} exceeds safety threshold; engagement quality irrelevant`,
    };
  } else if (gasGwei !== null && gasGwei > GAS_THRESHOLD_GWEI && bestEvent.engagementQuality >= 0.5) {
    return {
      action: 'observe_more',
      creatorName: bestEvent.creatorName,
      reason: `[OpenClaw] WAIT — gas too expensive (${gasGwei.toFixed(1)}gwei > ${GAS_THRESHOLD_GWEI} threshold) despite good engagement. ${reasoningParts.join(', ')}. Tools: ${trace.toolsUsed.join(', ')}`,
      confidence: 75,
      engagementAssessment: `Good engagement ${bestEvent.engagementQuality} but gas costs make tipping uneconomical right now`,
    };
  } else if (bestEvent.engagementQuality >= 0.5) {
    let tipAmount = bestEvent.suggestedTipAmount;
    if (tokenPriceUsd !== null && tokenPriceUsd > 0) {
      tipAmount = bestEvent.suggestedTipAmount / tokenPriceUsd;
    }
    return {
      action: 'tip',
      creatorName: bestEvent.creatorName,
      creatorId: bestEvent.creatorId,
      amount: tipAmount,
      reason: `[OpenClaw] TIP — all checks passed. ${reasoningParts.join(', ')}. ${trace.totalSteps} steps, proof: ${trace.executionProof.slice(0, 16)}`,
      confidence: Math.round(bestEvent.engagementQuality * 100),
      engagementAssessment: `OpenClaw validated via ${trace.toolsUsed.join(' → ')} pipeline — conditions favorable`,
    };
  } else if (bestEvent.engagementQuality >= 0.4) {
    return {
      action: 'observe_more',
      creatorName: bestEvent.creatorName,
      reason: `[OpenClaw] OBSERVE — engagement ${bestEvent.engagementQuality} is borderline. ${reasoningParts.join(', ')}. ${trace.toolsUsed.length} tools consulted.`,
      confidence: 60,
    };
  } else {
    return {
      action: 'skip',
      creatorName: bestEvent.creatorName,
      reason: `[OpenClaw/rule-based] SKIP — low engagement ${bestEvent.engagementQuality}. ${reasoningParts.join(', ')}. ${trace.toolsUsed.length} tools consulted.`,
      confidence: 70,
    };
  }
}

// ── PHASE 3: ACT ──────────────────────────────────────────────

export interface ActResult {
  actionTaken: string;
  outcome: LoopCycleResult['outcome'];
  tipsExecutedDelta: number;
  tipsSkippedDelta: number;
  tipsRefusedDelta: number;
  earlyReturn?: LoopCycleResult;
}

/**
 * Phase 3: Act — Execute the LLM's decision (tip, skip, wait, etc.)
 * Returns deltas for tip counters, and an optional early-return cycle result.
 */
export async function actPhase(
  deps: CycleDeps,
  llmDecision: LLMLoopDecision | null,
  newEvents: SimulatedEvent[],
  creators: Array<{ name: string; walletAddress?: string; totalTipsReceived: number; totalTipAmount: number }>,
  cycleNumber: number,
  cycleStart: number,
  observation: string,
  pulse: FinancialPulse | undefined,
  moodState: WalletMoodState | undefined,
): Promise<ActResult> {
  let actionTaken = '';
  let outcome: LoopCycleResult['outcome'] = 'skipped';
  let tipsExecutedDelta = 0;
  let tipsSkippedDelta = 0;
  let tipsRefusedDelta = 0;

  if (llmDecision && llmDecision.action === 'tip' && llmDecision.creatorName) {
    const bestEvent = doFindBestEvent(newEvents, llmDecision.creatorName);
    const dedupKey = bestEvent?.id ?? `cycle_${cycleNumber}`;

    if (deps.dedup.isDuplicate(dedupKey, llmDecision.creatorId ?? llmDecision.creatorName, 'auto_tip')) {
      actionTaken = `DUPLICATE PREVENTED: Already tipped ${llmDecision.creatorName} for this event within the last hour`;
      outcome = 'skipped';
      tipsSkippedDelta++;
      logger.info('Duplicate tip prevented', { creator: llmDecision.creatorName, eventId: dedupKey });
    } else {
      const result = await executeTip(
        deps, llmDecision, newEvents, creators, bestEvent, dedupKey,
        cycleNumber, cycleStart, observation, pulse, moodState,
      );
      actionTaken = result.actionTaken;
      outcome = result.outcome;
      tipsExecutedDelta = result.tipsExecutedDelta;
      tipsSkippedDelta = result.tipsSkippedDelta;
      tipsRefusedDelta = result.tipsRefusedDelta;
      if (result.earlyReturn) {
        return { actionTaken, outcome, tipsExecutedDelta, tipsSkippedDelta, tipsRefusedDelta, earlyReturn: result.earlyReturn };
      }
    }
  } else if (llmDecision?.action === 'skip') {
    actionTaken = `SKIPPED: ${llmDecision.reason}`;
    outcome = 'skipped';
    tipsSkippedDelta++;
  } else if (llmDecision?.action === 'wait') {
    actionTaken = `WAITING: ${llmDecision.reason}`;
    outcome = 'skipped';
  } else if (llmDecision?.action === 'observe_more') {
    actionTaken = `OBSERVING: ${llmDecision.reason}`;
    outcome = 'skipped';
  } else {
    actionTaken = 'No actionable decision from LLM';
    outcome = 'skipped';
    tipsSkippedDelta++;
  }

  return { actionTaken, outcome, tipsExecutedDelta, tipsSkippedDelta, tipsRefusedDelta };
}

/** Internal: execute a tip after dedup check passes */
async function executeTip(
  deps: CycleDeps,
  llmDecision: LLMLoopDecision,
  newEvents: SimulatedEvent[],
  creators: Array<{ name: string; walletAddress?: string; totalTipsReceived: number; totalTipAmount: number }>,
  bestEvent: SimulatedEvent | undefined,
  dedupKey: string,
  cycleNumber: number,
  cycleStart: number,
  observation: string,
  pulse: FinancialPulse | undefined,
  moodState: WalletMoodState | undefined,
): Promise<ActResult> {
  let actionTaken = '';
  let outcome: LoopCycleResult['outcome'] = 'skipped';
  let tipsExecutedDelta = 0;
  let tipsSkippedDelta = 0;
  let tipsRefusedDelta = 0;

  const creator = creators.find(c => c.name === llmDecision.creatorName);
  const baseTipAmount = llmDecision.amount ?? bestEvent?.suggestedTipAmount ?? 0.003;
  const modifiers = deps.getMoodModifiers();
  const moodMultiplier = moodState?.tipMultiplier ?? 1.0;
  const autoTipThreshold = deps.getMoodAutoTipThreshold();
  let tipAmount = parseFloat((baseTipAmount * moodMultiplier * (1 + modifiers.tipAmountBonus)).toFixed(6));
  if (tipAmount > autoTipThreshold) {
    logger.info('Mood auto-tip threshold clamped tip amount', { mood: moodState?.mood, unclamped: tipAmount, threshold: autoTipThreshold });
    tipAmount = autoTipThreshold;
  }
  if (moodMultiplier !== 1.0 || modifiers.tipAmountBonus !== 0) {
    logger.info('Wallet mood adjusted tip amount', {
      mood: moodState?.mood, base: baseTipAmount, adjusted: tipAmount,
      multiplier: moodMultiplier, bonus: `${modifiers.tipAmountBonus >= 0 ? '+' : ''}${(modifiers.tipAmountBonus * 100).toFixed(0)}%`,
    });
  }

  const preferredChain = deps.getMoodPreferredChain();

  // Conservation mode check
  if (pulse && pulse.liquidityScore < 20 && !bestEvent?.isMilestone) {
    actionTaken = `CONSERVATION MODE: Skipping tip to ${llmDecision.creatorName} — liquidity critically low (${pulse.liquidityScore}/100, ${pulse.totalAvailableUsdt.toFixed(4)} USDT available)`;
    outcome = 'skipped';
    tipsSkippedDelta++;
    logger.warn('Conservation mode blocked non-essential tip', { creator: llmDecision.creatorName, liquidityScore: pulse.liquidityScore });
    const cycleDuration = Date.now() - cycleStart;
    deps.decisionLog.logDecision({
      cycleNumber, observation: observation.slice(0, 500),
      llmRecommendation: `${llmDecision.action}: ${llmDecision.reason} (confidence: ${llmDecision.confidence}%)`,
      actionTaken, outcome,
      creatorName: llmDecision.creatorName, tipAmount: baseTipAmount, chain: preferredChain,
      engagementScore: newEvents.length > 0 ? Math.max(...newEvents.map(e => e.engagementQuality)) : undefined,
      cycleDurationMs: cycleDuration, llmProvider: deps.ai.getProvider(),
    });
    return {
      actionTaken, outcome, tipsExecutedDelta, tipsSkippedDelta, tipsRefusedDelta,
      earlyReturn: { cycleNumber, phase: 'act' as const, events: newEvents, llmDecision, actionTaken, outcome, durationMs: cycleDuration, financialPulse: pulse, walletMood: moodState },
    };
  }

  const orchestratorResult = await deps.orchestrator.propose('tip', {
    recipient: creator?.walletAddress ?? '0x0000000000000000000000000000000000000000',
    amount: String(tipAmount),
    token: 'usdt',
    chainId: preferredChain,
    memo: `[Auto] ${llmDecision.reason}`,
  });

  if (orchestratorResult.consensus === 'approved') {
    const recipientAddr = creator?.walletAddress ?? '0x0000000000000000000000000000000000000000';

    // Safety gate
    if (deps.safetyService) {
      const safetyCheck: PolicyValidation = deps.safetyService.validateTip({ recipient: recipientAddr, amount: tipAmount, chain: preferredChain, token: 'USDT' });
      if (!safetyCheck.allowed) {
        actionTaken = `BLOCKED BY SAFETY: ${safetyCheck.reason} (policy: ${safetyCheck.policy})`;
        outcome = 'refused';
        tipsRefusedDelta++;
        logger.warn('Safety service blocked autonomous tip', { creator: llmDecision.creatorName, amount: tipAmount, reason: safetyCheck.reason, policy: safetyCheck.policy });
        const cycleDuration = Date.now() - cycleStart;
        deps.decisionLog.logDecision({
          cycleNumber, observation: observation.slice(0, 500),
          llmRecommendation: `${llmDecision.action}: ${llmDecision.reason} (confidence: ${llmDecision.confidence}%)`,
          actionTaken, outcome,
          creatorName: llmDecision.creatorName, tipAmount: llmDecision.amount, chain: preferredChain,
          engagementScore: newEvents.length > 0 ? Math.max(...newEvents.map(e => e.engagementQuality)) : undefined,
          cycleDurationMs: cycleDuration, llmProvider: deps.ai.getProvider(),
        });
        return {
          actionTaken, outcome, tipsExecutedDelta, tipsSkippedDelta, tipsRefusedDelta,
          earlyReturn: { cycleNumber, phase: 'act' as const, events: newEvents, llmDecision, actionTaken, outcome, durationMs: cycleDuration, financialPulse: pulse, walletMood: moodState },
        };
      }
    }

    // Gas economics gate
    const estimatedGasUsd = parseFloat(process.env.GAS_ESTIMATE_USD ?? '0.001');
    if (tipAmount < estimatedGasUsd) {
      logger.info('Gas economics gate: tip too small relative to gas cost', { tipAmount, estimatedGasUsd, ratio: (tipAmount / estimatedGasUsd).toFixed(2) });
      actionTaken = `APPROVED (off-chain only): Tip $${tipAmount} to ${llmDecision.creatorName} — gas ($${estimatedGasUsd}) exceeds tip value. Logged for batch settlement.`;
      outcome = 'executed';
      tipsExecutedDelta++;
      deps.dedup.mark(dedupKey, llmDecision.creatorId ?? llmDecision.creatorName ?? 'unknown', 'auto_tip');
      logger.info('Micro-tip logged for batch settlement', { creator: llmDecision.creatorName, amount: tipAmount });
      const cycleDuration = Date.now() - cycleStart;
      deps.decisionLog.logDecision({
        cycleNumber, observation: observation.slice(0, 500),
        llmRecommendation: `${llmDecision.action}: ${llmDecision.reason} (confidence: ${llmDecision.confidence}%)`,
        actionTaken, outcome,
        creatorName: llmDecision.creatorName, tipAmount, chain: preferredChain,
        engagementScore: newEvents.length > 0 ? Math.max(...newEvents.map(e => e.engagementQuality)) : undefined,
        cycleDurationMs: cycleDuration, llmProvider: deps.ai.getProvider(),
      });
      deps.memory.learnCreatorPreference(llmDecision.creatorName ?? 'unknown', newEvents[0]?.engagementQuality ?? 0.5, true);
      deps.memory.learnTimePattern(new Date().getHours(), new Date().getDay(), newEvents.length);
      return {
        actionTaken, outcome, tipsExecutedDelta, tipsSkippedDelta, tipsRefusedDelta,
        earlyReturn: { cycleNumber, phase: 'act' as const, events: newEvents, llmDecision, actionTaken, outcome, durationMs: cycleDuration, financialPulse: pulse, walletMood: moodState },
      };
    }

    // Execute real on-chain tip
    let txHash = '';
    if (deps.walletService && recipientAddr !== '0x0000000000000000000000000000000000000000') {
      try {
        const txResult = await deps.walletService.sendUsdtTransfer(
          preferredChain as Parameters<typeof deps.walletService.sendUsdtTransfer>[0],
          recipientAddr, String(tipAmount),
        );
        txHash = txResult.hash;
        logger.info('Autonomous tip sent on-chain via WDK', { txHash, fee: txResult.fee });
        if (deps.safetyService) deps.safetyService.recordSpend(recipientAddr, tipAmount);
      } catch (err) {
        logger.warn('On-chain tip execution failed (non-fatal)', { error: String(err), recipient: recipientAddr });
        txHash = `failed:${String(err).slice(0, 50)}`;
      }
    }

    actionTaken = `APPROVED: Tip ${tipAmount} USDT to ${llmDecision.creatorName}${txHash ? ` (tx: ${txHash.slice(0, 18)})` : ''}${moodState ? ` [mood: ${moodState.mood}, x${moodState.tipMultiplier}]` : ''} — ${llmDecision.reason}`;
    outcome = 'executed';
    tipsExecutedDelta++;
    deps.dedup.mark(dedupKey, llmDecision.creatorId ?? llmDecision.creatorName ?? 'unknown', 'auto_tip');
    logger.info('Autonomous tip approved', {
      creator: llmDecision.creatorName, amount: tipAmount,
      confidence: llmDecision.confidence, orchestratorConfidence: orchestratorResult.overallConfidence,
      txHash: txHash || 'no-wallet-service',
    });

    // Feedback loop
    const tipSuccess = !txHash.startsWith('failed:');
    deps.orchestrator.learnFromOutcome(orchestratorResult.id, tipSuccess, {
      recipient: recipientAddr, amount: tipAmount, error: tipSuccess ? undefined : txHash,
    });
  } else if (orchestratorResult.consensus === 'rejected') {
    actionTaken = `REFUSED by orchestrator: ${orchestratorResult.reasoningChain.slice(-1)[0]}`;
    outcome = 'refused';
    tipsRefusedDelta++;
  } else {
    actionTaken = `SPLIT DECISION — needs human review: ${orchestratorResult.reasoningChain.slice(-1)[0]}`;
    outcome = 'skipped';
    tipsSkippedDelta++;
  }

  return { actionTaken, outcome, tipsExecutedDelta, tipsSkippedDelta, tipsRefusedDelta };
}

// ── PHASE 4: REFLECT ──────────────────────────────────────────

/**
 * Phase 4: Reflect — Log the decision, update memory with learnings.
 */
export function reflectPhase(
  deps: CycleDeps,
  cycleNumber: number,
  observation: string,
  llmDecision: LLMLoopDecision | null,
  actionTaken: string,
  outcome: LoopCycleResult['outcome'],
  newEvents: SimulatedEvent[],
  cycleDuration: number,
  lastDataSource: 'live' | 'simulated' | 'none',
  totalCycles: number,
  tipsExecuted: number,
): void {
  deps.decisionLog.logDecision({
    cycleNumber,
    observation: observation.slice(0, 500),
    llmRecommendation: llmDecision
      ? `${llmDecision.action}: ${llmDecision.reason} (confidence: ${llmDecision.confidence}%)`
      : 'No recommendation',
    actionTaken,
    outcome,
    creatorName: llmDecision?.creatorName,
    tipAmount: llmDecision?.amount,
    chain: deps.getMoodPreferredChain(),
    engagementScore: newEvents.length > 0
      ? Math.max(...newEvents.map(e => e.engagementQuality))
      : undefined,
    cycleDurationMs: cycleDuration,
    llmProvider: deps.ai.getProvider(),
    dataSource: lastDataSource,
  });

  // Update memory with learnings
  if (outcome === 'executed' && llmDecision?.creatorName) {
    deps.memory.remember('fact', `last_auto_tip_${llmDecision.creatorName}`,
      `Auto-tipped ${llmDecision.amount ?? 0.003} USDT at cycle ${cycleNumber}`, 'observed');

    const bestEvent = doFindBestEvent(newEvents, llmDecision.creatorName);
    if (bestEvent) {
      deps.memory.learnCreatorPreference(llmDecision.creatorName, bestEvent.engagementQuality, true);
    }
    deps.memory.learnChainPerformance(deps.getMoodPreferredChain(), 0.001, cycleDuration, outcome === 'executed');
    if (bestEvent) {
      deps.memory.learnTipEffectiveness(llmDecision.creatorName, bestEvent.engagementQuality * 1.1, bestEvent.engagementQuality);
    }
  }

  // Learn time patterns
  const now = new Date();
  deps.memory.learnTimePattern(now.getHours(), now.getDay(), newEvents.length);

  // Store tip rate
  if (totalCycles > 0) {
    const tipRate = tipsExecuted / totalCycles;
    deps.memory.remember('context', 'context_agent_tip_rate', String(tipRate.toFixed(4)), 'observed');
  }

  // Learn creator prefs for skipped creators too
  if (outcome === 'skipped' && llmDecision?.creatorName) {
    const skippedEvent = doFindBestEvent(newEvents, llmDecision.creatorName);
    if (skippedEvent) {
      deps.memory.learnCreatorPreference(llmDecision.creatorName, skippedEvent.engagementQuality, false);
    }
  }

  if (newEvents.length > 0) {
    const topEvent = newEvents.reduce((best, e) =>
      e.engagementQuality > best.engagementQuality ? e : best, newEvents[0]);
    deps.memory.remember('context', 'last_observed_event',
      `${topEvent.type} from ${topEvent.creatorName} (engagement: ${topEvent.engagementQuality})`, 'observed');
  }
}

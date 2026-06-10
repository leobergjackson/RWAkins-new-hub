// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent

import { logger } from '../utils/logger.js';
import type { ReputationPassportService } from './reputation-passport.service.js';
import type { CreditScoringService } from './credit-scoring.service.js';

// ── Types ──────────────────────────────────────────────────────

/** Result of data-integrity validation on a tip proposal */
export interface DataIntegrityResult {
  valid: boolean;
  violations: string[];
}

/** Severity levels for safety decisions, ordered from most to least restrictive */
export type SeverityLevel = 'block' | 'require_confirmation' | 'warn_and_execute' | 'execute';

/** Audit entry for de-escalation prevention */
export interface DeEscalationAuditEntry {
  timestamp: string;
  originalSeverity: SeverityLevel;
  attemptedSeverity: SeverityLevel;
  source: string;
  overridden: boolean;
  context: string;
}

// ── Severity Escalation Enforcement ──────────────────────────────

/** Severity ranking: lower index = more restrictive */
const SEVERITY_RANK: Record<SeverityLevel, number> = {
  block: 0,
  require_confirmation: 1,
  warn_and_execute: 2,
  execute: 3,
};

/**
 * Validate that an LLM (or any downstream component) never de-escalates
 * the severity of a safety decision. If the proposed severity is LESS
 * restrictive than the original, the original is preserved.
 *
 * @returns The effective severity (always >= original in restrictiveness)
 *          and whether an override occurred.
 */
export function validateSeverityEscalation(
  originalSeverity: SeverityLevel,
  proposedSeverity: SeverityLevel,
  source: string = 'unknown',
): { effectiveSeverity: SeverityLevel; overridden: boolean; message: string } {
  const originalRank = SEVERITY_RANK[originalSeverity];
  const proposedRank = SEVERITY_RANK[proposedSeverity];

  if (proposedRank > originalRank) {
    // Proposed is LESS restrictive — override with original
    const message = `LLM attempted to de-escalate from ${originalSeverity} to ${proposedSeverity} — overridden`;
    logger.warn(message, { source, originalSeverity, proposedSeverity });
    return { effectiveSeverity: originalSeverity, overridden: true, message };
  }

  return {
    effectiveSeverity: proposedSeverity,
    overridden: false,
    message: `Severity ${proposedSeverity} accepted (same or more restrictive than ${originalSeverity})`,
  };
}

/**
 * Map an orchestrator consensus to a severity level.
 * Used to compare rule-based consensus with LLM-proposed overrides.
 */
function consensusToSeverity(consensus: OrchestratedAction['consensus']): SeverityLevel {
  switch (consensus) {
    case 'rejected': return 'block';
    case 'split_decision': return 'require_confirmation';
    case 'approved': return 'execute';
    case 'pending': return 'require_confirmation';
    default: return 'require_confirmation';
  }
}

/** Sub-agent roles in the orchestration protocol */
export type AgentRole = 'tip_executor' | 'guardian' | 'treasury_optimizer';

/** A sub-agent's vote on a proposed action */
export interface AgentVote {
  agent: AgentRole;
  decision: 'approve' | 'reject' | 'abstain';
  confidence: number; // 0-100
  reasoning: string;
  timestamp: string;
}

/** A proposed action that sub-agents vote on */
export interface OrchestratedAction {
  id: string;
  type: 'tip' | 'escrow' | 'stream' | 'bridge' | 'lend';
  params: {
    recipient?: string;
    amount?: string;
    token?: string;
    chainId?: string;
    memo?: string;
    [key: string]: unknown;
  };
  /** Votes from each sub-agent */
  votes: AgentVote[];
  /** Final consensus decision */
  consensus: 'approved' | 'rejected' | 'pending' | 'split_decision';
  /** Overall confidence (weighted average of votes) */
  overallConfidence: number;
  /** Full reasoning chain */
  reasoningChain: string[];
  /** Timestamps */
  proposedAt: string;
  resolvedAt?: string;
  /** If executed, the result */
  executionResult?: {
    success: boolean;
    txHash?: string;
    error?: string;
  };
}

/** Sub-agent configuration */
interface SubAgentConfig {
  role: AgentRole;
  name: string;
  description: string;
  weight: number; // Vote weight (higher = more influential)
  evaluator: (action: OrchestratedAction, peerContext?: string) => AgentVote;
}

// ── Service ────────────────────────────────────────────────────

/**
 * OrchestratorService — Multi-Agent Orchestration Protocol
 *
 * Three specialized sub-agents independently evaluate every tip:
 *
 * 1. TipExecutor — Evaluates feasibility (can we execute this?)
 *    - Checks balance sufficiency
 *    - Validates recipient address format
 *    - Estimates gas costs
 *
 * 2. Guardian — Evaluates safety (should we execute this?)
 *    - Checks spending limits
 *    - Validates recipient trust score
 *    - Detects anomalous patterns (unusual amount, new recipient, etc.)
 *
 * 3. TreasuryOptimizer — Evaluates economics (is this the best way?)
 *    - Compares fees across chains
 *    - Checks if better timing exists
 *    - Evaluates impact on treasury reserves
 *
 * Consensus rule: 2-of-3 must approve for execution.
 * Guardian has veto power (can reject even with 2 approvals).
 *
 * This architecture ensures no single point of failure in
 * autonomous tip decisions — the agent system is self-checking.
 */
/** AI service interface for LLM-enriched sub-agent reasoning */
interface AIServiceRef {
  isAvailable(): boolean;
  generateThought?(prompt: string): Promise<string | null>;
}

export class OrchestratorService {
  private actions: OrchestratedAction[] = [];
  private counter = 0;
  private subAgents: SubAgentConfig[];
  private aiService: AIServiceRef | null = null;
  private reputationPassportService: ReputationPassportService | null = null;
  private creditScoringService: CreditScoringService | null = null;

  // ── De-escalation audit log ──
  private deEscalationAudit: DeEscalationAuditEntry[] = [];

  // Configurable thresholds
  private dailySpent = 0;
  private dailyLimit = 0.1; // USDT
  private knownRecipients = new Set<string>();
  private lastResetDate = new Date().toDateString();

  // Address of the agent's own wallet — used to detect self-tip attempts
  private ownAddress: string | null = null;

  // ── Learned outcome tracking (feedback loop) ──
  // Maps creator address → { successes, failures } for adaptive evaluator confidence
  private outcomesByCreator = new Map<string, { successes: number; failures: number }>();

  constructor() {
    this.subAgents = [
      {
        role: 'tip_executor',
        name: 'TipExecutor',
        description: 'Evaluates technical feasibility of the tip',
        weight: 1.0,
        evaluator: this.tipExecutorEvaluate.bind(this),
      },
      {
        role: 'guardian',
        name: 'Guardian',
        description: 'Evaluates safety and policy compliance',
        weight: 1.5, // Higher weight — safety is paramount
        evaluator: this.guardianEvaluate.bind(this),
      },
      {
        role: 'treasury_optimizer',
        name: 'TreasuryOptimizer',
        description: 'Evaluates economic efficiency',
        weight: 0.8,
        evaluator: this.treasuryOptimizerEvaluate.bind(this),
      },
    ];
    logger.info('Multi-agent orchestrator initialized', { agents: this.subAgents.map(a => a.name) });
  }

  /** Wire AIService for LLM-enriched sub-agent reasoning */
  setAIService(ai: AIServiceRef): void {
    this.aiService = ai;
    logger.info('AIService connected to Orchestrator — sub-agents will use LLM reasoning when available');
  }

  /** Wire ReputationPassportService for cross-chain reputation checks */
  setReputationPassportService(rps: ReputationPassportService): void {
    this.reputationPassportService = rps;
    logger.info('ReputationPassportService connected to Orchestrator — guardian uses portable scores');
  }

  /** Wire CreditScoringService for guardian credit checks */
  setCreditScoringService(css: CreditScoringService): void {
    this.creditScoringService = css;
    logger.info('CreditScoringService connected to Orchestrator — guardian uses credit scores');
  }

  /** Set the agent's own wallet address (for self-tip detection) */
  setOwnAddress(address: string): void {
    this.ownAddress = address?.toLowerCase() ?? null;
    logger.info('OrchestratorService own address set', { address: address?.slice(0, 16) });
  }

  // ── Data Integrity Validation ──────────────────────────────────

  /**
   * Validate a tip proposal for data-integrity violations BEFORE
   * sub-agent voting. Catches manipulated / fraudulent parameters.
   */
  validateDataIntegrity(params: OrchestratedAction['params']): DataIntegrityResult {
    const violations: string[] = [];

    // 1. Engagement score must be in [0, 1] if provided
    const engagementScore = params.engagementScore as number | undefined;
    if (engagementScore !== undefined) {
      if (typeof engagementScore !== 'number' || !isFinite(engagementScore)) {
        violations.push(`engagementScore is not a finite number: ${engagementScore}`);
      } else if (engagementScore < 0 || engagementScore > 1) {
        violations.push(`engagementScore ${engagementScore} out of valid range [0, 1] — possible data manipulation`);
      }
    }

    // 2. Amount must be positive and finite
    const amount = parseFloat(String(params.amount ?? '0'));
    if (!isFinite(amount) || amount <= 0) {
      violations.push(`amount must be positive and finite, got ${params.amount}`);
    }

    // 3. Recipient address format — must be non-empty and reasonable length
    const recipient = params.recipient;
    if (!recipient || typeof recipient !== 'string' || recipient.length < 10) {
      violations.push(`recipient address is invalid or too short: "${recipient ?? ''}"`);
    }

    // 4. Timestamp validation (if provided) — not in the future and not older than 24h
    const ts = params.timestamp as string | undefined;
    if (ts) {
      const parsed = new Date(ts).getTime();
      const now = Date.now();
      if (isNaN(parsed)) {
        violations.push(`timestamp is not a valid date: "${ts}"`);
      } else if (parsed > now + 60_000) {
        violations.push(`timestamp is in the future: "${ts}"`);
      } else if (now - parsed > 24 * 60 * 60 * 1000) {
        violations.push(`timestamp is older than 24 hours: "${ts}"`);
      }
    }

    // 5. Self-tip detection
    if (this.ownAddress && recipient && recipient.toLowerCase() === this.ownAddress) {
      violations.push(`self-tip detected: recipient ${recipient.slice(0, 16)}... matches own wallet address`);
    }

    return { valid: violations.length === 0, violations };
  }

  // ── Core Orchestration ───────────────────────────────────────

  /**
   * Propose an action and run it through multi-agent consensus.
   * Returns the orchestrated action with votes and consensus.
   */
  async propose(type: OrchestratedAction['type'], params: OrchestratedAction['params']): Promise<OrchestratedAction> {
    // Reset daily counter if new day
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailySpent = 0;
      this.lastResetDate = today;
    }

    const action: OrchestratedAction = {
      id: `orch_${++this.counter}_${Date.now()}`,
      type,
      params,
      votes: [],
      consensus: 'pending',
      overallConfidence: 0,
      reasoningChain: [],
      proposedAt: new Date().toISOString(),
    };

    // Each sub-agent independently evaluates
    action.reasoningChain.push(`[Orchestrator] Proposed ${type}: ${params.amount ?? '?'} ${params.token ?? 'USDT'} to ${(params.recipient ?? 'unknown').slice(0, 12)}...`);

    // ── Data Integrity Gate — reject before voting if data is fraudulent ──
    const integrity = this.validateDataIntegrity(params);
    if (!integrity.valid) {
      action.consensus = 'rejected';
      action.overallConfidence = 99;
      action.resolvedAt = new Date().toISOString();
      for (const v of integrity.violations) {
        action.reasoningChain.push(`[Data Integrity] VIOLATION: ${v}`);
      }
      action.reasoningChain.push(`[Orchestrator] Rejected — ${integrity.violations.length} data integrity violation(s) detected before voting`);
      this.actions.push(action);
      logger.warn('Proposal rejected by data integrity check', { id: action.id, violations: integrity.violations });
      return action;
    }

    for (const agent of this.subAgents) {
      const vote = agent.evaluator(action);
      action.votes.push(vote);
      action.reasoningChain.push(`[${agent.name}] ${vote.decision.toUpperCase()} (${vote.confidence}%): ${vote.reasoning}`);
    }

    // Deliberation round: if votes are non-unanimous, agents re-evaluate with peer context
    this.deliberate(action);

    // Determine consensus
    action.consensus = this.determineConsensus(action);
    action.resolvedAt = new Date().toISOString();

    // Calculate weighted confidence
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < action.votes.length; i++) {
      const vote = action.votes[i];
      const weight = this.subAgents[i].weight;
      if (vote.decision === 'approve') {
        weightedSum += vote.confidence * weight;
      }
      totalWeight += weight;
    }
    action.overallConfidence = Math.round(weightedSum / totalWeight);

    action.reasoningChain.push(`[Orchestrator] Consensus: ${action.consensus} (${action.overallConfidence}% confidence)`);

    // Record the pre-LLM consensus (rule-based / sub-agent result) for de-escalation guard
    const preLlmConsensus = action.consensus;
    const guardianVote = action.votes.find(v => v.agent === 'guardian');

    // LLM synthesis: ask the AI to synthesize reasoning BEFORE locking the decision.
    // For split_decision outcomes, the LLM can override based on its analysis.
    if (this.aiService?.isAvailable() && this.aiService.generateThought) {
      const voteSummary = action.votes.map(v => `${v.agent}: ${v.decision} (${v.confidence}%) — ${v.reasoning}`).join('\n');
      const isSplit = action.consensus === 'split_decision';
      const synthesisPrompt = isSplit
        ? `Three sub-agents evaluated a tip of ${params.amount ?? '?'} ${params.token ?? 'USDT'} to ${(params.recipient ?? 'unknown').slice(0, 16)}...
Their votes:
${voteSummary}

Consensus is SPLIT (no majority). As the tie-breaker, decide: should this tip be APPROVED or REJECTED?
Weigh the guardian's safety concerns heavily. Respond with one sentence starting with "APPROVE:" or "REJECT:" followed by your reasoning.`
        : `Three sub-agents evaluated a tip of ${params.amount ?? '?'} ${params.token ?? 'USDT'} to ${(params.recipient ?? 'unknown').slice(0, 16)}...
Their votes:
${voteSummary}

Consensus: ${action.consensus}. Synthesize their reasoning in one sentence explaining the final decision.`;

      try {
        const synthesis = await this.aiService.generateThought(synthesisPrompt);
        if (synthesis) {
          action.reasoningChain.push(`[LLM Synthesis] ${synthesis}`);

          // For split decisions, allow LLM to break the tie
          if (isSplit) {
            const upper = synthesis.toUpperCase();
            let llmProposedConsensus: OrchestratedAction['consensus'] = action.consensus;
            if (upper.startsWith('REJECT:') || upper.includes('RECOMMEND REJECTION') || upper.includes('SHOULD BE REJECTED')) {
              llmProposedConsensus = 'rejected';
            } else if (upper.startsWith('APPROVE:') || upper.includes('RECOMMEND APPROVAL') || upper.includes('SHOULD BE APPROVED')) {
              llmProposedConsensus = 'approved';
            }

            // ── DE-ESCALATION GUARD: LLM cannot weaken safety decisions ──
            const preSeverity = consensusToSeverity(preLlmConsensus);
            const llmSeverity = consensusToSeverity(llmProposedConsensus);
            const escalationCheck = validateSeverityEscalation(preSeverity, llmSeverity, 'llm_synthesis');

            if (escalationCheck.overridden) {
              // LLM tried to de-escalate — override with original severity
              action.reasoningChain.push(`[De-Escalation Guard] ${escalationCheck.message}`);
              action.consensus = preLlmConsensus;
              this.auditDeEscalation(preSeverity, llmSeverity, 'llm_synthesis',
                `LLM tried to resolve split_decision to ${llmProposedConsensus} but rule-based consensus was ${preLlmConsensus}`);
            } else {
              action.consensus = llmProposedConsensus;
              action.reasoningChain.push(`[LLM Override] Split decision resolved to ${llmProposedConsensus.toUpperCase()} by LLM synthesis`);
            }
          }
        }
      } catch {
        logger.debug('LLM synthesis failed (non-critical) — consensus stands as-is');
      }
    }

    // ── GUARDIAN VETO ENFORCEMENT (post-LLM) ──
    // If Guardian voted REJECT but LLM synthesis changed consensus to APPROVED,
    // Guardian wins — safety veto is absolute and cannot be overridden by LLM.
    if (guardianVote?.decision === 'reject' && action.consensus === 'approved') {
      const preSeverity = consensusToSeverity('rejected');
      const llmSeverity = consensusToSeverity('approved');
      const check = validateSeverityEscalation(preSeverity, llmSeverity, 'guardian_veto_enforcement');
      action.consensus = 'rejected';
      action.reasoningChain.push(`[Guardian Veto] Guardian voted REJECT — LLM APPROVE overridden. ${check.message}`);
      this.auditDeEscalation(preSeverity, llmSeverity, 'guardian_veto_enforcement',
        'Guardian voted REJECT but LLM attempted to APPROVE — guardian veto is absolute');
    }

    // Track for history
    if (action.consensus === 'approved' && params.amount) {
      this.dailySpent += parseFloat(params.amount);
      if (params.recipient) this.knownRecipients.add(params.recipient);
    }

    this.actions.push(action);
    logger.info('Orchestrated action resolved', {
      id: action.id,
      consensus: action.consensus,
      confidence: action.overallConfidence,
      votes: action.votes.map(v => `${v.agent}:${v.decision}`)
    });

    return action;
  }

  /**
   * Record execution result for an approved action
   */
  recordExecution(actionId: string, result: OrchestratedAction['executionResult']): OrchestratedAction | undefined {
    const action = this.actions.find(a => a.id === actionId);
    if (!action) return undefined;
    action.executionResult = result;
    if (result?.success) {
      action.reasoningChain.push(`[Orchestrator] Executed successfully: tx ${result.txHash?.slice(0, 14)}...`);
    } else {
      action.reasoningChain.push(`[Orchestrator] Execution failed: ${result?.error}`);
    }
    return action;
  }

  // ── De-Escalation Audit ─────────────────────────────────────

  /** Record a de-escalation prevention event */
  private auditDeEscalation(
    originalSeverity: SeverityLevel,
    attemptedSeverity: SeverityLevel,
    source: string,
    context: string,
  ): void {
    const entry: DeEscalationAuditEntry = {
      timestamp: new Date().toISOString(),
      originalSeverity,
      attemptedSeverity,
      source,
      overridden: true,
      context,
    };
    this.deEscalationAudit.push(entry);
    // Keep bounded
    if (this.deEscalationAudit.length > 200) {
      this.deEscalationAudit = this.deEscalationAudit.slice(-100);
    }
    logger.warn('De-escalation prevented', entry);
  }

  /** Get de-escalation audit log */
  getDeEscalationAudit(): DeEscalationAuditEntry[] {
    return [...this.deEscalationAudit].reverse();
  }

  // ── Queries ──────────────────────────────────────────────────

  getAction(id: string): OrchestratedAction | undefined {
    return this.actions.find(a => a.id === id);
  }

  getHistory(): OrchestratedAction[] {
    return [...this.actions].reverse();
  }

  getStats() {
    const total = this.actions.length;
    const approved = this.actions.filter(a => a.consensus === 'approved').length;
    const rejected = this.actions.filter(a => a.consensus === 'rejected').length;
    const split = this.actions.filter(a => a.consensus === 'split_decision').length;

    return {
      total,
      approved,
      rejected,
      splitDecisions: split,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      avgConfidence: total > 0
        ? Math.round(this.actions.reduce((s, a) => s + a.overallConfidence, 0) / total)
        : 0,
      dailySpent: this.dailySpent,
      dailyLimit: this.dailyLimit,
      dailyRemaining: Math.max(0, this.dailyLimit - this.dailySpent),
      knownRecipients: this.knownRecipients.size,
      agentPerformance: this.subAgents.map(agent => {
        const agentVotes = this.actions.flatMap(a => a.votes.filter(v => v.agent === agent.role));
        return {
          agent: agent.name,
          role: agent.role,
          weight: agent.weight,
          totalVotes: agentVotes.length,
          approvals: agentVotes.filter(v => v.decision === 'approve').length,
          rejections: agentVotes.filter(v => v.decision === 'reject').length,
          avgConfidence: agentVotes.length > 0
            ? Math.round(agentVotes.reduce((s, v) => s + v.confidence, 0) / agentVotes.length)
            : 0,
        };
      }),
    };
  }

  // ── Configuration ────────────────────────────────────────────

  setDailyLimit(limit: number): void {
    this.dailyLimit = limit;
    logger.info('Daily limit updated', { limit });
  }

  addKnownRecipient(address: string): void {
    this.knownRecipients.add(address);
  }

  // ── Learned Outcome Tracking (Feedback Loop) ───────────────

  /**
   * Record the outcome of a tip execution so sub-agents learn from history.
   * Call this after every tip succeeds or fails.
   */
  learnFromOutcome(tipId: string, success: boolean, details: { recipient?: string; amount?: number; error?: string }): void {
    const recipient = details.recipient;
    if (recipient) {
      const stats = this.outcomesByCreator.get(recipient) ?? { successes: 0, failures: 0 };
      if (success) {
        stats.successes++;
      } else {
        stats.failures++;
      }
      this.outcomesByCreator.set(recipient, stats);
    }

    logger.info('Orchestrator learned from outcome', {
      tipId,
      success,
      recipient: recipient?.slice(0, 12),
      creatorStats: recipient ? this.outcomesByCreator.get(recipient) : undefined,
    });
  }

  /**
   * Get learned success rates per creator for transparency / API.
   */
  getLearnedStats(): Record<string, { successes: number; failures: number; successRate: number }> {
    const result: Record<string, { successes: number; failures: number; successRate: number }> = {};
    for (const [addr, stats] of this.outcomesByCreator) {
      const total = stats.successes + stats.failures;
      result[addr] = {
        ...stats,
        successRate: total > 0 ? Math.round((stats.successes / total) * 100) : 0,
      };
    }
    return result;
  }

  /** Get success rate for a specific creator (used by evaluators) */
  private getCreatorSuccessRate(recipient: string | undefined): number | null {
    if (!recipient) return null;
    const stats = this.outcomesByCreator.get(recipient);
    if (!stats) return null;
    const total = stats.successes + stats.failures;
    if (total < 2) return null; // need at least 2 data points
    return stats.successes / total;
  }

  // ── Sub-Agent Evaluators ─────────────────────────────────────

  /**
   * TipExecutor — checks technical feasibility
   */
  private tipExecutorEvaluate(action: OrchestratedAction, peerContext?: string): AgentVote {
    const { recipient, amount, chainId } = action.params;
    let confidence = 80;
    let decision: AgentVote['decision'] = 'approve';
    const reasons: string[] = [];

    // Validate recipient
    if (!recipient || recipient.length < 10) {
      decision = 'reject';
      confidence = 95;
      reasons.push('Invalid recipient address');
    } else {
      reasons.push('Recipient address format valid');
    }

    // Validate amount
    const numAmount = parseFloat(amount ?? '0');
    if (numAmount <= 0) {
      decision = 'reject';
      confidence = 99;
      reasons.push('Amount must be positive');
    } else if (numAmount > 1) {
      confidence = Math.max(confidence - 20, 40);
      reasons.push(`Large amount (${numAmount}) — higher risk`);
    } else {
      reasons.push(`Amount ${numAmount} within normal range`);
    }

    // Chain validation
    const validChains = ['ethereum-sepolia', 'ton-testnet', 'tron-nile'];
    if (chainId && !validChains.includes(chainId)) {
      decision = 'reject';
      confidence = 90;
      reasons.push(`Unknown chain: ${chainId}`);
    } else {
      reasons.push(`Chain ${chainId ?? 'auto-select'} supported`);
    }

    // ── LEARNED FEEDBACK: boost confidence for high-success-rate creators ──
    const executorSuccessRate = this.getCreatorSuccessRate(recipient);
    if (executorSuccessRate !== null && executorSuccessRate > 0.8) {
      confidence += 10;
      reasons.push(`High historical success rate (${Math.round(executorSuccessRate * 100)}%) — boosted confidence`);
    }

    // Deliberation: soften rejection if peers strongly approve — and potentially flip
    if (peerContext && decision === 'reject') {
      const guardianApproved = /guardian voted approve \((\d+)%\)/.exec(peerContext);
      const treasuryApproved = /treasury_optimizer voted approve \((\d+)%\)/.exec(peerContext);
      const guardianConf = guardianApproved ? parseInt(guardianApproved[1], 10) : 0;
      const treasuryConf = treasuryApproved ? parseInt(treasuryApproved[1], 10) : 0;

      if (guardianConf > 75 && treasuryConf > 75) {
        // Both Guardian and TreasuryOptimizer approved with high confidence — flip
        logger.info('Deliberation flip', { agent: 'tip_executor', from: 'reject', to: 'approve', reason: 'Both guardian and treasury approved with >75% confidence' });
        decision = 'approve';
        confidence = Math.round((guardianConf + treasuryConf) / 2 * 0.8);
        reasons.push('Flipped: peer consensus overrode initial concern');
      } else {
        const peerApprovals = (peerContext.match(/voted approve/g) || []).length;
        if (peerApprovals >= 2) {
          confidence = Math.max(10, confidence - 10);
          reasons.push('Deliberation: peers approve, softened confidence');
        }
      }
    }

    return {
      agent: 'tip_executor',
      decision,
      confidence,
      reasoning: reasons.join('; '),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Guardian — checks safety and policy compliance
   * Has VETO power (can reject even with 2 approvals)
   */
  private guardianEvaluate(action: OrchestratedAction, peerContext?: string): AgentVote {
    const { recipient, amount } = action.params;
    let confidence = 85;
    let decision: AgentVote['decision'] = 'approve';
    const reasons: string[] = [];
    const numAmount = parseFloat(amount ?? '0');

    // ── Data Integrity: auto-reject if violations detected ──
    const integrity = this.validateDataIntegrity(action.params);
    if (!integrity.valid) {
      decision = 'reject';
      confidence = 99;
      for (const v of integrity.violations) {
        reasons.push(`Data integrity violation: ${v}`);
      }
      return {
        agent: 'guardian',
        decision,
        confidence,
        reasoning: reasons.join('; '),
        timestamp: new Date().toISOString(),
      };
    }

    // ── Self-tip detection (even if data integrity already caught it) ──
    if (this.ownAddress && recipient && recipient.toLowerCase() === this.ownAddress) {
      decision = 'reject';
      confidence = 99;
      reasons.push('BLOCKED: Self-tip attempt detected — recipient matches own wallet');
      return {
        agent: 'guardian',
        decision,
        confidence,
        reasoning: reasons.join('; '),
        timestamp: new Date().toISOString(),
      };
    }

    // Check daily spending limit
    if (this.dailySpent + numAmount > this.dailyLimit) {
      decision = 'reject';
      confidence = 95;
      reasons.push(`Would exceed daily limit: ${this.dailySpent + numAmount} > ${this.dailyLimit}`);
    } else {
      const pctUsed = ((this.dailySpent + numAmount) / this.dailyLimit) * 100;
      reasons.push(`Daily budget: ${pctUsed.toFixed(0)}% used after this tip`);
      if (pctUsed > 80) confidence -= 15;
    }

    // Check if recipient is known
    if (recipient && this.knownRecipients.has(recipient)) {
      confidence += 10;
      reasons.push('Recipient is known/trusted');
    } else if (recipient) {
      confidence -= 20;
      reasons.push('NEW recipient — exercise caution');
      if (numAmount > 0.01) {
        decision = 'reject';
        confidence = 80;
        reasons.push('Large tip to unknown recipient blocked');
      }
    }

    // Anomaly detection: unusual amount
    if (numAmount > 0.05) {
      confidence -= 25;
      reasons.push(`Unusually large tip amount: ${numAmount}`);
      if (numAmount > 0.1) {
        decision = 'reject';
        confidence = 90;
        reasons.push('Amount exceeds safety threshold');
      }
    }

    // Time-based check (suspicious: tips at unusual hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 23) {
      confidence -= 10;
      reasons.push('Unusual hour for tipping activity');
    }

    // ── LEARNED FEEDBACK: penalize creators with poor outcome history ──
    const guardianSuccessRate = this.getCreatorSuccessRate(recipient);
    if (guardianSuccessRate !== null && guardianSuccessRate < 0.5) {
      confidence -= 20;
      reasons.push(`Low historical success rate (${Math.round(guardianSuccessRate * 100)}%) — learned caution`);
    } else if (guardianSuccessRate !== null && guardianSuccessRate >= 0.8) {
      reasons.push(`Strong historical success rate (${Math.round(guardianSuccessRate * 100)}%)`);
    }

    // ── CROSS-CHAIN REPUTATION: check portable score ──
    // High portable score = earned trust across chains → relax safety thresholds
    if (recipient && this.reputationPassportService) {
      const portableScore = this.reputationPassportService.getPortableScore(recipient);
      if (portableScore >= 75) {
        // Highly trusted across chains — boost confidence, potentially un-reject
        confidence += 15;
        reasons.push(`High cross-chain reputation (${portableScore}/100) — trusted across chains`);
        if (decision === 'reject' && numAmount <= 0.05) {
          // Only un-reject for moderate amounts from highly reputable recipients
          const isCriticalReject = reasons.some(r =>
            r.includes('daily limit') || r.includes('safety threshold')
          );
          if (!isCriticalReject) {
            decision = 'approve';
            confidence = 70;
            reasons.push('Cross-chain reputation override: high portable score unlocked approval');
          }
        }
      } else if (portableScore >= 50) {
        confidence += 5;
        reasons.push(`Moderate cross-chain reputation (${portableScore}/100)`);
      } else if (portableScore < 25 && portableScore > 0) {
        confidence -= 10;
        reasons.push(`Low cross-chain reputation (${portableScore}/100) — extra caution`);
      }
    }

    // ── CREDIT SCORE: check recipient creditworthiness for large tips ──
    if (recipient && this.creditScoringService && numAmount > 0.01) {
      const creditCheck = this.creditScoringService.isTipAllowedByCredit(recipient, numAmount);
      if (!creditCheck.allowed) {
        decision = 'reject';
        confidence = Math.max(confidence, 85);
        reasons.push(`Credit score too low for amount: score=${creditCheck.score} (${creditCheck.tier}), maxTip=${creditCheck.maxTip}`);
      } else if (creditCheck.requiresApproval) {
        if (decision === 'approve') {
          decision = 'approve'; // still approve but lower confidence
          confidence -= 15;
        }
        reasons.push(`Credit tier ${creditCheck.tier} (score=${creditCheck.score}) requires extra scrutiny`);
      } else {
        reasons.push(`Credit score ${creditCheck.score} (${creditCheck.tier}) — sufficient for this amount`);
      }
    }

    // Deliberation: Guardian NEVER flips REJECT→APPROVE (safety veto is absolute)
    // But CAN flip APPROVE→REJECT if both peers rejected (safety agreement)
    if (peerContext) {
      if (decision === 'approve') {
        const peerRejections = (peerContext.match(/voted reject/g) || []).length;
        if (peerRejections >= 2) {
          logger.info('Deliberation flip', { agent: 'guardian', from: 'approve', to: 'reject', reason: 'Both peers rejected — safety agreement' });
          decision = 'reject';
          confidence = 80;
          reasons.push('Flipped: both peers rejected, guardian agrees with safety concern');
        }
      } else if (decision === 'reject') {
        const peerApprovals = (peerContext.match(/voted approve/g) || []).length;
        if (peerApprovals >= 2) {
          // Only soften non-critical rejections (not daily limit or hard safety blocks)
          const isCriticalReject = reasons.some(r =>
            r.includes('daily limit') || r.includes('safety threshold')
          );
          if (!isCriticalReject) {
            confidence = Math.max(10, Math.round(confidence * 0.9));
            reasons.push('Deliberation: peers approve strongly, softened confidence by 10% (but NOT flipping — safety veto is absolute)');
          } else {
            reasons.push('Deliberation: peers approve but safety concern is critical, holding firm');
          }
        }
      }
    }

    return {
      agent: 'guardian',
      decision,
      confidence: Math.min(99, Math.max(10, confidence)),
      reasoning: reasons.join('; '),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * TreasuryOptimizer — checks economic efficiency
   */
  private treasuryOptimizerEvaluate(action: OrchestratedAction, peerContext?: string): AgentVote {
    const { amount, chainId } = action.params;
    let confidence = 75;
    let decision: AgentVote['decision'] = 'approve';
    const reasons: string[] = [];
    const numAmount = parseFloat(amount ?? '0');

    // Fee efficiency check — configurable via env, defaults to typical testnet values
    const feeEstimates: Record<string, number> = {
      'ethereum-sepolia': parseFloat(process.env.FEE_ETH_SEPOLIA ?? '0.002'),
      'ton-testnet': parseFloat(process.env.FEE_TON_TESTNET ?? '0.0005'),
      'tron-nile': parseFloat(process.env.FEE_TRON_NILE ?? '0.001'),
    };

    const chain = chainId ?? 'ethereum-sepolia';
    const estimatedFee = feeEstimates[chain] ?? parseFloat(process.env.FEE_DEFAULT ?? '0.002');
    const feePercentage = numAmount > 0 ? (estimatedFee / numAmount) * 100 : 100;

    if (feePercentage > 50) {
      decision = 'reject';
      confidence = 85;
      reasons.push(`Fee too high: ${feePercentage.toFixed(0)}% of tip amount`);
    } else if (feePercentage > 20) {
      confidence -= 20;
      reasons.push(`Fee warning: ${feePercentage.toFixed(0)}% of tip goes to gas`);
    } else {
      reasons.push(`Fee efficient: only ${feePercentage.toFixed(1)}% gas overhead`);
    }

    // Chain optimization
    if (chain === 'ethereum-sepolia' && numAmount < 0.005) {
      confidence -= 15;
      reasons.push('Consider TON/TRON for small tips (lower fees)');
    } else {
      reasons.push(`Chain ${chain} appropriate for this amount`);
    }

    // Treasury impact
    const remainingBudget = this.dailyLimit - this.dailySpent;
    const budgetImpact = numAmount > 0 ? (numAmount / remainingBudget) * 100 : 0;
    if (budgetImpact > 50 && remainingBudget > 0) {
      confidence -= 10;
      reasons.push(`High treasury impact: ${budgetImpact.toFixed(0)}% of remaining daily budget`);
    } else {
      reasons.push(`Sustainable: ${budgetImpact.toFixed(0)}% of remaining budget`);
    }

    // Deliberation: potentially flip if TipExecutor approved and fee concern is marginal
    if (peerContext && decision === 'reject') {
      const executorApproved = /tip_executor voted approve \((\d+)%\)/.exec(peerContext);
      const executorConf = executorApproved ? parseInt(executorApproved[1], 10) : 0;

      if (executorConf > 0 && confidence < 60) {
        // TipExecutor approved and our rejection confidence is below 60% (i.e. fee concern is marginal)
        logger.info('Deliberation flip', { agent: 'treasury_optimizer', from: 'reject', to: 'approve', reason: 'TipExecutor approved and fee ratio is acceptable (confidence < 60%)' });
        decision = 'approve';
        confidence = 45;
        reasons.push('Flipped: acceptable fee ratio per peer analysis');
      } else {
        const peerApprovals = (peerContext.match(/voted approve/g) || []).length;
        if (peerApprovals >= 2) {
          confidence = Math.max(10, confidence - 10);
          reasons.push('Deliberation: peers approve, softened confidence');
        }
      }
    }

    return {
      agent: 'treasury_optimizer',
      decision,
      confidence: Math.min(99, Math.max(10, confidence)),
      reasoning: reasons.join('; '),
      timestamp: new Date().toISOString(),
    };
  }

  // ── Deliberation ────────────────────────────────────────────

  /**
   * Deliberation round for non-unanimous decisions.
   *
   * When sub-agents disagree, each agent receives the votes and
   * reasoning of its peers and re-evaluates. This converts simple
   * voting into genuine multi-agent debate.
   *
   * - Unanimous decisions skip deliberation entirely.
   * - After deliberation, votes are replaced with revised votes.
   * - If still split after deliberation, the existing LLM tie-breaker handles it.
   */
  private deliberate(action: OrchestratedAction): void {
    const decisions = new Set(action.votes.map(v => v.decision));
    if (decisions.size <= 1) return; // unanimous — skip deliberation

    // Capture original votes for flip detection
    const originalVotes = action.votes.map(v => ({ agent: v.agent, decision: v.decision }));

    // Build peer context: each agent's vote + reasoning
    const peerContext = action.votes
      .map(v => `${v.agent} voted ${v.decision} (${v.confidence}%): ${v.reasoning}`)
      .join('; ');

    // Each agent re-evaluates with awareness of peer reasoning
    const revisedVotes: AgentVote[] = [];
    for (const agent of this.subAgents) {
      const revisedVote = agent.evaluator(action, peerContext);
      revisedVotes.push(revisedVote);
    }

    // Detect and log flips
    const flips: string[] = [];
    for (let i = 0; i < revisedVotes.length; i++) {
      const orig = originalVotes[i];
      const revised = revisedVotes[i];
      if (orig.decision !== revised.decision) {
        flips.push(`${orig.agent}: ${orig.decision} → ${revised.decision}`);
      }
    }

    // Replace votes with deliberated votes
    action.votes = revisedVotes;
    const flipNote = flips.length > 0 ? ` | Flips: ${flips.join(', ')}` : ' | No flips';
    action.reasoningChain.push(
      `[Deliberation] Non-unanimous initial vote — agents re-evaluated with peer reasoning${flipNote}`
    );
  }

  // ── Consensus Logic ──────────────────────────────────────────

  /**
   * 2-of-3 consensus with Guardian veto power.
   *
   * Rules:
   * 1. If Guardian rejects → REJECTED (veto power)
   * 2. If 2+ agents approve → APPROVED
   * 3. If 2+ agents reject → REJECTED
   * 4. Otherwise → SPLIT_DECISION (needs human review)
   */
  private determineConsensus(action: OrchestratedAction): OrchestratedAction['consensus'] {
    const guardianVote = action.votes.find(v => v.agent === 'guardian');

    // Guardian veto
    if (guardianVote?.decision === 'reject') {
      return 'rejected';
    }

    const approvals = action.votes.filter(v => v.decision === 'approve').length;
    const rejections = action.votes.filter(v => v.decision === 'reject').length;

    if (approvals >= 2) return 'approved';
    if (rejections >= 2) return 'rejected';
    return 'split_decision';
  }
}

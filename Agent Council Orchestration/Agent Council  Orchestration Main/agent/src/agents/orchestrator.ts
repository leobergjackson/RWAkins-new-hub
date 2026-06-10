// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Multi-Agent Orchestrator — The brain that coordinates all agents
//
// Runs the autonomous loop: Discovery -> Analysis -> Proposal -> Vote -> Execute
// Requires 3/4 majority to approve (Guardian can solo-veto).
// Logs every decision with full reasoning chain.

import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';
import { eventStore, metrics, consensusProtocol, profitLossEngine, policyEngine } from '../shared-singletons.js';
import type { PolicyContext } from '../policies/policy-engine.js';
import { MessageBus, type AgentMessage } from './message-bus.js';
import {
  BaseAgent,
  type AgentContext,
  type AgentAnalysis,
  type Proposal,
  type Vote,
  type Action,
  type ExecutionResult,
  type TipRecord,
} from './base-agent.js';
import type { TipExecutorAgent } from './tip-executor.agent.js';
import type { GuardianAgent } from './guardian.agent.js';
import type { TreasuryOptimizerAgent } from './treasury-optimizer.agent.js';
import type { DiscoveryAgent } from './discovery.agent.js';
import type { WalletService } from '../services/wallet.service.js';

// ── Types ──────────────────────────────────────────────────────

export interface CycleResult {
  cycleNumber: number;
  timestamp: string;
  duration: number; // ms
  phases: {
    discovery: AgentAnalysis | null;
    analysis: AgentAnalysis[];
    proposals: Proposal[];
    votes: Map<string, Vote[]>;
    executions: ExecutionResult[];
  };
  decisions: DecisionRecord[];
  errors: string[];
}

export interface DecisionRecord {
  proposalId: string;
  proposalType: string;
  description: string;
  votes: Vote[];
  outcome: 'approved' | 'rejected' | 'vetoed';
  reasoning: string;
  executionResult?: ExecutionResult;
  timestamp: string;
}

export interface OrchestratorStatus {
  running: boolean;
  paused: boolean;
  currentCycle: number;
  totalCycles: number;
  lastCycleAt: string | null;
  lastCycleDuration: number | null;
  agents: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    cyclesCompleted: number;
  }>;
  recentDecisions: DecisionRecord[];
  messageBusStats: { totalMessages: number; subscribedAgents: number };
}

// ── Orchestrator ───────────────────────────────────────────────

export class MultiAgentOrchestrator {
  readonly bus: MessageBus;

  private tipExecutor: TipExecutorAgent;
  private readonly _guardian: GuardianAgent;
  private treasuryOptimizer: TreasuryOptimizerAgent;
  private discovery: DiscoveryAgent;

  private walletService: WalletService | null = null;

  private agents: BaseAgent[];
  private running = false;
  private paused = false;
  private currentCycle = 0;
  private cycleHistory: CycleResult[] = [];
  private decisionLog: DecisionRecord[] = [];
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private errors: string[] = [];

  // Adaptive timing
  private baseCycleInterval = 60_000; // 1 minute default
  private minCycleInterval = 15_000; // 15 seconds minimum
  private maxCycleInterval = 300_000; // 5 minutes maximum
  private currentCycleInterval: number;

  // Voting rules
  private readonly requiredMajority = 3; // 3/4 agents must approve
  private readonly guardianCanVeto = true;

  constructor(
    tipExecutor: TipExecutorAgent,
    guardian: GuardianAgent,
    treasuryOptimizer: TreasuryOptimizerAgent,
    discovery: DiscoveryAgent,
  ) {
    this.bus = new MessageBus();
    this.tipExecutor = tipExecutor;
    this._guardian = guardian;
    this.treasuryOptimizer = treasuryOptimizer;
    this.discovery = discovery;
    this.agents = [tipExecutor, guardian, treasuryOptimizer, discovery];
    this.currentCycleInterval = this.baseCycleInterval;

    // Connect all agents to message bus
    for (const agent of this.agents) {
      agent.connectBus(this.bus);
    }

    logger.info('MultiAgentOrchestrator initialized', {
      agents: this.agents.map((a) => a.name),
      cycleInterval: this.currentCycleInterval,
    });
  }

  /** Wire wallet service for balance lookups */
  setWalletService(walletService: WalletService): void {
    this.walletService = walletService;
  }

  // ── Autonomous Loop ──

  /** Start the autonomous orchestration loop */
  start(): void {
    if (this.running) {
      logger.warn('Orchestrator: already running');
      return;
    }

    this.running = true;
    this.paused = false;
    logger.info('Orchestrator: Starting autonomous loop', { interval: this.currentCycleInterval });

    // Run first cycle immediately
    this.scheduleCycle(100);
  }

  /** Stop the autonomous loop */
  stop(): void {
    this.running = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    logger.info('Orchestrator: Stopped');
  }

  /** Pause without stopping */
  pause(): void {
    this.paused = true;
    logger.info('Orchestrator: Paused');
  }

  /** Resume from pause */
  resume(): void {
    this.paused = false;
    logger.info('Orchestrator: Resumed');
    if (this.running) {
      this.scheduleCycle(100);
    }
  }

  /** Trigger a single cycle manually (does not require running state) */
  async triggerManualCycle(): Promise<CycleResult> {
    return this.runCycle();
  }

  // ── Cycle Execution ──

  private scheduleCycle(delay: number): void {
    if (this.loopTimer) clearTimeout(this.loopTimer);
    this.loopTimer = setTimeout(async () => {
      if (!this.running || this.paused) return;

      try {
        await this.runCycle();
      } catch (err) {
        const errMsg = `Cycle ${this.currentCycle} crashed: ${String(err)}`;
        logger.error(`Orchestrator: ${errMsg}`);
        this.errors.push(errMsg);
      }

      // Schedule next cycle with adaptive timing
      if (this.running && !this.paused) {
        this.scheduleCycle(this.currentCycleInterval);
      }
    }, delay);
  }

  private async runCycle(): Promise<CycleResult> {
    this.currentCycle++;
    const cycleStart = Date.now();
    const cycleTimestamp = new Date().toISOString();

    logger.info(`Orchestrator: === CYCLE ${this.currentCycle} START ===`);

    const result: CycleResult = {
      cycleNumber: this.currentCycle,
      timestamp: cycleTimestamp,
      duration: 0,
      phases: {
        discovery: null,
        analysis: [],
        proposals: [],
        votes: new Map(),
        executions: [],
      },
      decisions: [],
      errors: [],
    };

    // Build shared context
    const context = await this.buildContext();

    // ── PHASE 1: DISCOVERY ──
    logger.info('Orchestrator: Phase 1 — Discovery');
    try {
      result.phases.discovery = await this.withTimeout(
        this.discovery.analyze(context),
        10_000,
        'Discovery analysis',
      );
    } catch (err) {
      result.errors.push(`Discovery phase failed: ${String(err)}`);
      logger.warn('Orchestrator: Discovery phase failed, continuing', { error: String(err) });
    }

    // ── PHASE 2: ANALYSIS (all agents in parallel) ──
    logger.info('Orchestrator: Phase 2 — Analysis');
    const analysisPromises = this.agents.map((agent) =>
      this.withTimeout(agent.analyze(context), 10_000, `${agent.name} analysis`).catch((err) => {
        result.errors.push(`${agent.name} analysis failed: ${String(err)}`);
        return null;
      }),
    );
    const analyses = (await Promise.all(analysisPromises)).filter((a): a is AgentAnalysis => a !== null);
    result.phases.analysis = analyses;

    // ── PHASE 3: GENERATE PROPOSALS ──
    logger.info('Orchestrator: Phase 3 — Proposals');
    const proposals = this.generateProposals(analyses, context);
    result.phases.proposals = proposals;

    if (proposals.length === 0) {
      logger.info('Orchestrator: No proposals generated this cycle');
    }

    // ── PHASE 4: VOTE ON PROPOSALS ──
    logger.info(`Orchestrator: Phase 4 — Voting on ${proposals.length} proposal(s)`);
    for (const proposal of proposals) {
      const votes: Vote[] = [];

      for (const agent of this.agents) {
        try {
          const vote = await this.withTimeout(agent.vote(proposal), 5_000, `${agent.name} vote`);
          votes.push(vote);
        } catch (err) {
          result.errors.push(`${agent.name} vote on ${proposal.id} failed: ${String(err)}`);
        }
      }

      proposal.votes = votes;
      result.phases.votes.set(proposal.id, votes);

      // Resolve proposal
      const decision = this.resolveVotes(proposal, votes);
      proposal.status = decision.outcome === 'approved' ? 'approved' : decision.outcome === 'vetoed' ? 'vetoed' : 'rejected';
      proposal.resolvedAt = new Date().toISOString();

      result.decisions.push(decision);
      this.decisionLog.push(decision);

      logger.info(`Orchestrator: Proposal ${proposal.id} — ${decision.outcome}`, {
        type: proposal.type,
        votes: votes.map((v) => `${v.agentName}:${v.decision}`).join(', '),
      });

      // ── PHASE 5: EXECUTE APPROVED PROPOSALS ──
      if (decision.outcome === 'approved') {
        // Evaluate policy engine BEFORE execution
        try {
          const amount = parseFloat(String(proposal.data['amount'] ?? '0'));
          const chain = String(proposal.data['chain'] ?? proposal.data['chainId'] ?? 'ethereum');
          const policyCtx: PolicyContext = {
            operationType: proposal.type === 'TIP' ? 'tip' : 'transfer',
            amount,
            chain,
            recipient: String(proposal.data['recipient'] ?? ''),
            gasCostUsd: 0.05,
            agentId: proposal.proposedBy,
            totalBalance: 100,
            dailySpent: 0,
            tipsLastHour: 0,
            creatorEngagement: (proposal.data['engagementScore'] as number ?? 50) / 100,
            isNewCreator: false,
            hourOfDay: new Date().getHours(),
            metadata: {},
          };
          const policyResult = policyEngine.evaluate(policyCtx);
          eventStore.append('POLICY_EVALUATED', {
            proposalId: proposal.id,
            allowed: policyResult.allowed,
            deniedBy: policyResult.deniedBy,
            policiesChecked: policyResult.evaluatedPolicies.length,
          }, 'policy-engine');
          metrics.increment('policies_evaluated_total', { result: policyResult.allowed ? 'allow' : 'deny' });

          if (!policyResult.allowed) {
            eventStore.append('POLICY_DENIED', {
              proposalId: proposal.id,
              deniedBy: policyResult.deniedBy,
              reason: policyResult.denialReason,
            }, 'policy-engine');
            metrics.increment('policies_denied_total', { policy_id: policyResult.deniedBy ?? 'unknown' });
            result.errors.push(`Policy denied ${proposal.id}: ${policyResult.denialReason}`);
            logger.info(`Orchestrator: Proposal ${proposal.id} DENIED by policy ${policyResult.deniedBy}`);
            continue; // Skip execution
          }

          // Apply modifications if policy says MODIFY
          if (policyResult.modifiedParams?.amount !== undefined) {
            proposal.data['amount'] = String(policyResult.modifiedParams.amount);
            logger.info(`Policy modified tip amount to ${policyResult.modifiedParams.amount}`);
          }
        } catch (err) {
          logger.debug('Policy evaluation failed (non-fatal, proceeding)', { error: String(err) });
        }

        const action = this.proposalToAction(proposal);
        const executor = this.selectExecutor(action);
        const execStart = Date.now();

        try {
          const execResult = await this.withTimeout(executor.execute(action), 15_000, `${executor.name} execution`);
          decision.executionResult = execResult;
          result.phases.executions.push(execResult);
          proposal.status = 'executed';

          // Emit REAL TIP_EXECUTED event
          try {
            const tipAmount = parseFloat(String(proposal.data['amount'] ?? '0'));
            const tipChain = String(proposal.data['chain'] ?? proposal.data['chainId'] ?? 'ethereum');
            eventStore.append('TIP_EXECUTED', {
              proposalId: proposal.id,
              recipient: proposal.data['recipient'],
              amount: proposal.data['amount'],
              chain: tipChain,
              txHash: execResult.txHash ?? 'pending',
              executionTimeMs: Date.now() - execStart,
            }, 'orchestrator');
            metrics.increment('tips_sent_total', { chain: tipChain, status: 'confirmed' });
            metrics.observe('tip_execution_time_ms', Date.now() - execStart);
            metrics.observe('tip_amount_usd', tipAmount);
            profitLossEngine.recordTipSent(tipAmount, tipChain, 0.01);
          } catch (emitErr) {
            logger.debug('Event/metric emission failed (non-fatal)', { error: String(emitErr) });
          }

          // Broadcast result
          this.bus.publish(
            this.bus.createMessage('orchestrator', '*', 'RESULT', {
              proposalId: proposal.id,
              result: execResult,
            }, proposal.id),
          );
        } catch (err) {
          result.errors.push(`Execution of ${proposal.id} failed: ${String(err)}`);
        }
      }
    }

    result.duration = Date.now() - cycleStart;

    // Adjust timing based on activity
    this.adjustCycleInterval(proposals.length, result.errors.length);

    // Store history (keep last 100 cycles)
    this.cycleHistory.push(result);
    if (this.cycleHistory.length > 100) {
      this.cycleHistory = this.cycleHistory.slice(-100);
    }

    logger.info(`Orchestrator: === CYCLE ${this.currentCycle} END === (${result.duration}ms, ${proposals.length} proposals, ${result.phases.executions.length} executed, ${result.errors.length} errors)`);

    return result;
  }

  // ── Context Building ──

  private async buildContext(): Promise<AgentContext> {
    const balances = new Map<string, { native: string; usdt: string }>();

    // Fetch real balances from WDK if available
    if (this.walletService) {
      const chains = ['ethereum-sepolia', 'ton-testnet', 'tron-nile', 'bitcoin-testnet', 'solana-devnet'] as const;
      for (const chain of chains) {
        try {
          const bal = await this.walletService.getBalance(chain);
          balances.set(chain, { native: bal.nativeBalance, usdt: bal.usdtBalance });
        } catch {
          balances.set(chain, { native: '0', usdt: '0' });
        }
      }
    }

    // Collect recent tips from TipExecutor
    const recentTips: TipRecord[] = this.tipExecutor.getExecutedTips().map((t) => ({
      id: t.id,
      recipient: t.recipient,
      amount: t.amount,
      chain: t.chain,
      timestamp: t.timestamp,
      status: 'confirmed' as const,
    }));

    return {
      cycleNumber: this.currentCycle,
      timestamp: new Date().toISOString(),
      balances,
      recentTips,
      activeProposals: [],
      sharedState: new Map(),
    };
  }

  // ── Proposal Generation ──

  private generateProposals(analyses: AgentAnalysis[], _context: AgentContext): Proposal[] {
    const proposals: Proposal[] = [];

    for (const analysis of analyses) {
      for (const rec of analysis.recommendations) {
        // Parse tip recommendations
        if (rec.toLowerCase().includes('tip') && rec.toLowerCase().includes('usdt')) {
          const amountMatch = rec.match(/([\d.]+)\s*USDT/i);
          const amount = amountMatch ? amountMatch[1] : '0.5';

          // Extract recipient and chain from recommendation text
          const toMatch = rec.match(/to\s+(\S+)/i);
          const onMatch = rec.match(/on\s+(\S+)/i);
          const recipient = toMatch ? toMatch[1] : 'unknown';
          const chain = onMatch ? onMatch[1] : 'ethereum-sepolia';

          // Extract engagement score if present
          const engMatch = rec.match(/engagement[:\s]*(\d+)/i);
          const engagementScore = engMatch ? parseInt(engMatch[1], 10) : 50;

          proposals.push({
            id: randomUUID(),
            type: 'TIP',
            proposedBy: analysis.agentId,
            description: rec,
            data: { recipient, amount, chain, engagementScore },
            votes: [],
            status: 'pending',
            createdAt: new Date().toISOString(),
          });
        }

        // Parse rebalance recommendations
        if (rec.toLowerCase().includes('rebalance') || rec.toLowerCase().includes('move')) {
          const amountMatch = rec.match(/([\d.]+)\s*USDT/i);
          const fromMatch = rec.match(/from\s+(\S+)/i);
          const toMatch = rec.match(/to\s+(\S+)/i);

          if (amountMatch && fromMatch && toMatch) {
            proposals.push({
              id: randomUUID(),
              type: 'REBALANCE',
              proposedBy: analysis.agentId,
              description: rec,
              data: {
                amount: amountMatch[1],
                fromChain: fromMatch[1],
                toChain: toMatch[1],
              },
              votes: [],
              status: 'pending',
              createdAt: new Date().toISOString(),
            });
          }
        }

        // Parse yield deployment recommendations
        if (rec.toLowerCase().includes('yield') || rec.toLowerCase().includes('deploy') || rec.toLowerCase().includes('aave')) {
          const amountMatch = rec.match(/([\d.]+)\s*USDT/i);
          const apyMatch = rec.match(/([\d.]+)%\s*APY/i);

          if (amountMatch) {
            proposals.push({
              id: randomUUID(),
              type: 'YIELD_DEPLOY',
              proposedBy: analysis.agentId,
              description: rec,
              data: {
                amount: amountMatch[1],
                protocol: 'aave',
                chain: 'ethereum-sepolia',
                apy: apyMatch ? parseFloat(apyMatch[1]) / 100 : 0.035,
              },
              votes: [],
              status: 'pending',
              createdAt: new Date().toISOString(),
            });
          }
        }

        // Parse spike -> tip proposals from Discovery
        if (rec.toLowerCase().includes('spike') && rec.toLowerCase().includes('propose tip')) {
          const slugMatch = rec.match(/SPIKE:\s*(\S+)/i);
          const scoreMatch = rec.match(/to\s+(\d+)/i);

          if (slugMatch) {
            proposals.push({
              id: randomUUID(),
              type: 'TIP',
              proposedBy: analysis.agentId,
              description: `Auto-tip for engagement spike: ${rec}`,
              data: {
                recipient: slugMatch[1],
                amount: '1.00',
                chain: 'ethereum-sepolia',
                engagementScore: scoreMatch ? parseInt(scoreMatch[1], 10) : 70,
                reason: 'engagement_spike',
              },
              votes: [],
              status: 'pending',
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    // Deduplicate proposals by recipient
    const seen = new Set<string>();
    return proposals.filter((p) => {
      const key = `${p.type}-${p.data['recipient'] ?? p.data['fromChain'] ?? ''}-${p.data['amount']}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ── Vote Resolution ──

  private resolveVotes(proposal: Proposal, votes: Vote[]): DecisionRecord {
    // ── Use REAL cryptographic consensus protocol ──
    try {
      // Register agents if not already
      for (const agent of this.agents) {
        consensusProtocol.registerAgent(agent.id);
      }

      // Create a real consensus round
      const round = consensusProtocol.createRound(
        proposal.description,
        proposal.type,
        proposal.proposedBy,
        proposal.data,
        0, // risk score
      );

      // Cast each agent's vote through the cryptographic consensus
      for (const vote of votes) {
        try {
          const agentId = this.agents.find(a => a.name === vote.agentName)?.id ?? vote.agentName;
          const decision = vote.decision === 'approve' ? 'approve' as const
            : vote.decision === 'abstain' ? 'abstain' as const
            : 'reject' as const;
          consensusProtocol.castVote(round.id, agentId, decision, vote.confidence, vote.reasoning);
          metrics.increment('votes_cast_total', { decision });
        } catch (err) {
          logger.debug(`Consensus vote cast failed for ${vote.agentName}`, { error: String(err) });
        }
      }

      // Resolve the round with cryptographic verification
      const result = consensusProtocol.resolveRound(round.id);

      // Emit REAL event
      eventStore.append('CONSENSUS_RESOLVED', {
        roundId: round.id,
        proposalId: proposal.id,
        decision: result.decision,
        votesFor: result.votesFor,
        votesAgainst: result.votesAgainst,
        abstentions: result.abstentions,
        integrityVerified: result.integrityVerified,
        quorumMet: result.quorumMet,
      }, 'orchestrator');

      const outcome: DecisionRecord['outcome'] = result.decision === 'approved' ? 'approved'
        : result.decision === 'vetoed' ? 'vetoed'
        : 'rejected';

      return {
        proposalId: proposal.id,
        proposalType: proposal.type,
        description: proposal.description,
        votes,
        outcome,
        reasoning: `[Crypto Consensus] ${result.details} (integrity: ${result.integrityVerified ? 'verified' : 'FAILED'})`,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      logger.warn('Cryptographic consensus failed, falling back to simple vote count', { error: String(err) });
    }

    // ── Fallback: simple vote counting (original logic) ──
    const guardianVote = votes.find((v) => v.agentName === 'Guardian');
    if (this.guardianCanVeto && guardianVote?.decision === 'reject' && guardianVote.confidence >= 0.8) {
      return {
        proposalId: proposal.id,
        proposalType: proposal.type,
        description: proposal.description,
        votes,
        outcome: 'vetoed',
        reasoning: `Guardian VETO (confidence ${guardianVote.confidence}): ${guardianVote.reasoning}`,
        timestamp: new Date().toISOString(),
      };
    }

    const nonAbstain = votes.filter((v) => v.decision !== 'abstain');
    const approvals = nonAbstain.filter((v) => v.decision === 'approve').length;
    const total = nonAbstain.length;
    const needed = Math.min(this.requiredMajority, Math.ceil(total * 0.75));
    const approved = approvals >= needed;
    const voteSummary = votes.map((v) => `${v.agentName}:${v.decision}(${v.confidence.toFixed(2)})`).join(', ');

    return {
      proposalId: proposal.id,
      proposalType: proposal.type,
      description: proposal.description,
      votes,
      outcome: approved ? 'approved' : 'rejected',
      reasoning: `${approvals}/${total} approved (need ${needed}). Votes: ${voteSummary}`,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Action Mapping ──

  private proposalToAction(proposal: Proposal): Action {
    const typeMap: Record<Proposal['type'], Action['type']> = {
      TIP: 'SEND_TIP',
      REBALANCE: 'REBALANCE',
      YIELD_DEPLOY: 'SUPPLY_YIELD',
      BRIDGE: 'BRIDGE_FUNDS',
      WATCHLIST_ADD: 'ADD_WATCHLIST',
    };

    return {
      id: randomUUID(),
      proposalId: proposal.id,
      type: typeMap[proposal.type] ?? 'SEND_TIP',
      params: proposal.data,
    };
  }

  private selectExecutor(action: Action): BaseAgent {
    switch (action.type) {
      case 'SEND_TIP':
        return this.tipExecutor;
      case 'REBALANCE':
      case 'SUPPLY_YIELD':
      case 'BRIDGE_FUNDS':
        return this.treasuryOptimizer;
      case 'ADD_WATCHLIST':
        return this.discovery;
      default:
        return this.tipExecutor;
    }
  }

  // ── Adaptive Timing ──

  private adjustCycleInterval(proposalCount: number, errorCount: number): void {
    if (errorCount > 2) {
      // Slow down on errors
      this.currentCycleInterval = Math.min(this.maxCycleInterval, this.currentCycleInterval * 1.5);
    } else if (proposalCount > 3) {
      // Speed up when active
      this.currentCycleInterval = Math.max(this.minCycleInterval, this.currentCycleInterval * 0.8);
    } else if (proposalCount === 0) {
      // Slow down when idle
      this.currentCycleInterval = Math.min(this.maxCycleInterval, this.currentCycleInterval * 1.2);
    }
  }

  // ── Timeout Helper ──

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }

  // ── Status and Queries ──

  getStatus(): OrchestratorStatus {
    return {
      running: this.running,
      paused: this.paused,
      currentCycle: this.currentCycle,
      totalCycles: this.cycleHistory.length,
      lastCycleAt: this.cycleHistory.length > 0
        ? this.cycleHistory[this.cycleHistory.length - 1].timestamp
        : null,
      lastCycleDuration: this.cycleHistory.length > 0
        ? this.cycleHistory[this.cycleHistory.length - 1].duration
        : null,
      agents: this.agents.map((a) => {
        const info = a.getInfo();
        return {
          id: info.id,
          name: info.name,
          role: info.role,
          status: info.status,
          cyclesCompleted: info.cyclesCompleted,
        };
      }),
      recentDecisions: this.decisionLog.slice(-20),
      messageBusStats: this.bus.getStats(),
    };
  }

  /** Get a specific agent by ID */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.find((a) => a.id === agentId);
  }

  /** Get all agents */
  getAgents(): BaseAgent[] {
    return [...this.agents];
  }

  /** Get decision log */
  getDecisionLog(): DecisionRecord[] {
    return [...this.decisionLog];
  }

  /** Get cycle history */
  getCycleHistory(): CycleResult[] {
    return [...this.cycleHistory];
  }

  /** Get the guardian agent for direct queries */
  getGuardian(): GuardianAgent {
    return this._guardian;
  }

  /** Get agent message history */
  getAgentMessages(agentId: string): AgentMessage[] {
    return this.bus.getAgentMessages(agentId);
  }
}

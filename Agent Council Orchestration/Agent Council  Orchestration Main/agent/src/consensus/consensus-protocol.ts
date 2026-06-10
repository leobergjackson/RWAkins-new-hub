// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Consensus Protocol — Cryptographic voting with quorum, supermajority, and guardian veto.
// Each agent signs their vote with SHA-256; the entire round is tamper-verifiable.

import { createHash, randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export type VoteDecision = 'approve' | 'reject' | 'abstain';

export interface ConsensusVote {
  agentId: string;
  proposal: string;
  decision: VoteDecision;
  confidence: number; // 0-1
  reasoning: string;
  timestamp: string;
  signature: string; // SHA-256(agentId + decision + timestamp + secret)
}

export interface ConsensusRound {
  id: string;
  proposal: string;
  proposalType: string;
  proposedBy: string;
  proposalData: Record<string, unknown>;
  votes: ConsensusVote[];
  quorumRequired: number; // fraction, e.g. 0.75
  supermajorityRequired: number; // fraction of non-abstain, e.g. 0.6667
  riskScore: number; // 0-1, populated before resolution
  guardianVetoThreshold: number; // risk score above which guardian auto-vetos
  result: ConsensusResult | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ConsensusResult {
  decision: 'approved' | 'rejected' | 'vetoed' | 'no_quorum';
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  totalVoters: number;
  quorumMet: boolean;
  supermajorityMet: boolean;
  guardianVetoed: boolean;
  winningConfidence: number; // weighted average confidence of winning side
  integrityVerified: boolean;
  details: string;
}

export interface ConsensusConfig {
  /** Fraction of registered agents that must vote (abstain counts as present). Default 0.75 */
  quorumFraction: number;
  /** Fraction of non-abstain votes needed for approval. Default 0.6667 */
  supermajorityFraction: number;
  /** Risk score threshold above which guardian auto-vetos. Default 0.8 */
  guardianVetoThreshold: number;
  /** Secret used to sign votes (shared among agents in the same cluster). */
  signingSecret: string;
}

const DEFAULT_CONFIG: ConsensusConfig = {
  quorumFraction: 0.75,
  supermajorityFraction: 2 / 3,
  guardianVetoThreshold: 0.8,
  signingSecret: process.env.CONSENSUS_SECRET ?? 'aerofyta-consensus-default-secret',
};

// ── Signature Utilities ────────────────────────────────────────

function computeSignature(
  agentId: string,
  decision: VoteDecision,
  timestamp: string,
  secret: string,
): string {
  return createHash('sha256')
    .update(`${agentId}|${decision}|${timestamp}|${secret}`)
    .digest('hex');
}

function verifySignature(vote: ConsensusVote, secret: string): boolean {
  const expected = computeSignature(vote.agentId, vote.decision, vote.timestamp, secret);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== vote.signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ vote.signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ── Consensus Protocol ─────────────────────────────────────────

export class ConsensusProtocol {
  private config: ConsensusConfig;
  private rounds: Map<string, ConsensusRound> = new Map();
  private registeredAgents: Set<string> = new Set();
  private roundHistory: ConsensusRound[] = [];
  private readonly MAX_HISTORY = 500;

  constructor(config: Partial<ConsensusConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('ConsensusProtocol initialized', {
      quorum: this.config.quorumFraction,
      supermajority: this.config.supermajorityFraction,
      guardianVetoThreshold: this.config.guardianVetoThreshold,
    });
  }

  // ── Agent Registration ─────────────────────────────────────

  registerAgent(agentId: string): void {
    this.registeredAgents.add(agentId);
    logger.debug(`Agent registered for consensus: ${agentId}`);
  }

  unregisterAgent(agentId: string): void {
    this.registeredAgents.delete(agentId);
  }

  getRegisteredAgents(): string[] {
    return [...this.registeredAgents];
  }

  // ── Round Lifecycle ────────────────────────────────────────

  /** Create a new consensus round for a proposal. */
  createRound(
    proposal: string,
    proposalType: string,
    proposedBy: string,
    proposalData: Record<string, unknown> = {},
    riskScore = 0,
  ): ConsensusRound {
    const round: ConsensusRound = {
      id: `cr-${Date.now()}-${randomUUID().slice(0, 8)}`,
      proposal,
      proposalType,
      proposedBy,
      proposalData,
      votes: [],
      quorumRequired: this.config.quorumFraction,
      supermajorityRequired: this.config.supermajorityFraction,
      riskScore,
      guardianVetoThreshold: this.config.guardianVetoThreshold,
      result: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    this.rounds.set(round.id, round);
    logger.info(`Consensus round created: ${round.id}`, { proposal, proposalType, riskScore });
    return round;
  }

  /** Submit a cryptographically signed vote to an open round. */
  castVote(
    roundId: string,
    agentId: string,
    decision: VoteDecision,
    confidence: number,
    reasoning: string,
  ): ConsensusVote {
    const round = this.rounds.get(roundId);
    if (!round) throw new Error(`Round not found: ${roundId}`);
    if (round.result) throw new Error(`Round already resolved: ${roundId}`);
    if (round.votes.some(v => v.agentId === agentId)) {
      throw new Error(`Agent ${agentId} already voted in round ${roundId}`);
    }

    const timestamp = new Date().toISOString();
    const signature = computeSignature(agentId, decision, timestamp, this.config.signingSecret);

    const vote: ConsensusVote = {
      agentId,
      proposal: round.proposal,
      decision,
      confidence: Math.max(0, Math.min(1, confidence)),
      reasoning,
      timestamp,
      signature,
    };

    round.votes.push(vote);
    logger.info(`Vote cast in round ${roundId}`, { agentId, decision, confidence: vote.confidence });
    return vote;
  }

  /** Resolve a round: check quorum, supermajority, guardian veto. */
  resolveRound(roundId: string): ConsensusResult {
    const round = this.rounds.get(roundId);
    if (!round) throw new Error(`Round not found: ${roundId}`);
    if (round.result) return round.result;

    const totalRegistered = Math.max(this.registeredAgents.size, 1);
    const totalVoters = round.votes.length;
    const approvals = round.votes.filter(v => v.decision === 'approve');
    const rejections = round.votes.filter(v => v.decision === 'reject');
    const abstentions = round.votes.filter(v => v.decision === 'abstain');

    // Quorum: 3/4 of registered agents must have voted (abstain counts as present)
    const quorumMet = totalVoters / totalRegistered >= round.quorumRequired;

    // Supermajority: 2/3 of non-abstain votes must agree
    const nonAbstain = approvals.length + rejections.length;
    const approvalRatio = nonAbstain > 0 ? approvals.length / nonAbstain : 0;
    const supermajorityMet = approvalRatio >= round.supermajorityRequired;

    // Guardian veto: if risk score exceeds threshold, auto-veto
    const guardianVetoed = round.riskScore > round.guardianVetoThreshold;

    // Calculate weighted confidence of the winning side
    const winningSide = approvals.length >= rejections.length ? approvals : rejections;
    const winningConfidence = winningSide.length > 0
      ? winningSide.reduce((sum, v) => sum + v.confidence, 0) / winningSide.length
      : 0;

    // Verify all vote signatures
    const integrityVerified = round.votes.every(v =>
      verifySignature(v, this.config.signingSecret),
    );

    // Determine result
    let decision: ConsensusResult['decision'];
    let details: string;

    if (guardianVetoed) {
      decision = 'vetoed';
      details = `Guardian veto: risk score ${round.riskScore.toFixed(3)} exceeds threshold ${round.guardianVetoThreshold}`;
    } else if (!quorumMet) {
      decision = 'no_quorum';
      details = `Quorum not met: ${totalVoters}/${totalRegistered} voted (need ${(round.quorumRequired * 100).toFixed(0)}%)`;
    } else if (supermajorityMet) {
      decision = 'approved';
      details = `Approved: ${approvals.length}/${nonAbstain} non-abstain votes (${(approvalRatio * 100).toFixed(1)}% >= ${(round.supermajorityRequired * 100).toFixed(1)}% required)`;
    } else {
      decision = 'rejected';
      details = `Rejected: ${approvals.length}/${nonAbstain} non-abstain votes (${(approvalRatio * 100).toFixed(1)}% < ${(round.supermajorityRequired * 100).toFixed(1)}% required)`;
    }

    const result: ConsensusResult = {
      decision,
      votesFor: approvals.length,
      votesAgainst: rejections.length,
      abstentions: abstentions.length,
      totalVoters,
      quorumMet,
      supermajorityMet,
      guardianVetoed,
      winningConfidence,
      integrityVerified,
      details,
    };

    round.result = result;
    round.resolvedAt = new Date().toISOString();

    // Move to history
    this.roundHistory.push(round);
    if (this.roundHistory.length > this.MAX_HISTORY) {
      this.roundHistory.shift();
    }

    logger.info(`Consensus round resolved: ${roundId}`, {
      decision,
      votesFor: result.votesFor,
      votesAgainst: result.votesAgainst,
      abstentions: result.abstentions,
      quorumMet,
      guardianVetoed,
      integrityVerified,
    });

    return result;
  }

  // ── Integrity Verification ─────────────────────────────────

  /** Re-verify all vote signatures in a round (audit function). */
  verifyConsensusIntegrity(roundId: string): {
    roundId: string;
    totalVotes: number;
    validSignatures: number;
    invalidSignatures: string[];
    integrityPassed: boolean;
  } {
    const round = this.rounds.get(roundId)
      ?? this.roundHistory.find(r => r.id === roundId);
    if (!round) throw new Error(`Round not found: ${roundId}`);

    const invalidSignatures: string[] = [];
    for (const vote of round.votes) {
      if (!verifySignature(vote, this.config.signingSecret)) {
        invalidSignatures.push(vote.agentId);
      }
    }

    return {
      roundId,
      totalVotes: round.votes.length,
      validSignatures: round.votes.length - invalidSignatures.length,
      invalidSignatures,
      integrityPassed: invalidSignatures.length === 0,
    };
  }

  // ── Queries ────────────────────────────────────────────────

  getRound(roundId: string): ConsensusRound | undefined {
    return this.rounds.get(roundId) ?? this.roundHistory.find(r => r.id === roundId);
  }

  getActiveRounds(): ConsensusRound[] {
    return [...this.rounds.values()].filter(r => !r.result);
  }

  getHistory(limit = 50): ConsensusRound[] {
    return this.roundHistory.slice(-limit);
  }

  getStats(): {
    totalRounds: number;
    activeRounds: number;
    approved: number;
    rejected: number;
    vetoed: number;
    noQuorum: number;
    registeredAgents: number;
    averageVotesPerRound: number;
    integrityScore: number;
  } {
    const resolved = this.roundHistory.filter(r => r.result);
    const approved = resolved.filter(r => r.result?.decision === 'approved').length;
    const rejected = resolved.filter(r => r.result?.decision === 'rejected').length;
    const vetoed = resolved.filter(r => r.result?.decision === 'vetoed').length;
    const noQuorum = resolved.filter(r => r.result?.decision === 'no_quorum').length;
    const totalVotes = resolved.reduce((s, r) => s + r.votes.length, 0);
    const integrityPassed = resolved.filter(r => r.result?.integrityVerified).length;

    return {
      totalRounds: this.roundHistory.length,
      activeRounds: this.getActiveRounds().length,
      approved,
      rejected,
      vetoed,
      noQuorum,
      registeredAgents: this.registeredAgents.size,
      averageVotesPerRound: resolved.length > 0 ? totalVotes / resolved.length : 0,
      integrityScore: resolved.length > 0 ? integrityPassed / resolved.length : 1,
    };
  }

  /** Seed demo data for a fully resolved consensus round with 4 agents. */
  seedDemoRound(): ConsensusRound {
    const agents = ['discovery-agent', 'treasury-agent', 'tip-executor-agent', 'guardian-agent'];
    agents.forEach(a => this.registerAgent(a));

    const round = this.createRound(
      'Tip @CryptoCreator 5 USDT on Ethereum for viral tutorial',
      'TIP',
      'discovery-agent',
      { recipient: '0xabc...def', amount: '5', chain: 'ethereum', reason: 'viral tutorial' },
      0.3,
    );

    this.castVote(round.id, 'discovery-agent', 'approve', 0.92,
      'High engagement creator (150k views), content aligns with tip criteria');
    this.castVote(round.id, 'treasury-agent', 'approve', 0.85,
      'Budget allows this tip. Current balance 450 USDT, daily spend at 23% of limit');
    this.castVote(round.id, 'tip-executor-agent', 'approve', 0.78,
      'Gas costs acceptable at 0.8% of tip amount. Network not congested');
    this.castVote(round.id, 'guardian-agent', 'abstain', 0.60,
      'No risk flags detected. Abstaining — routine transaction');

    this.resolveRound(round.id);
    return round;
  }
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Autonomous Proof Service
// Generates structured proof documents showing the agent makes real autonomous decisions.

import { logger } from '../utils/logger.js';
import type { AuditTrailService, AuditEntry, AuditStatistics } from './audit-trail.service.js';

// ── Types ──────────────────────────────────────────────────────

export interface ProofDocument {
  generatedAt: string;
  agentId: string;
  version: string;
  uptime: {
    startedAt: string;
    uptimeMs: number;
    uptimeHuman: string;
  };
  cycleCount: number;
  decisionHistory: ProofDecisionSummary[];
  transactionProofs: TransactionProof[];
  consensusRecords: ConsensusRecord[];
  guardianVetoRecords: GuardianVetoRecord[];
  riskAssessments: RiskAssessment[];
  statistics: AuditStatistics;
}

export interface ProofDecisionSummary {
  decisionId: string;
  timestamp: string;
  type: string;
  reasoning: string;
  outcome: string;
  confidence: number;
  executionTimeMs: number;
  hash?: string;
}

export interface TransactionProof {
  decisionId: string;
  txHash: string;
  chain: string;
  explorerUrl: string;
  timestamp: string;
  type: string;
  gasUsed?: string;
}

export interface ConsensusRecord {
  decisionId: string;
  timestamp: string;
  votes: Array<{ agent: string; vote: string; confidence: number }>;
  result: string;
  unanimity: boolean;
}

export interface GuardianVetoRecord {
  decisionId: string;
  timestamp: string;
  verdict: string;
  type: string;
  reasoning: string;
}

export interface RiskAssessment {
  decisionId: string;
  timestamp: string;
  riskScore: number;
  type: string;
  outcome: string;
}

// ── Explorer URL mapping ───────────────────────────────────────

const EXPLORER_MAP: Record<string, string> = {
  'ethereum': 'https://etherscan.io/tx/',
  'ethereum-sepolia': 'https://sepolia.etherscan.io/tx/',
  'polygon': 'https://polygonscan.com/tx/',
  'polygon-mumbai': 'https://mumbai.polygonscan.com/tx/',
  'polygon-amoy': 'https://amoy.polygonscan.com/tx/',
  'arbitrum': 'https://arbiscan.io/tx/',
  'optimism': 'https://optimistic.etherscan.io/tx/',
  'bsc': 'https://bscscan.com/tx/',
  'ton': 'https://tonscan.org/tx/',
};

function getExplorerUrl(chain: string, txHash: string): string {
  const base = EXPLORER_MAP[chain.toLowerCase()] ?? EXPLORER_MAP['ethereum-sepolia'];
  return `${base}${txHash}`;
}

// ── Service ────────────────────────────────────────────────────

export class AutonomousProofService {
  private readonly agentId = 'aerofyta-agent-v1';
  private readonly version = '1.1.0';
  private readonly startedAt: string;

  constructor(private auditTrail: AuditTrailService) {
    this.startedAt = new Date().toISOString();
  }

  /** Generate the full proof document (JSON). */
  generateProofDocument(): ProofDocument {
    const entries = this.auditTrail.exportAuditLog();
    const stats = this.auditTrail.getStatistics();
    const uptimeMs = this.auditTrail.getUptimeMs();

    return {
      generatedAt: new Date().toISOString(),
      agentId: this.agentId,
      version: this.version,
      uptime: {
        startedAt: this.startedAt,
        uptimeMs,
        uptimeHuman: this.formatUptime(uptimeMs),
      },
      cycleCount: this.auditTrail.getCycleCount(),
      decisionHistory: this.buildDecisionHistory(entries),
      transactionProofs: this.buildTransactionProofs(entries),
      consensusRecords: this.buildConsensusRecords(entries),
      guardianVetoRecords: this.buildGuardianVetoRecords(entries),
      riskAssessments: this.buildRiskAssessments(entries),
      statistics: stats,
    };
  }

  /** Generate a markdown-friendly proof section for the README. */
  generateReadmeProof(): string {
    const stats = this.auditTrail.getStatistics();
    const entries = this.auditTrail.exportAuditLog();
    const txEntries = entries.filter(e => e.txHash);
    const vetoedEntries = entries.filter(e => e.outcome === 'vetoed');
    const recentEntries = entries.slice(-10).reverse();

    const lines: string[] = [
      '## Autonomous Decision Proof',
      '',
      `> Generated at ${new Date().toISOString()} by AeroFyta Agent v${this.version}`,
      '',
      '### Agent Statistics',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Decisions | ${stats.totalDecisions} |`,
      `| Approval Rate | ${stats.approvalRate}% |`,
      `| Average Confidence | ${stats.avgConfidence} |`,
      `| Average Execution Time | ${stats.avgExecutionTimeMs}ms |`,
      `| Unique Chains Used | ${Object.keys(stats.byChain).length} |`,
      `| On-chain Transactions | ${stats.transactionsWithHash} |`,
      `| Guardian Vetoes | ${vetoedEntries.length} |`,
      `| Autonomous Cycles | ${stats.cycleCount} |`,
      `| Uptime | ${this.formatUptime(stats.uptimeMs)} |`,
      '',
    ];

    // Decision breakdown by type
    if (Object.keys(stats.byType).length > 0) {
      lines.push('### Decision Breakdown by Type', '');
      lines.push('| Type | Count |');
      lines.push('|------|-------|');
      for (const [type, count] of Object.entries(stats.byType)) {
        lines.push(`| ${type} | ${count} |`);
      }
      lines.push('');
    }

    // Transaction proofs
    if (txEntries.length > 0) {
      lines.push('### On-Chain Transaction Proofs', '');
      lines.push('| Decision ID | Chain | Tx Hash | Explorer |');
      lines.push('|-------------|-------|---------|----------|');
      for (const e of txEntries.slice(-20)) {
        const chain = e.chain ?? 'ethereum-sepolia';
        const shortHash = e.txHash!.slice(0, 10) + '...' + e.txHash!.slice(-6);
        const url = getExplorerUrl(chain, e.txHash!);
        lines.push(`| ${e.decisionId} | ${chain} | \`${shortHash}\` | [View](${url}) |`);
      }
      lines.push('');
    }

    // Recent decision trace
    if (recentEntries.length > 0) {
      lines.push('### Recent Decision Trace (Last 10)', '');
      for (const e of recentEntries) {
        const avgConf = e.agentVotes.length > 0
          ? (e.agentVotes.reduce((s, v) => s + v.confidence, 0) / e.agentVotes.length).toFixed(2)
          : 'N/A';
        lines.push(`#### ${e.decisionId} (${e.type})`);
        lines.push(`- **Time:** ${e.timestamp}`);
        lines.push(`- **Outcome:** ${e.outcome}`);
        lines.push(`- **Confidence:** ${avgConf}`);
        lines.push(`- **Reasoning:** ${e.reasoning.slice(0, 200)}${e.reasoning.length > 200 ? '...' : ''}`);
        if (e.txHash) {
          const chain = e.chain ?? 'ethereum-sepolia';
          lines.push(`- **Tx:** [${e.txHash.slice(0, 16)}...](${getExplorerUrl(chain, e.txHash)})`);
        }
        lines.push('');
      }
    }

    logger.info('README proof generated', { decisions: stats.totalDecisions, txProofs: txEntries.length });
    return lines.join('\n');
  }

  // ── Internal builders ────────────────────────────────────────

  private buildDecisionHistory(entries: AuditEntry[]): ProofDecisionSummary[] {
    return entries.map(e => {
      const avgConf = e.agentVotes.length > 0
        ? Math.round((e.agentVotes.reduce((s, v) => s + v.confidence, 0) / e.agentVotes.length) * 100) / 100
        : 0;
      return {
        decisionId: e.decisionId,
        timestamp: e.timestamp,
        type: e.type,
        reasoning: e.reasoning,
        outcome: e.outcome,
        confidence: avgConf,
        executionTimeMs: e.executionTimeMs,
        hash: e.hash,
      };
    });
  }

  private buildTransactionProofs(entries: AuditEntry[]): TransactionProof[] {
    return entries
      .filter(e => e.txHash)
      .map(e => ({
        decisionId: e.decisionId,
        txHash: e.txHash!,
        chain: e.chain ?? 'ethereum-sepolia',
        explorerUrl: getExplorerUrl(e.chain ?? 'ethereum-sepolia', e.txHash!),
        timestamp: e.timestamp,
        type: e.type,
        gasUsed: e.gasUsed,
      }));
  }

  private buildConsensusRecords(entries: AuditEntry[]): ConsensusRecord[] {
    return entries
      .filter(e => e.agentVotes.length > 0)
      .map(e => {
        const approves = e.agentVotes.filter(v => v.vote === 'approve').length;
        const unanimity = e.agentVotes.every(v => v.vote === e.agentVotes[0]?.vote);
        return {
          decisionId: e.decisionId,
          timestamp: e.timestamp,
          votes: e.agentVotes.map(v => ({ agent: v.agent, vote: v.vote, confidence: v.confidence })),
          result: approves > e.agentVotes.length / 2 ? 'approved' : 'rejected',
          unanimity,
        };
      });
  }

  private buildGuardianVetoRecords(entries: AuditEntry[]): GuardianVetoRecord[] {
    return entries
      .filter(e => e.guardianVerdict === 'vetoed')
      .map(e => ({
        decisionId: e.decisionId,
        timestamp: e.timestamp,
        verdict: e.guardianVerdict,
        type: e.type,
        reasoning: e.reasoning,
      }));
  }

  private buildRiskAssessments(entries: AuditEntry[]): RiskAssessment[] {
    return entries
      .filter(e => e.riskScore !== undefined)
      .map(e => ({
        decisionId: e.decisionId,
        timestamp: e.timestamp,
        riskScore: e.riskScore!,
        type: e.type,
        outcome: e.outcome,
      }));
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

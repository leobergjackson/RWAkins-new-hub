// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Decision Audit Trail Service
// Comprehensive, append-only audit log proving autonomous agent decisions.

import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', '..', 'data');
const AUDIT_FILE = resolve(DATA_DIR, 'audit-trail.jsonl');

// ── Types ──────────────────────────────────────────────────────

export type AuditDecisionType = 'tip' | 'escrow' | 'swap' | 'yield' | 'security' | 'dca' | 'bridge' | 'governance' | 'other';
export type AuditOutcome = 'approved' | 'rejected' | 'executed' | 'failed' | 'vetoed' | 'pending';

export interface AgentVote {
  agent: string;
  vote: 'approve' | 'reject' | 'abstain';
  confidence: number;
  reasoning?: string;
}

export interface AuditEntry {
  timestamp: string;
  decisionId: string;
  type: AuditDecisionType;
  input: string;
  reasoning: string;
  agentVotes: AgentVote[];
  guardianVerdict: 'approved' | 'vetoed' | 'not_required';
  outcome: AuditOutcome;
  txHash?: string;
  chain?: string;
  gasUsed?: string;
  executionTimeMs: number;
  riskScore?: number;
  cycleNumber?: number;
  hash?: string;
}

export interface AuditFilters {
  type?: AuditDecisionType;
  outcome?: AuditOutcome;
  startDate?: string;
  endDate?: string;
  chain?: string;
  minConfidence?: number;
  page?: number;
  limit?: number;
}

export interface AuditStatistics {
  totalDecisions: number;
  approvalRate: number;
  rejectionRate: number;
  vetoRate: number;
  avgConfidence: number;
  avgExecutionTimeMs: number;
  byType: Record<string, number>;
  byOutcome: Record<string, number>;
  byChain: Record<string, number>;
  totalGasUsed: string;
  transactionsWithHash: number;
  firstDecisionAt: string | null;
  lastDecisionAt: string | null;
  uptimeMs: number;
  cycleCount: number;
}

export interface ProofBundle {
  generatedAt: string;
  version: '1.0.0';
  agentId: string;
  totalDecisions: number;
  decisions: Array<AuditEntry & { hash: string }>;
  merkleRoot: string;
  statistics: AuditStatistics;
}

// ── Service ────────────────────────────────────────────────────

export class AuditTrailService {
  private entries: AuditEntry[] = [];
  private startedAt: number = Date.now();
  private cycleCount = 0;
  private maxInMemory = 5000;

  constructor() {
    this.ensureDataDir();
    this.loadFromDisk();
  }

  // ── Core Methods ─────────────────────────────────────────────

  /** Append a decision to the audit log (persists immediately). */
  logDecision(entry: Omit<AuditEntry, 'hash'>): AuditEntry {
    const hash = this.hashEntry(entry);
    const full: AuditEntry = { ...entry, hash };

    this.entries.push(full);
    this.cycleCount = Math.max(this.cycleCount, entry.cycleNumber ?? this.cycleCount);

    // Persist to JSONL (append-only)
    try {
      appendFileSync(AUDIT_FILE, JSON.stringify(full) + '\n', 'utf-8');
    } catch (err) {
      logger.warn('Failed to persist audit entry', { error: String(err) });
    }

    // Trim in-memory buffer
    if (this.entries.length > this.maxInMemory) {
      this.entries = this.entries.slice(-this.maxInMemory);
    }

    logger.info('Audit decision logged', {
      decisionId: full.decisionId,
      type: full.type,
      outcome: full.outcome,
      txHash: full.txHash?.slice(0, 12),
    });

    return full;
  }

  /** Query decisions with optional filters. */
  getDecisions(filters?: AuditFilters): { decisions: AuditEntry[]; total: number; page: number; totalPages: number } {
    let filtered = [...this.entries];

    if (filters?.type) filtered = filtered.filter(e => e.type === filters.type);
    if (filters?.outcome) filtered = filtered.filter(e => e.outcome === filters.outcome);
    if (filters?.chain) filtered = filtered.filter(e => e.chain === filters.chain);
    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime();
      filtered = filtered.filter(e => new Date(e.timestamp).getTime() <= end);
    }
    if (filters?.minConfidence !== undefined) {
      filtered = filtered.filter(e => {
        const avg = e.agentVotes.length > 0
          ? e.agentVotes.reduce((s, v) => s + v.confidence, 0) / e.agentVotes.length
          : 0;
        return avg >= (filters.minConfidence ?? 0);
      });
    }

    // Sort newest first
    filtered.reverse();

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const decisions = filtered.slice(offset, offset + limit);

    return { decisions, total, page, totalPages };
  }

  /** Get a single decision by ID. */
  getDecisionById(id: string): AuditEntry | null {
    return this.entries.find(e => e.decisionId === id) ?? null;
  }

  /** Export the full audit log as JSON. */
  exportAuditLog(): AuditEntry[] {
    return [...this.entries];
  }

  /** Get summary statistics. */
  getStatistics(): AuditStatistics {
    const total = this.entries.length;
    const approved = this.entries.filter(e => e.outcome === 'approved' || e.outcome === 'executed').length;
    const rejected = this.entries.filter(e => e.outcome === 'rejected' || e.outcome === 'failed').length;
    const vetoed = this.entries.filter(e => e.outcome === 'vetoed').length;

    const confidences = this.entries.flatMap(e => e.agentVotes.map(v => v.confidence));
    const avgConfidence = confidences.length > 0
      ? Math.round((confidences.reduce((s, c) => s + c, 0) / confidences.length) * 100) / 100
      : 0;

    const execTimes = this.entries.map(e => e.executionTimeMs).filter(t => t > 0);
    const avgExecutionTimeMs = execTimes.length > 0
      ? Math.round(execTimes.reduce((s, t) => s + t, 0) / execTimes.length)
      : 0;

    const byType: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};
    const byChain: Record<string, number> = {};
    let totalGas = 0;
    let txCount = 0;

    for (const e of this.entries) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      byOutcome[e.outcome] = (byOutcome[e.outcome] ?? 0) + 1;
      if (e.chain) byChain[e.chain] = (byChain[e.chain] ?? 0) + 1;
      if (e.gasUsed) totalGas += parseInt(e.gasUsed, 10) || 0;
      if (e.txHash) txCount++;
    }

    return {
      totalDecisions: total,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      rejectionRate: total > 0 ? Math.round((rejected / total) * 100) : 0,
      vetoRate: total > 0 ? Math.round((vetoed / total) * 100) : 0,
      avgConfidence,
      avgExecutionTimeMs,
      byType,
      byOutcome,
      byChain,
      totalGasUsed: totalGas.toString(),
      transactionsWithHash: txCount,
      firstDecisionAt: this.entries.length > 0 ? this.entries[0].timestamp : null,
      lastDecisionAt: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : null,
      uptimeMs: Date.now() - this.startedAt,
      cycleCount: this.cycleCount,
    };
  }

  /** Generate a verifiable proof bundle with SHA-256 hashes and Merkle root. */
  generateProofBundle(): ProofBundle {
    const hashedDecisions = this.entries.map(e => ({
      ...e,
      hash: e.hash ?? this.hashEntry(e),
    }));

    const hashes = hashedDecisions.map(d => d.hash);
    const merkleRoot = this.computeMerkleRoot(hashes);

    return {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      agentId: 'aerofyta-agent-v1',
      totalDecisions: this.entries.length,
      decisions: hashedDecisions,
      merkleRoot,
      statistics: this.getStatistics(),
    };
  }

  /** Increment cycle counter (called by autonomous loop). */
  incrementCycle(): number {
    return ++this.cycleCount;
  }

  /** Get current cycle count. */
  getCycleCount(): number {
    return this.cycleCount;
  }

  /** Get uptime in ms. */
  getUptimeMs(): number {
    return Date.now() - this.startedAt;
  }

  /** Reset (for testing). */
  clear(): void {
    this.entries = [];
    this.cycleCount = 0;
    this.startedAt = Date.now();
  }

  // ── Internal ─────────────────────────────────────────────────

  private hashEntry(entry: Omit<AuditEntry, 'hash'>): string {
    const payload = JSON.stringify({
      timestamp: entry.timestamp,
      decisionId: entry.decisionId,
      type: entry.type,
      input: entry.input,
      reasoning: entry.reasoning,
      outcome: entry.outcome,
      txHash: entry.txHash,
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  private computeMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return createHash('sha256').update('empty').digest('hex');
    if (hashes.length === 1) return hashes[0];

    const nextLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left;
      nextLevel.push(createHash('sha256').update(left + right).digest('hex'));
    }
    return this.computeMerkleRoot(nextLevel);
  }

  private ensureDataDir(): void {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {
      // Ignore — may not have write permissions in all environments
    }
  }

  private loadFromDisk(): void {
    try {
      if (!existsSync(AUDIT_FILE)) return;
      const raw = readFileSync(AUDIT_FILE, 'utf-8');
      const lines = raw.split('\n').filter(l => l.trim().length > 0);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditEntry;
          this.entries.push(entry);
          if (entry.cycleNumber && entry.cycleNumber > this.cycleCount) {
            this.cycleCount = entry.cycleNumber;
          }
        } catch {
          // Skip malformed lines
        }
      }
      if (this.entries.length > this.maxInMemory) {
        this.entries = this.entries.slice(-this.maxInMemory);
      }
      logger.info('Audit trail loaded from disk', { entries: this.entries.length });
    } catch {
      // File may not exist yet — that's fine
    }
  }
}

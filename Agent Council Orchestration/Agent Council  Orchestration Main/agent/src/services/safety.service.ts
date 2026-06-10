// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Safety & Risk Service (Group 5)
//
// Implements Features 28, 39, 40, 47:
//   28: Risk Guardrails / Policy Validator
//   39: Budget Autonomy / Kill Switch
//   40: Tiered Approval (Small Auto, Large Confirm)
//   47: Try/Catch + Rollback Recovery
//
// Design: NON-BLOCKING — if this service crashes, the agent continues
// with conservative defaults (block everything).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';
import { ServiceError, rateLimited } from '../utils/service-error.js';
import type { AnomalyDetectionService } from './anomaly-detection.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEND_LOG_FILE = join(__dirname, '..', '..', '.safety-spend-log.json');

// ── Types ────────────────────────────────────────────────────────

/** Policy validation result */
export interface PolicyValidation {
  allowed: boolean;
  reason: string;
  policy: string;
}

/** Spend tracking for a given time window */
interface SpendRecord {
  amount: number;
  recipient: string;
  timestamp: number;
}

/** Tiered approval decision */
export type ApprovalTier = 'auto' | 'flagged' | 'manual_required';

/** Pending approval entry for large tips */
export interface PendingApproval {
  id: string;
  recipient: string;
  amount: number;
  chain: string;
  token: string;
  reason: string;
  tier: ApprovalTier;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt?: string;
}

/** Recovery queue entry for failed transactions */
export interface RecoveryEntry {
  id: string;
  txHash?: string;
  recipient: string;
  amount: number;
  chain: string;
  token: string;
  failureType: 'pre_send' | 'post_send' | 'timeout';
  error: string;
  status: 'pending_verification' | 'queued_retry' | 'resolved' | 'abandoned';
  retryCount: number;
  createdAt: string;
  lastRetryAt?: string;
}

/** Velocity alert when rapid-fire tipping detected */
export interface VelocityAlert {
  recipient: string;
  count: number;
  windowSeconds: number;
  detectedAt: string;
  severity: 'warning' | 'critical';
}

/** Structured security report */
export interface SecurityReport {
  generatedAt: string;
  killSwitch: boolean;
  velocityAlerts: VelocityAlert[];
  progressiveLimitActive: boolean;
  effectiveDailyLimit: number;
  baseDailyLimit: number;
  flaggedTipsLastHour: number;
  budgetUsedPercent: number;
  topRecipients: Array<{ address: string; tipCount: number; totalAmount: number }>;
  riskSummary: 'healthy' | 'elevated' | 'critical';
}

/** Safety status overview */
export interface SafetyStatus {
  killSwitch: boolean;
  budgetRemaining: number;
  budgetUsed: number;
  hourlyUsed: number;
  hourlyRemaining: number;
  tipsToday: number;
  pendingApprovals: number;
  recoveryQueueSize: number;
}

/** Active policies with current limits */
export interface ActivePolicies {
  maxSingleTip: number;
  maxDailySpend: number;
  maxHourlySpend: number;
  minTipAmount: number;
  maxTipsPerCreatorPerDay: number;
  blockedAddresses: string[];
  tier1Limit: number;
  tier2Limit: number;
}

/** Usage stats against limits */
export interface UsageStats {
  dailySpend: number;
  dailyLimit: number;
  dailyPercent: number;
  hourlySpend: number;
  hourlyLimit: number;
  hourlyPercent: number;
  tipsToday: number;
  tipsByRecipientToday: Record<string, number>;
}

// ── Service ──────────────────────────────────────────────────────

/**
 * SafetyService — the guardian layer for all tip operations.
 *
 * Every tip MUST pass through validateTip() before execution.
 * The kill switch can halt all autonomous activity instantly.
 * Tiered approval ensures large tips get human review.
 * Recovery queue tracks failed transactions for retry.
 */
export class SafetyService {
  // ── Policy limits (from env vars with defaults) ──
  private maxSingleTip: number;
  private maxDailySpend: number;
  private maxHourlySpend: number;
  private minTipAmount: number;
  private maxTipsPerCreatorPerDay: number;
  private blockedAddresses: Set<string>;
  private tier1Limit: number;
  private tier2Limit: number;

  // ── Optional services ──
  private anomalyDetection: AnomalyDetectionService | null = null;

  // ── State ──
  private killSwitch = false;
  private spendLog: SpendRecord[] = [];
  private pendingApprovals: PendingApproval[] = [];
  private recoveryQueue: RecoveryEntry[] = [];
  private approvalCounter = 0;
  private recoveryCounter = 0;
  private velocityAlerts: VelocityAlert[] = [];
  private flaggedTimestamps: number[] = [];
  private deEscalationAuditLog: Array<{ timestamp: string; ruleBasedTier: ApprovalTier; proposedTier: ApprovalTier; source: string; overridden: boolean }> = [];

  constructor() {
    // Load limits from environment with sensible defaults
    this.maxSingleTip = parseFloat(process.env.MAX_SINGLE_TIP ?? '50');
    this.maxDailySpend = parseFloat(process.env.MAX_DAILY_SPEND ?? '200');
    this.maxHourlySpend = parseFloat(process.env.MAX_HOURLY_SPEND ?? '100');
    this.minTipAmount = parseFloat(process.env.MIN_TIP_AMOUNT ?? '0.001');
    this.maxTipsPerCreatorPerDay = parseInt(process.env.MAX_TIPS_PER_CREATOR_PER_DAY ?? '5', 10);
    this.tier1Limit = parseFloat(process.env.TIER1_LIMIT ?? '5');
    this.tier2Limit = parseFloat(process.env.TIER2_LIMIT ?? '25');

    // Parse blocked addresses from comma-separated env var
    this.blockedAddresses = new Set<string>();
    const blocked = process.env.BLOCKED_ADDRESSES ?? '';
    if (blocked.trim()) {
      for (const addr of blocked.split(',')) {
        const trimmed = addr.trim().toLowerCase();
        if (trimmed) this.blockedAddresses.add(trimmed);
      }
    }
    // Always block burn addresses
    this.blockedAddresses.add('0x0000000000000000000000000000000000000000');
    this.blockedAddresses.add('0x000000000000000000000000000000000000dead');

    // Restore spend log from disk (survive restarts)
    this.loadSpendLog();

    logger.info('Safety service initialized', {
      maxSingleTip: this.maxSingleTip,
      maxDailySpend: this.maxDailySpend,
      maxHourlySpend: this.maxHourlySpend,
      tier1: this.tier1Limit,
      tier2: this.tier2Limit,
      blockedAddresses: this.blockedAddresses.size,
      restoredSpendRecords: this.spendLog.length,
    });
  }

  /** Wire the AnomalyDetectionService for statistical anomaly checks */
  setAnomalyDetection(svc: AnomalyDetectionService): void {
    this.anomalyDetection = svc;
    logger.info('AnomalyDetectionService connected to SafetyService');
  }

  /** Load spend log from disk */
  private loadSpendLog(): void {
    try {
      if (existsSync(SPEND_LOG_FILE)) {
        const raw = readFileSync(SPEND_LOG_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          // Only keep records from the last 24 hours
          const cutoff = Date.now() - 24 * 60 * 60 * 1000;
          this.spendLog = data.filter((r: SpendRecord) => r.timestamp > cutoff);
        }
      }
    } catch (err) {
      logger.debug('Could not load spend log from disk', { error: String(err) });
    }
  }

  /** Persist spend log to disk */
  private saveSpendLog(): void {
    try {
      writeFileSync(SPEND_LOG_FILE, JSON.stringify(this.spendLog), 'utf-8');
    } catch (err) {
      logger.debug('Could not save spend log to disk', { error: String(err) });
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Feature 28: Risk Guardrails / Policy Validator
  // ════════════════════════════════════════════════════════════════

  /**
   * Validate a tip against ALL safety policies.
   * Must be called BEFORE every tip execution.
   *
   * Returns { allowed, reason, policy } so the caller knows
   * exactly why a tip was blocked.
   */
  validateTip(params: {
    recipient: string;
    amount: number;
    chain?: string;
    token?: string;
  }): PolicyValidation {
    try {
      const { recipient, amount } = params;
      const recipientLower = recipient.toLowerCase();

      // Policy 1: Kill switch
      if (this.killSwitch) {
        logger.info('Policy KILL_SWITCH blocked tip', { recipient: recipientLower.slice(0, 12), amount });
        return { allowed: false, reason: 'Kill switch is active — all tips are paused', policy: 'KILL_SWITCH' };
      }

      // Policy 2: Minimum amount
      if (amount < this.minTipAmount) {
        logger.info('Policy MIN_TIP_AMOUNT blocked tip', { amount, min: this.minTipAmount });
        return { allowed: false, reason: `Tip amount ${amount} is below minimum ${this.minTipAmount} USDT`, policy: 'MIN_TIP_AMOUNT' };
      }

      // Policy 3: Maximum single tip
      if (amount > this.maxSingleTip) {
        logger.info('Policy MAX_SINGLE_TIP blocked tip', { amount, max: this.maxSingleTip });
        return { allowed: false, reason: `Tip amount ${amount} exceeds maximum single tip ${this.maxSingleTip} USDT`, policy: 'MAX_SINGLE_TIP' };
      }

      // Policy 4: Blocked addresses
      if (this.blockedAddresses.has(recipientLower)) {
        logger.info('Policy BLOCKED_ADDRESS blocked tip', { recipient: recipientLower.slice(0, 12) });
        return { allowed: false, reason: `Recipient ${recipientLower.slice(0, 12)}... is on the blocklist`, policy: 'BLOCKED_ADDRESS' };
      }

      // Policy 5: Daily spend limit
      const dailySpend = this.getDailySpend();
      if (dailySpend + amount > this.maxDailySpend) {
        logger.info('Policy MAX_DAILY_SPEND blocked tip', { dailySpend, amount, max: this.maxDailySpend });
        return {
          allowed: false,
          reason: `Daily spend would be ${(dailySpend + amount).toFixed(4)} USDT, exceeding limit of ${this.maxDailySpend} USDT (${dailySpend.toFixed(4)} already spent)`,
          policy: 'MAX_DAILY_SPEND',
        };
      }

      // Policy 6: Hourly spend limit
      const hourlySpend = this.getHourlySpend();
      if (hourlySpend + amount > this.maxHourlySpend) {
        logger.info('Policy MAX_HOURLY_SPEND blocked tip', { hourlySpend, amount, max: this.maxHourlySpend });
        return {
          allowed: false,
          reason: `Hourly spend would be ${(hourlySpend + amount).toFixed(4)} USDT, exceeding limit of ${this.maxHourlySpend} USDT`,
          policy: 'MAX_HOURLY_SPEND',
        };
      }

      // Policy 7: Per-creator daily limit (anti-spam)
      const creatorTipsToday = this.getCreatorTipsToday(recipientLower);
      if (creatorTipsToday >= this.maxTipsPerCreatorPerDay) {
        logger.info('Policy MAX_TIPS_PER_CREATOR blocked tip', { recipient: recipientLower.slice(0, 12), count: creatorTipsToday });
        return {
          allowed: false,
          reason: `Already sent ${creatorTipsToday} tips to this creator today (max: ${this.maxTipsPerCreatorPerDay})`,
          policy: 'MAX_TIPS_PER_CREATOR_PER_DAY',
        };
      }

      // Policy 8: Velocity detection — 3+ tips to same address in 60 seconds
      const velocityResult = this.checkVelocity(recipientLower);
      if (velocityResult) {
        this.flaggedTimestamps.push(Date.now());
        logger.warn('Policy VELOCITY blocked tip', { recipient: recipientLower.slice(0, 12), count: velocityResult.count });
        return { allowed: false, reason: velocityResult.severity === 'critical'
          ? `Velocity alert: ${velocityResult.count} tips to same address in ${velocityResult.windowSeconds}s — possible automation attack`
          : `Rapid tipping detected: ${velocityResult.count} tips to same address in ${velocityResult.windowSeconds}s`,
          policy: 'VELOCITY_LIMIT' };
      }

      // Policy 9: Progressive spending limit — daily limit decreases by 20% if 2+ tips flagged in last hour
      const effectiveDaily = this.getEffectiveDailyLimit();
      if (effectiveDaily < this.maxDailySpend && dailySpend + amount > effectiveDaily) {
        logger.info('Policy PROGRESSIVE_LIMIT blocked tip', { dailySpend, amount, effectiveLimit: effectiveDaily });
        return {
          allowed: false,
          reason: `Progressive limit active: daily limit reduced to ${effectiveDaily.toFixed(2)} USDT due to recent flagged activity (${dailySpend.toFixed(4)} already spent)`,
          policy: 'PROGRESSIVE_LIMIT',
        };
      }

      // Policy 10: Statistical anomaly detection (Z-score + IQR)
      if (this.anomalyDetection && !this.anomalyDetection.needsColdStart()) {
        const anomaly = this.anomalyDetection.detectAnomaly(amount);
        if (anomaly.isAnomaly) {
          this.flaggedTimestamps.push(Date.now());
          logger.warn('Policy ANOMALY_DETECTION flagged tip', {
            amount,
            zScore: anomaly.zScore,
            iqrOutlier: anomaly.iqrOutlier,
            severity: anomaly.severity,
          });
          return {
            allowed: false,
            reason: `Statistical anomaly detected: Z-score=${anomaly.zScore} (threshold=2.5), IQR outlier=${anomaly.iqrOutlier} — flagged for review`,
            policy: 'ANOMALY_DETECTION',
          };
        }
      }

      // All policies passed
      return { allowed: true, reason: 'All policies passed', policy: 'NONE' };
    } catch (err) {
      // NON-BLOCKING: if safety service errors, default to blocking (conservative)
      logger.error('Safety service error in validateTip — defaulting to BLOCK', { error: String(err) });
      if (err instanceof ServiceError) {
        return { allowed: false, reason: err.message, policy: err.code };
      }
      return { allowed: false, reason: `Safety service error: ${String(err)}`, policy: 'SAFETY_ERROR' };
    }
  }

  /**
   * Throwing variant of validateTip — throws ServiceError if blocked.
   * Use in middleware or places where you want to short-circuit with an error.
   */
  assertTipAllowed(params: { recipient: string; amount: number; chain?: string; token?: string }): void {
    const result = this.validateTip(params);
    if (!result.allowed) {
      if (result.policy === 'VELOCITY_LIMIT' || result.policy === 'MAX_HOURLY_SPEND') {
        throw rateLimited('SafetyService', { policy: result.policy, reason: result.reason });
      }
      throw new ServiceError(result.reason, result.policy, 'SafetyService', 403, {
        recipient: params.recipient,
        amount: params.amount,
      });
    }
  }

  /** Record a completed tip spend (persisted to disk for restart survival) */
  recordSpend(recipient: string, amount: number): void {
    this.spendLog.push({
      amount,
      recipient: recipient.toLowerCase(),
      timestamp: Date.now(),
    });

    // Feed the anomaly detection model
    if (this.anomalyDetection) {
      this.anomalyDetection.recordTransaction(amount);
    }

    // Keep bounded (last 5000 entries)
    if (this.spendLog.length > 5000) {
      this.spendLog = this.spendLog.slice(-2500);
    }

    // Persist to disk so spending limits survive restarts
    this.saveSpendLog();
  }

  /** Get all active policies */
  getPolicies(): ActivePolicies {
    return {
      maxSingleTip: this.maxSingleTip,
      maxDailySpend: this.maxDailySpend,
      maxHourlySpend: this.maxHourlySpend,
      minTipAmount: this.minTipAmount,
      maxTipsPerCreatorPerDay: this.maxTipsPerCreatorPerDay,
      blockedAddresses: Array.from(this.blockedAddresses),
      tier1Limit: this.tier1Limit,
      tier2Limit: this.tier2Limit,
    };
  }

  /** Get current usage stats */
  getUsage(): UsageStats {
    const dailySpend = this.getDailySpend();
    const hourlySpend = this.getHourlySpend();
    const tipsToday = this.getTodaySpendRecords().length;
    const tipsByRecipient: Record<string, number> = {};
    for (const record of this.getTodaySpendRecords()) {
      tipsByRecipient[record.recipient] = (tipsByRecipient[record.recipient] ?? 0) + 1;
    }

    return {
      dailySpend: Math.round(dailySpend * 1e6) / 1e6,
      dailyLimit: this.maxDailySpend,
      dailyPercent: this.maxDailySpend > 0 ? Math.round((dailySpend / this.maxDailySpend) * 100) : 0,
      hourlySpend: Math.round(hourlySpend * 1e6) / 1e6,
      hourlyLimit: this.maxHourlySpend,
      hourlyPercent: this.maxHourlySpend > 0 ? Math.round((hourlySpend / this.maxHourlySpend) * 100) : 0,
      tipsToday,
      tipsByRecipientToday: tipsByRecipient,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Feature 39: Budget Autonomy / Kill Switch
  // ════════════════════════════════════════════════════════════════

  /** Activate kill switch — immediately stops ALL autonomous activity */
  activateKillSwitch(): void {
    this.killSwitch = true;
    logger.warn('KILL SWITCH ACTIVATED — all autonomous tipping paused');
  }

  /** Deactivate kill switch — resume normal operations */
  deactivateKillSwitch(): void {
    this.killSwitch = false;
    logger.info('Kill switch deactivated — autonomous tipping resumed');
  }

  /** Check if kill switch is active */
  isKillSwitchActive(): boolean {
    return this.killSwitch;
  }

  /** Check if daily budget is exhausted */
  isBudgetExhausted(): boolean {
    const dailySpend = this.getDailySpend();
    if (dailySpend >= this.maxDailySpend) {
      logger.info('Budget exhausted for today', { spent: dailySpend, limit: this.maxDailySpend });
      return true;
    }
    return false;
  }

  /** Get full safety status */
  getStatus(): SafetyStatus {
    const dailySpend = this.getDailySpend();
    const hourlySpend = this.getHourlySpend();

    return {
      killSwitch: this.killSwitch,
      budgetRemaining: Math.max(0, Math.round((this.maxDailySpend - dailySpend) * 1e6) / 1e6),
      budgetUsed: Math.round(dailySpend * 1e6) / 1e6,
      hourlyUsed: Math.round(hourlySpend * 1e6) / 1e6,
      hourlyRemaining: Math.max(0, Math.round((this.maxHourlySpend - hourlySpend) * 1e6) / 1e6),
      tipsToday: this.getTodaySpendRecords().length,
      pendingApprovals: this.pendingApprovals.filter(a => a.status === 'pending').length,
      recoveryQueueSize: this.recoveryQueue.filter(r => r.status === 'pending_verification' || r.status === 'queued_retry').length,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Feature 40: Tiered Approval (Small Auto, Large Confirm)
  // ════════════════════════════════════════════════════════════════

  /**
   * Determine the approval tier for a tip amount.
   *
   * - Below TIER1_LIMIT (default 5 USDT) → auto (execute immediately)
   * - Between TIER1 and TIER2 (default 25 USDT) → flagged (execute but flag for review)
   * - Above TIER2_LIMIT → manual_required (queue for human approval)
   */
  getApprovalTier(amount: number): ApprovalTier {
    if (amount <= this.tier1Limit) return 'auto';
    if (amount <= this.tier2Limit) return 'flagged';
    return 'manual_required';
  }

  // ── Approval Tier De-Escalation Guard ──────────────────────────

  /** Tier ranking: lower index = more restrictive */
  private static readonly TIER_RANK: Record<ApprovalTier, number> = {
    manual_required: 0,
    flagged: 1,
    auto: 2,
  };

  /**
   * Validate that an LLM or downstream component never de-escalates
   * the approval tier. If rule-based check says `manual_required` but
   * any LLM component says `auto`, the result is overridden to `manual_required`.
   *
   * @returns The effective tier (always >= original in restrictiveness)
   */
  validateApprovalTierEscalation(
    ruleBasedTier: ApprovalTier,
    proposedTier: ApprovalTier,
    source: string = 'unknown',
  ): { effectiveTier: ApprovalTier; overridden: boolean; message: string } {
    const ruleRank = SafetyService.TIER_RANK[ruleBasedTier];
    const proposedRank = SafetyService.TIER_RANK[proposedTier];

    if (proposedRank > ruleRank) {
      // Proposed is LESS restrictive — override
      const message = `LLM attempted to de-escalate approval tier from ${ruleBasedTier} to ${proposedTier} — overridden`;
      logger.warn(message, { source, ruleBasedTier, proposedTier });
      this.deEscalationAuditLog.push({
        timestamp: new Date().toISOString(),
        ruleBasedTier,
        proposedTier,
        source,
        overridden: true,
      });
      // Keep bounded
      if (this.deEscalationAuditLog.length > 200) {
        this.deEscalationAuditLog = this.deEscalationAuditLog.slice(-100);
      }
      return { effectiveTier: ruleBasedTier, overridden: true, message };
    }

    return {
      effectiveTier: proposedTier,
      overridden: false,
      message: `Tier ${proposedTier} accepted (same or more restrictive than ${ruleBasedTier})`,
    };
  }

  /** Get the de-escalation audit log for safety transparency */
  getDeEscalationAuditLog(): Array<{ timestamp: string; ruleBasedTier: ApprovalTier; proposedTier: ApprovalTier; source: string; overridden: boolean }> {
    return [...this.deEscalationAuditLog].reverse();
  }

  /**
   * Queue a tip for manual approval (for large tips above TIER2_LIMIT).
   * Returns the approval entry.
   */
  queueForApproval(params: {
    recipient: string;
    amount: number;
    chain: string;
    token: string;
    reason: string;
  }): PendingApproval {
    this.approvalCounter++;
    const entry: PendingApproval = {
      id: `approval-${Date.now()}-${this.approvalCounter}`,
      recipient: params.recipient,
      amount: params.amount,
      chain: params.chain,
      token: params.token,
      reason: params.reason,
      tier: 'manual_required',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    this.pendingApprovals.push(entry);
    logger.warn('Tip queued for manual approval', {
      id: entry.id,
      recipient: params.recipient.slice(0, 12),
      amount: params.amount,
    });
    return entry;
  }

  /** Approve a pending tip */
  approveApproval(id: string): PendingApproval | undefined {
    const entry = this.pendingApprovals.find(a => a.id === id && a.status === 'pending');
    if (!entry) return undefined;
    entry.status = 'approved';
    entry.decidedAt = new Date().toISOString();
    logger.info('Tip approved', { id, amount: entry.amount });
    return entry;
  }

  /** Reject a pending tip */
  rejectApproval(id: string): PendingApproval | undefined {
    const entry = this.pendingApprovals.find(a => a.id === id && a.status === 'pending');
    if (!entry) return undefined;
    entry.status = 'rejected';
    entry.decidedAt = new Date().toISOString();
    logger.info('Tip rejected', { id, amount: entry.amount });
    return entry;
  }

  /** Get all pending approvals */
  getPendingApprovals(): PendingApproval[] {
    return this.pendingApprovals.filter(a => a.status === 'pending');
  }

  /** Get all approvals (including decided) */
  getAllApprovals(): PendingApproval[] {
    return [...this.pendingApprovals].reverse();
  }

  // ════════════════════════════════════════════════════════════════
  // Feature 47: Try/Catch + Rollback Recovery
  // ════════════════════════════════════════════════════════════════

  /**
   * Add a failed transaction to the recovery queue.
   *
   * - post_send: TX was sent but not confirmed → mark as pending_verification
   * - pre_send: TX failed before sending → queue for retry
   * - timeout: TX confirmation timed out → mark as pending_verification
   */
  addToRecoveryQueue(params: {
    txHash?: string;
    recipient: string;
    amount: number;
    chain: string;
    token: string;
    failureType: 'pre_send' | 'post_send' | 'timeout';
    error: string;
  }): RecoveryEntry {
    this.recoveryCounter++;
    const entry: RecoveryEntry = {
      id: `recovery-${Date.now()}-${this.recoveryCounter}`,
      txHash: params.txHash,
      recipient: params.recipient,
      amount: params.amount,
      chain: params.chain,
      token: params.token,
      failureType: params.failureType,
      error: params.error,
      status: params.failureType === 'pre_send' ? 'queued_retry' : 'pending_verification',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.recoveryQueue.push(entry);

    logger.warn('Transaction added to recovery queue', {
      id: entry.id,
      type: params.failureType,
      txHash: params.txHash?.slice(0, 16),
      status: entry.status,
    });

    return entry;
  }

  /** Get active recovery queue entries */
  getRecoveryQueue(): RecoveryEntry[] {
    return this.recoveryQueue.filter(r =>
      r.status === 'pending_verification' || r.status === 'queued_retry',
    );
  }

  /** Get full recovery queue (including resolved) */
  getFullRecoveryQueue(): RecoveryEntry[] {
    return [...this.recoveryQueue].reverse();
  }

  /** Mark a recovery entry as resolved */
  resolveRecovery(id: string): RecoveryEntry | undefined {
    const entry = this.recoveryQueue.find(r => r.id === id);
    if (!entry) return undefined;
    entry.status = 'resolved';
    logger.info('Recovery entry resolved', { id });
    return entry;
  }

  /** Mark a recovery entry as abandoned */
  abandonRecovery(id: string): RecoveryEntry | undefined {
    const entry = this.recoveryQueue.find(r => r.id === id);
    if (!entry) return undefined;
    entry.status = 'abandoned';
    logger.info('Recovery entry abandoned', { id });
    return entry;
  }

  /** Increment retry count for a recovery entry */
  markRetried(id: string): RecoveryEntry | undefined {
    const entry = this.recoveryQueue.find(r => r.id === id);
    if (!entry) return undefined;
    entry.retryCount++;
    entry.lastRetryAt = new Date().toISOString();
    return entry;
  }

  /** Add an address to the blocklist */
  blockAddress(address: string): void {
    this.blockedAddresses.add(address.toLowerCase());
    logger.info('Address added to blocklist', { address: address.slice(0, 12) });
  }

  /** Remove an address from the blocklist */
  unblockAddress(address: string): void {
    this.blockedAddresses.delete(address.toLowerCase());
    logger.info('Address removed from blocklist', { address: address.slice(0, 12) });
  }

  // ════════════════════════════════════════════════════════════════
  // Velocity Detection & Progressive Limits
  // ════════════════════════════════════════════════════════════════

  /**
   * Check for velocity anomaly: 3+ tips to the same address within 60 seconds.
   * Returns a VelocityAlert if triggered, undefined otherwise.
   */
  private checkVelocity(recipientLower: string): VelocityAlert | undefined {
    const windowMs = 60_000; // 60 seconds
    const threshold = 3;
    const now = Date.now();

    const recentToSame = this.spendLog.filter(
      r => r.recipient === recipientLower && (now - r.timestamp) < windowMs,
    );

    if (recentToSame.length >= threshold) {
      const severity = recentToSame.length >= 5 ? 'critical' : 'warning';
      const alert: VelocityAlert = {
        recipient: recipientLower,
        count: recentToSame.length,
        windowSeconds: 60,
        detectedAt: new Date().toISOString(),
        severity,
      };
      this.velocityAlerts.push(alert);
      // Keep alerts bounded
      if (this.velocityAlerts.length > 100) {
        this.velocityAlerts = this.velocityAlerts.slice(-50);
      }
      return alert;
    }
    return undefined;
  }

  /**
   * Progressive spending limit: if 2+ tips were flagged (blocked by any policy)
   * in the last hour, reduce the daily limit by 20% per flagged tip beyond 1.
   * This creates an adaptive defense against sustained abuse.
   */
  getEffectiveDailyLimit(): number {
    const oneHourAgo = Date.now() - 3600_000;
    const recentFlagged = this.flaggedTimestamps.filter(t => t > oneHourAgo).length;

    if (recentFlagged < 2) return this.maxDailySpend;

    // Each flagged tip beyond the first reduces limit by 20%
    const reductionFactor = Math.pow(0.8, recentFlagged - 1);
    const effective = this.maxDailySpend * reductionFactor;
    // Floor at 10% of original to prevent total lockout (kill switch handles that)
    return Math.max(this.maxDailySpend * 0.1, Math.round(effective * 100) / 100);
  }

  /** Get recent velocity alerts */
  getVelocityAlerts(): VelocityAlert[] {
    return [...this.velocityAlerts].reverse().slice(0, 20);
  }

  /**
   * Get a structured security report — a comprehensive snapshot of the
   * safety system's current state, suitable for dashboard display or
   * agent decision-making context.
   */
  getSecurityReport(): SecurityReport {
    const dailySpend = this.getDailySpend();
    const effectiveLimit = this.getEffectiveDailyLimit();
    const oneHourAgo = Date.now() - 3600_000;
    const flaggedLastHour = this.flaggedTimestamps.filter(t => t > oneHourAgo).length;

    // Aggregate top recipients by spend
    const recipientAgg: Record<string, { count: number; total: number }> = {};
    for (const record of this.getTodaySpendRecords()) {
      if (!recipientAgg[record.recipient]) {
        recipientAgg[record.recipient] = { count: 0, total: 0 };
      }
      recipientAgg[record.recipient].count++;
      recipientAgg[record.recipient].total += record.amount;
    }
    const topRecipients = Object.entries(recipientAgg)
      .map(([address, data]) => ({ address, tipCount: data.count, totalAmount: Math.round(data.total * 1e6) / 1e6 }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // Determine overall risk summary
    let riskSummary: SecurityReport['riskSummary'] = 'healthy';
    if (this.killSwitch || flaggedLastHour >= 5 || this.velocityAlerts.some(a => a.severity === 'critical' && Date.now() - new Date(a.detectedAt).getTime() < 3600_000)) {
      riskSummary = 'critical';
    } else if (flaggedLastHour >= 2 || effectiveLimit < this.maxDailySpend) {
      riskSummary = 'elevated';
    }

    return {
      generatedAt: new Date().toISOString(),
      killSwitch: this.killSwitch,
      velocityAlerts: this.velocityAlerts.filter(a => Date.now() - new Date(a.detectedAt).getTime() < 3600_000),
      progressiveLimitActive: effectiveLimit < this.maxDailySpend,
      effectiveDailyLimit: effectiveLimit,
      baseDailyLimit: this.maxDailySpend,
      flaggedTipsLastHour: flaggedLastHour,
      budgetUsedPercent: effectiveLimit > 0 ? Math.round((dailySpend / effectiveLimit) * 100) : 0,
      topRecipients,
      riskSummary,
    };
  }

  // ── Private helpers ────────────────────────────────────────────

  private getDailySpend(): number {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const cutoff = todayStart.getTime();

    return this.spendLog
      .filter(r => r.timestamp >= cutoff)
      .reduce((sum, r) => sum + r.amount, 0);
  }

  private getHourlySpend(): number {
    const cutoff = Date.now() - 3600_000;
    return this.spendLog
      .filter(r => r.timestamp >= cutoff)
      .reduce((sum, r) => sum + r.amount, 0);
  }

  private getTodaySpendRecords(): SpendRecord[] {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const cutoff = todayStart.getTime();
    return this.spendLog.filter(r => r.timestamp >= cutoff);
  }

  private getCreatorTipsToday(recipient: string): number {
    return this.getTodaySpendRecords()
      .filter(r => r.recipient === recipient)
      .length;
  }
}

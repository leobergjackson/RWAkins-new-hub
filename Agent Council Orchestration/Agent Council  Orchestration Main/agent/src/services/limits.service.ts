import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

/** Spending limit configuration */
export interface SpendingLimit {
  dailyLimit: number;
  weeklyLimit: number;
  perTipLimit: number;
  currency: string;
}

/** Result of a spending limit check */
export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  remaining: number;
}

/** Current spending totals */
export interface SpendingTotals {
  dailySpent: number;
  weeklySpent: number;
  dailyRemaining: number;
  weeklyRemaining: number;
  limits: SpendingLimit;
  dailyPercentage: number;
  weeklyPercentage: number;
}

/** Audit log entry */
export interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: 'tip_sent' | 'tip_failed' | 'login' | 'settings_changed' | 'limit_exceeded' | 'webhook_fired';
  details: string;
  ip?: string;
  status: 'success' | 'failure' | 'warning';
  metadata?: Record<string, string>;
}

interface SpendRecord {
  amount: number;
  timestamp: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIMITS_FILE = join(__dirname, '..', '..', '.limits.json');
const AUDIT_FILE = join(__dirname, '..', '..', '.audit.json');

const DEFAULT_LIMITS: SpendingLimit = {
  dailyLimit: 1,
  weeklyLimit: 5,
  perTipLimit: 0.5,
  currency: 'ETH',
};

/**
 * LimitsService — enforces daily, weekly, and per-tip spending caps.
 * Also maintains an enterprise audit log of security-relevant events.
 */
export class LimitsService {
  private limits: SpendingLimit;
  private spendHistory: SpendRecord[] = [];
  private auditLog: AuditEntry[] = [];
  private auditCounter = 0;

  constructor() {
    this.limits = { ...DEFAULT_LIMITS };
    this.loadLimits();
    this.loadAudit();
  }

  /** Check if a tip amount is within spending limits */
  checkLimit(amount: number): LimitCheckResult {
    // Per-tip check
    if (amount > this.limits.perTipLimit) {
      this.addAuditEntry('limit_exceeded', `Per-tip limit exceeded: ${amount} > ${this.limits.perTipLimit} ${this.limits.currency}`, 'warning');
      return {
        allowed: false,
        reason: `Amount ${amount} ${this.limits.currency} exceeds per-tip limit of ${this.limits.perTipLimit} ${this.limits.currency}`,
        remaining: this.limits.perTipLimit,
      };
    }

    // Daily check
    const dailySpent = this.getDailySpent();
    if (dailySpent + amount > this.limits.dailyLimit) {
      this.addAuditEntry('limit_exceeded', `Daily limit would be exceeded: ${dailySpent} + ${amount} > ${this.limits.dailyLimit} ${this.limits.currency}`, 'warning');
      return {
        allowed: false,
        reason: `Daily limit would be exceeded. Spent today: ${dailySpent.toFixed(4)} ${this.limits.currency}. Remaining: ${(this.limits.dailyLimit - dailySpent).toFixed(4)} ${this.limits.currency}`,
        remaining: Math.max(0, this.limits.dailyLimit - dailySpent),
      };
    }

    // Weekly check
    const weeklySpent = this.getWeeklySpent();
    if (weeklySpent + amount > this.limits.weeklyLimit) {
      this.addAuditEntry('limit_exceeded', `Weekly limit would be exceeded: ${weeklySpent} + ${amount} > ${this.limits.weeklyLimit} ${this.limits.currency}`, 'warning');
      return {
        allowed: false,
        reason: `Weekly limit would be exceeded. Spent this week: ${weeklySpent.toFixed(4)} ${this.limits.currency}. Remaining: ${(this.limits.weeklyLimit - weeklySpent).toFixed(4)} ${this.limits.currency}`,
        remaining: Math.max(0, this.limits.weeklyLimit - weeklySpent),
      };
    }

    const dailyRemaining = this.limits.dailyLimit - dailySpent - amount;
    const weeklyRemaining = this.limits.weeklyLimit - weeklySpent - amount;
    return {
      allowed: true,
      remaining: Math.min(dailyRemaining, weeklyRemaining),
    };
  }

  /** Record a successful spend */
  recordSpend(amount: number): void {
    this.spendHistory.push({
      amount,
      timestamp: new Date().toISOString(),
    });
    // Prune records older than 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.spendHistory = this.spendHistory.filter(
      (r) => new Date(r.timestamp).getTime() > weekAgo,
    );
  }

  /** Get current spending totals */
  getSpending(): SpendingTotals {
    const dailySpent = this.getDailySpent();
    const weeklySpent = this.getWeeklySpent();
    return {
      dailySpent,
      weeklySpent,
      dailyRemaining: Math.max(0, this.limits.dailyLimit - dailySpent),
      weeklyRemaining: Math.max(0, this.limits.weeklyLimit - weeklySpent),
      limits: { ...this.limits },
      dailyPercentage: this.limits.dailyLimit > 0 ? Math.min(100, (dailySpent / this.limits.dailyLimit) * 100) : 0,
      weeklyPercentage: this.limits.weeklyLimit > 0 ? Math.min(100, (weeklySpent / this.limits.weeklyLimit) * 100) : 0,
    };
  }

  /** Update spending limits */
  setLimits(limits: Partial<SpendingLimit>): SpendingLimit {
    if (limits.dailyLimit !== undefined) this.limits.dailyLimit = limits.dailyLimit;
    if (limits.weeklyLimit !== undefined) this.limits.weeklyLimit = limits.weeklyLimit;
    if (limits.perTipLimit !== undefined) this.limits.perTipLimit = limits.perTipLimit;
    if (limits.currency !== undefined) this.limits.currency = limits.currency;
    this.saveLimits();
    this.addAuditEntry('settings_changed', `Spending limits updated: daily=${this.limits.dailyLimit}, weekly=${this.limits.weeklyLimit}, perTip=${this.limits.perTipLimit} ${this.limits.currency}`, 'success');
    logger.info('Spending limits updated', { limits: this.limits });
    return { ...this.limits };
  }

  /** Get current limits */
  getLimits(): SpendingLimit {
    return { ...this.limits };
  }

  // ── Audit Log ──────────────────────────────────────────────────

  /** Add an entry to the audit log */
  addAuditEntry(
    eventType: AuditEntry['eventType'],
    details: string,
    status: AuditEntry['status'],
    ip?: string,
    metadata?: Record<string, string>,
  ): void {
    this.auditCounter++;
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${this.auditCounter}`,
      timestamp: new Date().toISOString(),
      eventType,
      details,
      ip,
      status,
      metadata,
    };
    this.auditLog.push(entry);
    // Keep last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
    this.saveAudit();
  }

  /** Get audit log entries with optional filtering */
  getAuditLog(filters?: {
    eventType?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): AuditEntry[] {
    let entries = [...this.auditLog];

    if (filters?.eventType) {
      entries = entries.filter((e) => e.eventType === filters.eventType);
    }
    if (filters?.dateFrom) {
      const from = new Date(filters.dateFrom).getTime();
      entries = entries.filter((e) => new Date(e.timestamp).getTime() >= from);
    }
    if (filters?.dateTo) {
      const to = new Date(filters.dateTo).getTime();
      entries = entries.filter((e) => new Date(e.timestamp).getTime() <= to);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.details.toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q),
      );
    }

    return entries.reverse(); // newest first
  }

  // ── Private helpers ────────────────────────────────────────────

  private getDailySpent(): number {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dayStart = startOfDay.getTime();
    return this.spendHistory
      .filter((r) => new Date(r.timestamp).getTime() >= dayStart)
      .reduce((sum, r) => sum + r.amount, 0);
  }

  private getWeeklySpent(): number {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek.getTime();
    return this.spendHistory
      .filter((r) => new Date(r.timestamp).getTime() >= weekStart)
      .reduce((sum, r) => sum + r.amount, 0);
  }

  private loadLimits(): void {
    try {
      if (existsSync(LIMITS_FILE)) {
        const data = JSON.parse(readFileSync(LIMITS_FILE, 'utf-8')) as SpendingLimit;
        this.limits = { ...DEFAULT_LIMITS, ...data };
        logger.info('Loaded spending limits from disk', { limits: this.limits });
      }
    } catch (err) {
      logger.warn('Failed to load limits file', { error: String(err) });
    }
  }

  private saveLimits(): void {
    try {
      writeFileSync(LIMITS_FILE, JSON.stringify(this.limits, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to save limits file', { error: String(err) });
    }
  }

  private loadAudit(): void {
    try {
      if (existsSync(AUDIT_FILE)) {
        const data = JSON.parse(readFileSync(AUDIT_FILE, 'utf-8')) as AuditEntry[];
        this.auditLog = data;
        this.auditCounter = data.length;
        logger.info(`Loaded ${data.length} audit entries from disk`);
      }
    } catch (err) {
      logger.warn('Failed to load audit file', { error: String(err) });
    }
  }

  private saveAudit(): void {
    try {
      writeFileSync(AUDIT_FILE, JSON.stringify(this.auditLog, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to save audit file', { error: String(err) });
    }
  }
}

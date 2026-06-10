// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Tip Streaming Protocol (Continuous Micro-Tipping)

import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';
import type { WalletService } from './wallet.service.js';
import type { ChainId, TokenType } from '../types/index.js';

/** A live tip stream — continuous micro-tips at intervals */
export interface TipStream {
  id: string;
  recipient: string;
  microTipAmount: string;
  intervalMs: number;
  token: TokenType;
  chainId: ChainId;
  status: 'active' | 'paused' | 'stopped' | 'error';
  totalStreamed: string;
  totalTransactions: number;
  totalFees: string;
  startedAt: string;
  stoppedAt?: string;
  lastTipAt?: string;
  lastTxHash?: string;
  maxBudget?: string;
  elapsedSeconds: number;
  error?: string;
}

/** Configuration to start a tip stream */
export interface StreamConfig {
  recipient: string;
  amountPerTick: string;        // amount per micro-tip (e.g., "0.0001")
  intervalSeconds: number;      // seconds between ticks (default: 30)
  token: TokenType;
  chainId: ChainId;
  maxBudget?: string;           // optional total budget cap
}

/** Stream statistics */
export interface StreamStats {
  activeStreams: number;
  totalStreamsCreated: number;
  totalAmountStreamed: string;
  totalTransactionsSent: number;
  /** Average stream duration in seconds (across completed streams) */
  avgDurationSeconds: number;
  /** Batch settlement stats */
  batchSettlement: {
    pendingAmount: string;
    pendingRecipients: number;
    totalBatchesSettled: number;
    totalBatchAmount: string;
  };
}

/** A continuous pay-per-second stream entry */
export interface ContinuousStream {
  id: string;
  recipient: string;
  ratePerSecond: number;
  token: TokenType;
  chainId: ChainId;
  status: 'active' | 'paused' | 'stopped';
  type: 'continuous';
  accumulatedAmount: number;
  totalSettled: number;
  startedAt: string;
  stoppedAt?: string;
  maxDuration: number; // seconds
  elapsedSeconds: number;
}

/** A pending micro-payment waiting for batch settlement */
interface PendingMicroPayment {
  recipient: string;
  amount: number;
  token: TokenType;
  chainId: ChainId;
  accumulatedAt: string;
}

// ── Engagement-Based Payment Types ────────────────────────────────

/** Configuration for engagement-triggered payments to a creator */
export interface EngagementPaymentConfig {
  creatorAddress: string;
  chainId: ChainId;
  token: TokenType;
  triggers: {
    perView?: number;            // pay X per view (e.g., 0.001 USDT per view)
    perLike?: number;            // pay X per like
    perComment?: number;         // pay X per comment
    perShare?: number;           // pay X per share
    perMinuteWatched?: number;   // pay X per minute watched
  };
  maxPerHour: number;            // safety cap per hour
  maxPerDay: number;             // daily limit
}

/** An engagement event recorded against a config */
export interface EngagementEvent {
  type: 'view' | 'like' | 'comment' | 'share' | 'minute_watched';
  creatorAddress: string;
  metadata?: Record<string, unknown>;
}

/** Stats tracked per engagement config */
interface EngagementConfigState {
  config: EngagementPaymentConfig;
  id: string;
  totalEvents: number;
  totalAmount: number;
  eventCounts: Record<EngagementEvent['type'], number>;
  hourlySpend: number;
  dailySpend: number;
  hourlyResetAt: number;
  dailyResetAt: number;
  createdAt: string;
}

export class StreamingService {
  private wallet: WalletService;
  private streams = new Map<string, TipStream>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private history: TipStream[] = [];
  private onActivity?: (msg: string, detail?: string, chainId?: ChainId) => void;

  // Batch settlement: accumulate micro-payments and settle in one on-chain tx
  private pendingPayments = new Map<string, PendingMicroPayment>();
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private batchIntervalMs = 10_000; // settle every 10 seconds
  private totalBatchesSettled = 0;
  private totalBatchAmount = 0;

  // Continuous pay-per-second streams
  private continuousStreams = new Map<string, ContinuousStream>();
  private continuousAccumulators = new Map<string, ReturnType<typeof setInterval>>();
  private continuousSettlers = new Map<string, ReturnType<typeof setInterval>>();
  private continuousMaxTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(walletService: WalletService) {
    this.wallet = walletService;
  }

  /** Set activity callback for event notifications */
  setActivityCallback(cb: (msg: string, detail?: string, chainId?: ChainId) => void): void {
    this.onActivity = cb;
  }

  /** Start a new tip stream — sends micro-tips at intervals */
  startStream(config: StreamConfig): TipStream {
    const id = randomUUID();
    const intervalMs = (config.intervalSeconds || 30) * 1000;

    const stream: TipStream = {
      id,
      recipient: config.recipient,
      microTipAmount: config.amountPerTick,
      intervalMs,
      token: config.token,
      chainId: config.chainId,
      status: 'active',
      totalStreamed: '0',
      totalTransactions: 0,
      totalFees: '0',
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      maxBudget: config.maxBudget,
    };

    this.streams.set(id, stream);

    // Start the interval timer
    const timer = setInterval(() => {
      this.tick(id).catch((err) => {
        logger.error('Stream tick failed', { streamId: id, error: String(err) });
      });
    }, intervalMs);

    this.timers.set(id, timer);

    logger.info('Tip stream started', {
      streamId: id,
      recipient: config.recipient,
      amountPerTick: config.amountPerTick,
      intervalSeconds: config.intervalSeconds,
    });

    this.onActivity?.(
      `Tip stream started: ${config.amountPerTick} ${config.token} every ${config.intervalSeconds}s to ${config.recipient.slice(0, 10)}...`,
      `Stream ${id.slice(0, 8)}`,
      config.chainId,
    );

    return stream;
  }

  /** Internal: execute one micro-tip tick */
  /* istanbul ignore next -- requires real WalletService.sendTransaction */
  private async tick(streamId: string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream || stream.status !== 'active') return;

    // Update elapsed time
    stream.elapsedSeconds = Math.floor(
      (Date.now() - new Date(stream.startedAt).getTime()) / 1000
    );

    // Check budget cap
    if (stream.maxBudget) {
      const total = parseFloat(stream.totalStreamed);
      const budget = parseFloat(stream.maxBudget);
      if (total >= budget) {
        logger.info('Stream budget reached', { streamId, total, budget });
        this.stopStream(streamId);
        this.onActivity?.(
          `Stream budget reached: ${stream.totalStreamed}/${stream.maxBudget} ${stream.token}`,
          `Stream ${streamId.slice(0, 8)} auto-stopped`,
          stream.chainId,
        );
        return;
      }
    }

    // Send the micro-tip
    try {
      const result = await this.wallet.sendTransaction(
        stream.chainId,
        stream.recipient,
        stream.microTipAmount,
      );

      // Update stream stats
      stream.totalTransactions += 1;
      stream.totalStreamed = (
        parseFloat(stream.totalStreamed) + parseFloat(stream.microTipAmount)
      ).toFixed(8);
      stream.totalFees = (
        parseFloat(stream.totalFees) + parseFloat(result.fee)
      ).toFixed(8);
      stream.lastTipAt = new Date().toISOString();
      stream.lastTxHash = result.hash;

      logger.info('Stream micro-tip sent', {
        streamId,
        txHash: result.hash,
        total: stream.totalStreamed,
        count: stream.totalTransactions,
      });

      this.onActivity?.(
        `Stream micro-tip #${stream.totalTransactions}: ${stream.microTipAmount} ${stream.token}`,
        `tx: ${result.hash.slice(0, 14)}... | total: ${stream.totalStreamed}`,
        stream.chainId,
      );
    } catch (err) {
      stream.error = String(err);
      logger.error('Stream micro-tip failed', { streamId, error: stream.error });

      // Don't stop on single failure — retry next tick
      this.onActivity?.(
        `Stream micro-tip failed (will retry): ${String(err).slice(0, 60)}`,
        `Stream ${streamId.slice(0, 8)}`,
        stream.chainId,
      );
    }
  }

  /** Pause a stream (keeps timer but skips ticks) */
  pauseStream(streamId: string): TipStream | null {
    const stream = this.streams.get(streamId);
    if (!stream || stream.status !== 'active') return null;

    stream.status = 'paused';
    const timer = this.timers.get(streamId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(streamId);
    }

    logger.info('Tip stream paused', { streamId });
    this.onActivity?.(`Tip stream paused after ${stream.totalTransactions} transactions`, `Total: ${stream.totalStreamed} ${stream.token}`, stream.chainId);
    return stream;
  }

  /** Resume a paused stream */
  resumeStream(streamId: string): TipStream | null {
    const stream = this.streams.get(streamId);
    if (!stream || stream.status !== 'paused') return null;

    stream.status = 'active';

    const timer = setInterval(() => {
      this.tick(streamId).catch((err) => {
        logger.error('Stream tick failed', { streamId, error: String(err) });
      });
    }, stream.intervalMs);

    this.timers.set(streamId, timer);

    logger.info('Tip stream resumed', { streamId });
    this.onActivity?.(`Tip stream resumed`, `Stream ${streamId.slice(0, 8)}`, stream.chainId);
    return stream;
  }

  /** Stop a stream permanently */
  stopStream(streamId: string): TipStream | null {
    const stream = this.streams.get(streamId);
    if (!stream || stream.status === 'stopped') return null;

    stream.status = 'stopped';
    stream.stoppedAt = new Date().toISOString();
    stream.elapsedSeconds = Math.floor(
      (Date.now() - new Date(stream.startedAt).getTime()) / 1000
    );

    const timer = this.timers.get(streamId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(streamId);
    }

    // Move to history
    this.history.push({ ...stream });
    this.streams.delete(streamId);

    logger.info('Tip stream stopped', {
      streamId,
      totalStreamed: stream.totalStreamed,
      totalTransactions: stream.totalTransactions,
    });

    this.onActivity?.(
      `Tip stream stopped: ${stream.totalStreamed} ${stream.token} in ${stream.totalTransactions} transactions`,
      `Duration: ${stream.elapsedSeconds}s`,
      stream.chainId,
    );

    return stream;
  }

  /** Get all active streams */
  getActiveStreams(): TipStream[] {
    const streams = Array.from(this.streams.values());
    // Update elapsed seconds for each active stream
    for (const s of streams) {
      s.elapsedSeconds = Math.floor(
        (Date.now() - new Date(s.startedAt).getTime()) / 1000
      );
    }
    return streams;
  }

  /** Get stream history (completed streams) */
  getStreamHistory(): TipStream[] {
    return this.history;
  }

  /** Get a specific stream by ID */
  getStream(id: string): TipStream | undefined {
    return this.streams.get(id);
  }

  /** Get streaming statistics */
  getStats(): StreamStats {
    let totalAmount = 0;
    let totalTx = 0;
    for (const s of this.streams.values()) {
      totalAmount += parseFloat(s.totalStreamed);
      totalTx += s.totalTransactions;
    }
    for (const s of this.history) {
      totalAmount += parseFloat(s.totalStreamed);
      totalTx += s.totalTransactions;
    }
    // Compute average duration from completed streams
    let avgDurationSeconds = 0;
    if (this.history.length > 0) {
      const totalDuration = this.history.reduce((sum, s) => sum + s.elapsedSeconds, 0);
      avgDurationSeconds = Math.round(totalDuration / this.history.length);
    }

    const batchInfo = this.getPendingBatchInfo();

    return {
      activeStreams: this.streams.size,
      totalStreamsCreated: this.streams.size + this.history.length,
      totalAmountStreamed: totalAmount.toFixed(8),
      totalTransactionsSent: totalTx,
      avgDurationSeconds,
      batchSettlement: {
        pendingAmount: batchInfo.totalPending.toFixed(8),
        pendingRecipients: batchInfo.recipients,
        totalBatchesSettled: this.totalBatchesSettled,
        totalBatchAmount: this.totalBatchAmount.toFixed(8),
      },
    };
  }

  /** Stop all active streams (for graceful shutdown) */
  stopAll(): void {
    for (const id of Array.from(this.streams.keys())) {
      this.stopStream(id);
    }
    for (const id of Array.from(this.continuousStreams.keys())) {
      this.stopContinuousStream(id);
    }
    this.stopBatchSettlement();
  }

  // ── Batch Settlement ────────────────────────────────────────

  /**
   * Start the batch settlement timer.
   * Micro-payments are accumulated and settled every `batchIntervalMs` (default 10s)
   * into a single on-chain WDK transaction per recipient, saving gas.
   */
  startBatchSettlement(intervalMs?: number): void {
    if (this.batchTimer) return; // already running
    this.batchIntervalMs = intervalMs ?? this.batchIntervalMs;

    this.batchTimer = setInterval(() => {
      this.settleBatch().catch((err) => {
        logger.error('Batch settlement failed', { error: String(err) });
      });
    }, this.batchIntervalMs);

    logger.info('Batch settlement started', { intervalMs: this.batchIntervalMs });
  }

  /** Stop the batch settlement timer */
  stopBatchSettlement(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
      logger.info('Batch settlement stopped');
    }
  }

  /**
   * Accumulate a micro-payment for batch settlement.
   * Payments to the same recipient are aggregated into one pending entry.
   */
  accumulateMicroPayment(
    recipient: string,
    amount: number,
    token: TokenType,
    chainId: ChainId,
  ): void {
    const existing = this.pendingPayments.get(recipient);
    if (existing) {
      existing.amount += amount;
      existing.accumulatedAt = new Date().toISOString();
    } else {
      this.pendingPayments.set(recipient, {
        recipient,
        amount,
        token,
        chainId,
        accumulatedAt: new Date().toISOString(),
      });
    }
    logger.debug('Micro-payment accumulated for batch', {
      recipient: recipient.slice(0, 10),
      amount,
      pendingTotal: existing ? existing.amount + amount : amount,
    });
  }

  /**
   * Settle all pending micro-payments in one batch.
   * Each recipient gets a single on-chain transaction with the aggregated amount.
   */
  async settleBatch(): Promise<{ settled: number; totalAmount: number }> {
    if (this.pendingPayments.size === 0) {
      return { settled: 0, totalAmount: 0 };
    }

    const entries = Array.from(this.pendingPayments.values());
    this.pendingPayments.clear();

    let settled = 0;
    let totalAmount = 0;

    for (const payment of entries) {
      if (payment.amount <= 0) continue;

      try {
        await this.wallet.sendTransaction(
          payment.chainId,
          payment.recipient,
          payment.amount.toFixed(8),
        );
        settled++;
        totalAmount += payment.amount;

        logger.info('Batch settlement: payment sent', {
          recipient: payment.recipient.slice(0, 10),
          amount: payment.amount.toFixed(8),
          token: payment.token,
        });
      } catch (err) {
        // Re-queue failed payment for next batch
        this.accumulateMicroPayment(
          payment.recipient,
          payment.amount,
          payment.token,
          payment.chainId,
        );
        logger.warn('Batch settlement: payment failed, re-queued', {
          recipient: payment.recipient.slice(0, 10),
          amount: payment.amount.toFixed(8),
          error: String(err),
        });
      }
    }

    if (settled > 0) {
      this.totalBatchesSettled++;
      this.totalBatchAmount += totalAmount;

      logger.info('Batch settlement complete', {
        settled,
        totalAmount: totalAmount.toFixed(8),
        batchNumber: this.totalBatchesSettled,
      });

      this.onActivity?.(
        `Batch settlement: ${settled} payments totaling ${totalAmount.toFixed(6)} settled on-chain`,
        `Batch #${this.totalBatchesSettled}`,
      );
    }

    return { settled, totalAmount };
  }

  /** Get pending batch settlement info */
  getPendingBatchInfo(): { recipients: number; totalPending: number } {
    let totalPending = 0;
    for (const p of this.pendingPayments.values()) {
      totalPending += p.amount;
    }
    return { recipients: this.pendingPayments.size, totalPending };
  }

  // ── Continuous Pay-Per-Second Streaming ───────────────────────

  /**
   * Start a continuous pay-per-second stream.
   * Accumulates amount every second internally and calls accumulateMicroPayment()
   * every 10 seconds with the accumulated amount for batch settlement.
   * Auto-stops after maxDuration (default 3600s = 1 hour).
   */
  startContinuousStream(
    recipient: string,
    ratePerSecond: number,
    token: TokenType,
    chainId: ChainId,
    maxDuration = 3600,
  ): ContinuousStream {
    const id = randomUUID();

    const stream: ContinuousStream = {
      id,
      recipient,
      ratePerSecond,
      token,
      chainId,
      status: 'active',
      type: 'continuous',
      accumulatedAmount: 0,
      totalSettled: 0,
      startedAt: new Date().toISOString(),
      maxDuration,
      elapsedSeconds: 0,
    };

    this.continuousStreams.set(id, stream);

    // Accumulate every 1 second
    const accumulator = setInterval(() => {
      const s = this.continuousStreams.get(id);
      if (!s || s.status !== 'active') return;
      s.accumulatedAmount += s.ratePerSecond;
      s.elapsedSeconds = Math.floor(
        (Date.now() - new Date(s.startedAt).getTime()) / 1000,
      );
    }, 1000);
    this.continuousAccumulators.set(id, accumulator);

    // Settle every 10 seconds via batch micro-payment
    const settler = setInterval(() => {
      const s = this.continuousStreams.get(id);
      if (!s || s.status !== 'active' || s.accumulatedAmount <= 0) return;

      const amount = s.accumulatedAmount;
      s.accumulatedAmount = 0;
      s.totalSettled += amount;

      this.accumulateMicroPayment(s.recipient, amount, s.token, s.chainId);

      logger.info('Continuous stream settlement', {
        streamId: id,
        amount: amount.toFixed(8),
        totalSettled: s.totalSettled.toFixed(8),
      });
    }, 10_000);
    this.continuousSettlers.set(id, settler);

    // Auto-stop after maxDuration
    const maxTimer = setTimeout(() => {
      this.stopContinuousStream(id);
    }, maxDuration * 1000);
    this.continuousMaxTimers.set(id, maxTimer);

    // Start batch settlement if not already running
    this.startBatchSettlement();

    logger.info('Continuous stream started', {
      streamId: id,
      recipient,
      ratePerSecond,
      token,
      chainId,
      maxDuration,
    });

    this.onActivity?.(
      `Continuous stream started: ${ratePerSecond} ${token}/s to ${recipient.slice(0, 10)}...`,
      `Stream ${id.slice(0, 8)} | max ${maxDuration}s`,
      chainId,
    );

    return stream;
  }

  /** Pause a continuous stream — stops accumulation but preserves state */
  pauseContinuousStream(streamId: string): ContinuousStream | null {
    const stream = this.continuousStreams.get(streamId);
    if (!stream || stream.status !== 'active') return null;

    stream.status = 'paused';

    // Clear accumulator and settler intervals
    const acc = this.continuousAccumulators.get(streamId);
    if (acc) { clearInterval(acc); this.continuousAccumulators.delete(streamId); }
    const stl = this.continuousSettlers.get(streamId);
    if (stl) { clearInterval(stl); this.continuousSettlers.delete(streamId); }

    logger.info('Continuous stream paused', { streamId });
    this.onActivity?.(
      `Continuous stream paused — settled ${stream.totalSettled.toFixed(6)} ${stream.token}`,
      `Stream ${streamId.slice(0, 8)}`,
      stream.chainId,
    );

    return stream;
  }

  /** Resume a paused continuous stream */
  resumeContinuousStream(streamId: string): ContinuousStream | null {
    const stream = this.continuousStreams.get(streamId);
    if (!stream || stream.status !== 'paused') return null;

    stream.status = 'active';

    // Restart accumulator (1s)
    const accumulator = setInterval(() => {
      const s = this.continuousStreams.get(streamId);
      if (!s || s.status !== 'active') return;
      s.accumulatedAmount += s.ratePerSecond;
      s.elapsedSeconds = Math.floor(
        (Date.now() - new Date(s.startedAt).getTime()) / 1000,
      );
    }, 1000);
    this.continuousAccumulators.set(streamId, accumulator);

    // Restart settler (10s)
    const settler = setInterval(() => {
      const s = this.continuousStreams.get(streamId);
      if (!s || s.status !== 'active' || s.accumulatedAmount <= 0) return;

      const amount = s.accumulatedAmount;
      s.accumulatedAmount = 0;
      s.totalSettled += amount;

      this.accumulateMicroPayment(s.recipient, amount, s.token, s.chainId);
    }, 10_000);
    this.continuousSettlers.set(streamId, settler);

    logger.info('Continuous stream resumed', { streamId });
    this.onActivity?.(
      `Continuous stream resumed`,
      `Stream ${streamId.slice(0, 8)}`,
      stream.chainId,
    );

    return stream;
  }

  /** Stop a continuous stream permanently */
  stopContinuousStream(streamId: string): ContinuousStream | null {
    const stream = this.continuousStreams.get(streamId);
    if (!stream || stream.status === 'stopped') return null;

    stream.status = 'stopped';
    stream.stoppedAt = new Date().toISOString();
    stream.elapsedSeconds = Math.floor(
      (Date.now() - new Date(stream.startedAt).getTime()) / 1000,
    );

    // Settle any remaining accumulated amount
    if (stream.accumulatedAmount > 0) {
      const remaining = stream.accumulatedAmount;
      stream.accumulatedAmount = 0;
      stream.totalSettled += remaining;
      this.accumulateMicroPayment(stream.recipient, remaining, stream.token, stream.chainId);
    }

    // Clean up all timers
    const acc = this.continuousAccumulators.get(streamId);
    if (acc) { clearInterval(acc); this.continuousAccumulators.delete(streamId); }
    const stl = this.continuousSettlers.get(streamId);
    if (stl) { clearInterval(stl); this.continuousSettlers.delete(streamId); }
    const maxT = this.continuousMaxTimers.get(streamId);
    if (maxT) { clearTimeout(maxT); this.continuousMaxTimers.delete(streamId); }

    logger.info('Continuous stream stopped', {
      streamId,
      totalSettled: stream.totalSettled.toFixed(8),
      elapsedSeconds: stream.elapsedSeconds,
    });

    this.onActivity?.(
      `Continuous stream stopped: ${stream.totalSettled.toFixed(6)} ${stream.token} over ${stream.elapsedSeconds}s`,
      `Stream ${streamId.slice(0, 8)}`,
      stream.chainId,
    );

    return stream;
  }

  /** Get a continuous stream by ID */
  getContinuousStream(id: string): ContinuousStream | undefined {
    return this.continuousStreams.get(id);
  }

  /** Get all continuous streams */
  getContinuousStreams(): ContinuousStream[] {
    return Array.from(this.continuousStreams.values());
  }

  // ── Engagement-Based Payment Streaming ─────────────────────────

  private engagementConfigs = new Map<string, EngagementConfigState>();

  /**
   * Register a new engagement-based payment configuration.
   * Each engagement event (view, like, comment, share, minute_watched) triggers
   * a micro-payment that accumulates via batch settlement.
   * Returns the configId.
   */
  registerEngagementPayment(config: EngagementPaymentConfig): string {
    const id = randomUUID();

    const state: EngagementConfigState = {
      config,
      id,
      totalEvents: 0,
      totalAmount: 0,
      eventCounts: { view: 0, like: 0, comment: 0, share: 0, minute_watched: 0 },
      hourlySpend: 0,
      dailySpend: 0,
      hourlyResetAt: Date.now() + 3600_000,
      dailyResetAt: Date.now() + 86400_000,
      createdAt: new Date().toISOString(),
    };

    this.engagementConfigs.set(id, state);

    // Ensure batch settlement is running for micro-payment accumulation
    this.startBatchSettlement();

    logger.info('Engagement payment config registered', {
      configId: id,
      creator: config.creatorAddress.slice(0, 10),
      triggers: Object.keys(config.triggers).filter(
        (k) => config.triggers[k as keyof typeof config.triggers] !== undefined,
      ),
      maxPerHour: config.maxPerHour,
      maxPerDay: config.maxPerDay,
    });

    this.onActivity?.(
      `Engagement payment registered for ${config.creatorAddress.slice(0, 10)}...`,
      `Config ${id.slice(0, 8)} | max $${config.maxPerHour}/hr, $${config.maxPerDay}/day`,
      config.chainId,
    );

    return id;
  }

  /**
   * Record an engagement event and trigger a micro-payment.
   * Returns the payment amount and whether it was accumulated (vs. capped).
   */
  recordEngagement(
    configId: string,
    event: EngagementEvent,
  ): { amount: number; accumulated: boolean; cappedReason?: string } {
    const state = this.engagementConfigs.get(configId);
    if (!state) {
      return { amount: 0, accumulated: false, cappedReason: 'config_not_found' };
    }

    // Reset hourly/daily counters if windows have elapsed
    const now = Date.now();
    if (now >= state.hourlyResetAt) {
      state.hourlySpend = 0;
      state.hourlyResetAt = now + 3600_000;
    }
    if (now >= state.dailyResetAt) {
      state.dailySpend = 0;
      state.dailyResetAt = now + 86400_000;
    }

    // Determine payment amount based on event type
    const triggerMap: Record<EngagementEvent['type'], number | undefined> = {
      view: state.config.triggers.perView,
      like: state.config.triggers.perLike,
      comment: state.config.triggers.perComment,
      share: state.config.triggers.perShare,
      minute_watched: state.config.triggers.perMinuteWatched,
    };

    const amount = triggerMap[event.type] ?? 0;
    if (amount <= 0) {
      return { amount: 0, accumulated: false, cappedReason: 'no_trigger_for_event_type' };
    }

    // Check safety caps
    if (state.hourlySpend + amount > state.config.maxPerHour) {
      logger.warn('Engagement payment capped (hourly limit)', {
        configId, hourlySpend: state.hourlySpend, maxPerHour: state.config.maxPerHour,
      });
      return { amount: 0, accumulated: false, cappedReason: 'hourly_limit_reached' };
    }
    if (state.dailySpend + amount > state.config.maxPerDay) {
      logger.warn('Engagement payment capped (daily limit)', {
        configId, dailySpend: state.dailySpend, maxPerDay: state.config.maxPerDay,
      });
      return { amount: 0, accumulated: false, cappedReason: 'daily_limit_reached' };
    }

    // Accumulate the micro-payment for batch settlement
    this.accumulateMicroPayment(
      state.config.creatorAddress,
      amount,
      state.config.token,
      state.config.chainId,
    );

    // Update state
    state.totalEvents += 1;
    state.totalAmount += amount;
    state.eventCounts[event.type] += 1;
    state.hourlySpend += amount;
    state.dailySpend += amount;

    logger.debug('Engagement event recorded', {
      configId,
      type: event.type,
      amount,
      totalEvents: state.totalEvents,
      totalAmount: state.totalAmount.toFixed(6),
    });

    return { amount, accumulated: true };
  }

  /**
   * Get engagement stats for a specific config or all configs.
   */
  getEngagementStats(configId?: string): {
    configs: Array<{
      id: string;
      creatorAddress: string;
      totalEvents: number;
      totalAmount: number;
      eventCounts: Record<string, number>;
      hourlySpend: number;
      dailySpend: number;
      maxPerHour: number;
      maxPerDay: number;
      createdAt: string;
    }>;
    totals: { totalConfigs: number; totalEvents: number; totalAmount: number };
  } {
    const entries = configId
      ? [this.engagementConfigs.get(configId)].filter(Boolean) as EngagementConfigState[]
      : Array.from(this.engagementConfigs.values());

    const configs = entries.map((s) => ({
      id: s.id,
      creatorAddress: s.config.creatorAddress,
      totalEvents: s.totalEvents,
      totalAmount: parseFloat(s.totalAmount.toFixed(8)),
      eventCounts: { ...s.eventCounts },
      hourlySpend: parseFloat(s.hourlySpend.toFixed(8)),
      dailySpend: parseFloat(s.dailySpend.toFixed(8)),
      maxPerHour: s.config.maxPerHour,
      maxPerDay: s.config.maxPerDay,
      createdAt: s.createdAt,
    }));

    let totalEvents = 0;
    let totalAmount = 0;
    for (const c of configs) {
      totalEvents += c.totalEvents;
      totalAmount += c.totalAmount;
    }

    return {
      configs,
      totals: {
        totalConfigs: this.engagementConfigs.size,
        totalEvents,
        totalAmount: parseFloat(totalAmount.toFixed(8)),
      },
    };
  }

  /** Remove an engagement payment config */
  removeEngagementPayment(configId: string): boolean {
    const state = this.engagementConfigs.get(configId);
    if (!state) return false;

    this.engagementConfigs.delete(configId);

    logger.info('Engagement payment config removed', {
      configId,
      totalEvents: state.totalEvents,
      totalAmount: state.totalAmount.toFixed(6),
    });

    this.onActivity?.(
      `Engagement payment removed for ${state.config.creatorAddress.slice(0, 10)}...`,
      `${state.totalEvents} events, ${state.totalAmount.toFixed(6)} ${state.config.token} total`,
      state.config.chainId,
    );

    return true;
  }
}

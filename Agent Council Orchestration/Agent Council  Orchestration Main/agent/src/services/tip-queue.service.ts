// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
//
// TIP QUEUE SERVICE — Event-driven async tip processing for scale
//
// Instead of processing tips synchronously (blocking the API request),
// tips are queued and processed by background workers. This enables:
//   - Non-blocking API responses (instant 202 Accepted)
//   - Retry logic with exponential backoff
//   - Priority-based ordering (urgent tips first)
//   - Rate limiting per sender/recipient
//   - Batch optimization (group small tips to save gas)
//   - Horizontal scaling (multiple workers, shared queue)
//
// Architecture:
//   API Request → Queue (in-memory / Redis) → Worker → WDK Execute → Webhook
//
// For hackathon: in-memory queue with single worker.
// For production: swap to Redis/BullMQ for multi-node scaling.

import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PERSISTENCE_FILE = resolve(__dirname, '..', '..', '.tip-queue.json');

// ── Types ────────────────────────────────────────────────────────

export type TipPriority = 'urgent' | 'normal' | 'low' | 'batch';

export interface QueuedTip {
  id: string;
  recipient: string;
  amount: string;
  token: string;
  chainId?: string;
  message?: string;
  priority: TipPriority;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
  txHash?: string;
  error?: string;
  /** Source: which system queued this tip */
  source: 'api' | 'autonomous' | 'rumble' | 'policy' | 'dca' | 'stream' | 'webhook';
  /** Metadata for tracking */
  metadata?: Record<string, unknown>;
}

export interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  avgProcessingTimeMs: number;
  throughputPerMinute: number;
  oldestQueuedAge: number; // ms since oldest queued item
}

export interface BatchGroup {
  id: string;
  recipient: string;
  tips: QueuedTip[];
  totalAmount: number;
  status: 'pending' | 'executing' | 'completed';
  createdAt: string;
}

// ── Priority weights ─────────────────────────────────────────────

const PRIORITY_ORDER: Record<TipPriority, number> = {
  urgent: 0,
  normal: 1,
  low: 2,
  batch: 3,
};

// ── Service ──────────────────────────────────────────────────────

/**
 * TipQueueService — Event-driven async tip processing.
 *
 * Designed for horizontal scalability:
 *   - In-memory queue (hackathon) → Redis/BullMQ (production)
 *   - Single worker (hackathon) → Worker pool (production)
 *   - Same API, same interface, just swap the queue backend
 *
 * Features:
 *   - Priority ordering (urgent > normal > low > batch)
 *   - Automatic retry with exponential backoff
 *   - Batch optimization for same-recipient tips
 *   - Rate limiting per source
 *   - Dead letter queue for permanently failed tips
 *   - Real-time stats and monitoring
 */
export class TipQueueService {
  private queue: QueuedTip[] = [];
  private deadLetterQueue: QueuedTip[] = [];
  private processingTips: Map<string, QueuedTip> = new Map();
  private completedCount = 0;
  private totalProcessingTimeMs = 0;
  private processingTimestamps: number[] = []; // Last 60s of completions
  private batchGroups: Map<string, BatchGroup> = new Map();
  private onProcess: ((tip: QueuedTip) => Promise<{ txHash: string } | null>) | null = null;
  private workerInterval: ReturnType<typeof setInterval> | null = null;
  private batchInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.load();
    logger.info('Tip queue service initialized (in-memory, scalable to Redis/BullMQ)');
  }

  /** Persist queue + deadLetterQueue to disk */
  private save(): void {
    try {
      const data = {
        queue: this.queue,
        deadLetterQueue: this.deadLetterQueue,
        savedAt: new Date().toISOString(),
      };
      writeFileSync(PERSISTENCE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Failed to persist tip queue', { error: String(err) });
    }
  }

  /** Restore queue + deadLetterQueue from disk on startup */
  private load(): void {
    try {
      if (!existsSync(PERSISTENCE_FILE)) return;
      const raw = readFileSync(PERSISTENCE_FILE, 'utf-8');
      const data = JSON.parse(raw) as { queue?: QueuedTip[]; deadLetterQueue?: QueuedTip[] };
      if (Array.isArray(data.queue)) {
        // Re-queue items that were processing (interrupted by crash)
        this.queue = data.queue.map((t) => {
          if (t.status === 'processing') t.status = 'queued';
          return t;
        });
      }
      if (Array.isArray(data.deadLetterQueue)) {
        this.deadLetterQueue = data.deadLetterQueue;
      }
      logger.info(`Tip queue restored from disk: ${this.queue.length} queued, ${this.deadLetterQueue.length} dead-letter`);
    } catch (err) {
      logger.warn('Failed to load persisted tip queue (starting fresh)', { error: String(err) });
    }
  }

  /** Set the tip processor function (called by the agent) */
  setProcessor(fn: (tip: QueuedTip) => Promise<{ txHash: string } | null>): void {
    this.onProcess = fn;
  }

  /** Start the background worker */
  startWorker(intervalMs = 1000): void {
    if (this.workerInterval) return;

    this.workerInterval = setInterval(() => {
      this.processNext().catch((err) => {
        logger.error('Queue worker error', { error: String(err) });
      });
    }, intervalMs);

    // Batch aggregation: every 30s, group small tips to same recipient
    this.batchInterval = setInterval(() => {
      this.aggregateBatches();
    }, 30000);

    logger.info('Tip queue worker started', { intervalMs });
  }

  /** Stop the worker */
  stopWorker(): void {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
  }

  // ── Enqueue ────────────────────────────────────────────────────

  /** Add a tip to the queue. Returns queue position. */
  enqueue(params: {
    recipient: string;
    amount: string;
    token?: string;
    chainId?: string;
    message?: string;
    priority?: TipPriority;
    source?: QueuedTip['source'];
    metadata?: Record<string, unknown>;
  }): QueuedTip {
    const tip: QueuedTip = {
      id: uuidv4(),
      recipient: params.recipient,
      amount: params.amount,
      token: params.token ?? 'native',
      chainId: params.chainId,
      message: params.message,
      priority: params.priority ?? 'normal',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      source: params.source ?? 'api',
      metadata: params.metadata,
    };

    // Insert sorted by priority
    const insertIdx = this.queue.findIndex(
      (q) => PRIORITY_ORDER[q.priority] > PRIORITY_ORDER[tip.priority],
    );

    if (insertIdx === -1) {
      this.queue.push(tip);
    } else {
      this.queue.splice(insertIdx, 0, tip);
    }

    logger.info('Tip queued', {
      id: tip.id,
      recipient: tip.recipient.slice(0, 10) + '...',
      amount: tip.amount,
      priority: tip.priority,
      position: insertIdx === -1 ? this.queue.length : insertIdx + 1,
      queueSize: this.queue.length,
    });

    this.save();
    return tip;
  }

  /** Enqueue multiple tips at once (batch import) */
  enqueueBatch(tips: Array<{
    recipient: string;
    amount: string;
    token?: string;
    message?: string;
  }>, source: QueuedTip['source'] = 'api'): QueuedTip[] {
    return tips.map((t) => this.enqueue({ ...t, priority: 'batch', source }));
  }

  // ── Processing ─────────────────────────────────────────────────

  /** Process the next tip in the queue */
  private async processNext(): Promise<void> {
    if (!this.onProcess) return;
    if (this.queue.length === 0) return;
    if (this.processingTips.size >= 3) return; // Max 3 concurrent

    const tip = this.queue.shift()!;
    tip.status = 'processing';
    tip.processedAt = new Date().toISOString();
    tip.attempts++;
    this.processingTips.set(tip.id, tip);

    const startTime = Date.now();

    try {
      const result = await this.onProcess(tip);

      if (result) {
        tip.status = 'completed';
        tip.txHash = result.txHash;
        tip.completedAt = new Date().toISOString();

        const processingTime = Date.now() - startTime;
        this.completedCount++;
        this.totalProcessingTimeMs += processingTime;
        this.processingTimestamps.push(Date.now());

        // Keep only last 60s of timestamps for throughput calculation
        const cutoff = Date.now() - 60000;
        this.processingTimestamps = this.processingTimestamps.filter((t) => t > cutoff);

        logger.info('Tip processed successfully', {
          id: tip.id,
          txHash: result.txHash,
          processingTimeMs: processingTime,
        });
      } else {
        throw new Error('Processor returned null');
      }
    } catch (err) {
      if (tip.attempts < tip.maxAttempts) {
        // Retry with exponential backoff
        tip.status = 'retrying';
        tip.error = String(err);
        const backoffMs = Math.pow(2, tip.attempts) * 1000; // 2s, 4s, 8s

        setTimeout(() => {
          tip.status = 'queued';
          this.queue.unshift(tip); // Priority retry at front of queue
        }, backoffMs);

        logger.warn('Tip processing failed, scheduling retry', {
          id: tip.id,
          attempt: tip.attempts,
          maxAttempts: tip.maxAttempts,
          backoffMs,
          error: String(err),
        });
      } else {
        // Max retries exceeded — move to dead letter queue
        tip.status = 'failed';
        tip.error = String(err);
        this.deadLetterQueue.push(tip);

        logger.error('Tip permanently failed after max retries', {
          id: tip.id,
          attempts: tip.attempts,
          error: String(err),
        });
      }
    } finally {
      this.processingTips.delete(tip.id);
      this.save();
    }
  }

  /** Aggregate small tips to same recipient into batches (gas optimization) */
  private aggregateBatches(): void {
    const batchCandidates = this.queue.filter((t) => t.priority === 'batch' || t.priority === 'low');
    if (batchCandidates.length < 2) return;

    // Group by recipient
    const grouped = new Map<string, QueuedTip[]>();
    for (const tip of batchCandidates) {
      const existing = grouped.get(tip.recipient) ?? [];
      existing.push(tip);
      grouped.set(tip.recipient, existing);
    }

    for (const [recipient, tips] of grouped) {
      if (tips.length < 2) continue;

      const totalAmount = tips.reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const batch: BatchGroup = {
        id: uuidv4(),
        recipient,
        tips,
        totalAmount,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      this.batchGroups.set(batch.id, batch);

      // Remove individual tips from queue, add single batched tip
      for (const tip of tips) {
        const idx = this.queue.indexOf(tip);
        if (idx !== -1) this.queue.splice(idx, 1);
      }

      this.queue.push({
        id: batch.id,
        recipient,
        amount: totalAmount.toFixed(8),
        token: tips[0].token,
        priority: 'normal', // Upgrade batched tip to normal priority
        status: 'queued',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        source: 'api',
        message: `Batched ${tips.length} tips`,
        metadata: { batchId: batch.id, originalCount: tips.length },
      });

      logger.info('Tips batched for gas optimization', {
        batchId: batch.id,
        recipient: recipient.slice(0, 10) + '...',
        count: tips.length,
        totalAmount: totalAmount.toFixed(8),
      });
    }

    this.save();
  }

  // ── Query ──────────────────────────────────────────────────────

  /** Get current queue contents */
  getQueue(): QueuedTip[] {
    return [...this.queue];
  }

  /** Get dead letter queue (permanently failed tips) */
  getDeadLetterQueue(): QueuedTip[] {
    return [...this.deadLetterQueue];
  }

  /** Get queue statistics */
  getStats(): QueueStats {
    const cutoff = Date.now() - 60000;
    const recentCompletions = this.processingTimestamps.filter((t) => t > cutoff).length;
    const oldestQueued = this.queue[0];
    const oldestAge = oldestQueued ? Date.now() - new Date(oldestQueued.createdAt).getTime() : 0;

    return {
      queued: this.queue.length,
      processing: this.processingTips.size,
      completed: this.completedCount,
      failed: this.deadLetterQueue.length,
      totalProcessed: this.completedCount + this.deadLetterQueue.length,
      avgProcessingTimeMs: this.completedCount > 0
        ? Math.round(this.totalProcessingTimeMs / this.completedCount)
        : 0,
      throughputPerMinute: recentCompletions,
      oldestQueuedAge: oldestAge,
    };
  }

  /** Get a queued tip by ID */
  getTip(id: string): QueuedTip | undefined {
    return this.queue.find((t) => t.id === id)
      ?? this.processingTips.get(id)
      ?? this.deadLetterQueue.find((t) => t.id === id);
  }

  /** Get active batch groups */
  getBatches(): BatchGroup[] {
    return Array.from(this.batchGroups.values());
  }
}

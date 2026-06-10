// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Event Sourcing — Append-only event store with SHA-256 hash chain for tamper-proof audit.
// Every state change in the system is recorded as an immutable event.

import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { logger } from '../utils/logger.js';

// ── Event Types ────────────────────────────────────────────────

export type EventType =
  // Tip lifecycle
  | 'TIP_PROPOSED'
  | 'TIP_APPROVED'
  | 'TIP_REJECTED'
  | 'TIP_EXECUTED'
  | 'TIP_CONFIRMED'
  | 'TIP_FAILED'
  // Escrow lifecycle
  | 'ESCROW_CREATED'
  | 'ESCROW_CLAIMED'
  | 'ESCROW_REFUNDED'
  | 'ESCROW_EXPIRED'
  // Yield lifecycle
  | 'YIELD_DEPOSITED'
  | 'YIELD_WITHDRAWN'
  // Bridge lifecycle
  | 'BRIDGE_INITIATED'
  | 'BRIDGE_COMPLETED'
  // Agent lifecycle
  | 'AGENT_STARTED'
  | 'AGENT_STOPPED'
  | 'MOOD_CHANGED'
  | 'CYCLE_COMPLETED'
  // Consensus
  | 'CONSENSUS_ROUND_CREATED'
  | 'CONSENSUS_VOTE_CAST'
  | 'CONSENSUS_RESOLVED'
  // Policy
  | 'POLICY_EVALUATED'
  | 'POLICY_DENIED'
  | 'POLICY_MODIFIED'
  // System
  | 'SYSTEM_STARTUP'
  | 'SYSTEM_SHUTDOWN'
  | 'CONFIG_CHANGED';

export interface StoredEvent {
  /** Monotonically increasing sequence number */
  sequence: number;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Event type */
  type: EventType;
  /** Arbitrary event payload */
  payload: Record<string, unknown>;
  /** Agent or system component that produced this event */
  agentId: string;
  /** Correlation ID — ties related events together (e.g. a tip from proposal→confirmation) */
  correlationId: string;
  /** SHA-256(previousHash + sequence + type + JSON(payload)) — creates tamper-proof chain */
  hash: string;
  /** Hash of the previous event (genesis event uses '0'.repeat(64)) */
  previousHash: string;
}

export interface EventFilter {
  type?: EventType | EventType[];
  agentId?: string;
  correlationId?: string;
  fromSequence?: number;
  toSequence?: number;
  fromTimestamp?: string;
  toTimestamp?: string;
  limit?: number;
}

export interface EventStoreSnapshot {
  totalEvents: number;
  lastSequence: number;
  lastHash: string;
  eventCounts: Record<string, number>;
  firstEventAt: string | null;
  lastEventAt: string | null;
  chainIntegrityVerified: boolean;
}

// ── Hash Utilities ─────────────────────────────────────────────

const GENESIS_HASH = '0'.repeat(64);

function computeEventHash(
  previousHash: string,
  sequence: number,
  type: string,
  payload: Record<string, unknown>,
): string {
  const content = `${previousHash}|${sequence}|${type}|${JSON.stringify(payload)}`;
  return createHash('sha256').update(content).digest('hex');
}

// ── Event Store ────────────────────────────────────────────────

export class EventStore {
  private events: StoredEvent[] = [];
  private sequence = 0;
  private lastHash = GENESIS_HASH;
  private readonly persistPath: string;
  private readonly persistEnabled: boolean;

  constructor(persistPath?: string) {
    this.persistPath = persistPath ?? 'agent/data/events.jsonl';
    this.persistEnabled = true;
    this.loadFromDisk();
    logger.info('EventStore initialized', {
      events: this.events.length,
      lastSequence: this.sequence,
      persistPath: this.persistPath,
    });
  }

  // ── Core Operations ────────────────────────────────────────

  /** Append a new event to the store. Returns the stored event with hash. */
  append(
    type: EventType,
    payload: Record<string, unknown>,
    agentId: string,
    correlationId?: string,
  ): StoredEvent {
    this.sequence++;
    const timestamp = new Date().toISOString();
    const hash = computeEventHash(this.lastHash, this.sequence, type, payload);

    const event: StoredEvent = {
      sequence: this.sequence,
      timestamp,
      type,
      payload,
      agentId,
      correlationId: correlationId ?? randomUUID(),
      hash,
      previousHash: this.lastHash,
    };

    this.events.push(event);
    this.lastHash = hash;

    // Persist to disk
    this.appendToDisk(event);

    logger.debug(`Event appended: #${event.sequence} ${type}`, {
      agentId,
      correlationId: event.correlationId,
    });

    return event;
  }

  /** Query events with filtering. */
  getEvents(filter: EventFilter = {}): StoredEvent[] {
    let results = this.events;

    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      results = results.filter(e => types.includes(e.type));
    }
    if (filter.agentId) {
      results = results.filter(e => e.agentId === filter.agentId);
    }
    if (filter.correlationId) {
      results = results.filter(e => e.correlationId === filter.correlationId);
    }
    if (filter.fromSequence !== undefined) {
      results = results.filter(e => e.sequence >= filter.fromSequence!);
    }
    if (filter.toSequence !== undefined) {
      results = results.filter(e => e.sequence <= filter.toSequence!);
    }
    if (filter.fromTimestamp) {
      results = results.filter(e => e.timestamp >= filter.fromTimestamp!);
    }
    if (filter.toTimestamp) {
      results = results.filter(e => e.timestamp <= filter.toTimestamp!);
    }
    if (filter.limit) {
      results = results.slice(-filter.limit);
    }

    return results;
  }

  /** Replay events from a given sequence number (for rebuilding state). */
  replay(fromSequence = 0): StoredEvent[] {
    return this.events.filter(e => e.sequence >= fromSequence);
  }

  /** Get a snapshot of the current store state. */
  getSnapshot(): EventStoreSnapshot {
    const eventCounts: Record<string, number> = {};
    for (const event of this.events) {
      eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
    }

    return {
      totalEvents: this.events.length,
      lastSequence: this.sequence,
      lastHash: this.lastHash,
      eventCounts,
      firstEventAt: this.events.length > 0 ? this.events[0].timestamp : null,
      lastEventAt: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null,
      chainIntegrityVerified: this.verifyChainIntegrity().valid,
    };
  }

  // ── Chain Integrity ────────────────────────────────────────

  /** Verify the entire hash chain — returns detailed integrity report. */
  verifyChainIntegrity(): {
    valid: boolean;
    eventsChecked: number;
    firstInvalidSequence: number | null;
    details: string;
  } {
    if (this.events.length === 0) {
      return { valid: true, eventsChecked: 0, firstInvalidSequence: null, details: 'Empty store — trivially valid' };
    }

    // Check genesis event
    const genesis = this.events[0];
    if (genesis.previousHash !== GENESIS_HASH) {
      return {
        valid: false,
        eventsChecked: 1,
        firstInvalidSequence: genesis.sequence,
        details: `Genesis event has wrong previousHash: expected ${GENESIS_HASH}, got ${genesis.previousHash}`,
      };
    }

    let previousHash = GENESIS_HASH;
    for (const event of this.events) {
      // Verify previous hash pointer
      if (event.previousHash !== previousHash) {
        return {
          valid: false,
          eventsChecked: event.sequence,
          firstInvalidSequence: event.sequence,
          details: `Event #${event.sequence} previousHash mismatch: expected ${previousHash.slice(0, 16)}..., got ${event.previousHash.slice(0, 16)}...`,
        };
      }

      // Recompute and verify the event's own hash
      const expectedHash = computeEventHash(previousHash, event.sequence, event.type, event.payload);
      if (event.hash !== expectedHash) {
        return {
          valid: false,
          eventsChecked: event.sequence,
          firstInvalidSequence: event.sequence,
          details: `Event #${event.sequence} hash mismatch: payload may have been tampered with`,
        };
      }

      previousHash = event.hash;
    }

    return {
      valid: true,
      eventsChecked: this.events.length,
      firstInvalidSequence: null,
      details: `All ${this.events.length} events verified — hash chain intact`,
    };
  }

  // ── Aggregation Helpers ────────────────────────────────────

  /** Get all events for a given correlation (e.g. full lifecycle of a tip). */
  getCorrelatedEvents(correlationId: string): StoredEvent[] {
    return this.events.filter(e => e.correlationId === correlationId);
  }

  /** Get event counts grouped by type. */
  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of this.events) {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
    }
    return counts;
  }

  /** Get the last N events. */
  getRecent(limit = 20): StoredEvent[] {
    return this.events.slice(-limit);
  }

  // ── Persistence ────────────────────────────────────────────

  private loadFromDisk(): void {
    try {
      if (!existsSync(this.persistPath)) return;
      const content = readFileSync(this.persistPath, 'utf-8').trim();
      if (!content) return;
      const lines = content.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line) as StoredEvent;
          this.events.push(event);
          this.sequence = event.sequence;
          this.lastHash = event.hash;
        } catch {
          logger.warn('Skipping corrupt event line during load');
        }
      }
      logger.info(`EventStore loaded ${this.events.length} events from disk`);
    } catch (err) {
      logger.warn('Could not load event store from disk', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private appendToDisk(event: StoredEvent): void {
    if (!this.persistEnabled) return;
    try {
      const dir = dirname(this.persistPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(this.persistPath, JSON.stringify(event) + '\n');
    } catch (err) {
      logger.warn('Could not persist event to disk', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Seed demo data — a full tip lifecycle with correlated events. */
  seedDemoEvents(): void {
    const correlationId = randomUUID();
    this.append('SYSTEM_STARTUP', { version: '1.0.0', agents: 4 }, 'system');
    this.append('AGENT_STARTED', { name: 'DiscoveryAgent', role: 'discovery' }, 'discovery-agent');
    this.append('AGENT_STARTED', { name: 'GuardianAgent', role: 'guardian' }, 'guardian-agent');

    this.append('TIP_PROPOSED', {
      recipient: '0xabc...def',
      amount: '5',
      chain: 'ethereum',
      creator: 'CryptoTeacher',
      reason: 'Excellent DeFi tutorial with 50k views',
    }, 'discovery-agent', correlationId);

    this.append('CONSENSUS_ROUND_CREATED', {
      roundId: 'cr-demo',
      proposal: 'Tip CryptoTeacher 5 USDT',
    }, 'system', correlationId);

    this.append('CONSENSUS_VOTE_CAST', {
      roundId: 'cr-demo',
      agentId: 'discovery-agent',
      decision: 'approve',
      confidence: 0.92,
    }, 'discovery-agent', correlationId);

    this.append('CONSENSUS_RESOLVED', {
      roundId: 'cr-demo',
      decision: 'approved',
      votesFor: 3,
      votesAgainst: 0,
    }, 'system', correlationId);

    this.append('TIP_APPROVED', {
      recipient: '0xabc...def',
      amount: '5',
      chain: 'ethereum',
    }, 'system', correlationId);

    this.append('POLICY_EVALUATED', {
      policies: ['MaxTipAmount', 'DailySpendLimit', 'MinBalanceReserve'],
      result: 'ALLOW',
    }, 'policy-engine', correlationId);

    this.append('TIP_EXECUTED', {
      txHash: '0x' + 'a'.repeat(64),
      gasUsed: '21000',
      gasCostUsd: '0.04',
    }, 'tip-executor-agent', correlationId);

    this.append('TIP_CONFIRMED', {
      txHash: '0x' + 'a'.repeat(64),
      blockNumber: 19500000,
      confirmations: 12,
    }, 'tip-executor-agent', correlationId);

    this.append('CYCLE_COMPLETED', {
      cycleNumber: 1,
      tipsExecuted: 1,
      totalSpent: '5',
    }, 'orchestrator');

    logger.info('EventStore seeded with demo lifecycle events', { correlationId });
  }
}

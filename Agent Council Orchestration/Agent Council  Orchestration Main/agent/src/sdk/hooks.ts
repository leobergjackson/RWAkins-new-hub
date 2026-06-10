// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta SDK Hooks — Event lifecycle system for integrating AeroFyta
// events into your existing application.
//
// Usage:
//   import { HookRegistry } from 'aerofyta-agent/sdk/hooks';
//   const hooks = new HookRegistry();
//   hooks.onTip((tip) => console.log(`Tipped ${tip.amount} to ${tip.recipient}`));

// ── Event Types ─────────────────────────────────────────────────────

export type HookEvent =
  // Tipping lifecycle
  | 'beforeTip'
  | 'afterTip'
  | 'tipBlocked'
  // Escrow lifecycle
  | 'beforeEscrow'
  | 'afterEscrow'
  | 'escrowClaimed'
  | 'escrowRefunded'
  // Intelligence events
  | 'moodChanged'
  | 'pulseUpdated'
  // Safety events
  | 'anomalyDetected'
  | 'policyViolation'
  // Learning events
  | 'learningUpdate'
  | 'reputationChanged'
  // Autonomous loop events
  | 'cycleStart'
  | 'cycleEnd'
  // Agent lifecycle
  | 'agentStarted'
  | 'agentStopped';

// ── Handler Types ───────────────────────────────────────────────────

export type HookHandler = (event: HookEvent, data: unknown) => void | Promise<void>;

export interface TipEventData {
  recipient: string;
  amount: number;
  chain: string;
  txHash?: string;
}

export interface BlockEventData {
  reason: string;
  policy: string;
  amount: number;
}

export interface AnomalyEventData {
  amount: number;
  zScore: number;
  severity: string;
}

export interface MoodEventData {
  previous: string;
  current: string;
  reason: string;
}

export interface EscrowEventData {
  id: string;
  recipient: string;
  amount: number;
  expiresAt?: number;
}

export interface CycleEventData {
  cycleNumber: number;
  timestamp: number;
  actions?: string[];
}

// ── Hook Registry ───────────────────────────────────────────────────

/**
 * Event hook registry for AeroFyta lifecycle events.
 *
 * Allows external systems to subscribe to agent events without
 * modifying the agent core.
 *
 * ```typescript
 * const hooks = new HookRegistry();
 *
 * hooks.onTip((tip) => {
 *   analytics.track('tip_sent', { amount: tip.amount, chain: tip.chain });
 * });
 *
 * hooks.onBlock((block) => {
 *   alerting.send(`Tip blocked: ${block.reason}`);
 * });
 *
 * hooks.onAnomaly((anomaly) => {
 *   if (anomaly.severity === 'critical') pagerDuty.alert(anomaly);
 * });
 * ```
 */
export class HookRegistry {
  private hooks = new Map<HookEvent, HookHandler[]>();

  // ── Core API ──────────────────────────────────────────────────

  /**
   * Register a handler for a specific event.
   */
  on(event: HookEvent, handler: HookHandler): void {
    const handlers = this.hooks.get(event) ?? [];
    handlers.push(handler);
    this.hooks.set(event, handlers);
  }

  /**
   * Remove a handler for a specific event.
   */
  off(event: HookEvent, handler: HookHandler): void {
    const handlers = this.hooks.get(event);
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  }

  /**
   * Emit an event to all registered handlers.
   * Handlers are called in registration order; async handlers are awaited.
   */
  async emit(event: HookEvent, data: unknown): Promise<void> {
    const handlers = this.hooks.get(event);
    if (!handlers || handlers.length === 0) return;

    for (const handler of handlers) {
      try {
        await handler(event, data);
      } catch (err) {
        // Hooks must not break the agent — log and continue
        console.error(`[AeroFyta] Hook error on '${event}':`, err);
      }
    }
  }

  /**
   * Remove all handlers for a specific event, or all events if no
   * event is specified.
   */
  clear(event?: HookEvent): void {
    if (event) {
      this.hooks.delete(event);
    } else {
      this.hooks.clear();
    }
  }

  /**
   * Get the number of registered handlers for an event.
   */
  listenerCount(event: HookEvent): number {
    return this.hooks.get(event)?.length ?? 0;
  }

  // ── Convenience Methods ───────────────────────────────────────

  /**
   * Subscribe to tip events (before + after).
   */
  onTip(handler: (tip: TipEventData) => void | Promise<void>): void {
    this.on('afterTip', (_event, data) => handler(data as TipEventData));
  }

  /**
   * Subscribe to blocked tip events.
   */
  onBlock(handler: (block: BlockEventData) => void | Promise<void>): void {
    this.on('tipBlocked', (_event, data) => handler(data as BlockEventData));
  }

  /**
   * Subscribe to anomaly detection events.
   */
  onAnomaly(handler: (anomaly: AnomalyEventData) => void | Promise<void>): void {
    this.on('anomalyDetected', (_event, data) => handler(data as AnomalyEventData));
  }

  /**
   * Subscribe to mood change events.
   */
  onMoodChange(handler: (mood: MoodEventData) => void | Promise<void>): void {
    this.on('moodChanged', (_event, data) => handler(data as MoodEventData));
  }

  /**
   * Subscribe to escrow lifecycle events.
   */
  onEscrow(handler: (escrow: EscrowEventData) => void | Promise<void>): void {
    this.on('afterEscrow', (_event, data) => handler(data as EscrowEventData));
    this.on('escrowClaimed', (_event, data) => handler(data as EscrowEventData));
    this.on('escrowRefunded', (_event, data) => handler(data as EscrowEventData));
  }

  /**
   * Subscribe to autonomous cycle events.
   */
  onCycle(handler: (cycle: CycleEventData) => void | Promise<void>): void {
    this.on('cycleStart', (_event, data) => handler(data as CycleEventData));
    this.on('cycleEnd', (_event, data) => handler(data as CycleEventData));
  }
}

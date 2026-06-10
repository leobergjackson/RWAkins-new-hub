// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Circuit breaker for external service calls (LLM, blockchain RPCs)

import { logger } from '../utils/logger.js';

// ── Types ────────────────────────────────────────────────────────

export enum CircuitState {
  CLOSED    = 'CLOSED',
  OPEN      = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitEntry {
  state: CircuitState;
  failures: number;
  lastFailureAt: number;
  lastStateChange: number;
  successCount: number;
  failureCount: number;
}

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit (default: 5) */
  failureThreshold: number;
  /** How long to wait (ms) before moving from OPEN to HALF_OPEN (default: 30000) */
  resetTimeoutMs: number;
}

export interface CircuitBreakerSnapshot {
  name: string;
  state: CircuitState;
  failures: number;
  totalSuccesses: number;
  totalFailures: number;
  lastFailureAt: string | null;
  lastStateChange: string;
}

// ── Default config ───────────────────────────────────────────────

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
};

// ── Circuit Breaker ──────────────────────────────────────────────

type StateChangeListener = (name: string, from: CircuitState, to: CircuitState) => void;

export class CircuitBreaker {
  private circuits = new Map<string, CircuitEntry>();
  private config: CircuitBreakerConfig;
  private listeners: StateChangeListener[] = [];

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Subscribe to state change events */
  onStateChange(listener: StateChangeListener): void {
    this.listeners.push(listener);
  }

  /**
   * Wrap an async function call with circuit breaker protection.
   *
   * @param name   Logical name for the external service (e.g. "llm", "eth-rpc")
   * @param fn     The async function to execute
   * @returns      The result of fn, or throws if the circuit is open
   */
  async wrapCall<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const circuit = this.getOrCreate(name);
    const now = Date.now();

    // ── OPEN state: reject immediately (unless timeout has elapsed) ──
    if (circuit.state === CircuitState.OPEN) {
      if (now - circuit.lastFailureAt >= this.config.resetTimeoutMs) {
        // Transition to HALF_OPEN — allow one probe request
        this.transition(name, circuit, CircuitState.HALF_OPEN);
      } else {
        throw new CircuitOpenError(
          name,
          Math.ceil((this.config.resetTimeoutMs - (now - circuit.lastFailureAt)) / 1000),
        );
      }
    }

    // ── CLOSED or HALF_OPEN: attempt the call ───────────────────────
    try {
      const result = await fn();
      this.onSuccess(name, circuit);
      return result;
    } catch (err) {
      this.onFailure(name, circuit);
      throw err;
    }
  }

  /** Get snapshots for all registered circuits (for health check) */
  getStates(): CircuitBreakerSnapshot[] {
    const snapshots: CircuitBreakerSnapshot[] = [];
    for (const [name, c] of this.circuits) {
      snapshots.push({
        name,
        state: c.state,
        failures: c.failures,
        totalSuccesses: c.successCount,
        totalFailures: c.failureCount,
        lastFailureAt: c.lastFailureAt ? new Date(c.lastFailureAt).toISOString() : null,
        lastStateChange: new Date(c.lastStateChange).toISOString(),
      });
    }
    return snapshots;
  }

  // ── Internal helpers ───────────────────────────────────────────

  private getOrCreate(name: string): CircuitEntry {
    let entry = this.circuits.get(name);
    if (!entry) {
      entry = {
        state: CircuitState.CLOSED,
        failures: 0,
        lastFailureAt: 0,
        lastStateChange: Date.now(),
        successCount: 0,
        failureCount: 0,
      };
      this.circuits.set(name, entry);
    }
    return entry;
  }

  private onSuccess(name: string, circuit: CircuitEntry): void {
    circuit.successCount++;
    if (circuit.state === CircuitState.HALF_OPEN) {
      // One successful call in HALF_OPEN closes the circuit
      circuit.failures = 0;
      this.transition(name, circuit, CircuitState.CLOSED);
      logger.info(`Circuit breaker [${name}] recovered — CLOSED`);
    } else {
      circuit.failures = 0;
    }
  }

  private onFailure(name: string, circuit: CircuitEntry): void {
    circuit.failures++;
    circuit.failureCount++;
    circuit.lastFailureAt = Date.now();

    if (circuit.state === CircuitState.HALF_OPEN) {
      // Failed during probe — reopen immediately
      this.transition(name, circuit, CircuitState.OPEN);
      logger.warn(`Circuit breaker [${name}] probe failed — OPEN`);
    } else if (circuit.failures >= this.config.failureThreshold) {
      this.transition(name, circuit, CircuitState.OPEN);
      logger.warn(`Circuit breaker [${name}] opened after ${circuit.failures} consecutive failures`);
    }
  }

  private transition(name: string, circuit: CircuitEntry, to: CircuitState): void {
    const from = circuit.state;
    circuit.state = to;
    circuit.lastStateChange = Date.now();
    for (const listener of this.listeners) {
      try { listener(name, from, to); } catch { /* swallow listener errors */ }
    }
  }
}

// ── Error class ──────────────────────────────────────────────────

export class CircuitOpenError extends Error {
  public readonly retryAfterSeconds: number;

  constructor(serviceName: string, retryAfterSeconds: number) {
    super(`Circuit breaker for "${serviceName}" is OPEN. Retry after ${retryAfterSeconds}s.`);
    this.name = 'CircuitOpenError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// ── Singleton instance ───────────────────────────────────────────

let _globalBreaker: CircuitBreaker | null = null;

export function getCircuitBreaker(): CircuitBreaker {
  if (!_globalBreaker) {
    _globalBreaker = new CircuitBreaker();
    _globalBreaker.onStateChange((name, from, to) => {
      logger.info(`Circuit [${name}] ${from} → ${to}`);
    });
  }
  return _globalBreaker;
}

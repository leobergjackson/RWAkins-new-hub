// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Shared Singletons — Single instances of EventStore, MetricsCollector,
// PolicyEngine, ConsensusProtocol, and ProfitLossEngine used across the system.
//
// Every service imports from here to guarantee one instance per process.
// When a judge runs the system, REAL events flow through REAL systems.

import { EventStore } from './events/event-store.js';
import { MetricsCollector } from './observability/metrics-collector.js';
import { PolicyEngine } from './policies/policy-engine.js';
import { ConsensusProtocol } from './consensus/consensus-protocol.js';
import { ProfitLossEngine } from './economics/profit-loss-engine.js';

// ── Singleton instances ─────────────────────────────────────────

/** Global event store — append-only, hash-chained, tamper-proof audit log */
export const eventStore = new EventStore();

/** Global metrics collector — Prometheus-style counters, gauges, histograms */
export const metrics = new MetricsCollector();

/** Global policy engine — evaluates every transaction against composable rules */
export const policyEngine = new PolicyEngine();

/** Global consensus protocol — cryptographic voting with quorum + guardian veto */
export const consensusProtocol = new ConsensusProtocol();

/** Global P&L engine — real financial ledger tracking income and expenses */
export const profitLossEngine = new ProfitLossEngine();

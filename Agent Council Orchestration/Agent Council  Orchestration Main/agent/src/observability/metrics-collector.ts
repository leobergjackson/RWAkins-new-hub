// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Observability — Prometheus-style metrics collection with counters, gauges, and histograms.
// Provides both Prometheus text format and structured JSON for monitoring and alerting.

import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricDefinition {
  name: string;
  type: MetricType;
  help: string;
  labels?: string[];
}

interface CounterValue {
  value: number;
  labels: Record<string, string>;
}

interface GaugeValue {
  value: number;
  labels: Record<string, string>;
}

interface HistogramValue {
  count: number;
  sum: number;
  min: number;
  max: number;
  buckets: Map<number, number>; // upper bound -> count
  labels: Record<string, string>;
}

interface MetricEntry {
  definition: MetricDefinition;
  counters: Map<string, CounterValue>;
  gauges: Map<string, GaugeValue>;
  histograms: Map<string, HistogramValue>;
}

// ── Default Metric Definitions ─────────────────────────────────

const DEFAULT_METRICS: MetricDefinition[] = [
  // Counters
  { name: 'tips_sent_total', type: 'counter', help: 'Total number of tips sent', labels: ['chain', 'status'] },
  { name: 'tips_received_total', type: 'counter', help: 'Total number of tips received' },
  { name: 'escrows_created_total', type: 'counter', help: 'Total escrows created', labels: ['chain'] },
  { name: 'escrows_claimed_total', type: 'counter', help: 'Total escrows claimed' },
  { name: 'votes_cast_total', type: 'counter', help: 'Total consensus votes cast', labels: ['decision'] },
  { name: 'cycles_completed_total', type: 'counter', help: 'Total autonomous cycles completed' },
  { name: 'policies_evaluated_total', type: 'counter', help: 'Total policy evaluations', labels: ['result'] },
  { name: 'policies_denied_total', type: 'counter', help: 'Total policy denials', labels: ['policy_id'] },
  { name: 'bridge_transfers_total', type: 'counter', help: 'Total cross-chain bridge transfers', labels: ['from_chain', 'to_chain'] },
  { name: 'events_appended_total', type: 'counter', help: 'Total events appended to event store', labels: ['type'] },
  { name: 'rpc_failovers_total', type: 'counter', help: 'Total RPC endpoint failovers', labels: ['chain'] },
  { name: 'api_requests_total', type: 'counter', help: 'Total API requests', labels: ['method', 'path', 'status'] },
  { name: 'llm_calls_total', type: 'counter', help: 'Total LLM API calls', labels: ['provider'] },

  // Gauges
  { name: 'portfolio_total_usd', type: 'gauge', help: 'Total portfolio value in USD' },
  { name: 'portfolio_health', type: 'gauge', help: 'Portfolio health score 0-1' },
  { name: 'agent_count_active', type: 'gauge', help: 'Number of active agents' },
  { name: 'chains_connected', type: 'gauge', help: 'Number of healthy connected chains' },
  { name: 'pending_transactions', type: 'gauge', help: 'Number of pending transactions' },
  { name: 'daily_spend_usd', type: 'gauge', help: 'Amount spent today in USD' },
  { name: 'daily_spend_limit_usd', type: 'gauge', help: 'Daily spending limit in USD' },
  { name: 'event_store_size', type: 'gauge', help: 'Number of events in the event store' },
  { name: 'active_policies', type: 'gauge', help: 'Number of active policies' },
  { name: 'active_consensus_rounds', type: 'gauge', help: 'Number of open consensus rounds' },
  { name: 'uptime_seconds', type: 'gauge', help: 'Agent uptime in seconds' },
  { name: 'chain_balance_usdt', type: 'gauge', help: 'USDT balance per chain', labels: ['chain'] },

  // Histograms
  { name: 'tip_execution_time_ms', type: 'histogram', help: 'Tip execution time in milliseconds' },
  { name: 'consensus_duration_ms', type: 'histogram', help: 'Consensus round duration in milliseconds' },
  { name: 'gas_cost_usd', type: 'histogram', help: 'Gas cost per transaction in USD', labels: ['chain'] },
  { name: 'tip_amount_usd', type: 'histogram', help: 'Tip amount distribution in USD' },
  { name: 'llm_response_time_ms', type: 'histogram', help: 'LLM response time in milliseconds', labels: ['provider'] },
  { name: 'api_response_time_ms', type: 'histogram', help: 'API response time in milliseconds', labels: ['path'] },
  { name: 'policy_evaluation_time_ms', type: 'histogram', help: 'Policy evaluation time in milliseconds' },
];

const DEFAULT_HISTOGRAM_BUCKETS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

// ── Label Key ──────────────────────────────────────────────────

function labelKey(labels: Record<string, string> = {}): string {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  return entries.length > 0 ? entries.map(([k, v]) => `${k}="${v}"`).join(',') : '__default__';
}

// ── Metrics Collector ──────────────────────────────────────────

export class MetricsCollector {
  private metrics: Map<string, MetricEntry> = new Map();
  private readonly startedAt: number;

  constructor() {
    this.startedAt = Date.now();
    for (const def of DEFAULT_METRICS) {
      this.register(def);
    }
    logger.info('MetricsCollector initialized', { metricCount: this.metrics.size });
  }

  // ── Registration ───────────────────────────────────────────

  register(definition: MetricDefinition): void {
    if (this.metrics.has(definition.name)) return;
    this.metrics.set(definition.name, {
      definition,
      counters: new Map(),
      gauges: new Map(),
      histograms: new Map(),
    });
  }

  // ── Counter Operations ─────────────────────────────────────

  /** Increment a counter by 1 (or a custom amount). */
  increment(name: string, labels: Record<string, string> = {}, amount = 1): void {
    const entry = this.metrics.get(name);
    if (!entry || entry.definition.type !== 'counter') {
      logger.warn(`Counter not found: ${name}`);
      return;
    }
    const key = labelKey(labels);
    const existing = entry.counters.get(key);
    if (existing) {
      existing.value += amount;
    } else {
      entry.counters.set(key, { value: amount, labels });
    }
  }

  // ── Gauge Operations ───────────────────────────────────────

  /** Set a gauge to a specific value. */
  set(name: string, value: number, labels: Record<string, string> = {}): void {
    const entry = this.metrics.get(name);
    if (!entry || entry.definition.type !== 'gauge') {
      logger.warn(`Gauge not found: ${name}`);
      return;
    }
    const key = labelKey(labels);
    entry.gauges.set(key, { value, labels });
  }

  /** Increment a gauge. */
  gaugeInc(name: string, amount = 1, labels: Record<string, string> = {}): void {
    const entry = this.metrics.get(name);
    if (!entry || entry.definition.type !== 'gauge') return;
    const key = labelKey(labels);
    const existing = entry.gauges.get(key);
    if (existing) {
      existing.value += amount;
    } else {
      entry.gauges.set(key, { value: amount, labels });
    }
  }

  /** Decrement a gauge. */
  gaugeDec(name: string, amount = 1, labels: Record<string, string> = {}): void {
    this.gaugeInc(name, -amount, labels);
  }

  // ── Histogram Operations ───────────────────────────────────

  /** Observe a value in a histogram. */
  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const entry = this.metrics.get(name);
    if (!entry || entry.definition.type !== 'histogram') {
      logger.warn(`Histogram not found: ${name}`);
      return;
    }
    const key = labelKey(labels);
    let hist = entry.histograms.get(key);
    if (!hist) {
      hist = {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        buckets: new Map(DEFAULT_HISTOGRAM_BUCKETS.map(b => [b, 0])),
        labels,
      };
      entry.histograms.set(key, hist);
    }

    hist.count++;
    hist.sum += value;
    hist.min = Math.min(hist.min, value);
    hist.max = Math.max(hist.max, value);

    for (const [bound] of hist.buckets) {
      if (value <= bound) {
        hist.buckets.set(bound, (hist.buckets.get(bound) ?? 0) + 1);
      }
    }
  }

  /** Time a function and record the duration in a histogram. */
  async time<T>(name: string, fn: () => Promise<T>, labels: Record<string, string> = {}): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.observe(name, Date.now() - start, labels);
      return result;
    } catch (err) {
      this.observe(name, Date.now() - start, labels);
      throw err;
    }
  }

  // ── Output Formats ─────────────────────────────────────────

  /** Get metrics in Prometheus text exposition format. */
  getMetrics(): string {
    const lines: string[] = [];

    // Add uptime gauge
    this.set('uptime_seconds', (Date.now() - this.startedAt) / 1000);

    for (const [, entry] of this.metrics) {
      const { definition } = entry;
      lines.push(`# HELP ${definition.name} ${definition.help}`);
      lines.push(`# TYPE ${definition.name} ${definition.type}`);

      if (definition.type === 'counter') {
        for (const [, counter] of entry.counters) {
          const labelsStr = this.formatLabels(counter.labels);
          lines.push(`${definition.name}${labelsStr} ${counter.value}`);
        }
      } else if (definition.type === 'gauge') {
        for (const [, gauge] of entry.gauges) {
          const labelsStr = this.formatLabels(gauge.labels);
          lines.push(`${definition.name}${labelsStr} ${gauge.value}`);
        }
      } else if (definition.type === 'histogram') {
        for (const [, hist] of entry.histograms) {
          const labelsStr = this.formatLabels(hist.labels);
          for (const [bound, count] of hist.buckets) {
            const bucketLabels = hist.labels && Object.keys(hist.labels).length > 0
              ? `{${Object.entries(hist.labels).map(([k, v]) => `${k}="${v}"`).join(',')},le="${bound}"}`
              : `{le="${bound}"}`;
            lines.push(`${definition.name}_bucket${bucketLabels} ${count}`);
          }
          const infLabels = hist.labels && Object.keys(hist.labels).length > 0
            ? `{${Object.entries(hist.labels).map(([k, v]) => `${k}="${v}"`).join(',')},le="+Inf"}`
            : `{le="+Inf"}`;
          lines.push(`${definition.name}_bucket${infLabels} ${hist.count}`);
          lines.push(`${definition.name}_sum${labelsStr} ${hist.sum}`);
          lines.push(`${definition.name}_count${labelsStr} ${hist.count}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /** Get metrics in structured JSON format. */
  getMetricsJSON(): Record<string, unknown> {
    this.set('uptime_seconds', (Date.now() - this.startedAt) / 1000);

    const result: Record<string, unknown> = {};

    for (const [name, entry] of this.metrics) {
      const { definition } = entry;

      if (definition.type === 'counter') {
        const values: Record<string, number> = {};
        for (const [key, counter] of entry.counters) {
          values[key] = counter.value;
        }
        result[name] = { type: 'counter', help: definition.help, values };
      } else if (definition.type === 'gauge') {
        const values: Record<string, number> = {};
        for (const [key, gauge] of entry.gauges) {
          values[key] = gauge.value;
        }
        result[name] = { type: 'gauge', help: definition.help, values };
      } else if (definition.type === 'histogram') {
        const values: Record<string, { count: number; sum: number; min: number; max: number; avg: number }> = {};
        for (const [key, hist] of entry.histograms) {
          values[key] = {
            count: hist.count,
            sum: hist.sum,
            min: hist.min === Infinity ? 0 : hist.min,
            max: hist.max === -Infinity ? 0 : hist.max,
            avg: hist.count > 0 ? hist.sum / hist.count : 0,
          };
        }
        result[name] = { type: 'histogram', help: definition.help, values };
      }
    }

    return result;
  }

  /** Get a human-readable summary of key metrics. */
  getMetricsSummary(): {
    uptime: string;
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, { count: number; avg: number; p99: number }>;
  } {
    const uptimeMs = Date.now() - this.startedAt;
    const uptimeH = Math.floor(uptimeMs / 3600000);
    const uptimeM = Math.floor((uptimeMs % 3600000) / 60000);
    const uptimeS = Math.floor((uptimeMs % 60000) / 1000);

    const counters: Record<string, number> = {};
    const gauges: Record<string, number> = {};
    const histograms: Record<string, { count: number; avg: number; p99: number }> = {};

    for (const [name, entry] of this.metrics) {
      if (entry.definition.type === 'counter') {
        let total = 0;
        for (const [, c] of entry.counters) total += c.value;
        if (total > 0) counters[name] = total;
      } else if (entry.definition.type === 'gauge') {
        for (const [, g] of entry.gauges) {
          gauges[name] = g.value;
          break; // Just take the first (default) value
        }
      } else if (entry.definition.type === 'histogram') {
        for (const [, h] of entry.histograms) {
          if (h.count > 0) {
            // Approximate p99 from buckets
            const target = h.count * 0.99;
            let p99 = 0;
            for (const [bound, count] of h.buckets) {
              if (count >= target) { p99 = bound; break; }
            }
            histograms[name] = {
              count: h.count,
              avg: h.sum / h.count,
              p99: p99 || h.max,
            };
          }
          break;
        }
      }
    }

    return {
      uptime: `${uptimeH}h ${uptimeM}m ${uptimeS}s`,
      counters,
      gauges,
      histograms,
    };
  }

  // ── Reset ──────────────────────────────────────────────────

  /** Reset all metric values (keeps definitions). */
  reset(): void {
    for (const [, entry] of this.metrics) {
      entry.counters.clear();
      entry.gauges.clear();
      entry.histograms.clear();
    }
    logger.info('All metrics reset');
  }

  // ── Helpers ────────────────────────────────────────────────

  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    return `{${entries.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
  }

  /** Seed demo metrics with realistic values. */
  seedDemoMetrics(): void {
    // Counters
    this.increment('tips_sent_total', { chain: 'ethereum', status: 'confirmed' }, 12);
    this.increment('tips_sent_total', { chain: 'polygon', status: 'confirmed' }, 28);
    this.increment('tips_sent_total', { chain: 'tron', status: 'confirmed' }, 15);
    this.increment('tips_sent_total', { chain: 'ton', status: 'confirmed' }, 8);
    this.increment('escrows_created_total', { chain: 'ethereum' }, 5);
    this.increment('votes_cast_total', { decision: 'approve' }, 45);
    this.increment('votes_cast_total', { decision: 'reject' }, 8);
    this.increment('votes_cast_total', { decision: 'abstain' }, 12);
    this.increment('cycles_completed_total', {}, 150);
    this.increment('policies_evaluated_total', { result: 'allow' }, 85);
    this.increment('policies_evaluated_total', { result: 'deny' }, 12);
    this.increment('events_appended_total', { type: 'TIP_EXECUTED' }, 63);
    this.increment('llm_calls_total', { provider: 'openrouter' }, 200);

    // Gauges
    this.set('portfolio_total_usd', 950);
    this.set('portfolio_health', 0.87);
    this.set('agent_count_active', 4);
    this.set('chains_connected', 9);
    this.set('pending_transactions', 2);
    this.set('daily_spend_usd', 45.50);
    this.set('daily_spend_limit_usd', 200);
    this.set('event_store_size', 342);
    this.set('active_policies', 10);
    this.set('active_consensus_rounds', 1);
    this.set('chain_balance_usdt', 150, { chain: 'ethereum' });
    this.set('chain_balance_usdt', 75, { chain: 'polygon' });
    this.set('chain_balance_usdt', 300, { chain: 'tron' });
    this.set('chain_balance_usdt', 100, { chain: 'ton' });

    // Histograms
    for (const ms of [120, 250, 180, 340, 150, 500, 90, 280, 600, 200]) {
      this.observe('tip_execution_time_ms', ms);
    }
    for (const ms of [2000, 3500, 1500, 4000, 2800, 1800]) {
      this.observe('consensus_duration_ms', ms);
    }
    for (const usd of [2.50, 0.01, 0.10, 0.05, 0.50, 0.02, 0.001]) {
      this.observe('gas_cost_usd', usd);
    }
    for (const usd of [1, 2, 5, 10, 3, 7, 15, 2, 5, 8]) {
      this.observe('tip_amount_usd', usd);
    }
    for (const ms of [800, 1200, 600, 1500, 900, 700, 1100]) {
      this.observe('llm_response_time_ms', ms, { provider: 'openrouter' });
    }

    logger.info('MetricsCollector seeded with demo data');
  }
}

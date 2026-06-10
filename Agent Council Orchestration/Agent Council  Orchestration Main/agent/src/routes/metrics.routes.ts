// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Metrics API Routes — Prometheus-compatible observability endpoints.

import { Router } from 'express';
import type { MetricsCollector } from '../observability/metrics-collector.js';
import { logger } from '../utils/logger.js';

export function registerMetricsRoutes(
  router: Router,
  metricsCollector: MetricsCollector,
): void {
  // GET /api/metrics — Prometheus text format (for Grafana / Prometheus scraping)
  router.get('/metrics', (_req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsCollector.getMetrics());
  });

  // GET /api/metrics/json — structured JSON format
  router.get('/metrics/json', (_req, res) => {
    res.json({ ok: true, metrics: metricsCollector.getMetricsJSON() });
  });

  // GET /api/metrics/summary — human-readable summary
  router.get('/metrics/summary', (_req, res) => {
    res.json({ ok: true, ...metricsCollector.getMetricsSummary() });
  });

  // POST /api/metrics/demo — seed demo metrics
  router.post('/metrics/demo', (_req, res) => {
    metricsCollector.seedDemoMetrics();
    res.json({ ok: true, message: 'Demo metrics seeded', summary: metricsCollector.getMetricsSummary() });
  });

  // POST /api/metrics/reset — reset all metrics
  router.post('/metrics/reset', (_req, res) => {
    metricsCollector.reset();
    res.json({ ok: true, message: 'All metrics reset' });
  });

  logger.info('Metrics routes mounted at /api/metrics/*');
}

/**
 * SelfSustainingService — agent economics and cost tracking.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SelfSustainingService } from '../services/self-sustaining.service.js';

describe('SelfSustainingService', () => {
  let service: SelfSustainingService;
  const originalFetch = globalThis.fetch;

  before(() => {
    // Mock fetch to avoid real API calls
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ result: '0x3b9aca00' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;
    service = new SelfSustainingService();
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  it('recordCost records a compute cost', () => {
    service.recordCost({ type: 'llm_inference', amount: 0.003, description: 'Test LLM call' });
    const metrics = service.getMetrics();
    assert.ok(metrics.totalCosts >= 0.003);
  });

  it('recordRevenue records revenue', () => {
    service.recordRevenue({ type: 'tip_fee', amount: 0.01, description: 'Fee from tip' });
    const metrics = service.getMetrics();
    assert.ok(metrics.totalRevenue >= 0.01);
  });

  it('getMetrics returns sustainability metrics', () => {
    const metrics = service.getMetrics();
    assert.equal(typeof metrics.totalRevenue, 'number');
    assert.equal(typeof metrics.totalCosts, 'number');
    assert.equal(typeof metrics.netProfit, 'number');
    assert.equal(typeof metrics.selfSustaining, 'boolean');
    assert.equal(typeof metrics.sustainabilityScore, 'number');
  });

  it('getOptimizations returns cost optimization suggestions', () => {
    const opts = service.getOptimizations();
    assert.ok(Array.isArray(opts));
  });
});

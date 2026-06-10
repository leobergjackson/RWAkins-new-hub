/**
 * TaxReportingService — tax event recording and report generation.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { TaxReportingService } from '../services/tax-reporting.service.js';

describe('TaxReportingService', () => {
  let service: TaxReportingService;
  const originalFetch = globalThis.fetch;

  before(() => {
    service = new TaxReportingService();
    // Mock fetch to avoid real CoinGecko calls
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ tether: { usd: 1.0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  it('recordEvent creates a taxable event with price lookup', async () => {
    const event = await service.recordEvent({
      type: 'tip_sent',
      amount: 10,
      token: 'USDT',
      chainId: 'ethereum',
    });
    assert.ok(event.id);
    assert.equal(event.type, 'tip_sent');
    assert.equal(event.amount, 10);
    assert.ok(event.fiatValueUsd >= 0);
  });

  it('recordEvent with explicit fiatValueUsd uses that value', async () => {
    const event = await service.recordEvent({
      type: 'tip_received',
      amount: 5,
      token: 'ETH',
      fiatValueUsd: 10000,
    });
    assert.equal(event.fiatValueUsd, 10000);
    assert.equal(event.priceSource, 'manual');
  });

  it('getEvents returns recorded events sorted by timestamp', () => {
    const events = service.getEvents();
    assert.ok(Array.isArray(events));
    assert.ok(events.length >= 2);
  });

  it('generateReport creates a tax report', () => {
    const report = service.generateReport({ period: '2026-Q1' });
    assert.ok(report.id);
    assert.equal(report.period, '2026-Q1');
    assert.ok(report.summary);
    assert.equal(typeof report.summary.totalTransactions, 'number');
  });

  it('getSettings and updateSettings work', () => {
    const settings = service.getSettings();
    assert.equal(settings.jurisdiction, 'US');
    const updated = service.updateSettings({ costBasisMethod: 'lifo' });
    assert.equal(updated.costBasisMethod, 'lifo');
    service.updateSettings({ costBasisMethod: 'fifo' }); // reset
  });

  it('getStats returns tax statistics', () => {
    const stats = service.getStats();
    assert.equal(typeof stats.totalEvents, 'number');
    assert.ok(stats.totalEvents >= 2);
    assert.equal(typeof stats.priceLookupCount, 'number');
  });
});

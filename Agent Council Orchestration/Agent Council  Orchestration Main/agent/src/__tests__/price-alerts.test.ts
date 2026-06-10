/**
 * PriceAlertsService — price alerts and portfolio tracking.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PriceAlertsService } from '../services/price-alerts.service.js';

describe('PriceAlertsService', () => {
  let service: PriceAlertsService;
  const originalFetch = globalThis.fetch;

  before(() => {
    // Mock fetch to avoid real CoinGecko calls
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({
        bitcoin: { usd: 85000, usd_24h_change: 2.5, usd_1h_change: 0.1, usd_24h_vol: 5e9, usd_market_cap: 1.7e12 },
        ethereum: { usd: 3200, usd_24h_change: 1.2, usd_1h_change: -0.3, usd_24h_vol: 2e9, usd_market_cap: 4e11 },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;
    service = new PriceAlertsService();
  });

  after(() => {
    service.destroy();
    globalThis.fetch = originalFetch;
  });

  it('createAlert creates a price alert', () => {
    const alert = service.createAlert({
      userId: 'user1',
      token: 'BTC',
      condition: 'above',
      threshold: 100000,
      channel: 'in_app',
      channelTarget: 'user1',
    });
    assert.ok(alert.id);
    assert.equal(alert.token, 'BTC');
    assert.equal(alert.status, 'active');
    assert.equal(alert.condition, 'above');
  });

  it('listAlerts returns all alerts', () => {
    const alerts = service.listAlerts();
    assert.ok(Array.isArray(alerts));
    assert.ok(alerts.length >= 1);
  });

  it('deleteAlert removes an alert', () => {
    const alert = service.createAlert({
      userId: 'user2',
      token: 'ETH',
      condition: 'below',
      threshold: 2000,
      channel: 'in_app',
      channelTarget: 'user2',
    });
    const result = service.deleteAlert(alert.id);
    assert.equal(result.success, true);
  });

  it('getStats returns alert statistics', () => {
    const stats = service.getStats();
    assert.equal(typeof stats.totalAlerts, 'number');
    assert.equal(typeof stats.activeAlerts, 'number');
    assert.equal(typeof stats.fetchCount, 'number');
    assert.ok(stats.dataSource.includes('coingecko'));
  });
});

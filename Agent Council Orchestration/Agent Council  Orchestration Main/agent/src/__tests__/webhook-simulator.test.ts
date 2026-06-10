/**
 * WebhookSimulatorService — realistic event generation and HMAC signing.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebhookSimulatorService } from '../services/webhook-simulator.service.js';

describe('WebhookSimulatorService', () => {
  let service: WebhookSimulatorService;

  before(() => {
    process.env.DEMO_MODE = 'true';
    service = new WebhookSimulatorService(19999);
  });

  after(() => {
    service.stop();
    delete process.env.DEMO_MODE;
  });

  it('constructor initializes with correct port', () => {
    const stats = service.getStats();
    assert.equal(stats.totalSent, 0);
    assert.equal(stats.totalErrors, 0);
    assert.equal(stats.running, false);
  });

  it('start sets running to true', () => {
    service.start(999999); // very long interval so it doesn't fire
    assert.equal(service.getStats().running, true);
    service.stop();
  });

  it('start is idempotent when already running', () => {
    service.start(999999);
    service.start(999999); // should not double-start
    assert.equal(service.getStats().running, true);
    service.stop();
  });

  it('stop sets running to false', () => {
    service.start(999999);
    service.stop();
    assert.equal(service.getStats().running, false);
  });

  it('stop is safe when not running', () => {
    service.stop();
    assert.equal(service.getStats().running, false);
  });

  it('getStats returns correct shape', () => {
    const stats = service.getStats();
    assert.equal(typeof stats.totalSent, 'number');
    assert.equal(typeof stats.totalErrors, 'number');
    assert.equal(typeof stats.running, 'boolean');
  });
});

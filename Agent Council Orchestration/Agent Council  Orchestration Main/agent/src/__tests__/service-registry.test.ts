/**
 * ServiceRegistry — Singleton service registry tests.
 * Tests getInstance, service getters, and wallet-dependent services.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ServiceRegistry } from '../services/service-registry.js';

describe('ServiceRegistry', () => {
  // ── Singleton ──

  describe('getInstance()', () => {
    it('returns a ServiceRegistry instance', () => {
      const sr = ServiceRegistry.getInstance();
      assert.ok(sr);
    });

    it('returns the same instance on repeated calls', () => {
      const sr1 = ServiceRegistry.getInstance();
      const sr2 = ServiceRegistry.getInstance();
      assert.equal(sr1, sr2, 'Should return same singleton');
    });
  });

  // ── Zero-arg service getters ──

  describe('Zero-arg service getters', () => {
    const sr = ServiceRegistry.getInstance();

    it('wallet getter returns instance', () => {
      assert.ok(sr.wallet, 'wallet should be instantiated');
    });

    it('ai getter returns instance', () => {
      assert.ok(sr.ai, 'ai should be instantiated');
    });

    it('contacts getter returns instance', () => {
      assert.ok(sr.contacts, 'contacts should be instantiated');
    });

    it('personality getter returns instance', () => {
      assert.ok(sr.personality, 'personality should be instantiated');
    });

    it('orchestrator getter returns instance', () => {
      assert.ok(sr.orchestrator, 'orchestrator should be instantiated');
    });

    it('treasury getter returns instance', () => {
      assert.ok(sr.treasury, 'treasury should be instantiated');
    });

    it('memory getter returns instance', () => {
      assert.ok(sr.memory, 'memory should be instantiated');
    });

    it('rumble getter returns instance', () => {
      assert.ok(sr.rumble, 'rumble should be instantiated');
    });
  });

  // ── Wallet-dependent getters ──

  describe('Wallet-dependent getters', () => {
    const sr = ServiceRegistry.getInstance();

    it('streaming returns null before initialize', () => {
      // streaming requires wallet, returns null before initialize()
      const streaming = sr.streaming;
      assert.equal(streaming, null, 'streaming should be null before wallet init');
    });

    it('autonomousLoop returns null before initialize', () => {
      const loop = sr.autonomousLoop;
      assert.equal(loop, null, 'autonomousLoop should be null before wallet init');
    });

    it('walletOps is eagerly created (not null)', () => {
      const ops = sr.walletOps;
      assert.ok(ops, 'walletOps should be eagerly created');
    });
  });
});

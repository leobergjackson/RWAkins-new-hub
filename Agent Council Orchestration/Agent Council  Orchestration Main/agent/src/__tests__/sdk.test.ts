/**
 * Comprehensive SDK tests — AeroFytaSDKError, validation, HookRegistry,
 * Presets, Chain Adapters, and agent factory.
 *
 * Tests core SDK primitives WITHOUT requiring WDK initialization or
 * network access. Covers 25+ test cases.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  AeroFytaSDKError,
  validateNonEmptyString,
  validatePositiveAmount,
  validateChainId,
} from '../sdk/errors.js';
import { HookRegistry } from '../sdk/hooks.js';
import type { TipEventData, BlockEventData, AnomalyEventData } from '../sdk/hooks.js';
import { PRESETS, listPresets } from '../sdk/presets.js';
import { EVMAdapter, TONAdapter, TronAdapter, UniversalAdapter } from '../sdk/adapters/index.js';
import type { WDKAccount } from '../sdk/adapters/index.js';
import { withRetry } from '../sdk/retry.js';
import { RateLimiter } from '../sdk/middleware.js';

// ── AeroFytaSDKError ──────────────────────────────────────────────────

describe('AeroFytaSDKError', () => {
  test('has correct name and code', () => {
    const err = new AeroFytaSDKError('bad input', 'INVALID_RECIPIENT', 'tip');
    assert.equal(err.name, 'AeroFytaSDKError');
    assert.equal(err.code, 'INVALID_RECIPIENT');
    assert.equal(err.method, 'tip');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof AeroFytaSDKError);
  });

  test('includes method in message', () => {
    const err = new AeroFytaSDKError('amount too low', 'AMOUNT_TOO_LOW', 'escrow.create');
    assert.ok(err.message.includes('escrow.create'));
    assert.ok(err.message.includes('amount too low'));
    assert.ok(err.message.includes('[AeroFyta SDK]'));
  });

  test('carries optional details', () => {
    const err = new AeroFytaSDKError('test', 'TEST', 'test', { foo: 42 });
    assert.deepEqual(err.details, { foo: 42 });
  });

  test('details is undefined when not provided', () => {
    const err = new AeroFytaSDKError('test', 'TEST', 'test');
    assert.equal(err.details, undefined);
  });
});

// ── Input Validation Helpers ──────────────────────────────────────────

describe('validateNonEmptyString', () => {
  test('passes for valid non-empty strings', () => {
    assert.doesNotThrow(() => validateNonEmptyString('hello', 'param', 'test'));
    assert.doesNotThrow(() => validateNonEmptyString('0xabc', 'address', 'tip'));
  });

  test('throws for empty string', () => {
    assert.throws(
      () => validateNonEmptyString('', 'recipient', 'tip'),
      (err: unknown) => err instanceof AeroFytaSDKError && err.code === 'INVALID_RECIPIENT',
    );
  });

  test('throws for whitespace-only string', () => {
    assert.throws(
      () => validateNonEmptyString('   ', 'recipient', 'tip'),
      (err: unknown) => err instanceof AeroFytaSDKError,
    );
  });

  test('throws for non-string values', () => {
    assert.throws(
      () => validateNonEmptyString(42 as unknown as string, 'amount', 'tip'),
      (err: unknown) => err instanceof AeroFytaSDKError,
    );
    assert.throws(
      () => validateNonEmptyString(null as unknown as string, 'param', 'test'),
      (err: unknown) => err instanceof AeroFytaSDKError,
    );
    assert.throws(
      () => validateNonEmptyString(undefined as unknown as string, 'param', 'test'),
      (err: unknown) => err instanceof AeroFytaSDKError,
    );
  });
});

describe('validatePositiveAmount', () => {
  test('passes for positive finite numbers', () => {
    assert.doesNotThrow(() => validatePositiveAmount(0.01, 'amount', 'tip'));
    assert.doesNotThrow(() => validatePositiveAmount(100, 'amount', 'tip'));
    assert.doesNotThrow(() => validatePositiveAmount(0.000001, 'amount', 'tip'));
  });

  test('rejects negative amount', () => {
    assert.throws(
      () => validatePositiveAmount(-1, 'amount', 'tip'),
      (err: unknown) => err instanceof AeroFytaSDKError && err.code === 'AMOUNT_NEGATIVE',
    );
  });

  test('rejects zero', () => {
    assert.throws(
      () => validatePositiveAmount(0, 'amount', 'tip'),
      (err: unknown) => err instanceof AeroFytaSDKError && err.code === 'AMOUNT_ZERO',
    );
  });

  test('rejects NaN', () => {
    assert.throws(
      () => validatePositiveAmount(NaN, 'amount', 'tip'),
      (err: unknown) => err instanceof AeroFytaSDKError && err.code === 'INVALID_AMOUNT',
    );
  });

  test('rejects Infinity', () => {
    assert.throws(
      () => validatePositiveAmount(Infinity, 'amount', 'tip'),
      (err: unknown) => err instanceof AeroFytaSDKError && err.code === 'INVALID_AMOUNT',
    );
    assert.throws(
      () => validatePositiveAmount(-Infinity, 'amount', 'tip'),
      (err: unknown) => err instanceof AeroFytaSDKError,
    );
  });

  test('rejects non-number types', () => {
    assert.throws(
      () => validatePositiveAmount('10' as unknown as number, 'amount', 'tip'),
      (err: unknown) => err instanceof AeroFytaSDKError,
    );
  });
});

describe('validateChainId', () => {
  test('passes for valid chain IDs', () => {
    assert.doesNotThrow(() => validateChainId('ethereum-sepolia', 'tip'));
    assert.doesNotThrow(() => validateChainId('ton-testnet', 'tip'));
    assert.doesNotThrow(() => validateChainId('tron-nile', 'tip'));
    assert.doesNotThrow(() => validateChainId('bitcoin-testnet', 'tip'));
    assert.doesNotThrow(() => validateChainId('solana-devnet', 'tip'));
  });

  test('passes for undefined (optional chain)', () => {
    assert.doesNotThrow(() => validateChainId(undefined, 'tip'));
    assert.doesNotThrow(() => validateChainId(null, 'tip'));
  });

  test('rejects invalid chain IDs', () => {
    assert.throws(
      () => validateChainId('invalid-chain', 'tip'),
      (err: unknown) => err instanceof AeroFytaSDKError && err.code === 'INVALID_CHAIN',
    );
  });
});

// ── HookRegistry ───────────────────────────────────────────────────────

describe('HookRegistry', () => {
  test('registers and fires hooks', async () => {
    const hooks = new HookRegistry();
    let fired = false;
    hooks.on('afterTip', () => { fired = true; });
    await hooks.emit('afterTip', { recipient: '0x', amount: 1, chain: 'ethereum-sepolia' });
    assert.ok(fired);
  });

  test('removes hooks with off()', async () => {
    const hooks = new HookRegistry();
    let count = 0;
    const handler = () => { count++; };
    hooks.on('afterTip', handler);
    await hooks.emit('afterTip', {});
    assert.equal(count, 1);
    hooks.off('afterTip', handler);
    await hooks.emit('afterTip', {});
    assert.equal(count, 1); // unchanged
  });

  test('catches hook errors without crashing', async () => {
    const hooks = new HookRegistry();
    hooks.on('afterTip', () => { throw new Error('boom'); });
    // Should not throw
    await hooks.emit('afterTip', {});
  });

  test('fires multiple handlers in order', async () => {
    const hooks = new HookRegistry();
    const order: number[] = [];
    hooks.on('beforeTip', () => { order.push(1); });
    hooks.on('beforeTip', () => { order.push(2); });
    hooks.on('beforeTip', () => { order.push(3); });
    await hooks.emit('beforeTip', {});
    assert.deepEqual(order, [1, 2, 3]);
  });

  test('onTip convenience works', async () => {
    const hooks = new HookRegistry();
    let captured: TipEventData | null = null;
    hooks.onTip((tip) => { captured = tip; });
    const data = { recipient: '0xabc', amount: 0.5, chain: 'eth', txHash: '0x123' };
    await hooks.emit('afterTip', data);
    assert.deepEqual(captured, data);
  });

  test('onBlock convenience works', async () => {
    const hooks = new HookRegistry();
    let captured: BlockEventData | null = null;
    hooks.onBlock((block) => { captured = block; });
    const data = { reason: 'over limit', policy: 'daily-cap', amount: 100 };
    await hooks.emit('tipBlocked', data);
    assert.deepEqual(captured, data);
  });

  test('onAnomaly convenience works', async () => {
    const hooks = new HookRegistry();
    let captured: AnomalyEventData | null = null;
    hooks.onAnomaly((anomaly) => { captured = anomaly; });
    const data = { amount: 999, zScore: 4.5, severity: 'critical' };
    await hooks.emit('anomalyDetected', data);
    assert.deepEqual(captured, data);
  });

  test('listenerCount returns correct count', () => {
    const hooks = new HookRegistry();
    assert.equal(hooks.listenerCount('afterTip'), 0);
    hooks.on('afterTip', () => {});
    hooks.on('afterTip', () => {});
    assert.equal(hooks.listenerCount('afterTip'), 2);
  });

  test('clear removes all handlers for an event', () => {
    const hooks = new HookRegistry();
    hooks.on('afterTip', () => {});
    hooks.on('beforeTip', () => {});
    hooks.clear('afterTip');
    assert.equal(hooks.listenerCount('afterTip'), 0);
    assert.equal(hooks.listenerCount('beforeTip'), 1);
  });

  test('clear without arg removes everything', () => {
    const hooks = new HookRegistry();
    hooks.on('afterTip', () => {});
    hooks.on('beforeTip', () => {});
    hooks.clear();
    assert.equal(hooks.listenerCount('afterTip'), 0);
    assert.equal(hooks.listenerCount('beforeTip'), 0);
  });
});

// ── Presets ──────────────────────────────────────────────────────────

describe('Presets', () => {
  test('tipBot preset has correct defaults', () => {
    const preset = PRESETS.tipBot;
    assert.equal(preset.name, 'Tip Bot');
    assert.equal(preset.config.autonomousLoop, true);
    assert.equal(preset.config.safetyLimits?.maxSingleTip, 1);
    assert.equal(preset.config.safetyLimits?.maxDailySpend, 10);
  });

  test('treasuryManager preset has strict safety', () => {
    const preset = PRESETS.treasuryManager;
    assert.equal(preset.name, 'Treasury Manager');
    assert.ok((preset.config.safetyLimits?.requireConfirmationAbove ?? 0) >= 50);
  });

  test('listPresets returns all 5', () => {
    const presets = listPresets();
    assert.equal(presets.length, 5);
    const ids = presets.map(p => p.id);
    assert.ok(ids.includes('tipBot'));
    assert.ok(ids.includes('treasuryManager'));
    assert.ok(ids.includes('escrowAgent'));
    assert.ok(ids.includes('paymentProcessor'));
    assert.ok(ids.includes('advisor'));
  });

  test('advisor preset has zero spend limits', () => {
    const preset = PRESETS.advisor;
    assert.equal(preset.config.safetyLimits?.maxSingleTip, 0);
    assert.equal(preset.config.safetyLimits?.maxDailySpend, 0);
    assert.equal(preset.config.autonomousLoop, false);
  });

  test('each preset has features array', () => {
    for (const [_name, preset] of Object.entries(PRESETS)) {
      assert.ok(Array.isArray(preset.features));
      assert.ok(preset.features.length > 0);
    }
  });
});

// ── Chain Adapters ──────────────────────────────────────────────────

describe('Chain Adapters', () => {
  const mockAccount: WDKAccount = {
    getAddress: () => '0xTEST_ADDRESS',
    getBalance: async () => ({ native: '1.5', usdt: '100.0' }),
  };

  test('EVMAdapter creates valid interface', () => {
    const wallet = EVMAdapter.fromWDKAccount(mockAccount);
    assert.equal(wallet.chainId, 'ethereum-sepolia');
    assert.equal(wallet.getAddress(), '0xTEST_ADDRESS');
    assert.ok(wallet.chainName.length > 0);
  });

  test('TONAdapter creates valid interface', () => {
    const wallet = TONAdapter.fromWDKAccount(mockAccount, 'ton-testnet');
    assert.equal(wallet.chainId, 'ton-testnet');
    assert.equal(wallet.chainName, 'TON');
    assert.equal(wallet.getAddress(), '0xTEST_ADDRESS');
  });

  test('TronAdapter creates valid interface', () => {
    const wallet = TronAdapter.fromWDKAccount(mockAccount, 'tron-nile');
    assert.equal(wallet.chainId, 'tron-nile');
    assert.equal(wallet.chainName, 'Tron');
  });

  test('UniversalAdapter detects ethereum chain', () => {
    const wallet = UniversalAdapter.fromWDKAccount(mockAccount, 'ethereum-sepolia');
    assert.equal(wallet.chainId, 'ethereum-sepolia');
  });

  test('UniversalAdapter detects ton chain', () => {
    const wallet = UniversalAdapter.fromWDKAccount(mockAccount, 'ton-testnet');
    assert.equal(wallet.chainId, 'ton-testnet');
    assert.equal(wallet.chainName, 'TON');
  });

  test('UniversalAdapter detects tron chain', () => {
    const wallet = UniversalAdapter.fromWDKAccount(mockAccount, 'tron-nile');
    assert.equal(wallet.chainId, 'tron-nile');
    assert.equal(wallet.chainName, 'Tron');
  });

  test('UniversalAdapter defaults to EVM for unknown chains', () => {
    const wallet = UniversalAdapter.fromWDKAccount(mockAccount, 'custom-chain');
    assert.equal(wallet.chainId, 'custom-chain');
  });

  test('adapter getBalance resolves correctly', async () => {
    const wallet = EVMAdapter.fromWDKAccount(mockAccount);
    const balance = await wallet.getBalance();
    assert.equal(balance.native, '1.5');
    assert.equal(balance.usdt, '100.0');
  });

  test('getSupportedChains returns list', () => {
    const chains = UniversalAdapter.getSupportedChains();
    assert.ok(chains.length > 0);
    assert.ok(chains.includes('ethereum-sepolia'));
    assert.ok(chains.includes('ton-testnet'));
    assert.ok(chains.includes('tron-nile'));
  });
});

// ── Retry Utility ───────────────────────────────────────────────────

describe('withRetry', () => {
  test('returns result on first success', async () => {
    const result = await withRetry(async () => 42, 3, 'test');
    assert.equal(result, 42);
  });

  test('retries on failure and eventually succeeds', async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) throw new Error('transient');
      return 'ok';
    }, 3, 'test');
    assert.equal(result, 'ok');
    assert.equal(attempts, 3);
  });

  test('throws after exhausting retries', async () => {
    await assert.rejects(
      () => withRetry(async () => { throw new Error('permanent'); }, 1, 'test'),
      { message: 'permanent' },
    );
  });
});

// ── RateLimiter ─────────────────────────────────────────────────────

describe('RateLimiter', () => {
  test('allows requests under the limit', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
    for (let i = 0; i < 5; i++) {
      const result = limiter.consume('127.0.0.1');
      assert.ok(result.allowed);
    }
  });

  test('blocks requests over the limit', () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 });
    limiter.consume('127.0.0.1');
    limiter.consume('127.0.0.1');
    limiter.consume('127.0.0.1');
    const result = limiter.consume('127.0.0.1');
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
  });

  test('tracks IPs independently', () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });
    limiter.consume('1.1.1.1');
    limiter.consume('1.1.1.1');
    const blocked = limiter.consume('1.1.1.1');
    assert.equal(blocked.allowed, false);

    // Different IP should still be allowed
    const otherIp = limiter.consume('2.2.2.2');
    assert.ok(otherIp.allowed);
  });

  test('returns remaining count', () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });
    const r1 = limiter.consume('x');
    assert.equal(r1.remaining, 9);
    const r2 = limiter.consume('x');
    assert.equal(r2.remaining, 8);
  });

  test('cleanup removes expired entries', () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 1 });
    limiter.consume('expired-ip');
    // After a tiny delay the window will have expired
    setTimeout(() => {
      limiter.cleanup();
      // Next consume should be treated as first request
      const result = limiter.consume('expired-ip');
      assert.equal(result.remaining, 9);
    }, 10);
  });
});

// ── createAeroFytaAgent (config validation only — no WDK) ──────────

describe('createAeroFytaAgent config validation', () => {
  // We import the factory but only test that config validation fires
  // before WDK initialization (which requires a real seed).

  test('throws AeroFytaSDKError on empty seed', async () => {
    const { createAeroFytaAgent } = await import('../sdk/create-agent.js');
    await assert.rejects(
      () => createAeroFytaAgent({ seed: '' }),
      (err: unknown) => err instanceof AeroFytaSDKError && err.code === 'INVALID_SEED',
    );
  });

  test('throws AeroFytaSDKError on whitespace seed', async () => {
    const { createAeroFytaAgent } = await import('../sdk/create-agent.js');
    await assert.rejects(
      () => createAeroFytaAgent({ seed: '   ' }),
      (err: unknown) => err instanceof AeroFytaSDKError && err.code === 'INVALID_SEED',
    );
  });
});

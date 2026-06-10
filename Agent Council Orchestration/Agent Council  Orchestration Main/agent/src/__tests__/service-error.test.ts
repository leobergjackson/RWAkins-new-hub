/**
 * ServiceError — Structured error handling tests.
 * Tests constructor, toJSON, and all factory functions.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ServiceError,
  insufficientBalance,
  wdkTimeout,
  chainUnavailable,
  validationFailed,
  rateLimited,
} from '../utils/service-error.js';

describe('ServiceError', () => {
  // ── Constructor ──

  describe('constructor', () => {
    it('sets all fields correctly', () => {
      const err = new ServiceError('Test error', 'TEST_CODE', 'TestService', 400, { key: 'val' }, true);
      assert.equal(err.message, 'Test error');
      assert.equal(err.code, 'TEST_CODE');
      assert.equal(err.service, 'TestService');
      assert.equal(err.statusCode, 400);
      assert.deepEqual(err.details, { key: 'val' });
      assert.equal(err.retryable, true);
      assert.equal(err.name, 'ServiceError');
    });

    it('defaults statusCode to 500', () => {
      const err = new ServiceError('msg', 'CODE', 'Svc');
      assert.equal(err.statusCode, 500);
    });

    it('defaults retryable to false', () => {
      const err = new ServiceError('msg', 'CODE', 'Svc');
      assert.equal(err.retryable, false);
    });

    it('is an instance of Error', () => {
      const err = new ServiceError('msg', 'CODE', 'Svc');
      assert.ok(err instanceof Error);
    });

    it('is an instance of ServiceError', () => {
      const err = new ServiceError('msg', 'CODE', 'Svc');
      assert.ok(err instanceof ServiceError);
    });
  });

  // ── toJSON ──

  describe('toJSON()', () => {
    it('returns structured object', () => {
      const err = new ServiceError('Test', 'CODE', 'Svc', 404, { a: 1 }, true);
      const json = err.toJSON();
      assert.equal(json.error, 'Test');
      assert.equal(json.code, 'CODE');
      assert.equal(json.service, 'Svc');
      assert.equal(json.statusCode, 404);
      assert.deepEqual(json.details, { a: 1 });
      assert.equal(json.retryable, true);
    });

    it('returns undefined details when not provided', () => {
      const err = new ServiceError('Test', 'CODE', 'Svc');
      const json = err.toJSON();
      assert.equal(json.details, undefined);
    });
  });

  // ── insufficientBalance ──

  describe('insufficientBalance()', () => {
    it('creates correct error', () => {
      const err = insufficientBalance('WalletService', { needed: 10, available: 5 });
      assert.equal(err.code, 'INSUFFICIENT_BALANCE');
      assert.equal(err.service, 'WalletService');
      assert.equal(err.statusCode, 400);
      assert.equal(err.retryable, false);
      assert.ok(err.message.includes('Insufficient'));
      assert.deepEqual(err.details, { needed: 10, available: 5 });
    });
  });

  // ── wdkTimeout ──

  describe('wdkTimeout()', () => {
    it('creates correct error', () => {
      const err = wdkTimeout('BridgeService', { operation: 'quote' });
      assert.equal(err.code, 'WDK_TIMEOUT');
      assert.equal(err.service, 'BridgeService');
      assert.equal(err.statusCode, 504);
      assert.equal(err.retryable, true);
      assert.ok(err.message.includes('timed out'));
    });
  });

  // ── chainUnavailable ──

  describe('chainUnavailable()', () => {
    it('creates correct error with chain in details', () => {
      const err = chainUnavailable('WalletService', 'polygon', { reason: 'RPC down' });
      assert.equal(err.code, 'CHAIN_UNAVAILABLE');
      assert.equal(err.service, 'WalletService');
      assert.equal(err.statusCode, 503);
      assert.equal(err.retryable, true);
      assert.ok(err.message.includes('polygon'));
      assert.ok(err.details);
      assert.equal(err.details!.chain, 'polygon');
      assert.equal(err.details!.reason, 'RPC down');
    });
  });

  // ── validationFailed ──

  describe('validationFailed()', () => {
    it('creates correct error with field in details', () => {
      const err = validationFailed('EscrowService', 'escrowId', { provided: 'abc' });
      assert.equal(err.code, 'VALIDATION_FAILED');
      assert.equal(err.service, 'EscrowService');
      assert.equal(err.statusCode, 400);
      assert.equal(err.retryable, false);
      assert.ok(err.message.includes('escrowId'));
      assert.equal(err.details!.field, 'escrowId');
    });
  });

  // ── rateLimited ──

  describe('rateLimited()', () => {
    it('creates correct error', () => {
      const err = rateLimited('SafetyService', { policy: 'max_per_hour', limit: 10 });
      assert.equal(err.code, 'RATE_LIMITED');
      assert.equal(err.service, 'SafetyService');
      assert.equal(err.statusCode, 429);
      assert.equal(err.retryable, true);
      assert.ok(err.message.includes('Rate limit'));
    });
  });
});

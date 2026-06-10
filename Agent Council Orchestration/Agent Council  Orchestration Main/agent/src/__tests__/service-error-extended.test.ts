/**
 * Tests for ServiceError and error-handler middleware.
 * Pure function tests — no WDK required.
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
  it('creates with correct properties', () => {
    const err = new ServiceError('test msg', 'TEST_CODE', 'test-svc', 400, { key: 'val' }, true);
    assert.equal(err.message, 'test msg');
    assert.equal(err.code, 'TEST_CODE');
    assert.equal(err.service, 'test-svc');
    assert.equal(err.statusCode, 400);
    assert.deepEqual(err.details, { key: 'val' });
    assert.equal(err.retryable, true);
    assert.equal(err.name, 'ServiceError');
  });

  it('toJSON includes all fields', () => {
    const err = new ServiceError('msg', 'CODE', 'svc', 500, undefined, false);
    const json = err.toJSON();
    assert.equal(json.error, 'msg');
    assert.equal(json.code, 'CODE');
    assert.equal(json.service, 'svc');
    assert.equal(json.statusCode, 500);
    assert.equal(json.retryable, false);
  });

  it('is instanceof Error', () => {
    const err = new ServiceError('msg', 'CODE', 'svc');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof ServiceError);
  });
});

describe('Factory functions', () => {
  it('insufficientBalance creates correct error', () => {
    const err = insufficientBalance('wallet', { needed: 100 });
    assert.equal(err.code, 'INSUFFICIENT_BALANCE');
    assert.equal(err.statusCode, 400);
    assert.equal(err.retryable, false);
    assert.equal(err.service, 'wallet');
  });

  it('wdkTimeout creates retryable error', () => {
    const err = wdkTimeout('bridge');
    assert.equal(err.code, 'WDK_TIMEOUT');
    assert.equal(err.statusCode, 504);
    assert.equal(err.retryable, true);
  });

  it('chainUnavailable includes chain in details', () => {
    const err = chainUnavailable('swap', 'polygon');
    assert.equal(err.code, 'CHAIN_UNAVAILABLE');
    assert.equal(err.statusCode, 503);
    assert.equal(err.retryable, true);
    assert.ok(err.message.includes('polygon'));
  });

  it('validationFailed includes field info', () => {
    const err = validationFailed('api', 'amount');
    assert.equal(err.code, 'VALIDATION_FAILED');
    assert.equal(err.statusCode, 400);
    assert.equal(err.retryable, false);
    assert.ok(err.message.includes('amount'));
  });

  it('rateLimited creates retryable 429 error', () => {
    const err = rateLimited('indexer');
    assert.equal(err.code, 'RATE_LIMITED');
    assert.equal(err.statusCode, 429);
    assert.equal(err.retryable, true);
  });
});

/**
 * X402Service — HTTP 402 payment protocol for agent commerce.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { X402Service } from '../services/x402.service.js';

describe('X402Service', () => {
  let service: X402Service;

  before(() => {
    service = new X402Service();
    service.setWalletAddress('0xTestWallet');
  });

  it('has default monetized endpoints registered', () => {
    const ep = service.requiresPayment('POST', '/api/predictions/generate');
    assert.ok(ep);
    assert.ok(ep!.pricePerRequest);
  });

  it('requiresPayment returns undefined for unregistered endpoints', () => {
    const ep = service.requiresPayment('GET', '/api/nonexistent');
    assert.equal(ep, undefined);
  });

  it('createPaymentRequirement generates a valid requirement', () => {
    const ep = service.requiresPayment('POST', '/api/predictions/generate');
    assert.ok(ep);
    const req = service.createPaymentRequirement(ep!, '/api/predictions/generate');
    assert.ok(req.id);
    assert.equal(req.token, 'usdt');
    assert.ok(req.expiresAt);
  });

  it('verifyPayment accepts valid proof', () => {
    const ep = service.requiresPayment('POST', '/api/predictions/generate');
    assert.ok(ep);
    const req = service.createPaymentRequirement(ep!, '/api/predictions/generate');
    const result = service.verifyPayment({
      requirementId: req.id,
      txHash: '0xproof123',
      chainId: 'ethereum-sepolia',
      amount: req.amount,
      payer: '0xPayer',
      paidAt: new Date().toISOString(),
    });
    assert.equal(result.verified, true);
  });

  it('verifyPayment rejects unknown requirement', () => {
    const result = service.verifyPayment({
      requirementId: 'nonexistent',
      txHash: '0xfake',
      chainId: 'ethereum',
      amount: '1',
      payer: '0x',
      paidAt: new Date().toISOString(),
    });
    assert.equal(result.verified, false);
  });

  it('getWalletAddress returns the set address', () => {
    assert.equal(service.getWalletAddress(), '0xTestWallet');
  });
});

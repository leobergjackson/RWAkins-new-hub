/**
 * Tests for ai-entities.ts — extractEntities.
 * Pure function tests — no WDK required.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractEntities } from '../services/ai-entities.js';

describe('extractEntities', () => {
  it('extracts dollar amounts', () => {
    const e = extractEntities('send $10 to alice');
    assert.ok(e.amounts.length >= 1);
    assert.equal(e.amounts[0].value, 10);
    assert.equal(e.amounts[0].currency, 'USD');
  });

  it('extracts USDT amounts', () => {
    const e = extractEntities('tip 5 USDT');
    assert.ok(e.amounts.some(a => a.value === 5 && a.currency === 'USDT'));
  });

  it('extracts ETH amounts', () => {
    const e = extractEntities('send 0.5 ETH');
    assert.ok(e.amounts.some(a => a.value === 0.5 && a.currency === 'ETH'));
  });

  it('extracts XAUT amounts', () => {
    const e = extractEntities('buy 2 xaut');
    assert.ok(e.amounts.some(a => a.value === 2 && a.currency === 'XAUT'));
  });

  it('extracts EVM address', () => {
    const e = extractEntities('to 0x1234567890abcdef1234567890abcdef12345678');
    assert.equal(e.addresses.length, 1);
    assert.equal(e.addresses[0].type, 'evm');
  });

  it('extracts TON address', () => {
    const addr = 'UQ' + 'a'.repeat(46);
    const e = extractEntities(`send to ${addr}`);
    assert.equal(e.addresses.length, 1);
    assert.equal(e.addresses[0].type, 'ton');
  });

  it('extracts TRON address', () => {
    const addr = 'T' + 'A'.repeat(33);
    const e = extractEntities(`send to ${addr}`);
    assert.equal(e.addresses.length, 1);
    assert.equal(e.addresses[0].type, 'tron');
  });

  it('extracts @mentions', () => {
    const e = extractEntities('tip @alice and @bob');
    assert.ok(e.creators.includes('alice'));
    assert.ok(e.creators.includes('bob'));
  });

  it('extracts chain names', () => {
    const e = extractEntities('send on ethereum');
    assert.ok(e.chains.includes('ethereum-sepolia'));
  });

  it('extracts token names', () => {
    const e = extractEntities('I want some usdt and eth');
    assert.ok(e.tokens.includes('USDT'));
    assert.ok(e.tokens.includes('ETH'));
  });

  it('handles empty input', () => {
    const e = extractEntities('');
    assert.equal(e.amounts.length, 0);
    assert.equal(e.addresses.length, 0);
    assert.equal(e.creators.length, 0);
  });

  it('handles garbage input', () => {
    const e = extractEntities('!@#$%^&*()');
    assert.equal(e.addresses.length, 0);
  });
});

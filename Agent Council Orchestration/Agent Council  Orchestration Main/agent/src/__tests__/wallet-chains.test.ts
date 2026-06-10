/**
 * Tests for wallet-chains.ts — CHAIN_CONFIGS, USDT_CONTRACTS,
 * USAT_CONTRACTS, XAUT_CONTRACTS.
 * Pure function tests — no WDK required.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CHAIN_CONFIGS, USDT_CONTRACTS, USAT_CONTRACTS, XAUT_CONTRACTS } from '../services/wallet-chains.js';

describe('CHAIN_CONFIGS', () => {
  it('has ethereum-sepolia entry', () => {
    assert.ok(CHAIN_CONFIGS['ethereum-sepolia']);
    assert.equal(CHAIN_CONFIGS['ethereum-sepolia'].blockchain, 'ethereum');
    assert.equal(CHAIN_CONFIGS['ethereum-sepolia'].isTestnet, true);
  });

  it('has ton-testnet entry', () => {
    assert.ok(CHAIN_CONFIGS['ton-testnet']);
    assert.equal(CHAIN_CONFIGS['ton-testnet'].nativeCurrency, 'TON');
  });

  it('has tron-nile entry', () => {
    assert.ok(CHAIN_CONFIGS['tron-nile']);
    assert.equal(CHAIN_CONFIGS['tron-nile'].nativeCurrency, 'TRX');
  });

  it('all chains have isTestnet defined', () => {
    for (const [_id, cfg] of Object.entries(CHAIN_CONFIGS)) {
      assert.equal(typeof cfg.isTestnet, 'boolean', `${cfg.id} should have isTestnet boolean`);
    }
  });
});

describe('Token contracts', () => {
  it('USDT_CONTRACTS has ethereum-sepolia', () => {
    assert.ok(USDT_CONTRACTS['ethereum-sepolia']);
    assert.ok(USDT_CONTRACTS['ethereum-sepolia'].startsWith('0x'));
  });

  it('USAT_CONTRACTS exists and has ethereum-sepolia', () => {
    assert.ok(USAT_CONTRACTS);
    assert.ok(USAT_CONTRACTS['ethereum-sepolia']);
    assert.ok(USAT_CONTRACTS['ethereum-sepolia'].startsWith('0x'));
  });

  it('XAUT_CONTRACTS exists and has ethereum-sepolia', () => {
    assert.ok(XAUT_CONTRACTS);
    assert.ok(XAUT_CONTRACTS['ethereum-sepolia']);
    assert.ok(XAUT_CONTRACTS['ethereum-sepolia'].startsWith('0x'));
  });
});

/**
 * Deep WalletService tests — non-WDK utility methods.
 * Tests formatBalance, parseAmount, getChainConfig, gasless status, etc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WalletService } from '../services/wallet.service.js';

describe('WalletService — getChainConfig', () => {
  it('returns config for ethereum-sepolia', () => {
    const ws = new WalletService();
    const cfg = ws.getChainConfig('ethereum-sepolia');
    assert.ok(cfg);
    assert.equal(cfg.blockchain, 'ethereum');
    assert.ok(cfg.name.toLowerCase().includes('sepolia') || cfg.name.toLowerCase().includes('ethereum'));
  });

  it('returns config for ton-testnet', () => {
    const ws = new WalletService();
    const cfg = ws.getChainConfig('ton-testnet');
    assert.ok(cfg);
    assert.equal(cfg.blockchain, 'ton');
  });

  it('returns config for tron-nile', () => {
    const ws = new WalletService();
    const cfg = ws.getChainConfig('tron-nile');
    assert.ok(cfg);
    assert.equal(cfg.blockchain, 'tron');
  });
});

describe('WalletService — getRegisteredChains', () => {
  it('returns empty array before initialization', () => {
    const ws = new WalletService();
    const chains = ws.getRegisteredChains();
    assert.ok(Array.isArray(chains));
    assert.equal(chains.length, 0);
  });
});

describe('WalletService — gasless status', () => {
  it('isGaslessAvailable returns false before init', () => {
    const ws = new WalletService();
    assert.equal(ws.isGaslessAvailable('evm'), false);
    assert.equal(ws.isGaslessAvailable('ton'), false);
    assert.equal(ws.isGaslessAvailable('any'), false);
  });

  it('getGaslessStatus returns status object', () => {
    const ws = new WalletService();
    const status = ws.getGaslessStatus();
    assert.ok(status.evmErc4337);
    assert.ok(status.tonGasless);
    assert.equal(status.evmErc4337.available, false);
    assert.equal(status.tonGasless.available, false);
    assert.equal(status.evmErc4337.chainId, 'ethereum-sepolia-gasless');
    assert.equal(status.tonGasless.chainId, 'ton-testnet-gasless');
  });
});

describe('WalletService — wallet index', () => {
  it('getActiveWalletIndex defaults to 0', () => {
    const ws = new WalletService();
    assert.equal(ws.getActiveWalletIndex(), 0);
  });

  it('setActiveWalletIndex sets and gets correctly', () => {
    const ws = new WalletService();
    ws.setActiveWalletIndex(3);
    assert.equal(ws.getActiveWalletIndex(), 3);
  });

  it('setActiveWalletIndex throws for negative index', () => {
    const ws = new WalletService();
    assert.throws(() => ws.setActiveWalletIndex(-1));
  });

  it('setActiveWalletIndex throws for non-integer', () => {
    const ws = new WalletService();
    assert.throws(() => ws.setActiveWalletIndex(1.5));
  });
});

describe('WalletService — getSeedPhrase', () => {
  it('returns empty string before init', () => {
    const ws = new WalletService();
    assert.equal(ws.getSeedPhrase(), '');
  });
});

describe('WalletService — updatePrices static', () => {
  it('updatePrices does not throw', () => {
    WalletService.updatePrices(3000, 3.0, 0.3);
    // No assertion needed, just ensure no throw
    assert.ok(true);
  });
});

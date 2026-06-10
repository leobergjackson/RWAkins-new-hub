/**
 * StreamingService — Tip Streaming Protocol tests.
 * Tests micro-payment accumulation, continuous streams, batch info, and stats.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingService } from '../services/streaming.service.js';

// Minimal mock WalletService
const mockWallet = {
  sendTransaction: async (_chainId: string, _recipient: string, _amount: string) => ({
    hash: '0xmocktxhash',
    fee: '0.001',
  }),
  getBalance: async () => '100',
  getAddress: async () => '0xmockaddr',
  getAllBalances: async () => [],
  initialized: true,
} as any;

describe('StreamingService', () => {
  let service: StreamingService;

  before(() => {
    service = new StreamingService(mockWallet);
  });

  after(() => {
    service.stopAll();
  });

  // ── accumulateMicroPayment ──

  describe('accumulateMicroPayment()', () => {
    it('accumulates payments for the same recipient', () => {
      const freshService = new StreamingService(mockWallet);
      freshService.accumulateMicroPayment('0xrecipient1', 0.001, 'usdt', 'ethereum-sepolia');
      freshService.accumulateMicroPayment('0xrecipient1', 0.002, 'usdt', 'ethereum-sepolia');
      const info = freshService.getPendingBatchInfo();
      assert.equal(info.recipients, 1);
      assert.ok(Math.abs(info.totalPending - 0.003) < 0.0001, `Expected ~0.003, got ${info.totalPending}`);
      freshService.stopAll();
    });

    it('tracks separate recipients independently', () => {
      const freshService = new StreamingService(mockWallet);
      freshService.accumulateMicroPayment('0xA', 0.01, 'usdt', 'ethereum-sepolia');
      freshService.accumulateMicroPayment('0xB', 0.02, 'usdt', 'ethereum-sepolia');
      const info = freshService.getPendingBatchInfo();
      assert.equal(info.recipients, 2);
      assert.ok(Math.abs(info.totalPending - 0.03) < 0.0001);
      freshService.stopAll();
    });
  });

  // ── getPendingBatchInfo ──

  describe('getPendingBatchInfo()', () => {
    it('returns zero when no pending payments', () => {
      const freshService = new StreamingService(mockWallet);
      const info = freshService.getPendingBatchInfo();
      assert.equal(info.recipients, 0);
      assert.equal(info.totalPending, 0);
      freshService.stopAll();
    });
  });

  // ── getStats ──

  describe('getStats()', () => {
    it('returns correct structure', () => {
      const stats = service.getStats();
      assert.equal(typeof stats.activeStreams, 'number');
      assert.equal(typeof stats.totalStreamsCreated, 'number');
      assert.equal(typeof stats.totalAmountStreamed, 'string');
      assert.equal(typeof stats.totalTransactionsSent, 'number');
      assert.equal(typeof stats.avgDurationSeconds, 'number');
      assert.ok(stats.batchSettlement);
      assert.equal(typeof stats.batchSettlement.pendingAmount, 'string');
      assert.equal(typeof stats.batchSettlement.pendingRecipients, 'number');
      assert.equal(typeof stats.batchSettlement.totalBatchesSettled, 'number');
      assert.equal(typeof stats.batchSettlement.totalBatchAmount, 'string');
    });

    it('starts with zero streams', () => {
      const freshService = new StreamingService(mockWallet);
      const stats = freshService.getStats();
      assert.equal(stats.activeStreams, 0);
      assert.equal(stats.totalStreamsCreated, 0);
      freshService.stopAll();
    });
  });

  // ── getContinuousStreams ──

  describe('getContinuousStreams()', () => {
    it('returns empty array initially', () => {
      const freshService = new StreamingService(mockWallet);
      const streams = freshService.getContinuousStreams();
      assert.ok(Array.isArray(streams));
      assert.equal(streams.length, 0);
      freshService.stopAll();
    });
  });

  // ── startStream / stopStream ──

  describe('Stream lifecycle', () => {
    it('startStream creates an active stream', () => {
      const freshService = new StreamingService(mockWallet);
      const stream = freshService.startStream({
        recipient: '0xrecipient',
        amountPerTick: '0.001',
        intervalSeconds: 60,
        token: 'usdt',
        chainId: 'ethereum-sepolia',
      });
      assert.ok(stream.id);
      assert.equal(stream.status, 'active');
      assert.equal(stream.totalStreamed, '0');
      assert.equal(stream.totalTransactions, 0);
      freshService.stopAll();
    });

    it('stopStream moves stream to history', () => {
      const freshService = new StreamingService(mockWallet);
      const stream = freshService.startStream({
        recipient: '0xrecipient',
        amountPerTick: '0.001',
        intervalSeconds: 60,
        token: 'usdt',
        chainId: 'ethereum-sepolia',
      });
      const stopped = freshService.stopStream(stream.id);
      assert.ok(stopped);
      assert.equal(stopped!.status, 'stopped');
      // Stream should be moved to history, not in active list
      const active = freshService.getActiveStreams();
      assert.ok(!active.some(s => s.id === stream.id));
      freshService.stopAll();
    });

    it('pauseStream pauses an active stream', () => {
      const freshService = new StreamingService(mockWallet);
      const stream = freshService.startStream({
        recipient: '0xrecipient',
        amountPerTick: '0.001',
        intervalSeconds: 60,
        token: 'usdt',
        chainId: 'ethereum-sepolia',
      });
      const paused = freshService.pauseStream(stream.id);
      assert.ok(paused);
      assert.equal(paused!.status, 'paused');
      freshService.stopAll();
    });
  });
});

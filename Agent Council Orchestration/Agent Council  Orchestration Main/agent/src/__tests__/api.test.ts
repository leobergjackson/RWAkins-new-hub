/**
 * API endpoint tests — using Node built-in test runner + native http.
 * Spins up an Express server with lightweight mocks on a random port,
 * then tests key endpoints.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
// Import ServiceRegistry first so it's initialized before api.ts module-level code runs
import { ServiceRegistry } from '../services/service-registry.js';
// Ensure singleton exists before createApiRouter is imported
ServiceRegistry.getInstance();
import { createApiRouter } from '../routes/api.js';

// ── Lightweight mock services ────────────────────────────────

function createMockAgent(): any {
  return {
    getState: () => ({ status: 'idle' }),
    onStateChange: () => () => {},
    getHistory: () => [],
    getStats: () => ({
      totalTips: 0,
      totalAmount: '0',
      totalFeesSaved: '0',
      avgTipAmount: '0',
      chainDistribution: {},
      tipsByDay: [],
      tipsByChain: {},
      tipsByToken: {},
      averageConfirmationTime: 0,
      totalFeePaid: '0',
      totalFeeSaved: '0',
      successRate: 0,
    }),
    getLeaderboard: () => [],
    getAchievements: () => [],
    executeTip: async () => ({ status: 'failed', error: 'mock' }),
    getActivityLog: () => [],
    onActivity: () => () => {},
    getScheduledTips: () => [],
    scheduleTip: () => ({ id: 'mock' }),
    cancelScheduledTip: () => true,
    getConditions: () => [],
    addCondition: () => ({ id: 'mock' }),
    removeCondition: () => true,
    markNlpUsed: () => {},
    markScheduleUsed: () => {},
    markFeeOptimizerUsed: () => {},
    getReceipt: () => null,
    getTipResult: () => null,
    executeBatch: async () => ({ results: [] }),
    executeSplit: async () => ({ results: [], totalAmount: '0', successCount: 0, failureCount: 0 }),
    setWebhooksService: () => {},
    setReceiptService: () => {},
    setReputationService: () => {},
  };
}

function createMockWallet(): any {
  return {
    getRegisteredChains: () => ['ethereum-sepolia', 'ton-testnet'],
    getAllBalances: async () => [
      { chainId: 'ethereum-sepolia', balance: '1.0', symbol: 'ETH', address: '0x' + 'a'.repeat(40) },
      { chainId: 'ton-testnet', balance: '5.0', symbol: 'TON', address: 'UQ' + 'B'.repeat(46) },
    ],
    getAllAddresses: async () => ({
      'ethereum-sepolia': '0x' + 'a'.repeat(40),
      'ton-testnet': 'UQ' + 'B'.repeat(46),
    }),
    getAddress: async () => '0x' + 'a'.repeat(40),
    estimateAllFees: async () => [],
    getChainConfig: () => ({ id: 'ethereum-sepolia', name: 'Ethereum Sepolia', blockchain: 'ethereum', isTestnet: true, nativeCurrency: 'ETH' }),
    getGaslessStatus: () => ({ evmErc4337: { available: false }, tonGasless: { available: false } }),
    dispose: () => {},
    getDerivedWallets: () => [],
    setActiveWalletIndex: () => {},
  };
}

function createMockAi(): any {
  return {
    isAvailable: () => false,
    getProvider: () => 'rule-based',
    parseNaturalLanguageTip: async (input: string) => ({
      recipient: '',
      amount: '',
      token: 'native',
      confidence: 0,
      rawInput: input,
    }),
    classifyIntent: async () => ({ intent: 'unknown', params: {} }),
    generateReasoning: async () => 'mock reasoning',
  };
}

// ── Test helpers ─────────────────────────────────────────────

function request(
  port: number,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: raw });
          }
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Test suite ───────────────────────────────────────────────

describe('API endpoints', { timeout: 30_000 }, () => {
  let server: http.Server;
  let port: number;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', createApiRouter(
      createMockAgent(),
      createMockWallet(),
      createMockAi(),
    ));

    await new Promise<void>((resolve) => {
      // Listen on port 0 to get a random available port
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr !== null ? addr.port : 0;
        resolve();
      });
    });
  });

  after(() => {
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // ── Health endpoint ──────────────────────────────────────

  it('GET /api/health returns 200', async () => {
    const { status, data } = await request(port, 'GET', '/api/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
  });

  it('GET /api/health includes expected fields', async () => {
    const { data } = await request(port, 'GET', '/api/health');
    assert.ok('status' in data, 'should include status field');
    assert.ok('uptime' in data || 'timestamp' in data, 'should include uptime or timestamp field');
  });

  // ── Wallet balances ──────────────────────────────────────

  it('GET /api/wallet/balances returns data', async () => {
    const { status, data } = await request(port, 'GET', '/api/wallet/balances');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.balances), 'balances should be an array');
    assert.ok(data.balances.length > 0, 'balances should not be empty');
  });

  // ── Tip validation ───────────────────────────────────────

  it('POST /api/tip with missing fields returns 400', async () => {
    const { status, data } = await request(port, 'POST', '/api/tip', {});
    assert.equal(status, 400);
    assert.ok(data.error, 'should return an error message');
  });

  it('POST /api/tip with invalid address returns 400', async () => {
    const { status, data } = await request(port, 'POST', '/api/tip', {
      recipient: 'not-an-address',
      amount: '0.01',
    });
    assert.equal(status, 400);
    assert.ok(data.error.toLowerCase().includes('address') || data.error.toLowerCase().includes('invalid'),
      'error should mention address');
  });

  it('POST /api/tip with invalid amount returns 400', async () => {
    const { status, data } = await request(port, 'POST', '/api/tip', {
      recipient: '0x' + 'a'.repeat(40),
      amount: '-5',
    });
    assert.equal(status, 400);
    assert.ok(data.error.toLowerCase().includes('amount') || data.error.toLowerCase().includes('invalid'),
      'error should mention amount');
  });

  it('POST /api/tip with amount exceeding cap returns 400', async () => {
    const { status, data } = await request(port, 'POST', '/api/tip', {
      recipient: '0x' + 'a'.repeat(40),
      amount: '9999999',
    });
    assert.equal(status, 400);
    assert.ok(data.error, 'should return an error for amount over cap');
  });

  // ── Leaderboard ──────────────────────────────────────────

  it('GET /api/leaderboard returns an array', async () => {
    const { status, data } = await request(port, 'GET', '/api/leaderboard');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.leaderboard), 'leaderboard should be an array');
  });

  // ── Achievements ─────────────────────────────────────────

  it('GET /api/achievements returns an array', async () => {
    const { status, data } = await request(port, 'GET', '/api/achievements');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.achievements), 'achievements should be an array');
  });
});

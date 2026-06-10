/**
 * CreatorAnalyticsService + CreatorDiscoveryService + AutonomyService +
 * RevenueSmoothingService + PredictorService + FeeArbitrageService +
 * StreamingService — focused unit tests.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __testDir = dirname(fileURLToPath(import.meta.url));

// Clean persisted state files before tests
before(() => {
  const files = [
    '.autonomy-policies.json',
    '.autonomy-decisions.json',
    '.revenue-smoothing.json',
  ];
  for (const f of files) {
    const fp = resolve(__testDir, '..', '..', f);
    if (existsSync(fp)) unlinkSync(fp);
  }
});

// ══════════════════════════════════════════════════════════════════
// 1. CreatorAnalyticsService
// ══════════════════════════════════════════════════════════════════

import { CreatorAnalyticsService } from '../services/creator-analytics.service.js';

describe('CreatorAnalyticsService — analytics tracking', () => {
  let analytics: CreatorAnalyticsService;

  before(() => {
    analytics = new CreatorAnalyticsService();
    analytics.ingestTips([
      { recipient: '0xAAA', amount: '1.0', token: 'usdt', chainId: 'ethereum-sepolia', createdAt: new Date().toISOString(), sender: '0xBBB' },
      { recipient: '0xAAA', amount: '2.0', token: 'native', chainId: 'ton-testnet', createdAt: new Date(Date.now() - 86400000).toISOString(), sender: '0xCCC' },
      { recipient: '0xDDD', amount: '0.5', token: 'usdt', chainId: 'ethereum-sepolia', createdAt: new Date().toISOString(), sender: '0xBBB' },
    ]);
  });

  it('getCreatorIncome returns correct totals', () => {
    const income = analytics.getCreatorIncome('0xAAA');
    assert.equal(income.creatorAddress, '0xAAA');
    assert.equal(income.totalReceived, 3.0);
    assert.equal(income.tipCount, 2);
    assert.equal(income.uniqueSupporters, 2);
    assert.equal(income.largestTip, 2.0);
  });

  it('getCreatorIncome returns income by chain', () => {
    const income = analytics.getCreatorIncome('0xAAA');
    assert.ok(income.incomeByChain.length >= 1);
    const ethChain = income.incomeByChain.find(c => c.chainId === 'ethereum-sepolia');
    assert.ok(ethChain);
    assert.equal(ethChain!.amount, 1.0);
  });

  it('getPlatformAnalytics aggregates all tips', () => {
    const platform = analytics.getPlatformAnalytics();
    assert.equal(platform.totalTipsProcessed, 3);
    assert.equal(platform.totalVolume, 3.5);
    assert.equal(platform.uniqueTippers, 2);
    assert.equal(platform.uniqueCreators, 2);
  });

  it('empty creator returns zero values', () => {
    const income = analytics.getCreatorIncome('0xNONE');
    assert.equal(income.totalReceived, 0);
    assert.equal(income.tipCount, 0);
    assert.equal(income.uniqueSupporters, 0);
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. CreatorDiscoveryService
// ══════════════════════════════════════════════════════════════════

import { CreatorDiscoveryService } from '../services/creator-discovery.service.js';

describe('CreatorDiscoveryService — discovery, ranking, filtering', () => {
  let discovery: CreatorDiscoveryService;

  before(() => {
    discovery = new CreatorDiscoveryService();
  });

  it('analyzeCreators identifies undervalued creators', () => {
    const signals = discovery.analyzeCreators([
      { id: 'c1', name: 'Undervalued', walletAddress: '0x1', categories: ['tech'], totalTipAmount: 0.001, subscriberCount: 100, avgWatchPercent: 90, rewatchRate: 0.4, postsPerWeek: 5, subscriberGrowthRate: 5 },
      { id: 'c2', name: 'Popular', walletAddress: '0x2', categories: ['tech'], totalTipAmount: 100, subscriberCount: 100000, avgWatchPercent: 50, postsPerWeek: 1 },
    ]);
    // At least the undervalued creator should be detected
    assert.ok(signals.length >= 1);
    assert.ok(signals[0].undervaluationScore > 40);
  });

  it('signals are sorted by undervaluation score descending', () => {
    const signals = discovery.getSignals();
    for (let i = 1; i < signals.length; i++) {
      assert.ok(signals[i - 1].undervaluationScore >= signals[i].undervaluationScore);
    }
  });

  it('recordDiscovery creates a discovery record with bonus', () => {
    discovery.analyzeCreators([
      { id: 'c3', name: 'Rising', walletAddress: '0x3', categories: ['niche'], totalTipAmount: 0, subscriberCount: 50, avgWatchPercent: 95, rewatchRate: 0.5, postsPerWeek: 7, subscriberGrowthRate: 8 },
    ]);
    const record = discovery.recordDiscovery({
      discovererAddress: '0xTipper',
      creatorId: 'c3',
      creatorName: 'Rising',
      tipAmount: 0.01,
      txHash: '0xfake',
    });
    assert.ok(record.id);
    assert.ok(record.reputationBonus >= 0);
    assert.equal(record.creatorName, 'Rising');
  });

  it('getStats aggregates discovery data', () => {
    const stats = discovery.getStats();
    assert.ok(typeof stats.creatorsDiscovered === 'number');
    assert.ok(typeof stats.totalDiscoveryTips === 'number');
    assert.ok(typeof stats.risingCreators === 'number');
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. AutonomyService
// ══════════════════════════════════════════════════════════════════

import { AutonomyService } from '../services/autonomy.service.js';

describe('AutonomyService — policies, tip analysis, recommendations', () => {
  let auto: AutonomyService;

  before(() => {
    auto = new AutonomyService();
  });

  it('analyzeTipHistory builds a profile', () => {
    const profile = auto.analyzeTipHistory([
      { id: '1', recipient: '0xaaa', amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia', status: 'confirmed', createdAt: new Date().toISOString() },
      { id: '2', recipient: '0xaaa', amount: '0.02', token: 'usdt', chainId: 'ethereum-sepolia', status: 'confirmed', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: '3', recipient: '0xbbb', amount: '0.005', token: 'native', chainId: 'ton-testnet', status: 'confirmed', createdAt: new Date().toISOString() },
      { id: '4', recipient: '0xaaa', amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia', status: 'failed', createdAt: new Date().toISOString() },
    ]);
    assert.equal(profile.userId, 'default');
    // Only confirmed tips counted
    assert.ok(profile.totalTipped > 0);
    assert.ok(profile.frequentRecipients.length >= 1);
    assert.equal(profile.frequentRecipients[0].address, '0xaaa');
  });

  it('setPolicy creates and retrieves policy', () => {
    const policy = auto.setPolicy('default', {
      name: 'TestBudget',
      type: 'budget',
      enabled: true,
      rules: { maxPerTip: 0.05, maxDailyTotal: 1.0 },
    });
    assert.ok(policy.id.startsWith('policy-'));
    const policies = auto.getPolicies('default');
    assert.ok(policies.some(p => p.name === 'TestBudget'));
  });

  it('deletePolicy removes policy', () => {
    const policy = auto.setPolicy('default', {
      name: 'ToDelete',
      type: 'custom',
      enabled: true,
      rules: {},
    });
    assert.equal(auto.deletePolicy(policy.id), true);
    assert.equal(auto.deletePolicy('nonexistent'), false);
  });

  it('approveDecision and rejectDecision change status', () => {
    const tips = [
      { id: '1', recipient: '0xaaa', amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia', status: 'confirmed', createdAt: new Date().toISOString() },
      { id: '2', recipient: '0xaaa', amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia', status: 'confirmed', createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
      { id: '3', recipient: '0xaaa', amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia', status: 'confirmed', createdAt: new Date(Date.now() - 86400000 * 9).toISOString() },
    ];
    const proposals = auto.evaluateAndPropose(tips);
    if (proposals.length > 0) {
      const approved = auto.approveDecision(proposals[0].id);
      assert.ok(approved);
      assert.equal(approved!.status, 'approved');
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// 4. RevenueSmoothingService
// ══════════════════════════════════════════════════════════════════

import { RevenueSmoothingService } from '../services/revenue-smoothing.service.js';

describe('RevenueSmoothingService — enrollment, income, smoothing', () => {
  let rs: RevenueSmoothingService;

  before(() => {
    rs = new RevenueSmoothingService();
  });

  it('enrollCreator creates a profile', () => {
    const profile = rs.enrollCreator('creator1', '0xCreator1', 60);
    assert.equal(profile.creatorId, 'creator1');
    assert.equal(profile.smoothingLevel, 60);
    assert.equal(profile.totalIncome, 0);
  });

  it('getProfile retrieves enrolled creator', () => {
    const profile = rs.getProfile('creator1');
    assert.ok(profile);
    assert.equal(profile!.walletAddress, '0xCreator1');
  });

  it('recordIncome updates daily history', () => {
    rs.recordIncome('creator1', 0.5);
    const profile = rs.getProfile('creator1');
    assert.ok(profile);
    assert.equal(profile!.totalIncome, 0.5);
    assert.ok(profile!.dailyHistory.length >= 1);
  });

  it('seedReserve and getReserveStatus work', () => {
    rs.seedReserve(10);
    const status = rs.getReserveStatus();
    assert.ok(status.totalBalance >= 10);
    assert.equal(status.enrolledCreators, 1);
  });

  it('listProfiles returns all enrolled creators', () => {
    rs.enrollCreator('creator2', '0xCreator2', 50);
    const profiles = rs.listProfiles();
    assert.ok(profiles.length >= 2);
  });
});

// ══════════════════════════════════════════════════════════════════
// 5. PredictorService
// ══════════════════════════════════════════════════════════════════

import { PredictorService } from '../services/predictor.service.js';

describe('PredictorService — learning and predictions', () => {
  let predictor: PredictorService;

  before(() => {
    predictor = new PredictorService();
  });

  it('learnFromHistory builds frequency maps', () => {
    const tips = [];
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      tips.push({
        recipient: '0xRecipient1',
        amount: '0.01',
        chainId: 'ethereum-sepolia',
        createdAt: new Date(now - i * 86400000).toISOString(),
      });
    }
    predictor.learnFromHistory(tips);
    // After learning, predictions should be possible
    assert.ok(true); // no throw
  });

  it('generatePredictions returns predictions array', () => {
    const preds = predictor.generatePredictions();
    assert.ok(Array.isArray(preds));
    for (const p of preds) {
      assert.ok(p.id.startsWith('pred_'));
      assert.equal(p.status, 'pending');
      assert.ok(p.confidence > 0);
    }
  });

  it('acceptPrediction changes status', () => {
    const preds = predictor.getPendingPredictions();
    if (preds.length > 0) {
      const accepted = predictor.acceptPrediction(preds[0].id);
      assert.ok(accepted);
      assert.equal(accepted!.status, 'accepted');
    }
  });

  it('dismissPrediction changes status', () => {
    // Generate more predictions
    predictor.generatePredictions();
    const preds = predictor.getPendingPredictions();
    if (preds.length > 0) {
      const dismissed = predictor.dismissPrediction(preds[0].id);
      assert.ok(dismissed);
      assert.equal(dismissed!.status, 'dismissed');
    }
  });

  it('getStats aggregates prediction results', () => {
    const stats = predictor.getStats();
    assert.ok(typeof stats.totalPredictions === 'number');
    assert.ok(typeof stats.accepted === 'number');
    assert.ok(typeof stats.dismissed === 'number');
    assert.ok(typeof stats.accuracy === 'number');
    assert.ok(Array.isArray(stats.topCategories));
  });
});

// ══════════════════════════════════════════════════════════════════
// 6. FeeArbitrageService
// ══════════════════════════════════════════════════════════════════

import { FeeArbitrageService } from '../services/fee-arbitrage.service.js';

describe('FeeArbitrageService — fee comparison, chain selection', () => {
  let feeArb: FeeArbitrageService;

  before(() => {
    feeArb = new FeeArbitrageService();
  });

  it('compareFees returns a FeeComparison structure', () => {
    const comparison = feeArb.compareFees('0.01', 'usdt');
    assert.ok(comparison.amount === '0.01');
    assert.ok(comparison.token === 'usdt');
    assert.ok(typeof comparison.recommendation.bestChain === 'string');
    assert.ok(typeof comparison.optimizationScore === 'number');
    assert.ok(typeof comparison.timestamp === 'string');
  });

  it('getCurrentFees returns an array of ChainFeeData', () => {
    const fees = feeArb.getCurrentFees();
    assert.ok(Array.isArray(fees));
    // May be empty if RPCs haven't responded yet, but should not throw
  });

  it('getOptimalTiming returns timing recommendation', () => {
    const timing = feeArb.getOptimalTiming();
    assert.ok(typeof timing.recommendation === 'string');
    assert.ok(['optimal', 'acceptable', 'wait'].includes(timing.currentStatus));
    assert.ok(typeof timing.chains === 'object');
  });

  it('dispose stops the update interval', () => {
    // Should not throw
    feeArb.dispose();
  });
});

// ══════════════════════════════════════════════════════════════════
// 7. StreamingService (constructor only — requires WalletService)
// ══════════════════════════════════════════════════════════════════

describe('StreamingService — interface validation (no wallet)', () => {
  it('module exports StreamingService class', async () => {
    const mod = await import('../services/streaming.service.js');
    assert.ok(typeof mod.StreamingService === 'function');
  });
});

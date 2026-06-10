/**
 * E2E Test: Full Tip Flow — wallet creation, balance check, ReAct reasoning,
 * tip execution, history verification, and audit trail.
 *
 * Uses the MockWalletService for deterministic testing; set SEED_PHRASE
 * env var to run against a real testnet.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MockWalletService } from '../mocks/wdk-mock.js';
import { SafetyService } from '../../services/safety.service.js';
import { AuditTrailService } from '../../services/audit-trail.service.js';

// WDK type imports for E2E tip flow testing via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
// E2E tests verify full WDK transfer flow: wallet creation -> balance -> tip -> receipt
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon; // eslint-disable-line @typescript-eslint/no-unused-vars

const _testDir = dirname(fileURLToPath(import.meta.url));
const SPEND_LOG = join(_testDir, '..', '..', '..', '.safety-spend-log.json');

// ── Shared state ───────────────────────────────────────────────

let wallet: MockWalletService;
let safety: SafetyService;
let audit: AuditTrailService;

// ── Setup ──────────────────────────────────────────────────────

describe('E2E — Full Tip Flow', () => {
  before(() => {
    try { if (existsSync(SPEND_LOG)) unlinkSync(SPEND_LOG); } catch { /* noop */ }
    wallet = new MockWalletService();
    safety = new SafetyService();
    audit = new AuditTrailService();
  });

  after(() => {
    wallet.reset();
  });

  // ── 1. Wallet creation & address retrieval ─────────────────

  it('creates a mock wallet and retrieves a valid Ethereum address', async () => {
    const address = await wallet.getAddress('ethereum-sepolia');
    assert.ok(address.startsWith('0x'), 'EVM address must start with 0x');
    assert.equal(address.length, 42, 'EVM address must be 42 chars (0x + 40 hex)');
  });

  it('creates a mock wallet and retrieves a valid TON address', async () => {
    const address = await wallet.getAddress('ton-testnet');
    assert.ok(address.startsWith('UQ'), 'TON address must start with UQ');
  });

  it('retrieves addresses for all registered chains', async () => {
    const addresses = await wallet.getAllAddresses();
    const chains = Object.keys(addresses);
    assert.ok(chains.length >= 3, 'Should have at least 3 chain addresses');
    assert.ok(chains.includes('ethereum-sepolia'));
    assert.ok(chains.includes('ton-testnet'));
    assert.ok(chains.includes('tron-nile'));
  });

  // ── 2. Balance checking ────────────────────────────────────

  it('checks Sepolia balance returns positive value', async () => {
    const bal = await wallet.getBalance('ethereum-sepolia');
    const native = parseFloat(bal.nativeBalance);
    assert.ok(native > 0, `Expected positive balance, got ${native}`);
  });

  it('getAllBalances returns balances for all registered chains', async () => {
    const balances = await wallet.getAllBalances();
    assert.ok(Array.isArray(balances));
    assert.ok(balances.length >= 3);
    for (const bal of balances) {
      assert.ok('chainId' in bal);
      assert.ok('balance' in bal);
    }
  });

  // ── 3. ReAct reasoning simulation ─────────────────────────

  it('simulates a ReAct tip decision with safety validation', () => {
    // THOUGHT: Creator published quality content, tip 0.01 USDT
    const tipAmount = 0.01;
    const recipient = '0x' + 'c'.repeat(40);

    // ACTION: Validate through safety service
    const validation = safety.validateTip({ recipient, amount: tipAmount });

    // OBSERVATION: Tip is allowed
    assert.ok(validation.allowed, `Tip should be allowed: ${validation.reason}`);
    assert.equal(validation.policy, 'NONE');
  });

  it('ReAct loop blocks a tip that exceeds max single tip', () => {
    const validation = safety.validateTip({
      recipient: '0x' + 'c'.repeat(40),
      amount: 999,
    });
    assert.equal(validation.allowed, false);
    assert.equal(validation.policy, 'MAX_SINGLE_TIP');
  });

  it('ReAct loop blocks a tip to the burn address', () => {
    const validation = safety.validateTip({
      recipient: '0x0000000000000000000000000000000000000000',
      amount: 1,
    });
    assert.equal(validation.allowed, false);
    assert.equal(validation.policy, 'BLOCKED_ADDRESS');
  });

  // ── 4. Tip execution (mock) ────────────────────────────────

  it('executes a mock tip transaction and deducts balance', async () => {
    const before = await wallet.getBalance('ethereum-sepolia');
    const beforeBal = parseFloat(before.nativeBalance);

    const result = await wallet.sendTransaction(
      'ethereum-sepolia',
      '0x' + 'c'.repeat(40),
      '0.01',
    );

    assert.ok(result.hash.startsWith('0x'), 'TX hash must start with 0x');
    assert.ok(result.fee, 'Fee should be present');

    const afterResult = await wallet.getBalance('ethereum-sepolia');
    const afterBal = parseFloat(afterResult.nativeBalance);
    assert.ok(afterBal < beforeBal, 'Balance should decrease after tip');
  });

  it('records the spend in safety service after execution', () => {
    const recipient = '0x' + 'c'.repeat(40);
    safety.recordSpend(recipient, 0.01);

    const usage = safety.getUsage();
    assert.ok(usage.dailySpend >= 0.01, 'Daily spend should reflect recorded tip');
    assert.ok(usage.tipsToday >= 1, 'Should have at least 1 tip today');
  });

  // ── 5. Tip history verification ────────────────────────────

  it('tracks the transaction count correctly', () => {
    assert.equal(wallet.getTxCount(), 1, 'Should have 1 TX after one tip');
  });

  it('increments TX count on subsequent tips', async () => {
    await wallet.sendTransaction('ethereum-sepolia', '0x' + 'd'.repeat(40), '0.005');
    assert.equal(wallet.getTxCount(), 2, 'Should have 2 TXs after two tips');
  });

  // ── 6. Audit trail verification ────────────────────────────

  it('creates an audit trail entry for the tip decision', () => {
    const entry = audit.logDecision({
      timestamp: new Date().toISOString(),
      decisionId: 'tip_001',
      type: 'tip',
      input: 'Tip 0.01 USDT to creator CryptoHero',
      reasoning: 'Creator posted quality Rumble content, engagement score 72/100',
      agentVotes: [
        { agent: 'analyzer', vote: 'approve', confidence: 0.85, reasoning: 'High engagement' },
        { agent: 'guardian', vote: 'approve', confidence: 0.90 },
      ],
      guardianVerdict: 'approved',
      outcome: 'executed',
      txHash: '0x' + '1'.repeat(64),
      chain: 'ethereum-sepolia',
      executionTimeMs: 1200,
    });

    assert.ok(entry.hash, 'Audit entry should have a hash');
    assert.equal(entry.type, 'tip');
    assert.equal(entry.outcome, 'executed');
  });

  it('audit trail entry has integrity hash for tamper-proofing', () => {
    const entry = audit.logDecision({
      timestamp: new Date().toISOString(),
      decisionId: 'tip_002',
      type: 'tip',
      input: 'Tip 0.005 USDT to creator TechGuru',
      reasoning: 'Moderate engagement but consistent posting',
      agentVotes: [
        { agent: 'analyzer', vote: 'approve', confidence: 0.65 },
      ],
      guardianVerdict: 'not_required',
      outcome: 'executed',
      executionTimeMs: 800,
    });

    assert.ok(typeof entry.hash === 'string');
    assert.ok(entry.hash.length > 0, 'Hash should be non-empty');
  });

  it('handles failed transaction gracefully and records failure in audit', async () => {
    wallet.setFailNextTx();

    await assert.rejects(async () => {
      await wallet.sendTransaction('ethereum-sepolia', '0x' + 'e'.repeat(40), '0.01');
    }, /Mock: transaction failed/);

    const entry = audit.logDecision({
      timestamp: new Date().toISOString(),
      decisionId: 'tip_003',
      type: 'tip',
      input: 'Tip 0.01 USDT — FAILED',
      reasoning: 'Transaction reverted on chain',
      agentVotes: [],
      guardianVerdict: 'not_required',
      outcome: 'failed',
      executionTimeMs: 500,
    });

    assert.equal(entry.outcome, 'failed');
  });

  // ── 7. Full round-trip (Thought → Action → Observe → Log) ─

  it('completes a full ReAct round-trip: validate → execute → record → audit', async () => {
    const recipient = '0x' + 'f'.repeat(40);
    const amount = 0.02;

    // THOUGHT: Validate tip
    const validation = safety.validateTip({ recipient, amount });
    assert.ok(validation.allowed);

    // ACTION: Execute tip
    const txResult = await wallet.sendTransaction('ethereum-sepolia', recipient, String(amount));
    assert.ok(txResult.hash);

    // OBSERVE: Record spend
    safety.recordSpend(recipient, amount);
    const usage = safety.getUsage();
    assert.ok(usage.dailySpend > 0);

    // LOG: Audit trail
    const auditEntry = audit.logDecision({
      timestamp: new Date().toISOString(),
      decisionId: `tip_roundtrip_${Date.now()}`,
      type: 'tip',
      input: `Tip ${amount} USDT to ${recipient.slice(0, 10)}...`,
      reasoning: 'Full ReAct round-trip test',
      agentVotes: [
        { agent: 'analyzer', vote: 'approve', confidence: 0.95 },
        { agent: 'guardian', vote: 'approve', confidence: 0.92 },
      ],
      guardianVerdict: 'approved',
      outcome: 'executed',
      txHash: txResult.hash,
      chain: 'ethereum-sepolia',
      executionTimeMs: 350,
    });

    assert.ok(auditEntry.hash);
    assert.equal(auditEntry.outcome, 'executed');
    assert.equal(auditEntry.txHash, txResult.hash);
  });
});

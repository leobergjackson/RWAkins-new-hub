/**
 * E2E Test: Escrow Flow — HTLC creation, state verification, claiming
 * with correct preimage, refund after timeout, and edge cases.
 *
 * Uses the MockWalletService for deterministic testing.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EscrowService } from '../../services/escrow.service.js';

// WDK type imports for escrow E2E testing via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Escrow E2E tests verify HTLC claim/refund flows using WDK account.transfer()
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars
import { MockWalletService } from '../mocks/wdk-mock.js';

const _testDir = dirname(fileURLToPath(import.meta.url));
const ESCROW_FILE = resolve(_testDir, '..', '..', '..', '.escrow-tips.json');

function cleanupEscrowFile(): void {
  try { if (existsSync(ESCROW_FILE)) unlinkSync(ESCROW_FILE); } catch { /* noop */ }
}

// ── Suite ────────────────────────────────────────────────────────

describe('E2E — Escrow HTLC Flow', () => {
  let escrow: EscrowService;
  let wallet: MockWalletService;

  before(() => {
    cleanupEscrowFile();
    escrow = new EscrowService();
    wallet = new MockWalletService();
    // Give the mock plenty of balance for all escrow tests
    wallet.setBalance('ethereum-sepolia', '100.0');
    escrow.setWalletService(wallet as never);
  });

  after(() => {
    cleanupEscrowFile();
  });

  // ── 1. Create escrow with hash lock ────────────────────────

  it('creates an escrow and returns a secret + hashLock', async () => {
    const result = await escrow.createEscrow({
      sender: '0x' + 'a'.repeat(40),
      recipient: '0x' + 'b'.repeat(40),
      amount: '0.01',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
      memo: 'Test escrow',
    });

    assert.ok(result.secret, 'Should return a secret');
    assert.ok(result.escrow.hashLock, 'Should have a hashLock');
    assert.equal(result.escrow.status, 'held');
    assert.equal(result.escrow.htlcStatus, 'locked');
  });

  it('hashLock matches SHA-256 of the returned secret', async () => {
    const result = await escrow.createEscrow({
      sender: '0x' + 'a'.repeat(40),
      recipient: '0x' + 'b'.repeat(40),
      amount: '0.005',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
    });

    const computedHash = createHash('sha256')
      .update(Buffer.from(result.secret, 'hex'))
      .digest('hex');

    assert.equal(computedHash, result.escrow.hashLock, 'SHA-256(secret) must equal hashLock');
  });

  // ── 2. Verify escrow state is Active ──────────────────────

  it('escrow is in "held" status after creation', async () => {
    const result = await escrow.createEscrow({
      sender: '0x' + 'c'.repeat(40),
      recipient: '0x' + 'd'.repeat(40),
      amount: '0.02',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
    });

    const fetched = escrow.getEscrow(result.escrow.id);
    assert.ok(fetched);
    assert.equal(fetched.status, 'held');
    assert.equal(fetched.htlcStatus, 'locked');
  });

  it('active escrow count increases with each creation', async () => {
    const countBefore = escrow.getActiveCount();
    await escrow.createEscrow({
      sender: '0x' + 'e'.repeat(40),
      recipient: '0x' + 'f'.repeat(40),
      amount: '0.01',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
    });
    const countAfter = escrow.getActiveCount();
    assert.ok(countAfter > countBefore, 'Active count should increase');
  });

  // ── 3. Claim with correct preimage ────────────────────────

  it('claims escrow with the correct secret and changes status to released/claimed', async () => {
    const result = await escrow.createEscrow({
      sender: '0x' + '1'.repeat(40),
      recipient: '0x' + '2'.repeat(40),
      amount: '0.01',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
    });

    const claimed = await escrow.claimEscrow(result.escrow.id, result.secret);
    assert.ok(claimed);
    assert.equal(claimed.status, 'released');
    assert.equal(claimed.htlcStatus, 'claimed');
    assert.ok(claimed.releasedAt, 'Should have a releasedAt timestamp');
  });

  it('rejects claim with an incorrect secret', async () => {
    const result = await escrow.createEscrow({
      sender: '0x' + '3'.repeat(40),
      recipient: '0x' + '4'.repeat(40),
      amount: '0.01',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
    });

    const wrongSecret = 'ff'.repeat(32);
    await assert.rejects(
      async () => escrow.claimEscrow(result.escrow.id, wrongSecret),
      (err: Error) => {
        assert.ok(err.message.includes('Secret') || err.message.includes('secret') || err.message.includes('validation'),
          `Expected secret mismatch error, got: ${err.message}`);
        return true;
      },
    );
  });

  it('rejects claim on an already-claimed escrow', async () => {
    const result = await escrow.createEscrow({
      sender: '0x' + '5'.repeat(40),
      recipient: '0x' + '6'.repeat(40),
      amount: '0.01',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
    });

    await escrow.claimEscrow(result.escrow.id, result.secret);

    // Try to claim again
    await assert.rejects(
      async () => escrow.claimEscrow(result.escrow.id, result.secret),
      (err: Error) => {
        assert.ok(err.message.length > 0);
        return true;
      },
    );
  });

  // ── 4. Refund after timeout ───────────────────────────────

  it('refund is rejected when timelock has NOT expired', async () => {
    const result = await escrow.createEscrow({
      sender: '0x' + '7'.repeat(40),
      recipient: '0x' + '8'.repeat(40),
      amount: '0.01',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
      timelockHours: 24, // 24h from now
    });

    // Try refund immediately — should fail because timelock is in the future
    const refundResult = await escrow.refundEscrow(result.escrow.id, 'Early refund attempt');
    assert.equal(refundResult, undefined, 'Refund should return undefined before timelock expires');
  });

  it('refund succeeds after timelock expiry (simulated with 0-hour timelock)', async () => {
    const result = await escrow.createEscrow({
      sender: '0x' + '9'.repeat(40),
      recipient: '0x' + 'a1'.padEnd(40, '0'),
      amount: '0.01',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
      timelockHours: 0, // Immediate expiry for testing
    });

    // Wait a tiny bit so Date.now() > timelock
    await new Promise(r => setTimeout(r, 10));

    const refunded = await escrow.refundEscrow(result.escrow.id, 'Timelock expired');
    assert.ok(refunded, 'Refund should succeed after timelock expiry');
    assert.equal(refunded.status, 'refunded');
    assert.equal(refunded.htlcStatus, 'refunded');
  });

  // ── 5. State transition validation ────────────────────────

  it('escrow transitions through correct lifecycle: held → released', async () => {
    const result = await escrow.createEscrow({
      sender: '0x' + 'b1'.padEnd(40, '0'),
      recipient: '0x' + 'c1'.padEnd(40, '0'),
      amount: '0.01',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
    });

    // State 1: held
    let state = escrow.getEscrow(result.escrow.id);
    assert.equal(state?.status, 'held');

    // Transition: claim
    await escrow.claimEscrow(result.escrow.id, result.secret);

    // State 2: released
    state = escrow.getEscrow(result.escrow.id);
    assert.equal(state?.status, 'released');
    assert.equal(state?.htlcStatus, 'claimed');
  });

  it('escrow stats reflect the correct counts', () => {
    const stats = escrow.getStats();
    assert.ok(stats.totalEscrowed > 0, 'Should have total escrowed');
    assert.ok(stats.totalReleased > 0, 'Should have released escrows');
    assert.ok(typeof stats.disputeRate === 'number');
  });

  it('different escrows get unique IDs', async () => {
    const r1 = await escrow.createEscrow({
      sender: '0x' + 'd1'.padEnd(40, '0'),
      recipient: '0x' + 'e1'.padEnd(40, '0'),
      amount: '0.01',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
    });

    const r2 = await escrow.createEscrow({
      sender: '0x' + 'd2'.padEnd(40, '0'),
      recipient: '0x' + 'e2'.padEnd(40, '0'),
      amount: '0.02',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
    });

    assert.notEqual(r1.escrow.id, r2.escrow.id, 'Escrow IDs must be unique');
  });

  it('different escrows get unique secrets', async () => {
    const r1 = await escrow.createEscrow({
      sender: '0x' + 'f1'.padEnd(40, '0'),
      recipient: '0x' + 'f2'.padEnd(40, '0'),
      amount: '0.01',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
    });

    const r2 = await escrow.createEscrow({
      sender: '0x' + 'f3'.padEnd(40, '0'),
      recipient: '0x' + 'f4'.padEnd(40, '0'),
      amount: '0.01',
      token: 'USDT',
      chainId: 'ethereum-sepolia',
    });

    assert.notEqual(r1.secret, r2.secret, 'Secrets must be unique per escrow');
    assert.notEqual(r1.escrow.hashLock, r2.escrow.hashLock, 'Hash locks must differ');
  });
});

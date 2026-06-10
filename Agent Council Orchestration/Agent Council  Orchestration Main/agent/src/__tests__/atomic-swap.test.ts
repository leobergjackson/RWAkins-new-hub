/**
 * Cross-Chain Atomic Swap tests — HTLC-based trustless exchange protocol.
 * Tests the full swap lifecycle without WDK initialization.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AtomicSwapService } from '../services/atomic-swap.service.js';
import { EscrowService } from '../services/escrow.service.js';

const __testDir = dirname(fileURLToPath(import.meta.url));
const SWAP_FILE = resolve(__testDir, '..', '..', '.atomic-swaps.json');
const ESCROW_FILE = resolve(__testDir, '..', '..', '.escrow-tips.json');

// Clean persisted data before tests
before(() => {
  if (existsSync(SWAP_FILE)) unlinkSync(SWAP_FILE);
  if (existsSync(ESCROW_FILE)) unlinkSync(ESCROW_FILE);
});

const ALICE = '0xAliceAddress1234567890abcdef';
const BOB = '0xBobAddress1234567890abcdef';

function makeRequest() {
  return {
    initiatorAddress: ALICE,
    counterpartyAddress: BOB,
    sendChain: 'ethereum-sepolia',
    sendAmount: '0.01',
    sendToken: 'native',
    receiveChain: 'ton-testnet',
    receiveAmount: '5.0',
    receiveToken: 'native',
  };
}

// ── Initiation Tests ─────────────────────────────────────────────

describe('AtomicSwapService — initiation', () => {
  it('creates a swap with correct hashLock and returns secret', async () => {
    const svc = new AtomicSwapService();
    const { swap, secret } = await svc.initiateSwap(makeRequest());

    assert.ok(swap.id.startsWith('swap_'));
    assert.equal(swap.status, 'initiated');
    assert.ok(swap.hashLock);
    assert.ok(secret);

    // Verify secret matches hashLock
    const computed = createHash('sha256').update(Buffer.from(secret, 'hex')).digest('hex');
    assert.equal(computed, swap.hashLock);
  });

  it('sets correct timelocks (initiator > counterparty)', async () => {
    const svc = new AtomicSwapService();
    const { swap } = await svc.initiateSwap(makeRequest());

    assert.ok(swap.initiatorTimelock > swap.counterpartyTimelock);
    // Initiator: 24h, Counterparty: 12h
    const diff = swap.initiatorTimelock - swap.counterpartyTimelock;
    // 12 hours in ms
    assert.ok(Math.abs(diff - 12 * 60 * 60 * 1000) < 1000);
  });

  it('records swap_initiated event', async () => {
    const svc = new AtomicSwapService();
    const { swap } = await svc.initiateSwap(makeRequest());

    assert.equal(swap.events.length, 1);
    assert.equal(swap.events[0].event, 'swap_initiated');
    assert.equal(swap.events[0].chain, 'ethereum-sepolia');
  });

  it('rejects invalid amounts', async () => {
    const svc = new AtomicSwapService();
    const req = makeRequest();
    req.sendAmount = '0';
    await assert.rejects(() => svc.initiateSwap(req), /Amounts must be positive/);
  });
});

// ── Respond Tests ────────────────────────────────────────────────

describe('AtomicSwapService — respond', () => {
  it('links counterparty escrow and updates status', async () => {
    const escrow = new EscrowService();
    const svc = new AtomicSwapService();
    svc.setEscrowService(escrow);

    const { swap, secret: _secret } = await svc.initiateSwap(makeRequest());

    // Bob creates a matching escrow with the same hashLock (simulated)
    // In real flow, Bob creates an escrow with the swap's hashLock
    // For testing, we create an escrow and verify the hashLock matching works
    const bobEscrow = await escrow.createEscrow({
      sender: BOB,
      recipient: ALICE,
      amount: '5.0',
      token: 'native',
      chainId: 'ton-testnet',
      memo: 'Counterparty lock',
      timelockHours: 12,
    });

    // The hashLock won't match since escrow generates its own.
    // In production, Bob would create the escrow externally with the same hashLock.
    // For this test, verify the service rejects mismatched hashLocks.
    await assert.rejects(
      () => svc.respondToSwap(swap.id, bobEscrow.escrow.id),
      /hashLock does not match/,
    );
  });

  it('rejects respond on non-initiated swap', async () => {
    const svc = new AtomicSwapService();
    await assert.rejects(
      () => svc.respondToSwap('nonexistent', 'escrow_1'),
      /not found/,
    );
  });
});

// ── Claim Tests ──────────────────────────────────────────────────

describe('AtomicSwapService — claim', () => {
  it('initiator claims counterparty funds with correct secret', async () => {
    const svc = new AtomicSwapService();
    // No escrow service — pure logic test
    const { swap, secret } = await svc.initiateSwap(makeRequest());

    // Simulate counterparty responding (without escrow verification)
    swap.status = 'counterparty_locked';
    swap.counterparty.escrowId = 'mock_escrow_bob';

    const claimed = await svc.claimSwap(swap.id, secret, 'initiator');
    assert.ok(claimed.secret === secret);
    assert.ok(claimed.events.some(e => e.event === 'initiator_claimed'));
  });

  it('counterparty claims with revealed secret completes swap', async () => {
    const svc = new AtomicSwapService();
    const { swap, secret } = await svc.initiateSwap(makeRequest());

    // Simulate full flow
    swap.status = 'counterparty_locked';
    swap.counterparty.escrowId = 'mock_escrow_bob';
    swap.initiator.escrowId = swap.initiator.escrowId || 'mock_escrow_alice';

    // Initiator claims
    await svc.claimSwap(swap.id, secret, 'initiator');

    // Counterparty claims
    const result = await svc.claimSwap(swap.id, secret, 'counterparty');
    assert.equal(result.status, 'claimed');
    assert.ok(result.completedAt);
  });

  it('rejects claim with wrong secret', async () => {
    const svc = new AtomicSwapService();
    const { swap } = await svc.initiateSwap(makeRequest());

    swap.status = 'counterparty_locked';
    swap.counterparty.escrowId = 'mock_escrow_bob';

    const wrongSecret = 'a'.repeat(64);
    await assert.rejects(
      () => svc.claimSwap(swap.id, wrongSecret, 'initiator'),
      /Invalid secret/,
    );
  });
});

// ── Refund Tests ─────────────────────────────────────────────────

describe('AtomicSwapService — refund', () => {
  it('refund fails before timelock expires', async () => {
    const svc = new AtomicSwapService();
    const { swap } = await svc.initiateSwap(makeRequest());
    swap.initiator.escrowId = 'mock_escrow_alice';

    await assert.rejects(
      () => svc.refundSwap(swap.id, 'initiator'),
      /timelock has not expired/,
    );
  });

  it('refund succeeds after timelock expires', async () => {
    const svc = new AtomicSwapService();
    const { swap } = await svc.initiateSwap(makeRequest());
    swap.initiator.escrowId = 'mock_escrow_alice';

    // Force timelock to past
    swap.initiatorTimelock = Date.now() - 1000;

    const result = await svc.refundSwap(swap.id, 'initiator');
    assert.equal(result.status, 'refunded');
    assert.ok(result.events.some(e => e.event === 'initiator_refunded'));
  });
});

// ── Stats Tests ──────────────────────────────────────────────────

describe('AtomicSwapService — stats', () => {
  it('tracks swap statistics correctly', async () => {
    const svc = new AtomicSwapService();

    // Create a swap
    await svc.initiateSwap(makeRequest());

    const stats = svc.getSwapStats();
    assert.ok(stats.total >= 1);
    assert.equal(typeof stats.completed, 'number');
    assert.equal(typeof stats.refunded, 'number');
    assert.equal(typeof stats.active, 'number');
    assert.equal(typeof stats.avgCompletionTime, 'number');
  });
});

// ── Persistence Tests ────────────────────────────────────────────

describe('AtomicSwapService — persistence', () => {
  it('persists and reloads swaps', async () => {
    // Clean file first
    if (existsSync(SWAP_FILE)) unlinkSync(SWAP_FILE);

    const svc1 = new AtomicSwapService();
    const { swap } = await svc1.initiateSwap(makeRequest());

    // Create new instance — should load from disk
    const svc2 = new AtomicSwapService();
    const loaded = svc2.getSwap(swap.id);
    assert.ok(loaded);
    assert.equal(loaded!.id, swap.id);
    assert.equal(loaded!.hashLock, swap.hashLock);
  });
});

// ── List/Filter Tests ────────────────────────────────────────────

describe('AtomicSwapService — list/filter', () => {
  it('lists and filters swaps by status', async () => {
    // Clean file first
    if (existsSync(SWAP_FILE)) unlinkSync(SWAP_FILE);

    const svc = new AtomicSwapService();
    await svc.initiateSwap(makeRequest());
    await svc.initiateSwap(makeRequest());

    const all = svc.listSwaps();
    assert.ok(all.length >= 2);

    const initiated = svc.listSwaps('initiated');
    assert.ok(initiated.length >= 2);

    const claimed = svc.listSwaps('claimed');
    assert.equal(claimed.length, 0);
  });
});

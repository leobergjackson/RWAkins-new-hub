/**
 * Smart Escrow (CREATE2) tests — deterministic vault address computation.
 * Tests the full lifecycle: create, fund, claim, refund, and verification.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SmartEscrowService } from '../services/smart-escrow.service.js';

const __testDir = dirname(fileURLToPath(import.meta.url));
const ESCROW_FILE = resolve(__testDir, '..', '..', '.smart-escrows.json');

before(() => {
  if (existsSync(ESCROW_FILE)) unlinkSync(ESCROW_FILE);
});

const SENDER = '0xSenderAddress1234567890abcdef1234';
const RECIPIENT = '0xRecipientAddress1234567890abcdef';

function makeParams() {
  return {
    sender: SENDER,
    recipient: RECIPIENT,
    amount: '0.01',
    hashLock: '',
    timelock: Date.now() + 60 * 60 * 1000,
    chainId: 'ethereum-sepolia',
  };
}

// ── CREATE2 Address Computation ───────────────────────────────

describe('SmartEscrowService — CREATE2 address computation', () => {
  it('computes a deterministic vault address from params', () => {
    const svc = new SmartEscrowService();
    const params = makeParams();
    params.hashLock = createHash('sha256').update(Buffer.from('test', 'hex')).digest('hex');

    const result1 = svc.computeEscrowAddress(params);
    const result2 = svc.computeEscrowAddress(params);

    assert.ok(result1.address.startsWith('0x'));
    assert.equal(result1.address.length, 42); // 0x + 40 hex chars
    assert.equal(result1.address, result2.address, 'Same params must produce same address');
    assert.equal(result1.salt, result2.salt);
    assert.equal(result1.bytecodeHash, result2.bytecodeHash);
  });

  it('produces different addresses for different params', () => {
    const svc = new SmartEscrowService();
    const params1 = makeParams();
    params1.hashLock = createHash('sha256').update('secret1').digest('hex');
    const params2 = makeParams();
    params2.hashLock = createHash('sha256').update('secret2').digest('hex');

    const addr1 = svc.computeEscrowAddress(params1).address;
    const addr2 = svc.computeEscrowAddress(params2).address;

    assert.notEqual(addr1, addr2, 'Different params should produce different addresses');
  });
});

// ── Escrow Lifecycle ──────────────────────────────────────────

describe('SmartEscrowService — lifecycle', () => {
  it('creates an escrow with auto-generated hashLock and secret', () => {
    const svc = new SmartEscrowService();
    const { escrow, secret } = svc.createSmartEscrow(makeParams());

    assert.ok(escrow.id.startsWith('se_'));
    assert.ok(escrow.vaultAddress.startsWith('0x'));
    assert.equal(escrow.status, 'created');
    assert.ok(secret.length > 0, 'Secret should be generated');

    // Verify secret matches hashLock
    const computed = createHash('sha256').update(Buffer.from(secret, 'hex')).digest('hex');
    assert.equal(computed, escrow.params.hashLock);
  });

  it('funds an escrow and updates status', () => {
    const svc = new SmartEscrowService();
    const { escrow } = svc.createSmartEscrow(makeParams());

    const funded = svc.fundEscrow(escrow.id, '0xfundtxhash123');
    assert.equal(funded.status, 'funded');
    assert.equal(funded.fundTxHash, '0xfundtxhash123');
  });

  it('claims an escrow with valid secret', () => {
    const svc = new SmartEscrowService();
    const { escrow, secret } = svc.createSmartEscrow(makeParams());
    svc.fundEscrow(escrow.id, '0xfundtx');

    const claimed = svc.claimSmartEscrow(escrow.id, secret);
    assert.equal(claimed.status, 'claimed');
    assert.ok(claimed.claimTxHash);
    assert.ok(claimed.completedAt);
  });

  it('rejects claim with invalid secret', () => {
    const svc = new SmartEscrowService();
    const { escrow } = svc.createSmartEscrow(makeParams());
    svc.fundEscrow(escrow.id, '0xfundtx');

    assert.throws(
      () => svc.claimSmartEscrow(escrow.id, 'deadbeef'.repeat(8)),
      /Invalid secret/,
    );
  });

  it('refunds after timelock expires', () => {
    const svc = new SmartEscrowService();
    const params = makeParams();
    params.timelock = Date.now() - 1000; // Already expired
    const { escrow } = svc.createSmartEscrow(params);

    const refunded = svc.refundSmartEscrow(escrow.id);
    assert.equal(refunded.status, 'refunded');
    assert.ok(refunded.refundTxHash);
  });

  it('rejects refund before timelock', () => {
    const svc = new SmartEscrowService();
    const params = makeParams();
    params.timelock = Date.now() + 60 * 60 * 1000; // 1 hour from now
    const { escrow } = svc.createSmartEscrow(params);

    assert.throws(
      () => svc.refundSmartEscrow(escrow.id),
      /Timelock has not expired/,
    );
  });
});

// ── Verification & Proof ──────────────────────────────────────

describe('SmartEscrowService — verification', () => {
  it('verifies escrow address matches recomputation', () => {
    const svc = new SmartEscrowService();
    const { escrow } = svc.createSmartEscrow(makeParams());

    const proof = svc.getEscrowProof(escrow.id);
    assert.equal(proof.addressMatch, true);
    assert.equal(proof.recomputedAddress, escrow.vaultAddress);
    assert.equal(proof.verificationSteps.length, 5);
    assert.ok(proof.deployerAddress);
  });

  it('returns stats with correct counts', () => {
    const svc = new SmartEscrowService();
    svc.createSmartEscrow(makeParams());
    svc.createSmartEscrow(makeParams());

    const stats = svc.getStats();
    assert.ok(stats.total >= 2);
    assert.ok(stats.created >= 2);
    assert.equal(typeof stats.totalVolume, 'string');
  });
});

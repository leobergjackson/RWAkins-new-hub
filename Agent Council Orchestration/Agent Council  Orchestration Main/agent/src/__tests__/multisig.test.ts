/**
 * MultiSigService — multi-signature wallet management and approvals.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { MultiSigService } from '../services/multisig.service.js';

describe('MultiSigService', () => {
  let service: MultiSigService;
  let walletId: string;
  let ownerKeys: Record<string, string>;

  before(() => {
    service = new MultiSigService();
    const result = service.createWallet({
      name: 'Test Wallet',
      owners: ['alice', 'bob', 'charlie'],
      requiredApprovals: 2,
    });
    assert.ok(!('error' in result));
    if (!('error' in result)) {
      walletId = result.id;
      ownerKeys = result.ownerKeys;
    }
  });

  it('createWallet returns wallet with signing keys', () => {
    assert.ok(walletId);
    assert.ok(ownerKeys.alice);
    assert.ok(ownerKeys.bob);
  });

  it('createWallet rejects fewer than 2 owners', () => {
    const result = service.createWallet({ name: 'Bad', owners: ['solo'], requiredApprovals: 1 });
    assert.ok('error' in result);
  });

  it('proposeTransaction creates a pending transaction', () => {
    const tx = service.proposeTransaction({
      walletId,
      to: '0xRecipient',
      amount: 0.5,
      proposedBy: 'alice',
    });
    assert.ok(!('error' in tx));
    if (!('error' in tx)) {
      assert.equal(tx.status, 'pending');
      assert.equal(tx.proposedBy, 'alice');
      assert.ok(tx.contentHash);
    }
  });

  it('approveTransaction with valid HMAC signature succeeds', async () => {
    const tx = service.proposeTransaction({
      walletId,
      to: '0xTarget',
      amount: 1.0,
      proposedBy: 'alice',
    });
    assert.ok(!('error' in tx));
    if (!('error' in tx)) {
      const signature = createHmac('sha256', ownerKeys.bob).update(tx.contentHash).digest('hex');
      const result = await service.approveTransaction(tx.id, 'bob', { signature });
      assert.ok(!('error' in result));
      if (!('error' in result)) {
        assert.ok(result.approvals.length >= 1);
        const approval = result.approvals.find(a => a.signer === 'bob');
        assert.ok(approval?.signatureVerified);
      }
    }
  });

  it('getSigningChallenge returns content hash', () => {
    const tx = service.proposeTransaction({
      walletId,
      to: '0xChallengeTarget',
      amount: 0.1,
      proposedBy: 'charlie',
    });
    assert.ok(!('error' in tx));
    if (!('error' in tx)) {
      const challenge = service.getSigningChallenge(tx.id, 'alice');
      assert.ok(!('error' in challenge));
      if (!('error' in challenge)) {
        assert.ok(challenge.contentHash);
        assert.ok(challenge.instruction);
      }
    }
  });

  it('getStats returns multi-sig statistics', () => {
    const stats = service.getStats();
    assert.equal(typeof stats.totalWallets, 'number');
    assert.ok(stats.totalWallets >= 1);
    assert.equal(typeof stats.totalTransactions, 'number');
  });
});

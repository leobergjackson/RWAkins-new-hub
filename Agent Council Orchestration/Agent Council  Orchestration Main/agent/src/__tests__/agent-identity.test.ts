/**
 * AgentIdentityService — cryptographic identity management.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { AgentIdentityService } from '../services/agent-identity.service.js';

describe('AgentIdentityService', () => {
  let service: AgentIdentityService;

  before(() => {
    service = new AgentIdentityService();
  });

  it('getIdentity returns null before initialization', () => {
    const identity = service.getIdentity();
    assert.equal(identity, null);
  });

  it('initialize throws without wallet service', async () => {
    await assert.rejects(() => service.initialize(), { message: /WalletService not set/ });
  });

  it('generateChallenge returns a challenge with expiry', () => {
    const challenge = service.generateChallenge();
    assert.ok(challenge.challenge);
    assert.ok(challenge.expiresAt);
    assert.equal(typeof challenge.challenge, 'string');
    assert.ok(challenge.challenge.length >= 32);
  });

  it('generateChallenge creates unique challenges each time', () => {
    const c1 = service.generateChallenge();
    const c2 = service.generateChallenge();
    assert.notEqual(c1.challenge, c2.challenge);
  });
});

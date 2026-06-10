/**
 * PersonalityService — personality management and message formatting.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { PersonalityService } from '../services/personality.service.js';

describe('PersonalityService', () => {
  let service: PersonalityService;

  before(() => {
    service = new PersonalityService();
  });

  it('defaults to friendly personality', () => {
    assert.equal(service.getActivePersonality(), 'friendly');
  });

  it('accepts initial personality in constructor', () => {
    const pirate = new PersonalityService('pirate');
    assert.equal(pirate.getActivePersonality(), 'pirate');
  });

  it('setPersonality changes the active personality', () => {
    const ok = service.setPersonality('minimal');
    assert.equal(ok, true);
    assert.equal(service.getActivePersonality(), 'minimal');
    service.setPersonality('friendly'); // reset
  });

  it('setPersonality returns false for invalid type', () => {
    const ok = service.setPersonality('nonexistent' as any);
    assert.equal(ok, false);
  });

  it('getPersonalities returns all available personalities', () => {
    const all = service.getPersonalities();
    assert.ok(Array.isArray(all));
    assert.ok(all.length >= 5);
    const ids = all.map(p => p.id);
    assert.ok(ids.includes('professional'));
    assert.ok(ids.includes('friendly'));
    assert.ok(ids.includes('pirate'));
  });

  it('formatMessage interpolates variables', () => {
    service.setPersonality('minimal');
    const msg = service.formatMessage('tip_confirmed', {
      amount: '0.01',
      currency: 'ETH',
      recipient: '0xABC',
      chain: 'Sepolia',
      txHash: '0x123',
    });
    assert.ok(msg.includes('0.01'));
    assert.ok(msg.includes('ETH'));
    assert.ok(msg.includes('0xABC'));
    service.setPersonality('friendly');
  });

  it('getActiveDefinition returns full definition', () => {
    const def = service.getActiveDefinition();
    assert.ok(def.id);
    assert.ok(def.name);
    assert.ok(def.templates);
    assert.ok(def.templates.greeting);
  });
});

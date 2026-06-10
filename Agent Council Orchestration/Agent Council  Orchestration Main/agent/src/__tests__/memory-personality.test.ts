/**
 * MemoryService + PersonalityService + DemoService — focused unit tests.
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
  const files = ['.agent-memory.json'];
  for (const f of files) {
    const fp = resolve(__testDir, '..', '..', f);
    if (existsSync(fp)) unlinkSync(fp);
  }
});

// ══════════════════════════════════════════════════════════════════
// 1. MemoryService
// ══════════════════════════════════════════════════════════════════

import { MemoryService } from '../services/memory.service.js';

describe('MemoryService — store, retrieve, search, context', () => {
  let mem: MemoryService;

  before(() => {
    mem = new MemoryService();
  });

  it('remember stores a new entry with correct fields', () => {
    const entry = mem.remember('preference', 'fav_chain', 'ton-testnet', 'user_said');
    assert.ok(entry.id.startsWith('mem_'));
    assert.equal(entry.type, 'preference');
    assert.equal(entry.key, 'fav_chain');
    assert.equal(entry.value, 'ton-testnet');
    assert.equal(entry.confidence, 95); // user_said = 95
    assert.equal(entry.importance, 80); // user_said = 80
  });

  it('recall retrieves stored entry and increments accessCount', () => {
    const recalled = mem.recall('fav_chain');
    assert.ok(recalled);
    assert.equal(recalled!.value, 'ton-testnet');
    assert.ok(recalled!.accessCount >= 2); // remember + recall
  });

  it('search finds entries by key or value substring', () => {
    mem.remember('fact', 'network_info', 'ton is fast and cheap', 'observed');
    const results = mem.search('ton');
    assert.ok(results.length >= 1);
    assert.ok(results.some(r => r.key === 'fav_chain' || r.value.includes('ton')));
  });

  it('forget removes an entry', () => {
    const entry = mem.remember('context', 'temp_key', 'temp_val', 'inferred');
    assert.equal(mem.forget(entry.id), true);
    assert.equal(mem.recall('temp_key'), undefined);
    assert.equal(mem.forget('nonexistent_id'), false);
  });

  it('buildContextForLLM returns a string', () => {
    mem.learnCreatorPreference('TestCreator', 0.85, true);
    mem.learnChainPerformance('ethereum-sepolia', 0.001, 5000, true);
    mem.learnTimePattern(10, 3, 5);
    const ctx = mem.buildContextForLLM();
    assert.ok(typeof ctx === 'string');
  });

  it('learnFromTip stores preferences', () => {
    mem.learnFromTip('0x' + 'a'.repeat(40), '0.01', 'ethereum-sepolia', 'usdt');
    const last = mem.recall('last_recipient');
    assert.ok(last);
    assert.equal(last!.value, '0x' + 'a'.repeat(40));
  });

  it('getStats returns expected structure', () => {
    const stats = mem.getStats();
    assert.ok(typeof stats.totalMemories === 'number');
    assert.ok(typeof stats.preferences === 'number');
    assert.ok(typeof stats.avgConfidence === 'number');
    assert.ok(Array.isArray(stats.topMemories));
  });

  it('recallByType returns sorted entries', () => {
    const prefs = mem.recallByType('preference');
    assert.ok(Array.isArray(prefs));
    for (let i = 1; i < prefs.length; i++) {
      assert.ok(prefs[i - 1].confidence >= prefs[i].confidence);
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. PersonalityService
// ══════════════════════════════════════════════════════════════════

import { PersonalityService } from '../services/personality.service.js';

describe('PersonalityService — traits, messages, switching', () => {
  it('defaults to friendly personality', () => {
    const svc = new PersonalityService();
    assert.equal(svc.getActivePersonality(), 'friendly');
  });

  it('constructor accepts initial personality', () => {
    const svc = new PersonalityService('pirate');
    assert.equal(svc.getActivePersonality(), 'pirate');
  });

  it('setPersonality switches and returns true', () => {
    const svc = new PersonalityService();
    assert.equal(svc.setPersonality('minimal'), true);
    assert.equal(svc.getActivePersonality(), 'minimal');
  });

  it('setPersonality rejects invalid type', () => {
    const svc = new PersonalityService();
    assert.equal(svc.setPersonality('nonexistent' as 'professional'), false);
    assert.equal(svc.getActivePersonality(), 'friendly');
  });

  it('formatMessage interpolates template variables', () => {
    const svc = new PersonalityService('professional');
    const msg = svc.formatMessage('tip_confirmed', {
      amount: '0.01',
      currency: 'USDT',
      recipient: '0xABC',
      chain: 'Ethereum',
      txHash: '0xDEF',
    });
    assert.ok(msg.includes('0.01'));
    assert.ok(msg.includes('USDT'));
    assert.ok(msg.includes('0xABC'));
  });

  it('getPersonalities returns all 5 personalities', () => {
    const svc = new PersonalityService();
    const all = svc.getPersonalities();
    assert.equal(all.length, 5);
    const ids = all.map(p => p.id);
    assert.ok(ids.includes('professional'));
    assert.ok(ids.includes('pirate'));
    assert.ok(ids.includes('minimal'));
  });

  it('getActiveDefinition returns full definition', () => {
    const svc = new PersonalityService('emoji');
    const def = svc.getActiveDefinition();
    assert.equal(def.id, 'emoji');
    assert.ok(typeof def.templates.greeting === 'string');
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. DemoService
// ══════════════════════════════════════════════════════════════════

import { DemoService } from '../services/demo.service.js';

describe('DemoService — sample data generation', () => {
  let demo: DemoService;

  before(() => {
    demo = new DemoService();
  });

  it('getSampleCreators returns 15 creators', () => {
    const creators = demo.getSampleCreators();
    assert.equal(creators.length, 15);
    for (const c of creators) {
      assert.ok(c.name);
      assert.ok(c.walletAddress);
      assert.ok(Array.isArray(c.categories));
    }
  });

  it('getSampleTipHistory returns 50 tips sorted by recency', () => {
    const tips = demo.getSampleTipHistory();
    assert.equal(tips.length, 50);
    for (let i = 1; i < tips.length; i++) {
      assert.ok(new Date(tips[i - 1].createdAt).getTime() >= new Date(tips[i].createdAt).getTime());
    }
  });

  it('getSampleActivities returns 25 activities', () => {
    const activities = demo.getSampleActivities();
    assert.equal(activities.length, 25);
    for (const a of activities) {
      assert.ok(a.type);
      assert.ok(a.message);
    }
  });

  it('getSamplePolicies returns 6 policies', () => {
    const policies = demo.getSamplePolicies();
    assert.equal(policies.length, 6);
  });

  it('isEnabled returns a boolean', () => {
    assert.equal(typeof demo.isEnabled(), 'boolean');
  });
});

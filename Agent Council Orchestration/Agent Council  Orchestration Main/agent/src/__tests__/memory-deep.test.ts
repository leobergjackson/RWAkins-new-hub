/**
 * Deep MemoryService tests — learning methods, context building, stats.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MemoryService } from '../services/memory.service.js';

const __testDir = dirname(fileURLToPath(import.meta.url));
const MEMORY_FILE = join(__testDir, '..', '..', '.agent-memory.json');

before(() => {
  if (existsSync(MEMORY_FILE)) unlinkSync(MEMORY_FILE);
});

describe('MemoryService — remember/recall', () => {
  it('remember stores and recall retrieves', () => {
    const svc = new MemoryService();
    svc.remember('preference', 'test_key', 'test_value');
    const mem = svc.recall('test_key');
    assert.ok(mem);
    assert.equal(mem!.value, 'test_value');
    assert.equal(mem!.type, 'preference');
  });

  it('remember updates existing memory with same key/type', () => {
    const svc = new MemoryService();
    svc.remember('fact', 'dup_key', 'old_value');
    svc.remember('fact', 'dup_key', 'new_value');
    const mem = svc.recall('dup_key');
    assert.equal(mem!.value, 'new_value');
    assert.ok(mem!.accessCount >= 2);
  });

  it('recall returns undefined for unknown key', () => {
    const svc = new MemoryService();
    assert.equal(svc.recall('nonexistent'), undefined);
  });

  it('recallByType filters by type', () => {
    const svc = new MemoryService();
    svc.remember('preference', 'p1', 'v1');
    svc.remember('fact', 'f1', 'v2');
    svc.remember('preference', 'p2', 'v3');
    const prefs = svc.recallByType('preference');
    assert.ok(prefs.length >= 2);
    assert.ok(prefs.every(m => m.type === 'preference'));
  });
});

describe('MemoryService — search and forget', () => {
  it('search finds by key or value substring', () => {
    const svc = new MemoryService();
    svc.remember('fact', 'chain_ethereum', 'fast and cheap');
    const results = svc.search('ethereum');
    assert.ok(results.length >= 1);
  });

  it('forget removes a memory by id', () => {
    const svc = new MemoryService();
    const mem = svc.remember('context', 'to_forget', 'temp');
    const removed = svc.forget(mem.id);
    assert.equal(removed, true);
    assert.equal(svc.recall('to_forget'), undefined);
  });

  it('forget returns false for unknown id', () => {
    const svc = new MemoryService();
    assert.equal(svc.forget('unknown_id'), false);
  });
});

describe('MemoryService — Conversation Summaries', () => {
  it('summarizeConversation stores summary', () => {
    const svc = new MemoryService();
    const summary = svc.summarizeConversation(['tipping', 'rumble'], 3, ['auto-tipped']);
    assert.ok(summary.id);
    assert.deepEqual(summary.topics, ['tipping', 'rumble']);
    assert.equal(summary.tipsMade, 3);
  });

  it('getConversationHistory returns in reverse order', () => {
    const svc = new MemoryService();
    svc.summarizeConversation(['a'], 0, []);
    svc.summarizeConversation(['b'], 1, []);
    const history = svc.getConversationHistory();
    assert.ok(history.length >= 2);
    // Most recent first
    assert.deepEqual(history[0].topics, ['b']);
  });
});

describe('MemoryService — learnFromTip', () => {
  it('stores last_recipient, last_amount, etc.', () => {
    const svc = new MemoryService();
    svc.learnFromTip('0xRecipient', '0.01', 'ethereum-sepolia', 'usdt');
    assert.equal(svc.recall('last_recipient')!.value, '0xRecipient');
    assert.equal(svc.recall('last_amount')!.value, '0.01');
    assert.equal(svc.recall('last_chain')!.value, 'ethereum-sepolia');
    assert.equal(svc.recall('last_token')!.value, 'usdt');
  });

  it('tracks recipient frequency', () => {
    const svc = new MemoryService();
    svc.learnFromTip('0xFreq', '0.01', 'eth', 'usdt');
    svc.learnFromTip('0xFreq', '0.02', 'eth', 'usdt');
    const freq = svc.recall('recipient_freq_0xFreq');
    assert.ok(freq);
    assert.equal(freq!.value, '2');
  });
});

describe('MemoryService — learnCreatorPreference', () => {
  it('creates preference for new creator', () => {
    const svc = new MemoryService();
    svc.learnCreatorPreference('CreatorX', 85, true);
    const mem = svc.recall('creator_pref_CreatorX');
    assert.ok(mem);
    const data = JSON.parse(mem!.value);
    assert.equal(data.interactions, 1);
    assert.equal(data.avgEngagement, 85);
    assert.equal(data.tipCount, 1);
  });

  it('updates existing creator preference', () => {
    const svc = new MemoryService();
    svc.learnCreatorPreference('CreatorY', 80, true);
    svc.learnCreatorPreference('CreatorY', 90, false);
    const mem = svc.recall('creator_pref_CreatorY');
    const data = JSON.parse(mem!.value);
    assert.equal(data.interactions, 2);
    assert.equal(data.tipCount, 1);
    assert.ok(data.avgEngagement > 80 && data.avgEngagement < 90);
  });
});

describe('MemoryService — learnChainPerformance', () => {
  it('creates chain performance record', () => {
    const svc = new MemoryService();
    svc.learnChainPerformance('ethereum-sepolia', 0.5, 3000, true);
    const mem = svc.recall('chain_perf_ethereum-sepolia');
    assert.ok(mem);
    const data = JSON.parse(mem!.value);
    assert.equal(data.transactions, 1);
    assert.equal(data.avgFee, 0.5);
    assert.equal(data.successRate, 1);
  });

  it('updates chain performance on repeated calls', () => {
    const svc = new MemoryService();
    svc.learnChainPerformance('ton-testnet', 0.1, 1000, true);
    svc.learnChainPerformance('ton-testnet', 0.2, 2000, false);
    const mem = svc.recall('chain_perf_ton-testnet');
    const data = JSON.parse(mem!.value);
    assert.equal(data.transactions, 2);
    assert.equal(data.successes, 1);
    assert.equal(data.successRate, 0.5);
  });
});

describe('MemoryService — learnTimePattern', () => {
  it('creates time pattern record', () => {
    const svc = new MemoryService();
    svc.learnTimePattern(14, 1, 25); // Mon at 14:00
    const mem = svc.recall('time_pattern_1_14');
    assert.ok(mem);
    const data = JSON.parse(mem!.value);
    assert.equal(data.observations, 1);
    assert.equal(data.avgEvents, 25);
  });

  it('updates time pattern on repeated calls', () => {
    const svc = new MemoryService();
    svc.learnTimePattern(9, 3, 10);
    svc.learnTimePattern(9, 3, 30);
    const mem = svc.recall('time_pattern_3_9');
    const data = JSON.parse(mem!.value);
    assert.equal(data.observations, 2);
    assert.equal(data.avgEvents, 20);
  });
});

describe('MemoryService — buildContextForLLM', () => {
  it('returns a string (possibly empty for fresh instance)', () => {
    const svc = new MemoryService();
    const ctx = svc.buildContextForLLM();
    assert.ok(typeof ctx === 'string');
  });

  it('includes creator preferences when present', () => {
    const svc = new MemoryService();
    svc.learnCreatorPreference('LLMCreator', 90, true);
    const ctx = svc.buildContextForLLM();
    assert.ok(ctx.includes('CREATOR PREFERENCES') || ctx.includes('LLMCreator'));
  });

  it('includes chain performance when present', () => {
    const svc = new MemoryService();
    svc.learnChainPerformance('eth-chain', 0.3, 2000, true);
    const ctx = svc.buildContextForLLM();
    assert.ok(ctx.includes('CHAIN PERFORMANCE') || ctx.includes('eth-chain'));
  });
});

describe('MemoryService — getStats', () => {
  it('returns stats object with correct fields', () => {
    const svc = new MemoryService();
    svc.remember('preference', 'stat_key', 'stat_val');
    const stats = svc.getStats();
    assert.ok(typeof stats.totalMemories === 'number');
    assert.ok(typeof stats.preferences === 'number');
    assert.ok(typeof stats.facts === 'number');
    assert.ok(typeof stats.avgConfidence === 'number');
    assert.ok(Array.isArray(stats.topMemories));
  });
});

describe('MemoryService — getAllMemories', () => {
  it('returns all memories sorted by access count', () => {
    const svc = new MemoryService();
    svc.remember('fact', 'low_access', 'v');
    svc.remember('fact', 'high_access', 'v');
    svc.recall('high_access');
    svc.recall('high_access');
    const all = svc.getAllMemories();
    assert.ok(all.length >= 2);
    // First entry should have highest access count
    assert.ok(all[0].accessCount >= all[all.length - 1].accessCount);
  });
});

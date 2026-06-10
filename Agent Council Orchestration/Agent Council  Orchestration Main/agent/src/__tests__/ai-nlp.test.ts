/**
 * AIService NLP — Entity extraction, intent detection, content analysis tests.
 * Tests regex-based fallback NLP features that work without an LLM key.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { AIService } from '../services/ai.service.js';

describe('AIService NLP', () => {
  let ai: AIService;

  before(() => {
    ai = new AIService();
  });

  // ── extractEntities — Amounts ──

  describe('extractEntities — amounts', () => {
    it('finds USD amounts ($10)', async () => {
      const intent = await ai.detectIntent('send $10 to someone');
      assert.ok(intent.entities.amounts.length >= 1);
      assert.equal(intent.entities.amounts[0].value, 10);
      assert.equal(intent.entities.amounts[0].currency, 'USD');
    });

    it('finds USDT amounts (5 USDT)', async () => {
      const intent = await ai.detectIntent('tip 5 USDT');
      assert.ok(intent.entities.amounts.length >= 1);
      const usdtAmount = intent.entities.amounts.find(a => a.currency === 'USDT');
      assert.ok(usdtAmount);
      assert.equal(usdtAmount!.value, 5);
    });

    it('finds ETH amounts (0.5 ETH)', async () => {
      const intent = await ai.detectIntent('send 0.5 ETH');
      assert.ok(intent.entities.amounts.length >= 1);
      const ethAmount = intent.entities.amounts.find(a => a.currency === 'ETH');
      assert.ok(ethAmount);
      assert.equal(ethAmount!.value, 0.5);
    });

    it('finds decimal USD amounts ($0.01)', async () => {
      const intent = await ai.detectIntent('tip $0.01');
      assert.ok(intent.entities.amounts.length >= 1);
      assert.equal(intent.entities.amounts[0].value, 0.01);
    });

    it('finds XAUT amounts (2 XAUT)', async () => {
      const intent = await ai.detectIntent('send 2 XAUT');
      assert.ok(intent.entities.amounts.length >= 1);
      const xautAmount = intent.entities.amounts.find(a => a.currency === 'XAUT');
      assert.ok(xautAmount);
      assert.equal(xautAmount!.value, 2);
    });

    it('finds USAT amounts (10 USAT)', async () => {
      const intent = await ai.detectIntent('send 10 USAT');
      assert.ok(intent.entities.amounts.length >= 1);
      const usatAmount = intent.entities.amounts.find(a => a.currency === 'USAT');
      assert.ok(usatAmount);
      assert.equal(usatAmount!.value, 10);
    });

    it('finds TON amounts (3 TON)', async () => {
      const intent = await ai.detectIntent('send 3 TON');
      assert.ok(intent.entities.amounts.length >= 1);
      const tonAmount = intent.entities.amounts.find(a => a.currency === 'TON');
      assert.ok(tonAmount);
      assert.equal(tonAmount!.value, 3);
    });
  });

  // ── extractEntities — Addresses ──

  describe('extractEntities — addresses', () => {
    it('finds EVM addresses (0x...)', async () => {
      const intent = await ai.detectIntent('send to 0x1234567890abcdef1234567890abcdef12345678');
      assert.ok(intent.entities.addresses.length >= 1);
      assert.equal(intent.entities.addresses[0].type, 'evm');
      assert.equal(intent.entities.addresses[0].value, '0x1234567890abcdef1234567890abcdef12345678');
    });

    it('finds TON addresses (UQ...)', async () => {
      const addr = 'UQ' + 'a'.repeat(46);
      const intent = await ai.detectIntent(`send to ${addr}`);
      assert.ok(intent.entities.addresses.length >= 1);
      assert.equal(intent.entities.addresses[0].type, 'ton');
    });

    it('finds TRON addresses (T...)', async () => {
      const addr = 'T' + 'a'.repeat(33);
      const intent = await ai.detectIntent(`send to ${addr}`);
      assert.ok(intent.entities.addresses.length >= 1);
      assert.equal(intent.entities.addresses[0].type, 'tron');
    });
  });

  // ── extractEntities — Creators ──

  describe('extractEntities — creators', () => {
    it('finds @mention creators', async () => {
      const intent = await ai.detectIntent('tip @CryptoDaily $5');
      assert.ok(intent.entities.creators.length >= 1);
      assert.ok(intent.entities.creators.includes('CryptoDaily'));
    });

    it('finds multiple @mentions', async () => {
      const intent = await ai.detectIntent('tip @Alice and @Bob');
      assert.ok(intent.entities.creators.length >= 2);
    });
  });

  // ── extractEntities — Chains ──

  describe('extractEntities — chains', () => {
    it('detects ethereum chain', async () => {
      const intent = await ai.detectIntent('send on ethereum');
      assert.ok(intent.entities.chains.includes('ethereum-sepolia'));
    });

    it('detects ton chain', async () => {
      const intent = await ai.detectIntent('use TON network');
      assert.ok(intent.entities.chains.includes('ton-testnet'));
    });

    it('detects tron chain', async () => {
      const intent = await ai.detectIntent('send via tron');
      assert.ok(intent.entities.chains.includes('tron-nile'));
    });
  });

  // ── regexDetectIntent — All 13 intents ──

  describe('regexDetectIntent — intent classification', () => {
    it('classifies "send 10 USDT" as tip', async () => {
      const result = await ai.detectIntent('send 10 USDT to creator');
      assert.equal(result.intent, 'tip');
    });

    it('classifies "check my balance" as check_balance', async () => {
      const result = await ai.detectIntent('check my balance');
      assert.equal(result.intent, 'check_balance');
    });

    it('classifies "show history" as view_history', async () => {
      const result = await ai.detectIntent('show my past transactions history log');
      assert.equal(result.intent, 'view_history');
    });

    it('classifies "find creator" as find_creator', async () => {
      const result = await ai.detectIntent('find creator CryptoDaily');
      assert.equal(result.intent, 'find_creator');
    });

    it('classifies "what can you do" as help', async () => {
      const result = await ai.detectIntent('what can you do help');
      assert.equal(result.intent, 'help');
    });

    it('classifies "bridge tokens" as bridge', async () => {
      const result = await ai.detectIntent('cross-chain bridge to polygon');
      assert.equal(result.intent, 'bridge');
    });

    it('classifies "swap ETH for USDT" as swap', async () => {
      const result = await ai.detectIntent('swap ETH for USDT');
      assert.equal(result.intent, 'swap');
    });

    it('classifies "lend my USDT" as lend', async () => {
      const result = await ai.detectIntent('lend USDT for yield');
      assert.equal(result.intent, 'lend');
    });

    it('classifies "compare fees" as fees', async () => {
      const result = await ai.detectIntent('compare fees across chains');
      assert.equal(result.intent, 'fees');
    });

    it('classifies "deposit address" as address', async () => {
      const result = await ai.detectIntent('where can i receive deposit address');
      assert.equal(result.intent, 'address');
    });

    it('classifies gibberish as unknown', async () => {
      const result = await ai.detectIntent('xyzzy foobar baz');
      assert.equal(result.intent, 'unknown');
    });

    it('classifies "agent status" as check_status', async () => {
      const result = await ai.detectIntent('what is the agent status');
      assert.equal(result.intent, 'check_status');
    });

    it('classifies "show analytics" as analytics', async () => {
      const result = await ai.detectIntent('show me analytics and stats');
      assert.equal(result.intent, 'analytics');
    });

    it('includes confidence score between 0 and 1', async () => {
      const result = await ai.detectIntent('send 10 USDT');
      assert.ok(result.confidence >= 0 && result.confidence <= 1);
    });

    it('includes reasoning string', async () => {
      const result = await ai.detectIntent('check balance');
      assert.equal(typeof result.reasoning, 'string');
      assert.ok(result.reasoning.length > 0);
    });
  });

  // ── analyzeContent ──

  describe('analyzeContent()', () => {
    it('returns sentiment analysis', () => {
      const result = ai.analyzeContent('This is great and amazing content');
      assert.ok(result.sentiment);
      assert.ok(['positive', 'negative', 'neutral'].includes(result.sentiment.label));
      assert.equal(typeof result.sentiment.score, 'number');
      assert.ok(result.sentiment.score >= 0 && result.sentiment.score <= 1);
    });

    it('detects positive sentiment', () => {
      const result = ai.analyzeContent('excellent wonderful amazing great perfect');
      assert.equal(result.sentiment.label, 'positive');
    });

    it('detects negative sentiment', () => {
      const result = ai.analyzeContent('terrible horrible awful bad worst');
      assert.equal(result.sentiment.label, 'negative');
    });

    it('returns topics array', () => {
      const result = ai.analyzeContent('bitcoin ethereum defi yield farming');
      assert.ok(Array.isArray(result.topics));
    });

    it('returns key phrases', () => {
      const result = ai.analyzeContent('send 10 USDT to the creator');
      assert.ok(Array.isArray(result.keyPhrases));
    });

    it('returns word count', () => {
      const result = ai.analyzeContent('one two three four five');
      assert.equal(typeof result.wordCount, 'number');
      assert.equal(result.wordCount, 5);
    });

    it('returns language as en', () => {
      const result = ai.analyzeContent('hello world');
      assert.equal(result.language, 'en');
    });
  });

  // ── getRuleBasedCapabilities ──

  describe('getRuleBasedCapabilities()', () => {
    it('returns capabilities structure', () => {
      const caps = ai.getRuleBasedCapabilities();
      assert.ok(caps);
      assert.equal(caps.engine, 'AeroFyta Rule-Based Intelligence Engine');
      assert.equal(caps.version, '2.0.0');
      assert.equal(caps.provider, 'rule-based');
      assert.ok(Array.isArray(caps.intents));
      assert.ok(caps.intents.length >= 10, 'Should have at least 10 intent types');
      assert.ok(Array.isArray(caps.entityTypes));
      assert.ok(Array.isArray(caps.analysisFeatures));
      assert.ok(Array.isArray(caps.limitations));
    });

    it('intents have name and description', () => {
      const caps = ai.getRuleBasedCapabilities();
      for (const intent of caps.intents) {
        assert.equal(typeof intent.name, 'string');
        assert.equal(typeof intent.description, 'string');
      }
    });
  });
});

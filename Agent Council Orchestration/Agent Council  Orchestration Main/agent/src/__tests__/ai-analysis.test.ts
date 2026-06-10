/**
 * Tests for ai-analysis.ts — analyzeContent, POSITIVE_WORDS, NEGATIVE_WORDS.
 * Pure function tests — no WDK required.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeContent, POSITIVE_WORDS, NEGATIVE_WORDS, TOPIC_KEYWORDS } from '../services/ai-analysis.js';

describe('POSITIVE_WORDS and NEGATIVE_WORDS', () => {
  it('POSITIVE_WORDS is a non-empty Set', () => {
    assert.ok(POSITIVE_WORDS instanceof Set);
    assert.ok(POSITIVE_WORDS.size > 10);
  });

  it('NEGATIVE_WORDS is a non-empty Set', () => {
    assert.ok(NEGATIVE_WORDS instanceof Set);
    assert.ok(NEGATIVE_WORDS.size > 10);
  });

  it('TOPIC_KEYWORDS has expected keys', () => {
    assert.ok('finance' in TOPIC_KEYWORDS);
    assert.ok('technical' in TOPIC_KEYWORDS);
    assert.ok('general' in TOPIC_KEYWORDS);
  });
});

describe('analyzeContent', () => {
  it('detects positive sentiment', () => {
    const result = analyzeContent('This is amazing and wonderful, I love it');
    assert.equal(result.sentiment.label, 'positive');
    assert.ok(result.sentiment.score > 0.5);
  });

  it('detects negative sentiment', () => {
    const result = analyzeContent('This is terrible and awful, I hate this broken scam');
    assert.equal(result.sentiment.label, 'negative');
    assert.ok(result.sentiment.score < 0.5);
  });

  it('detects neutral sentiment', () => {
    const result = analyzeContent('The cat sat on the mat');
    assert.equal(result.sentiment.label, 'neutral');
  });

  it('identifies finance topics', () => {
    const result = analyzeContent('Check the wallet balance and gas fee for the transaction');
    assert.ok(result.topics.some(t => t.name === 'finance'));
  });

  it('identifies technical topics', () => {
    const result = analyzeContent('Deploy the smart contract on the testnet node');
    assert.ok(result.topics.some(t => t.name === 'technical'));
  });

  it('extracts key phrases', () => {
    const result = analyzeContent('send 10 USDT to Alice for her great content');
    assert.ok(result.keyPhrases.length > 0);
  });

  it('returns word count', () => {
    const result = analyzeContent('one two three four five');
    assert.equal(result.wordCount, 5);
  });

  it('returns language as en', () => {
    const result = analyzeContent('hello world');
    assert.equal(result.language, 'en');
  });

  it('handles empty text gracefully', () => {
    const result = analyzeContent('');
    assert.equal(result.sentiment.label, 'neutral');
    assert.equal(result.wordCount, 0);
  });
});

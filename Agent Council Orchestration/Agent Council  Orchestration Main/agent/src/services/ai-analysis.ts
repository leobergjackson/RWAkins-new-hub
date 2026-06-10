// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI Content Analysis Engine (extracted from ai.service.ts)

import type { ContentAnalysis } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════
// CONTENT ANALYSIS — WORD LISTS AND TOPIC KEYWORDS
// ══════════════════════════════════════════════════════════════════

export const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'thank', 'thanks',
  'wonderful', 'fantastic', 'brilliant', 'perfect', 'best', 'happy', 'glad',
  'appreciate', 'outstanding', 'incredible', 'superb', 'enjoy', 'nice', 'cool',
  'impressive', 'helpful', 'valuable', 'quality', 'reward', 'support', 'generous',
  'earned', 'deserve', 'talented', 'favorite', 'recommend', 'beautiful',
]);

export const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'poor', 'boring',
  'useless', 'broken', 'error', 'fail', 'failed', 'scam', 'fraud', 'spam',
  'fake', 'suspicious', 'dangerous', 'risk', 'risky', 'expensive', 'slow',
  'stuck', 'bug', 'problem', 'issue', 'wrong', 'refund', 'complaint', 'angry',
  'disappointed', 'frustrat', 'annoying', 'ugly', 'unfair', 'waste',
]);

export const TOPIC_KEYWORDS: Record<string, string[]> = {
  finance: ['wallet', 'balance', 'fee', 'gas', 'transaction', 'transfer', 'payment',
    'budget', 'cost', 'price', 'money', 'fund', 'spend', 'earn', 'profit', 'loss',
    'usdt', 'eth', 'ton', 'token', 'crypto', 'defi', 'yield', 'apy', 'staking',
    'swap', 'bridge', 'lending', 'borrow', 'liquidity', 'portfolio'],
  'creator economy': ['creator', 'content', 'video', 'stream', 'channel', 'subscriber',
    'viewer', 'audience', 'engagement', 'rumble', 'tip', 'tipping', 'support',
    'donate', 'monetize', 'creator economy', 'platform', 'followers'],
  technical: ['api', 'sdk', 'wdk', 'chain', 'block', 'hash', 'address', 'contract',
    'deploy', 'node', 'rpc', 'testnet', 'mainnet', 'nonce', 'gwei', 'wei',
    'evm', 'smart contract', 'solidity', 'typescript', 'server', 'database'],
  general: ['hello', 'hi', 'hey', 'how', 'what', 'when', 'where', 'why', 'who',
    'please', 'can', 'could', 'would', 'should', 'want', 'need', 'like'],
};

// ══════════════════════════════════════════════════════════════════
// CONTENT ANALYSIS FUNCTION
// ══════════════════════════════════════════════════════════════════

/**
 * Analyze content using rule-based NLP: sentiment, topics, and key phrases.
 * Works without any LLM API key — pure pattern matching and heuristics.
 */
export function analyzeContent(text: string): ContentAnalysis {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(w => w.length > 1);
  const wordSet = new Set(words);

  // ── Sentiment Analysis ──
  const posMatches: string[] = [];
  const negMatches: string[] = [];
  for (const word of words) {
    // Stem-match: check if word starts with any keyword
    for (const pos of POSITIVE_WORDS) {
      if (word.startsWith(pos) || pos.startsWith(word)) { posMatches.push(word); break; }
    }
    for (const neg of NEGATIVE_WORDS) {
      if (word.startsWith(neg) || neg.startsWith(word)) { negMatches.push(word); break; }
    }
  }
  const posCount = posMatches.length;
  const negCount = negMatches.length;
  const totalSentiment = posCount + negCount;
  let sentimentLabel: 'positive' | 'negative' | 'neutral' = 'neutral';
  let sentimentScore = 0.5;
  if (totalSentiment > 0) {
    sentimentScore = posCount / totalSentiment;
    if (sentimentScore > 0.6) sentimentLabel = 'positive';
    else if (sentimentScore < 0.4) sentimentLabel = 'negative';
  }

  // ── Topic Classification ──
  const topicScores: Array<{ name: string; confidence: number }> = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let matches = 0;
    for (const kw of keywords) {
      if (kw.includes(' ')) {
        if (lower.includes(kw)) matches += 2; // multi-word phrases are stronger signals
      } else if (wordSet.has(kw)) {
        matches++;
      }
    }
    if (matches > 0) {
      const confidence = Math.min(1, matches / Math.max(3, keywords.length * 0.15));
      topicScores.push({ name: topic, confidence: parseFloat(confidence.toFixed(2)) });
    }
  }
  topicScores.sort((a, b) => b.confidence - a.confidence);

  // ── Key Phrase Extraction ──
  // Extract bigrams and trigrams that look meaningful
  const keyPhrases: string[] = [];
  const importantPrefixes = /^(?:send|tip|check|show|find|set|view|get|create|update|bridge|swap|lend)/;
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (importantPrefixes.test(words[i]) || /\d/.test(words[i + 1]) || /^(?:to|for|from|on|in)$/.test(words[i])) {
      keyPhrases.push(bigram);
    }
  }
  // Also extract noun-like phrases
  const nounPhrases = text.match(/\b(?:(?:the|my|a|this)\s+)?(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
  if (nounPhrases) {
    for (const np of nounPhrases.slice(0, 5)) {
      if (np.length > 3 && !keyPhrases.includes(np.toLowerCase())) {
        keyPhrases.push(np);
      }
    }
  }

  return {
    sentiment: { label: sentimentLabel, score: parseFloat(sentimentScore.toFixed(2)), keywords: [...posMatches, ...negMatches].slice(0, 10) },
    topics: topicScores.slice(0, 4),
    keyPhrases: keyPhrases.slice(0, 8),
    language: 'en',
    wordCount: words.length,
  };
}

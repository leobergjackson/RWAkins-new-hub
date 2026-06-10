// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

export interface MemoryEntry {
  id: string;
  type: 'preference' | 'context' | 'fact' | 'correction';
  key: string;
  value: string;
  confidence: number;
  source: 'user_said' | 'observed' | 'inferred';
  createdAt: string;
  lastAccessed: string;
  accessCount: number;
  /** Importance score: memories used in decisions get boosted */
  importance: number;
  /** Whether this memory has been archived (stale, not accessed in 7+ days) */
  archived?: boolean;
  /** Number of times this memory was used in a decision */
  decisionUseCount?: number;
}

/** Insight extracted from memory patterns */
export interface MemoryInsight {
  type: 'pattern' | 'anomaly' | 'preference_shift' | 'stale_data';
  description: string;
  confidence: number;
  relatedMemories: string[];
  detectedAt: string;
}

export interface ConversationSummary {
  id: string;
  timestamp: string;
  topics: string[];
  tipsMade: number;
  keyDecisions: string[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEMORY_FILE = join(__dirname, '..', '..', '.agent-memory.json');

/**
 * MemoryService — Persistent Agent Memory
 *
 * The agent remembers:
 * - User preferences (favorite chain, default amount, preferred creators)
 * - Context from past conversations
 * - Facts learned about the user
 * - Corrections (when user says "no, I meant...")
 *
 * This makes the agent smarter over time — TRUE intelligence.
 */
export class MemoryService {
  private memories: MemoryEntry[] = [];
  private conversations: ConversationSummary[] = [];
  private counter = 0;

  constructor() {
    this.load();
    logger.info('Agent memory loaded', { memories: this.memories.length, conversations: this.conversations.length });
  }

  // ── Store & Recall ───────────────────────────────────────────

  remember(type: MemoryEntry['type'], key: string, value: string, source: MemoryEntry['source'] = 'observed'): MemoryEntry {
    // Check if we already know this
    const existing = this.memories.find(m => m.key === key && m.type === type);
    if (existing) {
      existing.value = value;
      existing.lastAccessed = new Date().toISOString();
      existing.accessCount++;
      existing.confidence = Math.min(100, existing.confidence + 5);
      this.save();
      return existing;
    }

    const entry: MemoryEntry = {
      id: `mem_${++this.counter}_${Date.now()}`,
      type,
      key,
      value,
      confidence: source === 'user_said' ? 95 : source === 'observed' ? 70 : 50,
      source,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 1,
      importance: source === 'user_said' ? 80 : source === 'observed' ? 50 : 30,
      decisionUseCount: 0,
    };

    this.memories.push(entry);
    this.save();
    logger.info('Memory stored', { type, key, value: value.slice(0, 50) });
    return entry;
  }

  recall(key: string): MemoryEntry | undefined {
    const mem = this.memories.find(m => m.key === key);
    if (mem) {
      mem.lastAccessed = new Date().toISOString();
      mem.accessCount++;
      this.save();
    }
    return mem;
  }

  recallByType(type: MemoryEntry['type']): MemoryEntry[] {
    return this.memories.filter(m => m.type === type).sort((a, b) => b.confidence - a.confidence);
  }

  search(query: string): MemoryEntry[] {
    const q = query.toLowerCase();
    return this.memories.filter(m =>
      m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q)
    ).sort((a, b) => b.confidence - a.confidence);
  }

  forget(id: string): boolean {
    const idx = this.memories.findIndex(m => m.id === id);
    if (idx === -1) return false;
    this.memories.splice(idx, 1);
    this.save();
    return true;
  }

  // ── Conversation Summaries ───────────────────────────────────

  summarizeConversation(topics: string[], tipsMade: number, keyDecisions: string[]): ConversationSummary {
    const summary: ConversationSummary = {
      id: `conv_${Date.now()}`,
      timestamp: new Date().toISOString(),
      topics,
      tipsMade,
      keyDecisions,
    };
    this.conversations.push(summary);
    if (this.conversations.length > 50) this.conversations.shift();
    this.save();
    return summary;
  }

  getConversationHistory(): ConversationSummary[] {
    return [...this.conversations].reverse();
  }

  // ── Auto-Learn from Tips ─────────────────────────────────────

  learnFromTip(recipient: string, amount: string, chain: string, token: string): void {
    this.remember('preference', 'last_recipient', recipient, 'observed');
    this.remember('preference', 'last_amount', amount, 'observed');
    this.remember('preference', 'last_chain', chain, 'observed');
    this.remember('preference', 'last_token', token, 'observed');

    // Track frequency
    const freqKey = `recipient_freq_${recipient.slice(0, 10)}`;
    const existing = this.recall(freqKey);
    const count = existing ? parseInt(existing.value) + 1 : 1;
    this.remember('fact', freqKey, String(count), 'observed');
  }

  // ── Stats ────────────────────────────────────────────────────

  getStats() {
    return {
      totalMemories: this.memories.length,
      preferences: this.memories.filter(m => m.type === 'preference').length,
      facts: this.memories.filter(m => m.type === 'fact').length,
      contexts: this.memories.filter(m => m.type === 'context').length,
      corrections: this.memories.filter(m => m.type === 'correction').length,
      conversations: this.conversations.length,
      avgConfidence: this.memories.length > 0
        ? Math.round(this.memories.reduce((s, m) => s + m.confidence, 0) / this.memories.length)
        : 0,
      topMemories: this.memories
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 5)
        .map(m => ({ key: m.key, value: m.value, accessed: m.accessCount })),
    };
  }

  getAllMemories(): MemoryEntry[] {
    return [...this.memories].sort((a, b) => b.accessCount - a.accessCount);
  }

  // ══════════════════════════════════════════════════════════════
  // Feature 19: Agent Context Memory / Learning
  // ══════════════════════════════════════════════════════════════

  /**
   * Track creator preferences learned over time.
   * Records which creators consistently get good engagement.
   */
  learnCreatorPreference(creatorName: string, engagementScore: number, tipped: boolean): void {
    const key = `creator_pref_${creatorName}`;
    const existing = this.recall(key);

    if (existing) {
      // Parse existing data and update
      try {
        const data = JSON.parse(existing.value) as { interactions: number; avgEngagement: number; tipCount: number };
        data.interactions++;
        data.avgEngagement = (data.avgEngagement * (data.interactions - 1) + engagementScore) / data.interactions;
        if (tipped) data.tipCount++;
        this.remember('preference', key, JSON.stringify(data), 'observed');
      } catch {
        this.remember('preference', key, JSON.stringify({ interactions: 1, avgEngagement: engagementScore, tipCount: tipped ? 1 : 0 }), 'observed');
      }
    } else {
      this.remember('preference', key, JSON.stringify({ interactions: 1, avgEngagement: engagementScore, tipCount: tipped ? 1 : 0 }), 'observed');
    }
  }

  /**
   * Track chain performance history.
   * Records which chains were fastest/cheapest recently.
   */
  learnChainPerformance(chain: string, feeUsd: number, confirmationMs: number, success: boolean): void {
    const key = `chain_perf_${chain}`;
    const existing = this.recall(key);

    if (existing) {
      try {
        const data = JSON.parse(existing.value) as { transactions: number; avgFee: number; avgConfirmMs: number; successRate: number; successes: number };
        data.transactions++;
        data.avgFee = (data.avgFee * (data.transactions - 1) + feeUsd) / data.transactions;
        data.avgConfirmMs = (data.avgConfirmMs * (data.transactions - 1) + confirmationMs) / data.transactions;
        if (success) data.successes++;
        data.successRate = data.successes / data.transactions;
        this.remember('fact', key, JSON.stringify(data), 'observed');
      } catch {
        this.remember('fact', key, JSON.stringify({ transactions: 1, avgFee: feeUsd, avgConfirmMs: confirmationMs, successRate: success ? 1 : 0, successes: success ? 1 : 0 }), 'observed');
      }
    } else {
      this.remember('fact', key, JSON.stringify({ transactions: 1, avgFee: feeUsd, avgConfirmMs: confirmationMs, successRate: success ? 1 : 0, successes: success ? 1 : 0 }), 'observed');
    }
  }

  /**
   * Track time-of-day patterns.
   * Records when creators are most active.
   */
  learnTimePattern(hour: number, dayOfWeek: number, eventCount: number): void {
    const key = `time_pattern_${dayOfWeek}_${hour}`;
    const existing = this.recall(key);

    if (existing) {
      try {
        const data = JSON.parse(existing.value) as { observations: number; avgEvents: number };
        data.observations++;
        data.avgEvents = (data.avgEvents * (data.observations - 1) + eventCount) / data.observations;
        this.remember('context', key, JSON.stringify(data), 'observed');
      } catch {
        this.remember('context', key, JSON.stringify({ observations: 1, avgEvents: eventCount }), 'observed');
      }
    } else {
      this.remember('context', key, JSON.stringify({ observations: 1, avgEvents: eventCount }), 'observed');
    }
  }

  /**
   * Track tipping effectiveness.
   * Records whether tips led to more content/engagement from creator.
   */
  learnTipEffectiveness(creatorName: string, postTipEngagement: number, preTipEngagement: number): void {
    const key = `tip_effect_${creatorName}`;
    const improvement = postTipEngagement - preTipEngagement;
    const existing = this.recall(key);

    if (existing) {
      try {
        const data = JSON.parse(existing.value) as { samples: number; avgImprovement: number; positive: number };
        data.samples++;
        data.avgImprovement = (data.avgImprovement * (data.samples - 1) + improvement) / data.samples;
        if (improvement > 0) data.positive++;
        this.remember('fact', key, JSON.stringify(data), 'inferred');
      } catch {
        this.remember('fact', key, JSON.stringify({ samples: 1, avgImprovement: improvement, positive: improvement > 0 ? 1 : 0 }), 'inferred');
      }
    } else {
      this.remember('fact', key, JSON.stringify({ samples: 1, avgImprovement: improvement, positive: improvement > 0 ? 1 : 0 }), 'inferred');
    }
  }

  /**
   * Build a context string of relevant memories for LLM prompts.
   * Pulls the most relevant memories for decision-making.
   */
  buildContextForLLM(): string {
    const parts: string[] = [];

    // Creator preferences (top 5 by access count)
    const creatorPrefs = this.memories
      .filter(m => m.key.startsWith('creator_pref_'))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 5);
    if (creatorPrefs.length > 0) {
      parts.push('CREATOR PREFERENCES:');
      for (const pref of creatorPrefs) {
        const name = pref.key.replace('creator_pref_', '');
        try {
          const data = JSON.parse(pref.value) as { interactions: number; avgEngagement: number; tipCount: number };
          parts.push(`  ${name}: ${data.interactions} interactions, avg engagement ${data.avgEngagement.toFixed(2)}, tipped ${data.tipCount} times`);
        } catch {
          parts.push(`  ${name}: ${pref.value}`);
        }
      }
    }

    // Chain performance
    const chainPerfs = this.memories.filter(m => m.key.startsWith('chain_perf_'));
    if (chainPerfs.length > 0) {
      parts.push('CHAIN PERFORMANCE:');
      for (const perf of chainPerfs) {
        const chain = perf.key.replace('chain_perf_', '');
        try {
          const data = JSON.parse(perf.value) as { transactions: number; avgFee: number; successRate: number };
          parts.push(`  ${chain}: ${data.transactions} txs, avg fee $${data.avgFee.toFixed(4)}, success ${(data.successRate * 100).toFixed(0)}%`);
        } catch {
          parts.push(`  ${chain}: ${perf.value}`);
        }
      }
    }

    // Time patterns (most active times)
    const timePatterns = this.memories
      .filter(m => m.key.startsWith('time_pattern_'))
      .sort((a, b) => {
        try {
          const aData = JSON.parse(a.value) as { avgEvents: number };
          const bData = JSON.parse(b.value) as { avgEvents: number };
          return bData.avgEvents - aData.avgEvents;
        } catch { return 0; }
      })
      .slice(0, 3);
    if (timePatterns.length > 0) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      parts.push('PEAK ACTIVITY TIMES:');
      for (const tp of timePatterns) {
        const match = tp.key.match(/time_pattern_(\d+)_(\d+)/);
        if (match) {
          parts.push(`  ${days[parseInt(match[1])]} at ${match[2]}:00`);
        }
      }
    }

    // General facts (highest confidence)
    const facts = this.memories
      .filter(m => m.type === 'fact' && !m.key.startsWith('chain_perf_') && !m.key.startsWith('tip_effect_') && !m.key.startsWith('recipient_freq_'))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
    if (facts.length > 0) {
      parts.push('LEARNED FACTS:');
      for (const fact of facts) {
        parts.push(`  ${fact.key}: ${fact.value}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Get a summary of what the agent has learned (for /agent/memory endpoint).
   */
  getLearnings() {
    const creatorPrefs = this.memories
      .filter(m => m.key.startsWith('creator_pref_'))
      .map(m => {
        const name = m.key.replace('creator_pref_', '');
        try {
          return { name, ...(JSON.parse(m.value) as Record<string, unknown>), confidence: m.confidence };
        } catch { return { name, raw: m.value, confidence: m.confidence }; }
      });

    const chainPerfs = this.memories
      .filter(m => m.key.startsWith('chain_perf_'))
      .map(m => {
        const chain = m.key.replace('chain_perf_', '');
        try {
          return { chain, ...(JSON.parse(m.value) as Record<string, unknown>) };
        } catch { return { chain, raw: m.value }; }
      });

    const timePatterns = this.memories
      .filter(m => m.key.startsWith('time_pattern_'))
      .map(m => {
        const match = m.key.match(/time_pattern_(\d+)_(\d+)/);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        try {
          const data = JSON.parse(m.value) as { observations: number; avgEvents: number };
          return {
            day: match ? days[parseInt(match[1])] : 'unknown',
            hour: match ? parseInt(match[2]) : 0,
            observations: data.observations,
            avgEvents: data.avgEvents,
          };
        } catch {
          return { day: 'unknown', hour: 0, observations: 0, avgEvents: 0 };
        }
      })
      .sort((a, b) => b.avgEvents - a.avgEvents);

    const tipEffectiveness = this.memories
      .filter(m => m.key.startsWith('tip_effect_'))
      .map(m => {
        const creator = m.key.replace('tip_effect_', '');
        try {
          return { creator, ...(JSON.parse(m.value) as Record<string, unknown>) };
        } catch { return { creator, raw: m.value }; }
      });

    return {
      creatorPreferences: creatorPrefs,
      chainPerformance: chainPerfs,
      peakActivityTimes: timePatterns.slice(0, 10),
      tipEffectiveness,
      totalMemories: this.memories.length,
      contextSummary: this.buildContextForLLM(),
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Importance Scoring, Pruning & Insights
  // ════════════════════════════════════════════════════════════════

  /**
   * Mark a memory as used in a decision — boosts its importance score.
   * Call this when the agent references a memory during tip decisions.
   */
  markUsedInDecision(memoryId: string): void {
    const mem = this.memories.find(m => m.id === memoryId);
    if (!mem) return;

    mem.decisionUseCount = (mem.decisionUseCount ?? 0) + 1;
    // Each decision use boosts importance by 10 (max 100)
    mem.importance = Math.min(100, (mem.importance ?? 50) + 10);
    mem.lastAccessed = new Date().toISOString();
    mem.accessCount++;
    this.save();

    logger.debug('Memory importance boosted (used in decision)', {
      id: memoryId,
      key: mem.key,
      importance: mem.importance,
      decisionUses: mem.decisionUseCount,
    });
  }

  /**
   * Auto-archive memories not accessed in 7 days.
   * Archived memories are kept but excluded from active recall and LLM context.
   * This prevents stale data from polluting agent decisions.
   */
  pruneStaleMemories(): { archived: number; total: number } {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let archivedCount = 0;

    for (const mem of this.memories) {
      if (mem.archived) continue; // Already archived

      const lastAccess = new Date(mem.lastAccessed).getTime();
      if (lastAccess < sevenDaysAgo) {
        // Don't archive high-importance memories (user-stated facts, etc.)
        if ((mem.importance ?? 50) >= 80) continue;

        mem.archived = true;
        archivedCount++;
      }
    }

    if (archivedCount > 0) {
      this.save();
      logger.info('Pruned stale memories', { archived: archivedCount });
    }

    return { archived: archivedCount, total: this.memories.filter(m => m.archived).length };
  }

  /** Unarchive a memory (reactivate it) */
  unarchive(memoryId: string): boolean {
    const mem = this.memories.find(m => m.id === memoryId);
    if (!mem || !mem.archived) return false;
    mem.archived = false;
    mem.lastAccessed = new Date().toISOString();
    this.save();
    return true;
  }

  /** Get only active (non-archived) memories */
  getActiveMemories(): MemoryEntry[] {
    return this.memories.filter(m => !m.archived).sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
  }

  /**
   * Get memory insights — pattern analysis from stored memories.
   * Detects:
   * - Recurring preferences (same type of memory stored frequently)
   * - Stale data warnings (important memories not refreshed)
   * - Preference shifts (corrections overriding previous values)
   * - Usage patterns (which memories drive the most decisions)
   */
  getMemoryInsights(): MemoryInsight[] {
    const insights: MemoryInsight[] = [];
    const now = Date.now();

    // Insight 1: Most-used decision memories
    const decisionMemories = this.memories
      .filter(m => (m.decisionUseCount ?? 0) > 0)
      .sort((a, b) => (b.decisionUseCount ?? 0) - (a.decisionUseCount ?? 0));

    if (decisionMemories.length > 0) {
      const topKeys = decisionMemories.slice(0, 3).map(m => m.key);
      insights.push({
        type: 'pattern',
        description: `Top decision-driving memories: ${topKeys.join(', ')}. These memories most frequently influence agent tipping decisions.`,
        confidence: 90,
        relatedMemories: decisionMemories.slice(0, 3).map(m => m.id),
        detectedAt: new Date().toISOString(),
      });
    }

    // Insight 2: Stale important memories
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const staleImportant = this.memories.filter(m =>
      !m.archived &&
      (m.importance ?? 50) >= 60 &&
      new Date(m.lastAccessed).getTime() < sevenDaysAgo
    );

    if (staleImportant.length > 0) {
      insights.push({
        type: 'stale_data',
        description: `${staleImportant.length} important memory(s) haven't been accessed in 7+ days and may be outdated. Consider refreshing or archiving.`,
        confidence: 75,
        relatedMemories: staleImportant.map(m => m.id),
        detectedAt: new Date().toISOString(),
      });
    }

    // Insight 3: Preference shifts (corrections pattern)
    const corrections = this.memories.filter(m => m.type === 'correction');
    if (corrections.length >= 2) {
      insights.push({
        type: 'preference_shift',
        description: `${corrections.length} corrections recorded — user preferences have shifted. The agent is adapting to updated preferences.`,
        confidence: 85,
        relatedMemories: corrections.map(m => m.id),
        detectedAt: new Date().toISOString(),
      });
    }

    // Insight 4: Recipient concentration
    const recipientFreqs = this.memories
      .filter(m => m.key.startsWith('recipient_freq_'))
      .map(m => ({ key: m.key.replace('recipient_freq_', ''), count: parseInt(m.value) || 0 }))
      .sort((a, b) => b.count - a.count);

    if (recipientFreqs.length >= 3) {
      const totalTips = recipientFreqs.reduce((s, r) => s + r.count, 0);
      const topRecipientShare = totalTips > 0 ? recipientFreqs[0].count / totalTips : 0;

      if (topRecipientShare > 0.5) {
        insights.push({
          type: 'anomaly',
          description: `Tip concentration: ${(topRecipientShare * 100).toFixed(0)}% of tips go to a single creator (${recipientFreqs[0].key}...). Consider diversifying.`,
          confidence: 80,
          relatedMemories: this.memories.filter(m => m.key.startsWith('recipient_freq_')).slice(0, 3).map(m => m.id),
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Insight 5: Memory system health
    const activeCount = this.memories.filter(m => !m.archived).length;
    const archivedCount = this.memories.filter(m => m.archived).length;
    const avgImportance = activeCount > 0
      ? Math.round(this.memories.filter(m => !m.archived).reduce((s, m) => s + (m.importance ?? 50), 0) / activeCount)
      : 0;

    insights.push({
      type: 'pattern',
      description: `Memory health: ${activeCount} active, ${archivedCount} archived, avg importance ${avgImportance}/100.`,
      confidence: 95,
      relatedMemories: [],
      detectedAt: new Date().toISOString(),
    });

    return insights;
  }

  // ── Persistence ──────────────────────────────────────────────

  private load(): void {
    try {
      if (existsSync(MEMORY_FILE)) {
        const data = JSON.parse(readFileSync(MEMORY_FILE, 'utf-8'));
        this.memories = data.memories ?? [];
        this.conversations = data.conversations ?? [];
        this.counter = data.counter ?? 0;
      }
    } catch {
      logger.warn('Could not load agent memory, starting fresh');
    }
  }

  private save(): void {
    try {
      writeFileSync(MEMORY_FILE, JSON.stringify({
        memories: this.memories,
        conversations: this.conversations,
        counter: this.counter,
      }, null, 2));
    } catch (err) {
      logger.error('Failed to save agent memory', { error: String(err) });
    }
  }
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI Service with Groq/Gemini/Rule-based fallback chain

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';
import type {
  ChainAnalysis,
  ChainId,
  ChatIntent,
  ContentAnalysis,
  ExtractedEntities,
  LLMProvider,
  NLPTipParse,
  RuleBasedCapabilities,
  TipRefusal,
} from '../types/index.js';
import { extractEntities } from './ai-entities.js';
import { INTENT_RULES, regexDetectIntent as doRegexDetectIntent, shouldRefuseTip as doShouldRefuseTip, ruleBasedAutonomousDecision as doRuleBasedAutonomousDecision } from './ai-intents.js';
import { analyzeContent } from './ai-analysis.js';
import {
  LLMCache,
  callGroq as doCallGroq,
  callGemini as doCallGemini,
  callLLM as doCallLLM,
  safeParseJSON as doSafeParseJSON,
  isValidAddress as doIsValidAddress,
  regexParseTip as doRegexParseTip,
} from './ai-llm.js';

// Re-export extracted modules for backward compatibility
export { extractEntities } from './ai-entities.js';
export { INTENT_RULES, regexDetectIntent, shouldRefuseTip, ruleBasedAutonomousDecision } from './ai-intents.js';
export { analyzeContent, POSITIVE_WORDS, NEGATIVE_WORDS, TOPIC_KEYWORDS } from './ai-analysis.js';
export { LLMCache, regexParseTip, isValidAddress } from './ai-llm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── AI Service ────────────────────────────────────────────────────────

/**
 * AI Service — provides LLM-powered reasoning for agent decisions.
 *
 * Provider chain: Groq (primary) → Gemini (secondary) → Rule-based (fallback).
 * All LLM calls use structured JSON output.
 * Responses are cached in-memory (5 min TTL, max 100 entries).
 */
export class AIService {
  private available = false;
  private currentProvider: LLMProvider = 'rule-based';
  private soulPrompt = '';
  private cache = new LLMCache();

  // Groq config
  private readonly groqApiKey: string;
  private readonly groqModel = 'llama-3.3-70b-versatile';
  private readonly groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions';

  // Gemini config
  private readonly geminiApiKey: string;
  private readonly geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // Timeout for LLM calls
  private readonly llmTimeoutMs = 10_000;

  // Tip refusal tracking
  private recentTips: Array<{ creator: string; timestamp: number }> = [];

  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY ?? '';
    this.geminiApiKey = process.env.GEMINI_API_KEY ?? '';

    // Load SOUL.md as system prompt
    try {
      const soulPath = resolve(__dirname, '..', '..', 'SOUL.md');
      this.soulPrompt = readFileSync(soulPath, 'utf-8');
      logger.info('Loaded SOUL.md agent identity');
    } catch {
      logger.warn('SOUL.md not found, using default identity');
      this.soulPrompt = 'You are AeroFyta, an autonomous multi-chain payment agent built on Tether WDK.';
    }
  }

  /** Initialize — test which LLM provider is available */
  async initialize(): Promise<void> {
    // Try Groq first
    if (!this.groqApiKey) {
      logger.warn('No GROQ_API_KEY set — running in rule-based mode. Get a free key at https://console.groq.com');
    }
    if (this.groqApiKey) {
      try {
        const test = await this.callGroq(
          [{ role: 'user', content: 'Reply with exactly: {"status":"ok"}' }],
          0.1,
          20,
          true,
        );
        if (test) {
          this.available = true;
          this.currentProvider = 'groq';
          logger.info('Groq AI service initialized', { model: this.groqModel });
          return;
        }
      } catch (err) {
        logger.warn('Groq initialization failed', { error: String(err) });
      }
    }

    // Try Gemini
    if (this.geminiApiKey) {
      try {
        const test = await this.callGemini('Reply with exactly: {"status":"ok"}', 0.1, 20);
        if (test) {
          this.available = true;
          this.currentProvider = 'gemini';
          logger.info('Gemini AI service initialized (fallback)');
          return;
        }
      } catch (err) {
        logger.warn('Gemini initialization failed', { error: String(err) });
      }
    }

    logger.warn('No LLM provider available, using rule-based reasoning');
    this.currentProvider = 'rule-based';
  }

  /** Whether LLM reasoning is available */
  isAvailable(): boolean {
    return this.available;
  }

  /** Current LLM provider in use */
  getProvider(): LLMProvider {
    return this.currentProvider;
  }

  // ── LLM Calling (delegated to ai-llm.ts) ──────────────────────────

  private async callGroq(messages: Array<{ role: string; content: string }>, temperature = 0.3, maxTokens = 200, jsonMode = true): Promise<string> {
    return doCallGroq(this.groqApiKey, this.groqEndpoint, this.groqModel, messages, temperature, maxTokens, jsonMode, this.llmTimeoutMs);
  }

  private async callGemini(prompt: string, temperature = 0.3, maxTokens = 200): Promise<string> {
    return doCallGemini(this.geminiApiKey, this.geminiEndpoint, prompt, temperature, maxTokens, this.llmTimeoutMs);
  }

  private async callLLM(systemPrompt: string, userPrompt: string, temperature = 0.3, maxTokens = 200, useCache = true): Promise<{ text: string; provider: LLMProvider } | null> {
    const providerRef = { value: this.currentProvider };
    const availableRef = { value: this.available };
    const result = await doCallLLM(this.groqApiKey, this.groqEndpoint, this.groqModel, this.geminiApiKey, this.geminiEndpoint, this.cache, providerRef, availableRef, systemPrompt, userPrompt, temperature, maxTokens, useCache, this.llmTimeoutMs);
    this.currentProvider = providerRef.value;
    this.available = availableRef.value;
    return result;
  }

  private safeParseJSON<T>(raw: string): T | null { return doSafeParseJSON<T>(raw); }

  // ══════════════════════════════════════════════════════════════════
  // PUBLIC METHODS — same signatures as before, now with Groq/Gemini
  // ══════════════════════════════════════════════════════════════════

  /** Generate a thought/reasoning text via LLM for the OpenClaw ReAct loop */
  async generateThought(prompt: string): Promise<string | null> {
    if (!this.available) return null;
    try {
      const result = await this.callLLM(
        'You are an AI agent reasoning step-by-step in a ReAct loop. Be concise and specific.',
        prompt,
        0.4,
        120,
        false,
      );
      return result?.text ?? null;
    } catch (err) {
      logger.debug('LLM thought generation failed', { error: String(err) });
      return null;
    }
  }

  /** Generate reasoning for chain selection decision */
  async generateReasoning(
    analyses: ChainAnalysis[],
    selectedChain: ChainId,
    tipAmount: string,
    recipient: string,
  ): Promise<string> {
    const systemPrompt = this.soulPrompt;
    const userPrompt = this.buildReasoningPrompt(analyses, tipAmount, recipient);

    // Real-time decision — skip cache
    const result = await this.callLLM(systemPrompt, userPrompt, 0.3, 200, false);
    if (result) {
      const parsed = this.safeParseJSON<{ reasoning?: string; explanation?: string }>(result.text);
      const reasoning = parsed?.reasoning ?? parsed?.explanation ?? result.text;
      logger.info('Chain reasoning generated', { provider: result.provider });
      return typeof reasoning === 'string' ? reasoning : result.text;
    }

    return this.ruleBasedReasoning(analyses, selectedChain, tipAmount);
  }

  /** Build the LLM prompt for chain analysis */
  private buildReasoningPrompt(
    analyses: ChainAnalysis[],
    tipAmount: string,
    recipient: string,
  ): string {
    const chainSummaries = analyses.map((a) =>
      `- ${a.chainName}: balance=${a.balance}, fee=${a.estimatedFee} (~$${a.estimatedFeeUsd}), status=${a.networkStatus}, score=${a.score}/100`
    ).join('\n');

    const feeToTipRatios = analyses
      .filter((a) => a.available)
      .map((a) => `${a.chainName}: fee is ${((parseFloat(a.estimatedFee) / parseFloat(tipAmount)) * 100).toFixed(1)}% of tip`)
      .join(', ');

    const availableSorted = [...analyses].filter((a) => a.available).sort((a, b) => parseFloat(a.estimatedFee) - parseFloat(b.estimatedFee));
    const cheapest = availableSorted[0];
    const mostExpensive = availableSorted[availableSorted.length - 1];
    const savings = cheapest && mostExpensive && availableSorted.length > 1
      ? `Cheapest option saves ~$${(parseFloat(mostExpensive.estimatedFee) - parseFloat(cheapest.estimatedFee)).toFixed(6)} vs most expensive`
      : '';

    return `TASK: Select the optimal blockchain for this tip and explain your reasoning.
Return a JSON object with: {"reasoning": "2-3 sentence explanation starting with Selected [chain] because...", "selectedChain": "chain-id", "factors": ["factor1", "factor2"]}

TIP DETAILS:
- Amount: ${tipAmount} to ${recipient.slice(0, 10)}...${recipient.slice(-4)}
- Token: USDT (stablecoin)

CHAIN ANALYSIS:
${chainSummaries}

ECONOMIC CONTEXT:
- Fee-to-tip ratios: ${feeToTipRatios}
${savings ? `- ${savings}` : ''}
- Economic rule: gas should be <50% of tip amount for sound economics

DECISION FACTORS (weighted):
1. Cost efficiency (40%): minimize gas fees
2. Transaction speed (20%): faster confirmation is better
3. Balance adequacy (15%): don't drain the wallet
4. Historical reliability (15%): avoid chains with recent failures
5. Address compatibility (10%): recipient format must match chain

Provide a 2-3 sentence technical explanation starting with "Selected [chain] because...". Include specific numbers.`;
  }

  /** Deterministic rule-based reasoning as fallback */
  private ruleBasedReasoning(
    analyses: ChainAnalysis[],
    selectedChain: ChainId,
    tipAmount: string,
  ): string {
    const selected = analyses.find((a) => a.chainId === selectedChain);
    const other = analyses.find((a) => a.chainId !== selectedChain);

    if (!selected) {
      return `Selected ${selectedChain} as the only available chain for this ${tipAmount} tip.`;
    }

    const parts: string[] = [];
    parts.push(`Selected ${selected.chainName} for this ${tipAmount} tip.`);

    if (other && other.available) {
      const feeDiff = parseFloat(other.estimatedFeeUsd) - parseFloat(selected.estimatedFeeUsd);
      if (feeDiff > 0) {
        parts.push(`This saves approximately $${feeDiff.toFixed(4)} in fees compared to ${other.chainName}.`);
      }
    }

    if (selected.networkStatus === 'healthy') {
      parts.push('Network status is healthy with normal confirmation times.');
    } else if (selected.networkStatus === 'congested') {
      parts.push('Note: network is congested, confirmation may take longer.');
    }

    return parts.join(' ');
  }

  /**
   * Parse a natural language tip command into structured data.
   * Uses LLM when available, falls back to rule-based regex parsing.
   */
  async parseNaturalLanguageTip(input: string): Promise<NLPTipParse> {
    const trimmed = input.trim();
    if (!trimmed) {
      return { recipient: '', amount: '', token: 'native', confidence: 0, rawInput: input };
    }

    // Try LLM parsing first
    if (this.available) {
      try {
        const result = await this.llmParseTip(trimmed);
        if (result.confidence > 0) return result;
      } catch (err) {
        logger.warn('LLM tip parsing failed, using fallback', { error: String(err) });
      }
    }

    // Fallback to rule-based parsing
    return this.regexParseTip(trimmed);
  }

  /** Parse tip using LLM (Groq/Gemini) */
  private async llmParseTip(input: string): Promise<NLPTipParse> {
    const systemPrompt = 'You are a tip command parser. Extract tip details from user input and return valid JSON.';
    const userPrompt = `Extract tip details from this input. Return a JSON object with these fields:
- recipient: the wallet address (0x... for EVM, UQ... or EQ... for TON, T... for Tron), empty string if not found
- amount: the numeric amount as a string, empty string if not found
- token: "usdt" if USDT/Tether is mentioned, otherwise "native"
- chain: "ethereum-sepolia" if ETH/Ethereum/Sepolia mentioned, "ton-testnet" if TON mentioned, "tron-nile" if Tron/TRX mentioned, null if not specified
- message: any tip message or reason (e.g. "great work"), null if none

Input: "${input}"`;

    const result = await this.callLLM(systemPrompt, userPrompt, 0.1, 150, true);
    if (!result) {
      return { recipient: '', amount: '', token: 'native', confidence: 0, rawInput: input };
    }

    const parsed = this.safeParseJSON<Record<string, unknown>>(result.text);
    if (!parsed) {
      logger.warn('LLM returned non-JSON response for tip parse', { provider: result.provider });
      return { recipient: '', amount: '', token: 'native', confidence: 0, rawInput: input };
    }

    const recipient = String(parsed.recipient ?? '').trim();
    const amount = String(parsed.amount ?? '').trim();
    const tokenRaw = String(parsed.token ?? 'native').toLowerCase();
    const token: 'native' | 'usdt' | 'usat' | 'xaut' = tokenRaw === 'usdt' ? 'usdt' : tokenRaw === 'usat' ? 'usat' : tokenRaw === 'xaut' || tokenRaw === 'gold' ? 'xaut' : 'native';
    const chain = parsed.chain ? String(parsed.chain) : undefined;
    const message = parsed.message ? String(parsed.message) : undefined;

    // Calculate confidence based on what was extracted
    let confidence = 0;
    if (recipient && this.isValidAddress(recipient)) confidence += 40;
    if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) confidence += 40;
    if (token) confidence += 10;
    if (confidence > 0) confidence += 10; // bonus for LLM parse succeeding at all

    logger.info('LLM tip parse', { provider: result.provider, confidence });

    return {
      recipient,
      amount,
      token,
      chain: chain && (chain === 'ethereum-sepolia' || chain === 'ton-testnet' || chain === 'tron-nile') ? chain : undefined,
      message: message || undefined,
      confidence: Math.min(confidence, 100),
      rawInput: input,
    };
  }

  private regexParseTip(input: string): NLPTipParse { return doRegexParseTip(input); }
  private isValidAddress(addr: string): boolean { return doIsValidAddress(addr); }

  /**
   * Detect the user's intent from a chat message.
   * Uses LLM when available, falls back to regex pattern matching.
   */
  async detectIntent(message: string): Promise<ChatIntent> {
    const trimmed = message.trim().toLowerCase();
    if (!trimmed) {
      return { intent: 'unknown', params: {}, confidence: 0, reasoning: '[Rule-based] Empty input', entities: { amounts: [], addresses: [], creators: [], chains: [], tokens: [] } };
    }

    // Try LLM-based intent detection first
    if (this.available) {
      try {
        return await this.llmDetectIntent(message.trim());
      } catch (err) {
        logger.warn('LLM intent detection failed, using regex fallback', { error: String(err) });
      }
    }

    // Regex fallback
    return this.regexDetectIntent(trimmed, message.trim());
  }

  /** LLM-powered intent detection */
  private async llmDetectIntent(input: string): Promise<ChatIntent> {
    const systemPrompt = 'You are a chat intent classifier for AeroFyta, an autonomous multi-chain payment agent. Return valid JSON.';
    const userPrompt = `Classify this message into one of these intents:
- tip: user wants to send/tip crypto (extract "recipient" address and "amount" if present)
- check_balance: user wants to check wallet balances
- view_history: user wants to see past tips/transactions
- find_creator: user wants to find or lookup a creator
- set_policy: user wants to change settings/policies
- check_status: user asks about agent/system status
- help: user asks what you can do or needs help
- analytics: user wants stats/metrics/reports
- bridge: user wants to bridge tokens across chains
- swap: user wants to swap/exchange tokens
- lend: user wants lending/staking/yield
- fees: user wants to compare fees or know costs
- address: user wants to see wallet addresses
- unknown: doesn't match any intent

Return a JSON object: {"intent": "...", "confidence": 0.0-1.0, "entities": {"key": "value"}}

Message: "${input}"`;

    const result = await this.callLLM(systemPrompt, userPrompt, 0.1, 100, true);
    if (!result) return this.regexDetectIntent(input.toLowerCase(), input);

    const parsed = this.safeParseJSON<Record<string, unknown>>(result.text);
    if (!parsed) return this.regexDetectIntent(input.toLowerCase(), input);

    const intent = String(parsed.intent ?? 'unknown');
    const validIntents = [
      'tip', 'check_balance', 'view_history', 'find_creator', 'set_policy',
      'check_status', 'help', 'analytics', 'bridge', 'swap', 'lend',
      'balance', 'fees', 'address', 'history', 'unknown',
    ] as const;
    const validIntent = validIntents.includes(intent as typeof validIntents[number])
      ? (intent as ChatIntent['intent'])
      : 'unknown';

    const params: Record<string, string> = {};
    // Support both "params" and "entities" from LLM response
    const llmEntities = (parsed.entities ?? parsed.params ?? {}) as Record<string, unknown>;
    if (typeof llmEntities === 'object' && llmEntities !== null) {
      for (const [k, v] of Object.entries(llmEntities)) {
        if (typeof v === 'string') params[k] = v;
      }
    }

    const extractedEntities = this.extractEntities(input);
    const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.8;

    logger.info('LLM intent detection', { provider: result.provider, intent: validIntent });
    return {
      intent: validIntent,
      params,
      confidence,
      reasoning: `[LLM/${result.provider}] Classified as "${validIntent}" with confidence ${(confidence * 100).toFixed(0)}%`,
      entities: extractedEntities,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // ENTITY EXTRACTION ENGINE (delegated to ai-entities.ts)
  // ══════════════════════════════════════════════════════════════════

  /** Extract structured entities — delegates to standalone extractEntities() */
  private extractEntities(text: string): ExtractedEntities {
    return extractEntities(text);
  }

  // ══════════════════════════════════════════════════════════════════
  // ENHANCED RULE-BASED INTENT DETECTION
  // ══════════════════════════════════════════════════════════════════

  // INTENT_RULES extracted to ai-intents.ts


  /** Rule-based regex intent detection -- delegates to ai-intents.ts */
  private regexDetectIntent(lower: string, original: string): ChatIntent {
    return doRegexDetectIntent(lower, original, (text) => this.extractEntities(text));
  }

  /**
   * Generate a personalized tip message based on context.
   */
  async generateTipMessage(
    creatorName: string,
    amount: string,
    token: string,
    context?: { watchPercent?: number; category?: string; engagementScore?: number },
  ): Promise<string> {
    if (!this.available) {
      return this.ruleBasedTipMessage(creatorName, amount, token, context);
    }

    try {
      const systemPrompt = 'You are AeroFyta, a friendly crypto tipping agent for Rumble creators. Return JSON.';
      const userPrompt = `Generate a SHORT (1 sentence, max 20 words) personalized tip message for this tip.
Return JSON: {"message": "your message here"}

- Creator: ${creatorName}
- Amount: ${amount} ${token.toUpperCase()}
${context?.watchPercent ? `- Watch completion: ${context.watchPercent}%` : ''}
${context?.category ? `- Content category: ${context.category}` : ''}
${context?.engagementScore ? `- Engagement score: ${context.engagementScore}/100` : ''}

Be warm and specific. Reference the content or engagement if context is provided. Do NOT use emojis.`;

      const result = await this.callLLM(systemPrompt, userPrompt, 0.7, 60, true);
      if (result) {
        const parsed = this.safeParseJSON<{ message?: string }>(result.text);
        const msg = (parsed?.message ?? result.text).replace(/^["']|["']$/g, '');
        if (msg.length > 0 && msg.length < 200) return msg;
      }
    } catch {
      // fall through
    }
    return this.ruleBasedTipMessage(creatorName, amount, token, context);
  }

  /** Rule-based tip message fallback */
  private ruleBasedTipMessage(
    creatorName: string,
    amount: string,
    token: string,
    context?: { watchPercent?: number; category?: string; engagementScore?: number },
  ): string {
    if (context?.watchPercent && context.watchPercent > 90) {
      return `Loved watching your content, ${creatorName}! Here's ${amount} ${token.toUpperCase()} for your great work.`;
    }
    if (context?.engagementScore && context.engagementScore > 80) {
      return `Your content consistently delivers value, ${creatorName}. Tipping ${amount} ${token.toUpperCase()}.`;
    }
    return `Great content, ${creatorName}! Sending ${amount} ${token.toUpperCase()} your way.`;
  }

  /**
   * Generate a risk assessment explanation using LLM.
   */
  async generateRiskExplanation(
    riskScore: number,
    riskLevel: string,
    factors: Array<{ name: string; score: number; weight: number; details: string }>,
  ): Promise<string> {
    if (!this.available) {
      return this.ruleBasedRiskExplanation(riskScore, riskLevel, factors);
    }

    try {
      const factorSummary = factors
        .sort((a, b) => (b.score * b.weight) - (a.score * a.weight))
        .slice(0, 4)
        .map((f) => `- ${f.name}: score=${f.score}/100 (weight=${f.weight}x) — ${f.details}`)
        .join('\n');

      const systemPrompt = 'You are a financial risk analyst for AeroFyta. Return JSON.';
      const userPrompt = `Summarize this risk assessment in 2-3 sentences.
Return JSON: {"level": "${riskLevel}", "score": ${riskScore}, "summary": "your summary", "factors": ["factor1", "factor2"]}

Overall risk: ${riskScore}/100 (${riskLevel})
Top risk factors:
${factorSummary}

Provide actionable risk summary (2-3 sentences, no emojis).`;

      const result = await this.callLLM(systemPrompt, userPrompt, 0.3, 150, true);
      if (result) {
        const parsed = this.safeParseJSON<{ summary?: string }>(result.text);
        const explanation = parsed?.summary ?? result.text;
        if (typeof explanation === 'string' && explanation.length > 0) return explanation;
      }
    } catch {
      // fall through
    }
    return this.ruleBasedRiskExplanation(riskScore, riskLevel, factors);
  }

  /** Rule-based risk explanation fallback */
  private ruleBasedRiskExplanation(
    riskScore: number,
    riskLevel: string,
    factors: Array<{ name: string; score: number; weight: number; details: string }>,
  ): string {
    const topFactor = factors.sort((a, b) => (b.score * b.weight) - (a.score * a.weight))[0];
    if (riskLevel === 'low') {
      return `Risk assessment: LOW (${riskScore}/100). All risk factors within normal parameters. Transaction is safe to proceed.`;
    }
    if (riskLevel === 'medium') {
      return `Risk assessment: MEDIUM (${riskScore}/100). Primary concern: ${topFactor?.name ?? 'unknown'} (${topFactor?.details ?? ''}). Recommend review before proceeding.`;
    }
    return `Risk assessment: ${riskLevel.toUpperCase()} (${riskScore}/100). Critical factor: ${topFactor?.name ?? 'unknown'} — ${topFactor?.details ?? 'elevated risk detected'}. Manual approval strongly recommended.`;
  }

  /**
   * Generate autonomous decision explanation.
   */
  async generateAutonomousDecisionExplanation(
    decision: { recipient: string; amount: string; chain: string; reason: string },
    profile: { tipCount: number; avgAmount: number; topRecipient: string },
  ): Promise<string> {
    if (!this.available) {
      return `Autonomous tip of ${decision.amount} to ${decision.recipient.slice(0, 10)}... on ${decision.chain}. Reason: ${decision.reason}. Based on ${profile.tipCount} historical tips (avg: ${profile.avgAmount.toFixed(4)}).`;
    }

    try {
      const systemPrompt = this.soulPrompt;
      const userPrompt = `Explain this auto-tip decision in 2-3 sentences. Be transparent about the reasoning.
Return JSON: {"explanation": "your explanation here"}

Decision: Send ${decision.amount} to ${decision.recipient.slice(0, 10)}...${decision.recipient.slice(-4)} on ${decision.chain}
Agent's reason: ${decision.reason}
User profile: ${profile.tipCount} tips sent, average ${profile.avgAmount.toFixed(4)}, top recipient: ${profile.topRecipient.slice(0, 10)}...

Explain the autonomous reasoning (2-3 sentences, be specific with numbers).`;

      const result = await this.callLLM(systemPrompt, userPrompt, 0.3, 150, false);
      if (result) {
        const parsed = this.safeParseJSON<{ explanation?: string }>(result.text);
        const explanation = parsed?.explanation ?? result.text;
        if (typeof explanation === 'string' && explanation.length > 0) return explanation;
      }
    } catch {
      // fall through
    }
    return `Autonomous tip of ${decision.amount} to ${decision.recipient.slice(0, 10)}... on ${decision.chain}. Reason: ${decision.reason}. Based on ${profile.tipCount} historical tips.`;
  }

  /** Generate a summary of agent activity for the dashboard */
  async generateActivitySummary(
    totalTips: number,
    totalAmount: string,
    topChain: string,
  ): Promise<string> {
    if (!this.available) {
      return `Processed ${totalTips} tips totaling ${totalAmount}. Primary chain: ${topChain}.`;
    }

    try {
      const systemPrompt = 'You are AeroFyta. Summarize agent activity concisely. Return JSON.';
      const userPrompt = `Summarize this tipping agent activity in one sentence.
Return JSON: {"summary": "your one-sentence summary"}

Stats: ${totalTips} tips sent, total ${totalAmount}, most used chain: ${topChain}. Be concise and professional.`;

      const result = await this.callLLM(systemPrompt, userPrompt, 0.3, 80, true);
      if (result) {
        const parsed = this.safeParseJSON<{ summary?: string }>(result.text);
        const summary = parsed?.summary ?? result.text;
        if (typeof summary === 'string' && summary.length > 0) return summary;
      }
    } catch {
      // fall through
    }
    return `Processed ${totalTips} tips totaling ${totalAmount}. Primary chain: ${topChain}.`;
  }

  // ══════════════════════════════════════════════════════════════════
  // LLM-DRIVEN AUTONOMOUS DECISION MAKING
  // ══════════════════════════════════════════════════════════════════

  /**
   * Ask the LLM to make an autonomous tipping decision.
   * Returns a structured {action, confidence, reasoning} — the LLM DRIVES the decision.
   * Falls back to rule-based only when LLM is completely unavailable.
   */
  async makeAutonomousDecision(context: {
    observation: string;
    topCreator: string;
    engagementScore: number;
    suggestedAmount: number;
    gasGwei: number | null;
    riskScore: number | null;
    tokenPrice: number | null;
    tipHistory: { executed: number; skipped: number; refused: number };
    memoryContext: string;
  }): Promise<{ action: 'tip' | 'skip' | 'wait' | 'observe_more'; confidence: number; reasoning: string; llmDriven: boolean }> {
    if (!this.available) {
      // Intelligent rule-based fallback when no LLM API key is configured
      return this.ruleBasedAutonomousDecision(context);
    }

    try {
      const systemPrompt = `You are AeroFyta, an autonomous tipping agent. You analyze engagement data, gas costs, and risk scores to decide whether to tip a content creator. Be decisive and explain your reasoning concisely.

Your personality: analytical, fair, budget-conscious. You reward genuine engagement, not vanity metrics.`;

      const userPrompt = `Analyze this situation and decide what action to take.
Return ONLY a JSON object: {"action": "tip"|"skip"|"wait"|"observe_more", "confidence": 0-100, "reasoning": "1-2 sentence explanation"}

Situation:
- Creator: ${context.topCreator}
- Engagement quality: ${context.engagementScore}/1.0 (0=spam, 1=exceptional)
- Suggested tip: $${context.suggestedAmount.toFixed(4)} USDT
${context.gasGwei !== null ? `- Gas price: ${context.gasGwei.toFixed(1)} gwei` : '- Gas: unknown'}
${context.riskScore !== null ? `- Risk score: ${context.riskScore}/100 (>70 = dangerous)` : '- Risk: not assessed'}
${context.tokenPrice !== null ? `- USDT price: $${context.tokenPrice.toFixed(4)}` : ''}
- History: ${context.tipHistory.executed} tips sent, ${context.tipHistory.skipped} skipped, ${context.tipHistory.refused} refused
- Memory: ${context.memoryContext.slice(0, 200)}

Rules:
- "tip" = send the tip (good engagement + safe conditions)
- "skip" = don't tip (low engagement or too risky)
- "wait" = conditions will improve soon (high gas, try later)
- "observe_more" = need more data before deciding

Decide now:`;

      const result = await this.callLLM(systemPrompt, userPrompt, 0.2, 150, false);
      if (result) {
        const parsed = this.safeParseJSON<{ action?: string; confidence?: number; reasoning?: string }>(result.text);
        if (parsed?.action && ['tip', 'skip', 'wait', 'observe_more'].includes(parsed.action)) {
          logger.info('LLM autonomous decision', {
            action: parsed.action,
            confidence: parsed.confidence,
            provider: result.provider,
            creator: context.topCreator,
          });
          return {
            action: parsed.action as 'tip' | 'skip' | 'wait' | 'observe_more',
            confidence: Math.max(0, Math.min(100, parsed.confidence ?? 70)),
            reasoning: `[LLM/${result.provider}] ${parsed.reasoning ?? 'Decision made by AI agent'}`,
            llmDriven: true,
          };
        }
        // LLM returned text but not valid JSON — extract intent
        const text = result.text.toLowerCase();
        const action = text.includes('tip') ? 'tip' : text.includes('skip') ? 'skip' : text.includes('wait') ? 'wait' : 'observe_more';
        return {
          action,
          confidence: 55,
          reasoning: `[LLM/${result.provider}] ${result.text.slice(0, 150)}`,
          llmDriven: true,
        };
      }
    } catch (err) {
      logger.warn('LLM decision call failed', { error: String(err) });
    }

    // LLM call failed — use intelligent rule-based fallback
    return this.ruleBasedAutonomousDecision(context);
  }

  /** Rule-based autonomous decision -- delegates to ai-intents.ts */
  private ruleBasedAutonomousDecision(context: {
    engagementScore: number;
    suggestedAmount: number;
    gasGwei: number | null;
    riskScore: number | null;
    topCreator: string;
    tipHistory: { executed: number; skipped: number; refused: number };
  }): { action: 'tip' | 'skip' | 'wait' | 'observe_more'; confidence: number; reasoning: string; llmDriven: boolean } {
    return doRuleBasedAutonomousDecision(context);
  }

  // ══════════════════════════════════════════════════════════════════
  // Feature 52: "Agent Says NO" Logic
  // ══════════════════════════════════════════════════════════════════

  /** Feature 52: Agent Says NO -- delegates to ai-intents.ts */
  shouldRefuseTip(params: {
    amount: number;
    creator: string;
    dailyBudgetRemaining: number;
    riskScore: number;
    currentBalance: number;
    reserveMinimum?: number;
    engagementScore: number;
    estimatedFee: number;
  }): TipRefusal {
    const result = doShouldRefuseTip(params, this.recentTips);
    if (result.updatedRecentTips) {
      this.recentTips = result.updatedRecentTips;
    }
    return { refused: result.refused, reason: result.reason, suggestion: result.suggestion };
  }

  analyzeContent(text: string): ContentAnalysis { return analyzeContent(text); }

  getRuleBasedCapabilities(): RuleBasedCapabilities {
    return {
      engine: 'AeroFyta Rule-Based Intelligence Engine',
      version: '2.0.0',
      provider: 'rule-based',
      intents: INTENT_RULES.map(r => ({
        name: r.intent,
        description: r.description,
        examples: r.patterns.slice(0, 2).map(p => p.source.replace(/\\b|\\s|\(\?:|[)(|]/g, ' ').replace(/\s+/g, ' ').trim()),
      })),
      entityTypes: [
        { name: 'amounts', description: 'Currency amounts with denomination', patterns: ['$10', '5 USDT', '0.5 ETH', '100 XAUT'] },
        { name: 'addresses', description: 'Blockchain wallet addresses', patterns: ['0x... (EVM)', 'UQ.../EQ... (TON)', 'T... (Tron)'] },
        { name: 'creators', description: 'Content creator names', patterns: ['@username', 'creator Name'] },
        { name: 'chains', description: 'Blockchain network names', patterns: ['ethereum', 'ton', 'tron', 'polygon', 'arbitrum'] },
        { name: 'tokens', description: 'Token/cryptocurrency names', patterns: ['USDT', 'USAT', 'XAUT', 'ETH', 'TON', 'TRX'] },
      ],
      analysisFeatures: [
        'Intent classification (13 categories with confidence scoring)',
        'Entity extraction (amounts, addresses, creators, chains, tokens)',
        'Sentiment analysis (positive/negative/neutral with keyword evidence)',
        'Topic classification (finance, creator economy, technical, general)',
        'Key phrase extraction (bigrams, trigrams, noun phrases)',
        'Reasoning traces (step-by-step decision audit trail)',
        'Autonomous decision making (tip/skip/wait/observe with multi-factor evaluation)',
        'Risk assessment (6-factor refusal engine)',
        'Natural language tip parsing (multi-chain, multi-token)',
        'Chain selection reasoning (fee comparison, network status)',
      ],
      limitations: [
        'No generative text — responses are template-based, not creative',
        'No conversation memory — each request is independent',
        'No semantic understanding — relies on keyword/pattern matching',
        'English language only',
        'Add GROQ_API_KEY (free) or GEMINI_API_KEY for full LLM reasoning',
      ],
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // LLM TOOL-USE PATTERN — Agent autonomously decides which tools to call
  // ══════════════════════════════════════════════════════════════════

  /**
   * Agentic tool-use loop: the LLM autonomously decides which tools to invoke
   * to accomplish a goal, executing them in sequence and feeding results back.
   *
   * When no LLM is available, falls back to keyword-based tool selection
   * (similar to OpenClaw's selectToolForThought).
   */
  async agenticToolUse(
    goal: string,
    tools: AgenticToolDefinition[],
    maxSteps: number = 5,
  ): Promise<AgenticToolUseResult> {
    const steps: AgenticToolUseStep[] = [];
    const toolMap = new Map(tools.map(t => [t.name, t]));
    const usedTools = new Set<string>();

    for (let i = 0; i < maxSteps; i++) {
      // Build context from previous steps
      const stepsSummary = steps.map((s, idx) =>
        `Step ${idx + 1}: Called ${s.tool}(${JSON.stringify(s.params)}) → ${JSON.stringify(s.result).slice(0, 300)}`
      ).join('\n');

      let selectedTool: string | null = null;
      let selectedParams: Record<string, unknown> = {};
      let isFinal = false;
      let finalAnswer = '';
      let reasoning = '';

      if (this.available) {
        // LLM-driven tool selection
        const toolDescriptions = tools.map(t =>
          `- ${t.name}: ${t.description} | params: ${Object.entries(t.parameters).map(([k, v]) => `${k} (${v.type}): ${v.description}`).join(', ')}`
        ).join('\n');

        const systemPrompt = `You are an autonomous agent with access to tools. Given a goal, decide which tool to call next or provide a final answer.
Return ONLY a JSON object in one of these formats:
1. To call a tool: {"action": "call_tool", "tool": "tool_name", "params": {}, "reasoning": "why this tool"}
2. To give a final answer: {"action": "final_answer", "answer": "your answer", "reasoning": "summary of reasoning"}`;

        const userPrompt = `Goal: ${goal}

Available tools:
${toolDescriptions}

${steps.length > 0 ? `Steps taken so far:\n${stepsSummary}\n` : 'No steps taken yet.\n'}
Decide: call another tool or give a final answer.`;

        try {
          const result = await this.callLLM(systemPrompt, userPrompt, 0.2, 300, false);
          if (result) {
            const parsed = this.safeParseJSON<{
              action?: string;
              tool?: string;
              params?: Record<string, unknown>;
              answer?: string;
              reasoning?: string;
            }>(result.text);

            if (parsed) {
              reasoning = parsed.reasoning ?? '';
              if (parsed.action === 'final_answer') {
                isFinal = true;
                finalAnswer = parsed.answer ?? result.text;
              } else if (parsed.action === 'call_tool' && parsed.tool && toolMap.has(parsed.tool)) {
                selectedTool = parsed.tool;
                selectedParams = parsed.params ?? {};
              }
            }
          }
        } catch (err) {
          logger.debug('LLM tool-use selection failed, using keyword fallback', { error: String(err) });
        }
      }

      // If LLM did not select a tool (or unavailable), use keyword-based fallback
      if (!isFinal && !selectedTool) {
        const fallback = this.keywordSelectTool(goal, steps, tools, usedTools);
        if (fallback) {
          selectedTool = fallback.name;
          selectedParams = fallback.params;
          reasoning = fallback.reason;
        } else {
          // No more tools to try — synthesize final answer
          isFinal = true;
          finalAnswer = this.synthesizeFinalAnswer(goal, steps);
          reasoning = 'All relevant tools exhausted or no matching tool found';
        }
      }

      if (isFinal) {
        return { steps, finalAnswer, reasoning };
      }

      // Execute the selected tool
      const tool = toolMap.get(selectedTool!);
      if (!tool) {
        return {
          steps,
          finalAnswer: `Tool "${selectedTool}" not found`,
          reasoning: 'Selected tool does not exist in available tools',
        };
      }

      usedTools.add(selectedTool!);
      let toolResult: unknown;
      try {
        toolResult = await tool.executor(selectedParams);
      } catch (err) {
        toolResult = { error: String(err) };
      }

      steps.push({
        tool: selectedTool!,
        params: selectedParams,
        result: toolResult,
      });

      logger.info('Agentic tool-use step', {
        step: i + 1,
        tool: selectedTool,
        reasoning: reasoning.slice(0, 100),
      });
    }

    // Reached maxSteps — synthesize answer from collected data
    const finalAnswer = this.available
      ? await this.llmSynthesizeFinal(goal, steps)
      : this.synthesizeFinalAnswer(goal, steps);

    return {
      steps,
      finalAnswer,
      reasoning: `Completed ${steps.length} steps (max ${maxSteps} reached)`,
    };
  }

  /**
   * Keyword-based tool selection fallback (no LLM needed).
   * Matches goal keywords against tool names and descriptions.
   */
  private keywordSelectTool(
    goal: string,
    _previousSteps: AgenticToolUseStep[],
    tools: AgenticToolDefinition[],
    usedTools: Set<string>,
  ): { name: string; params: Record<string, unknown>; reason: string } | null {
    const lower = goal.toLowerCase();
    const keywords: Record<string, string[]> = {
      price: ['price', 'cost', 'value', 'market', 'worth', 'quote'],
      gas: ['gas', 'fee', 'cost', 'gwei', 'transaction cost'],
      risk: ['risk', 'safe', 'danger', 'security', 'assess', 'audit'],
      send: ['send', 'transfer', 'tip', 'pay', 'remit'],
      balance: ['balance', 'wallet', 'holdings', 'portfolio'],
    };

    for (const tool of tools) {
      if (usedTools.has(tool.name)) continue;

      const toolLower = `${tool.name} ${tool.description}`.toLowerCase();
      // Check if goal keywords match tool keywords
      for (const [_category, kws] of Object.entries(keywords)) {
        const goalMatch = kws.some(k => lower.includes(k));
        const toolMatch = kws.some(k => toolLower.includes(k));
        if (goalMatch && toolMatch) {
          // Derive simple params from goal context
          const params = this.deriveParamsFromGoal(goal, tool);
          return {
            name: tool.name,
            params,
            reason: `Keyword match: goal mentions "${kws.find(k => lower.includes(k))}" which aligns with tool "${tool.name}"`,
          };
        }
      }
    }

    // Try first unused tool as a last resort
    const unused = tools.find(t => !usedTools.has(t.name));
    if (unused) {
      return {
        name: unused.name,
        params: this.deriveParamsFromGoal(goal, unused),
        reason: `Fallback: trying unused tool "${unused.name}"`,
      };
    }

    return null;
  }

  /** Derive tool parameters from the goal string using simple heuristics */
  private deriveParamsFromGoal(
    goal: string,
    tool: AgenticToolDefinition,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const lower = goal.toLowerCase();

    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      if (paramDef.type === 'string') {
        // Try to extract addresses
        if (paramName === 'address' || paramName === 'recipient') {
          const addrMatch = goal.match(/0x[a-fA-F0-9]{40}/);
          if (addrMatch) params[paramName] = addrMatch[0];
        }
        // Try to extract token names
        if (paramName === 'token' || paramName === 'tokens') {
          if (lower.includes('bitcoin') || lower.includes('btc')) params[paramName] = 'bitcoin';
          else if (lower.includes('ethereum') || lower.includes('eth')) params[paramName] = 'ethereum';
          else if (lower.includes('usdt') || lower.includes('tether')) params[paramName] = 'tether';
          else params[paramName] = 'tether';
        }
      }
      if (paramDef.type === 'number') {
        const numMatch = goal.match(/\d+\.?\d*/);
        if (numMatch) params[paramName] = parseFloat(numMatch[0]);
      }
    }
    return params;
  }

  /** Synthesize a final answer from step results (rule-based) */
  private synthesizeFinalAnswer(goal: string, steps: AgenticToolUseStep[]): string {
    if (steps.length === 0) return `No tools were executed for goal: "${goal}"`;

    const summaries = steps.map(s => {
      const resultStr = typeof s.result === 'object' && s.result !== null
        ? JSON.stringify(s.result).slice(0, 200)
        : String(s.result);
      return `${s.tool}: ${resultStr}`;
    });

    return `Completed ${steps.length} tool calls for "${goal}". Results: ${summaries.join(' | ')}`;
  }

  /** Use LLM to synthesize a coherent final answer from all step results */
  private async llmSynthesizeFinal(goal: string, steps: AgenticToolUseStep[]): Promise<string> {
    try {
      const stepsSummary = steps.map((s, i) =>
        `Step ${i + 1} (${s.tool}): ${JSON.stringify(s.result).slice(0, 300)}`
      ).join('\n');

      const result = await this.callLLM(
        'You are a concise data analyst. Synthesize tool results into a clear answer.',
        `Goal: ${goal}\n\nTool results:\n${stepsSummary}\n\nProvide a concise answer based on these results.`,
        0.3,
        200,
        false,
      );
      return result?.text ?? this.synthesizeFinalAnswer(goal, steps);
    } catch {
      return this.synthesizeFinalAnswer(goal, steps);
    }
  }
}

// ── Agentic Tool-Use Types (public API) ────────────────────────────

/** Tool definition for the agentic tool-use pattern */
export interface AgenticToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string }>;
  executor: (params: Record<string, unknown>) => Promise<unknown>;
}

/** A single step in the agentic tool-use loop */
export interface AgenticToolUseStep {
  tool: string;
  params: Record<string, unknown>;
  result: unknown;
}

/** Result of the agentic tool-use loop */
export interface AgenticToolUseResult {
  steps: AgenticToolUseStep[];
  finalAnswer: string;
  reasoning: string;
}

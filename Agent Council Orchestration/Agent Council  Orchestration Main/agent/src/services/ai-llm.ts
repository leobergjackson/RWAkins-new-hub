// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — LLM Infrastructure (extracted from ai.service.ts)
// Contains: LLMCache, callGroq, callGemini, callLLM, safeParseJSON, tip parsing

import { createHash } from 'node:crypto';
import { logger } from '../utils/logger.js';
import type { LLMProvider, NLPTipParse } from '../types/index.js';

// ── LLM Response Cache ────────────────────────────────────────────────

interface CacheEntry {
  response: string;
  timestamp: number;
}

export class LLMCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 5 * 60 * 1000;
  private readonly maxSize = 100;

  private makeKey(prompt: string, model: string): string {
    return createHash('sha256').update(`${model}:${prompt}`).digest('hex').slice(0, 32);
  }

  get(prompt: string, model: string): string | null {
    const key = this.makeKey(prompt, model);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) { this.cache.delete(key); return null; }
    return entry.response;
  }

  set(prompt: string, model: string, response: string): void {
    if (this.cache.size >= this.maxSize) {
      let oldestKey: string | undefined;
      let oldestTime = Infinity;
      for (const [k, v] of this.cache.entries()) { if (v.timestamp < oldestTime) { oldestTime = v.timestamp; oldestKey = k; } }
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(this.makeKey(prompt, model), { response, timestamp: Date.now() });
  }

  get size(): number { return this.cache.size; }
}

// ── LLM API Calls ────────────────────────────────────────────────

export async function callGroq(
  groqApiKey: string,
  groqEndpoint: string,
  groqModel: string,
  messages: Array<{ role: string; content: string }>,
  temperature = 0.3,
  maxTokens = 200,
  jsonMode = true,
  timeoutMs = 10_000,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body: Record<string, unknown> = { model: groqModel, messages, temperature, max_tokens: maxTokens };
    if (jsonMode) body.response_format = { type: 'json_object' };
    const resp = await fetch(groqEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqApiKey}` },
      body: JSON.stringify(body), signal: controller.signal,
    });
    if (!resp.ok) { const errText = await resp.text().catch(() => 'unknown'); throw new Error(`Groq API ${resp.status}: ${errText}`); }
    const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  } finally { clearTimeout(timer); }
}

export async function callGemini(
  geminiApiKey: string,
  geminiEndpoint: string,
  prompt: string,
  temperature = 0.3,
  maxTokens = 200,
  timeoutMs = 10_000,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${geminiEndpoint}?key=${geminiApiKey}`;
    const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: 'application/json' } };
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    if (!resp.ok) { const errText = await resp.text().catch(() => 'unknown'); throw new Error(`Gemini API ${resp.status}: ${errText}`); }
    const data = (await resp.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  } finally { clearTimeout(timer); }
}

export interface LLMCallResult { text: string; provider: LLMProvider }

export async function callLLM(
  groqApiKey: string, groqEndpoint: string, groqModel: string,
  geminiApiKey: string, geminiEndpoint: string,
  cache: LLMCache,
  currentProviderRef: { value: LLMProvider },
  availableRef: { value: boolean },
  systemPrompt: string, userPrompt: string,
  temperature = 0.3, maxTokens = 200, useCache = true,
  timeoutMs = 10_000,
): Promise<LLMCallResult | null> {
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  if (useCache) { const cached = cache.get(fullPrompt, 'llm'); if (cached) { logger.debug('LLM cache hit'); return { text: cached, provider: currentProviderRef.value }; } }

  if (groqApiKey) {
    try {
      const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }];
      const result = await callGroq(groqApiKey, groqEndpoint, groqModel, messages, temperature, maxTokens, true, timeoutMs);
      if (result) { if (useCache) cache.set(fullPrompt, 'llm', result); currentProviderRef.value = 'groq'; availableRef.value = true; return { text: result, provider: 'groq' }; }
    } catch (err) { logger.warn('Groq call failed, trying Gemini fallback', { error: String(err) }); }
  }

  if (geminiApiKey) {
    try {
      const combined = `${systemPrompt}\n\n${userPrompt}`;
      const result = await callGemini(geminiApiKey, geminiEndpoint, combined, temperature, maxTokens, timeoutMs);
      if (result) { if (useCache) cache.set(fullPrompt, 'llm', result); currentProviderRef.value = 'gemini'; availableRef.value = true; return { text: result, provider: 'gemini' }; }
    } catch (err) { logger.warn('Gemini call failed, falling back to rule-based', { error: String(err) }); }
  }

  currentProviderRef.value = 'rule-based';
  return null;
}

export function safeParseJSON<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[0]) as T; } catch { return null; } }
    return null;
  }
}

// ── Tip Parsing ────────────────────────────────────────────────

export function isValidAddress(addr: string): boolean {
  if (/^0x[a-fA-F0-9]{40}$/.test(addr)) return true;
  if (/^[UE]Q[a-zA-Z0-9_-]{46}$/.test(addr)) return true;
  return false;
}

export function regexParseTip(input: string): NLPTipParse {
  const lower = input.toLowerCase();
  const evmMatch = input.match(/\b(0x[a-fA-F0-9]{40})\b/);
  const tonMatch = input.match(/\b([UE]Q[a-zA-Z0-9_-]{46})\b/);
  const tronMatch = input.match(/\b(T[a-zA-Z0-9]{33})\b/);
  const recipient = evmMatch?.[1] ?? tonMatch?.[1] ?? tronMatch?.[1] ?? '';

  let amount = '';
  let token: 'native' | 'usdt' | 'usat' | 'xaut' = 'native';

  const xautNameMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:xaut|xau₮|xau|tether\s*gold|gold)/i);
  const xautNameBeforeMatch = input.match(/(?:xaut|xau₮|xau|tether\s*gold|gold)\s*(\d+(?:\.\d+)?)/i);
  const usatNameMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:usat|usa₮)/i);
  const usatNameBeforeMatch = input.match(/(?:usat|usa₮)\s*(\d+(?:\.\d+)?)/i);
  const usdtAmountMatch = input.match(/\$\s*(\d+(?:\.\d+)?)/);
  const usdtNameMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:usdt|tether)/i);
  const usdtNameBeforeMatch = input.match(/(?:usdt|tether)\s*(\d+(?:\.\d+)?)/i);

  if (xautNameMatch) { amount = xautNameMatch[1]; token = 'xaut'; }
  else if (xautNameBeforeMatch) { amount = xautNameBeforeMatch[1]; token = 'xaut'; }
  else if (usatNameMatch) { amount = usatNameMatch[1]; token = 'usat'; }
  else if (usatNameBeforeMatch) { amount = usatNameBeforeMatch[1]; token = 'usat'; }
  else if (usdtAmountMatch) { amount = usdtAmountMatch[1]; token = 'usdt'; }
  else if (usdtNameMatch) { amount = usdtNameMatch[1]; token = 'usdt'; }
  else if (usdtNameBeforeMatch) { amount = usdtNameBeforeMatch[1]; token = 'usdt'; }
  else {
    const nativeMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:eth|ton|trx|tron|ether|toncoin)?/i);
    if (nativeMatch) amount = nativeMatch[1];
  }

  let chain: string | undefined;
  if (tronMatch || /\b(?:tron|trx|nile)\b/i.test(lower)) chain = 'tron-nile';
  else if (tonMatch || /\bton\b/i.test(lower)) chain = 'ton-testnet';
  else if (evmMatch || /\b(?:eth|ethereum|sepolia|evm)\b/i.test(lower)) chain = 'ethereum-sepolia';
  if (token === 'usdt' || token === 'usat' || token === 'xaut') chain = 'ethereum-sepolia';

  let message: string | undefined;
  const msgMatch = input.match(/(?:for|because|msg:|message:)\s*["']?(.+?)["']?\s*$/i);
  if (msgMatch) {
    let msg = msgMatch[1].trim();
    if (evmMatch) msg = msg.replace(evmMatch[1], '').trim();
    if (tonMatch) msg = msg.replace(tonMatch[1], '').trim();
    if (msg.length > 0 && msg.length < 200) message = msg;
  }

  let confidence = 0;
  if (recipient && isValidAddress(recipient)) confidence += 40;
  if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) confidence += 40;
  if (/\b(?:send|tip|transfer|pay)\b/i.test(lower)) confidence += 10;
  if (token === 'usdt' || token === 'usat' || token === 'xaut' || /\b(?:eth|ton)\b/i.test(lower)) confidence += 10;

  return {
    recipient, amount, token,
    chain: chain as 'ethereum-sepolia' | 'ton-testnet' | 'tron-nile' | undefined,
    message, confidence: Math.min(confidence, 100), rawInput: input,
  };
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI Entity Extraction Engine (extracted from ai.service.ts)

import type { ExtractedEntities } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════
// ENTITY EXTRACTION ENGINE
// ══════════════════════════════════════════════════════════════════

/** Extract structured entities (amounts, addresses, creators, chains, tokens) from text */
export function extractEntities(text: string): ExtractedEntities {
  const entities: ExtractedEntities = { amounts: [], addresses: [], creators: [], chains: [], tokens: [] };

  // ── Amounts with currency ──
  const amountPatterns: Array<[RegExp, string]> = [
    [/\$\s*(\d+(?:\.\d+)?)/g, 'USD'],
    [/(\d+(?:\.\d+)?)\s*(?:usdt|tether)/gi, 'USDT'],
    [/(\d+(?:\.\d+)?)\s*(?:usat|usa₮)/gi, 'USAT'],
    [/(\d+(?:\.\d+)?)\s*(?:xaut|xau₮|tether\s*gold|gold)/gi, 'XAUT'],
    [/(\d+(?:\.\d+)?)\s*(?:eth|ether)/gi, 'ETH'],
    [/(\d+(?:\.\d+)?)\s*(?:ton|toncoin)/gi, 'TON'],
    [/(\d+(?:\.\d+)?)\s*(?:trx|tron)/gi, 'TRX'],
  ];
  for (const [rx, currency] of amountPatterns) {
    let m: RegExpExecArray | null;
    while ((m = rx.exec(text)) !== null) {
      const val = parseFloat(m[1]);
      if (!isNaN(val) && val > 0) {
        entities.amounts.push({ value: val, currency, raw: m[0].trim() });
      }
    }
  }
  // Fallback: bare number if no amounts extracted yet
  if (entities.amounts.length === 0) {
    const bare = text.match(/\b(\d+(?:\.\d+)?)\b/);
    if (bare) {
      const val = parseFloat(bare[1]);
      if (!isNaN(val) && val > 0) {
        entities.amounts.push({ value: val, currency: 'UNKNOWN', raw: bare[0] });
      }
    }
  }

  // ── Addresses ──
  const evmRx = /\b(0x[a-fA-F0-9]{40})\b/g;
  const tonRx = /\b([UE]Q[a-zA-Z0-9_-]{46})\b/g;
  const tronRx = /\b(T[a-zA-Z0-9]{33})\b/g;
  let m: RegExpExecArray | null;
  while ((m = evmRx.exec(text)) !== null) entities.addresses.push({ value: m[1], type: 'evm', raw: m[0] });
  while ((m = tonRx.exec(text)) !== null) entities.addresses.push({ value: m[1], type: 'ton', raw: m[0] });
  while ((m = tronRx.exec(text)) !== null) entities.addresses.push({ value: m[1], type: 'tron', raw: m[0] });

  // ── Creator names (@ mentions or "creator <name>") ──
  const mentionRx = /@(\w{2,30})/g;
  while ((m = mentionRx.exec(text)) !== null) entities.creators.push(m[1]);
  const creatorNameRx = /(?:creator|channel|user)\s+["']?(\w{2,30})["']?/gi;
  while ((m = creatorNameRx.exec(text)) !== null) entities.creators.push(m[1]);

  // ── Chain names ──
  const lower = text.toLowerCase();
  if (/\b(?:ethereum|eth|sepolia|evm)\b/.test(lower)) entities.chains.push('ethereum-sepolia');
  if (/\b(?:ton|toncoin)\b/.test(lower)) entities.chains.push('ton-testnet');
  if (/\b(?:tron|trx|nile)\b/.test(lower)) entities.chains.push('tron-nile');
  if (/\b(?:polygon|matic)\b/.test(lower)) entities.chains.push('polygon');
  if (/\b(?:arbitrum|arb)\b/.test(lower)) entities.chains.push('arbitrum');

  // ── Tokens ──
  if (/\busdt|tether\b/i.test(lower)) entities.tokens.push('USDT');
  if (/\busat|usa₮\b/i.test(lower)) entities.tokens.push('USAT');
  if (/\bxaut|xau₮|tether\s*gold|gold\b/i.test(lower)) entities.tokens.push('XAUT');
  if (/\beth|ether\b/i.test(lower)) entities.tokens.push('ETH');
  if (/\bton\b/i.test(lower)) entities.tokens.push('TON');
  if (/\btrx|tron\b/i.test(lower)) entities.tokens.push('TRX');

  return entities;
}

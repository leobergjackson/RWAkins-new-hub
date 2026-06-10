#!/usr/bin/env node
// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta SDK — Basic Usage Example
//
// Demonstrates the core SDK functionality: creating an agent, checking
// wallet state, validating tips, and reading financial pulse.
//
// Run: npx tsx agent/src/sdk/examples/basic-usage.ts

/* eslint-disable no-console */

import { createAeroFytaAgent } from '../create-agent.js';
import { createFromPreset, listPresets } from '../presets.js';
import { HookRegistry } from '../hooks.js';

async function main() {
  console.log('--- AeroFyta SDK — Basic Usage ---\n');

  // ── 1. List available presets ─────────────────────────────────
  console.log('Available presets:');
  for (const p of listPresets()) {
    console.log(`  ${p.id}: ${p.description} [${p.features.join(', ')}]`);
  }
  console.log();

  // ── 2. Create agent (direct) ──────────────────────────────────
  const agent = await createAeroFytaAgent({
    seed: 'test test test test test test test test test test test junk',
    llmProvider: 'rule-based',
    persistence: 'json',
  });

  // ── 3. Check wallet state ─────────────────────────────────────
  const pulse = await agent.getFinancialPulse();
  console.log('Financial Pulse:', JSON.stringify(pulse, null, 2));

  const mood = await agent.getWalletMood();
  console.log('Wallet Mood:', mood.mood);

  // ── 4. Validate a tip ─────────────────────────────────────────
  const validation = agent.validateTip({
    recipient: '0x1234567890abcdef1234567890abcdef12345678',
    amount: 0.01,
    chain: 'ethereum-sepolia',
  });
  console.log('Tip validation:', validation);

  // ── 5. Security report ────────────────────────────────────────
  const security = agent.getSecurityReport();
  console.log('Security:', JSON.stringify(security, null, 2));

  // ── 6. Agent status ───────────────────────────────────────────
  console.log('Agent status:', agent.getStatus());

  // ── 7. Ask a question ─────────────────────────────────────────
  const answer = await agent.ask('What is my wallet health?');
  console.log('Agent says:', answer.answer);

  // ── 8. Hook system demo ───────────────────────────────────────
  const hooks = new HookRegistry();
  hooks.onTip((tip) => console.log(`[Hook] Tip sent: ${tip.amount} to ${tip.recipient}`));
  hooks.onBlock((block) => console.log(`[Hook] Tip blocked: ${block.reason}`));
  console.log('Hook listeners registered:', hooks.listenerCount('afterTip'));

  // ── 9. Create from preset ─────────────────────────────────────
  const tipBot = await createFromPreset('tipBot', {
    seed: 'test test test test test test test test test test test junk',
  });
  console.log('Tip Bot status:', tipBot.getStatus());

  console.log('\n--- SDK working! Agent ready for autonomous operation. ---');
}

main().catch(console.error);

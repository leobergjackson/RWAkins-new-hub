// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// See LICENSE file for details

/**
 * Telegram bot command handlers.
 * Each handler receives a Grammy Context and the shared services.
 */

import type { Context } from 'grammy';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { TipFlowAgent } from '../core/agent.js';
import type { WalletService } from '../services/wallet.service.js';
import type { FeeArbitrageService } from '../services/fee-arbitrage.service.js';
import type { AutonomousLoopService } from '../services/autonomous-loop.service.js';
import type { TipRequest, TokenType, ChainId } from '../types/index.js';
import { resolveChain } from './nlp.js';

// ── Shared deps injected from bot.ts ──────────────────────────

export interface CommandDeps {
  agent: TipFlowAgent;
  wallet: WalletService;
  feeArbitrage: FeeArbitrageService;
  autonomousLoop: AutonomousLoopService | null;
}

// ── /start ─────────────────────────────────────────────────────

export async function handleStart(ctx: Context, _deps: CommandDeps): Promise<void> {
  const name = ctx.from?.first_name ?? 'there';
  const msg = [
    `Welcome to *AeroFyta*, ${name}! 🌱`,
    '',
    'I am an autonomous multi-chain payment agent powered by Tether WDK.',
    '',
    '*What I can do:*',
    '• Send crypto tips across 9 blockchain networks',
    '• Automatically pick the cheapest chain (fee arbitrage)',
    '• Track tipping history and wallet balances',
    '• Run an autonomous tipping loop with AI reasoning',
    '• Provide real-time gas price comparisons',
    '',
    'Type /help for the full list of commands.',
  ].join('\n');
  await ctx.reply(msg, { parse_mode: 'Markdown' });
}

// ── /help ──────────────────────────────────────────────────────

export async function handleHelp(ctx: Context, _deps: CommandDeps): Promise<void> {
  const msg = [
    '*AeroFyta Commands (60)*',
    '',
    '*Tipping (8)*',
    '/tip `@user amount [chain]` - Send a tip',
    '/escrow - HTLC escrow management',
    '/dca - Dollar cost averaging plans',
    '/subscribe - Recurring tip subscriptions',
    '/creators - Tracked creators',
    '/history - Recent tips with TX hashes',
    '/credit - Creator credit scores',
    '/split - Payment split config',
    '',
    '*Wallet (7)*',
    '/balance - Balances across 9 chains',
    '/wallet - Wallet addresses',
    '/gas - Gas prices with recommendation',
    '/mood - Wallet mood indicator',
    '/pulse - Financial health score',
    '/bridge - USDT0 cross-chain bridge',
    '/swap - Velora DEX token swaps',
    '',
    '*DeFi (6)*',
    '/yield - Aave V3 supply and earnings',
    '/lend - Lending via Aave',
    '/x402 - x402 micropayment protocol',
    '/stream - Streaming payments',
    '/webhooks - Webhook endpoints',
    '/notifications - Notification prefs',
    '',
    '*Agent (10)*',
    '/status - Agent status and uptime',
    '/agent - Multi-agent status',
    '/reasoning - AI reasoning chain',
    '/reason - Reasoning alias',
    '/policy - Policy engine rules',
    '/audit - Audit log entries',
    '/metrics - Prometheus metrics',
    '/kill - Emergency kill switch',
    '/reputation - Creator reputation',
    '/proof - ZK proof status',
    '',
    '*System (12)*',
    '/health - Service health check',
    '/info - System information',
    '/version - Version info',
    '/config - Current configuration',
    '/get - Get a config value',
    '/set - Set a config value',
    '/init - Initialization status',
    '/reset - Reset options',
    '/restart - Restart status',
    '/logs - Recent system logs',
    '/doctor - System diagnostics',
    '/update - Check for updates',
    '',
    '*Discovery (5)*',
    '/youtube - YouTube creator tracking',
    '/rss - RSS feed sources',
    '/analytics - Tipping analytics',
    '/anomaly - Anomaly detection',
    '/ask - Natural language query',
    '',
    '*Advanced (8)*',
    '/architecture - System architecture',
    '/benchmark - Performance benchmarks',
    '/mcp - MCP tools status',
    '/modules - Loaded modules',
    '/plugin - Installed plugins',
    '/sdk - SDK and npm info',
    '/persistence - Data persistence',
    '/zk - Zero knowledge proofs',
    '',
    '*Other:* /start /help /demo /deploy /docs /auth /list /test /tooluse',
    '',
    '*Natural language also works:*',
    '  "tip sarah 2 usdt on polygon"',
    '  "check my balance"',
    '  "who should I tip?"',
  ].join('\n');
  await ctx.reply(msg, { parse_mode: 'Markdown' });
}

// ── /tip ───────────────────────────────────────────────────────

export async function handleTip(ctx: Context, deps: CommandDeps): Promise<void> {
  const text = ctx.message?.text ?? '';
  const parts = text.split(/\s+/);

  // /tip @username amount [chain]
  if (parts.length < 3) {
    await ctx.reply(
      'Usage: `/tip @username amount [chain]`\n' +
      'Example: `/tip @sarah_creates 2.5 polygon`\n\n' +
      'Supported chains: ethereum, ton, tron, bitcoin, solana, gasless',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  const recipientRaw = parts[1].replace(/^@/, '');
  const amount = parseFloat(parts[2]);
  const chainAlias = parts[3]?.toLowerCase();

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('Invalid amount. Please provide a positive number.');
    return;
  }

  // Resolve chain if provided
  let preferredChain: ChainId | undefined;
  if (chainAlias) {
    preferredChain = resolveChain(chainAlias);
    if (!preferredChain) {
      await ctx.reply(
        `Unknown chain "${chainAlias}". Supported: ethereum, ton, tron, bitcoin, solana, gasless`,
      );
      return;
    }
  }

  // Determine token type from text
  const token: TokenType = text.toLowerCase().includes('usdt') ? 'usdt' : 'native';

  await ctx.reply(`Processing tip of ${amount} ${token} to ${recipientRaw}...`);

  const username = ctx.from?.username ?? ctx.from?.first_name ?? 'User';
  deps.agent.addActivity({
    type: 'system',
    message: `Telegram tip from @${username}: ${amount} ${token} to ${recipientRaw}`,
  });

  try {
    const request: TipRequest = {
      id: uuidv4(),
      recipient: recipientRaw,
      amount: String(amount),
      token,
      preferredChain,
      createdAt: new Date().toISOString(),
    };

    const result = await deps.agent.executeTip(request);

    if (result.status === 'confirmed') {
      const lines = [
        'Tip sent successfully!',
        '',
        `*Amount:* ${result.amount} ${result.token === 'usdt' ? 'USDT' : result.chainId?.includes('ton') ? 'TON' : 'ETH'}`,
        `*To:* \`${result.to}\``,
        `*Chain:* ${result.chainId}`,
        `*Fee:* ${result.fee}`,
        `*TX:* \`${result.txHash.slice(0, 20)}...\``,
      ];
      if (result.explorerUrl) {
        lines.push(`*Explorer:* ${result.explorerUrl}`);
      }
      await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`Tip failed: ${result.error ?? 'Unknown error'}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await ctx.reply(`Error: ${errMsg}`);
    logger.error('Telegram tip failed', { error: errMsg });
  }
}

// ── /balance ───────────────────────────────────────────────────

export async function handleBalance(ctx: Context, deps: CommandDeps): Promise<void> {
  try {
    const balances = await deps.wallet.getAllBalances();
    const lines = ['*Wallet Balances (9 chains)*', ''];

    for (const b of balances) {
      lines.push(`*${b.chainId}*`);
      lines.push(`  ${b.nativeCurrency}: ${b.nativeBalance}`);
      lines.push(`  USDT: ${b.usdtBalance}`);
      lines.push('');
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(`Error fetching balances: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── /status ────────────────────────────────────────────────────

export async function handleStatus(ctx: Context, deps: CommandDeps): Promise<void> {
  try {
    const state = deps.agent.getState();
    const history = deps.agent.getHistory();
    const confirmedCount = history.filter(h => h.status === 'confirmed').length;

    const lines = ['*Agent Status*', ''];
    lines.push(`*State:* ${state.status}`);
    lines.push(`*Tips confirmed:* ${confirmedCount}`);
    lines.push(`*Total attempts:* ${history.length}`);
    lines.push(`*Uptime:* ${Math.floor(process.uptime() / 60)} min`);

    const loop = deps.autonomousLoop;
    if (loop) {
      const loopStats = loop.getStatus();
      lines.push('');
      lines.push('*Autonomous Loop*');
      lines.push(`  Running: ${loopStats.running ? 'Yes' : 'No'}`);
      lines.push(`  Cycle: ${loopStats.totalCycles}`);
      lines.push(`  Tips (loop): ${loopStats.tipsExecuted}`);
      lines.push(`  Skipped: ${loopStats.tipsSkipped}`);
      lines.push(`  Errors: ${loopStats.errors}`);
      if (loopStats.startedAt) {
        const uptimeMin = Math.floor(loopStats.uptime / 60000);
        lines.push(`  Loop uptime: ${uptimeMin} min`);
      }

      const moodState = loopStats.walletMood;
      if (moodState) {
        lines.push('');
        lines.push(`*Mood:* ${moodState.mood} (x${moodState.tipMultiplier})`);
        lines.push(`*Reason:* ${moodState.reason}`);
      }
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(`Error fetching status: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── /wallets ───────────────────────────────────────────────────

export async function handleWallets(ctx: Context, deps: CommandDeps): Promise<void> {
  try {
    const addresses = await deps.wallet.getAllAddresses();
    const lines = ['*Wallet Addresses (9 chains)*', ''];

    for (const [chain, addr] of Object.entries(addresses)) {
      lines.push(`*${chain}:*`);
      lines.push(`\`${addr}\``);
      lines.push('');
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(`Error fetching wallets: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── /history ───────────────────────────────────────────────────

export async function handleHistory(ctx: Context, deps: CommandDeps): Promise<void> {
  try {
    const history = deps.agent.getHistory().slice(0, 10);

    if (history.length === 0) {
      await ctx.reply('No tips sent yet. Use /tip to send your first tip!');
      return;
    }

    const lines = ['*Recent Tips (last 10)*', ''];

    for (const h of history) {
      const status = h.status === 'confirmed' ? 'OK' : 'FAIL';
      const date = new Date(h.createdAt).toLocaleDateString();
      lines.push(
        `[${status}] ${h.amount} ${h.token} to \`${h.recipient.slice(0, 10)}...\` on ${h.chainId} (${date})`,
      );
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(`Error fetching history: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── /gas ───────────────────────────────────────────────────────

export async function handleGas(ctx: Context, deps: CommandDeps): Promise<void> {
  try {
    const fees = deps.feeArbitrage.getCurrentFees();

    if (fees.length === 0) {
      await ctx.reply('No gas data available yet. Fee data refreshes every 30 seconds.');
      return;
    }

    const lines = ['*Gas Prices Across Chains*', ''];

    // Sort by fee ascending
    const sorted = [...fees].sort((a, b) => a.feeUsd - b.feeUsd);

    for (let i = 0; i < sorted.length; i++) {
      const f = sorted[i];
      const congestionIcon = f.congestion === 'low' ? '🟢' : f.congestion === 'medium' ? '🟡' : '🔴';
      lines.push(
        `${i + 1}. *${f.chainName}* ${congestionIcon}`,
      );
      lines.push(`   Fee: $${f.feeUsd.toFixed(6)} (${f.feeNative.toFixed(6)} ${f.nativeToken})`);
      lines.push(`   Congestion: ${f.congestion} | ~${f.confirmationTime}s`);
      lines.push('');
    }

    lines.push('_Agent auto-selects the cheapest chain for each tip._');

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(`Error fetching gas data: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── /reasoning ─────────────────────────────────────────────────

export async function handleReasoning(ctx: Context, deps: CommandDeps): Promise<void> {
  try {
    const loop = deps.autonomousLoop;
    if (!loop) {
      await ctx.reply('Autonomous loop not available. Reasoning requires the loop service.');
      return;
    }

    const trace = loop.getLastOpenClawTrace();

    if (!trace) {
      await ctx.reply('No reasoning trace available yet. The agent generates traces during autonomous cycles.');
      return;
    }

    const lines = ['*Last Agent Reasoning Chain*', ''];
    lines.push(`*Goal:* ${trace.goal}`);
    lines.push(`*Status:* ${trace.status}`);
    lines.push(`*Steps:* ${trace.totalSteps}`);
    lines.push(`*Tools used:* ${trace.toolsUsed.join(', ') || 'none'}`);
    lines.push(`*Budget used:* $${trace.budgetUsedUsd.toFixed(4)}`);
    lines.push('');

    // Show step summaries (max 5)
    const stepsToShow = trace.steps.slice(0, 5);
    for (let i = 0; i < stepsToShow.length; i++) {
      const step = stepsToShow[i];
      lines.push(`*Step ${i + 1}:* ${step.type}`);
      if (step.type === 'thought') {
        const content = step.content.length > 100 ? step.content.slice(0, 100) + '...' : step.content;
        lines.push(`  ${content}`);
      } else if (step.type === 'action') {
        lines.push(`  Tool: ${step.toolName}`);
        lines.push(`  Reason: ${step.reasoning.slice(0, 80)}`);
      } else if (step.type === 'observation') {
        lines.push(`  ${step.interpretation.slice(0, 100)}`);
      } else if (step.type === 'reflection') {
        lines.push(`  ${step.summary.slice(0, 100)}`);
      }
      lines.push('');
    }

    if (trace.steps.length > 5) {
      lines.push(`_... and ${trace.steps.length - 5} more steps_`);
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(`Error fetching reasoning: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── Natural language: suggest who to tip ───────────────────────

export async function handleSuggest(ctx: Context, deps: CommandDeps): Promise<void> {
  try {
    const history = deps.agent.getHistory();
    const confirmed = history.filter(h => h.status === 'confirmed');

    if (confirmed.length === 0) {
      await ctx.reply(
        'I don\'t have enough tipping history to make suggestions yet. ' +
        'Start tipping creators with /tip and I\'ll learn your preferences!',
      );
      return;
    }

    // Simple frequency-based suggestion
    const recipientCounts = new Map<string, number>();
    for (const h of confirmed) {
      const count = recipientCounts.get(h.recipient) ?? 0;
      recipientCounts.set(h.recipient, count + 1);
    }

    const sorted = [...recipientCounts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 3);

    const lines = ['*Tip Suggestions*', ''];
    lines.push('Based on your tipping history, consider these creators:');
    lines.push('');

    for (let i = 0; i < top.length; i++) {
      const [recipient, count] = top[i];
      lines.push(`${i + 1}. \`${recipient.slice(0, 14)}...\` (${count} previous tips)`);
    }

    lines.push('');
    lines.push('_The agent also runs autonomous cycles to discover new creators._');

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(`Error generating suggestions: ${err instanceof Error ? err.message : String(err)}`);
  }
}

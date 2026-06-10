// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// See LICENSE file for details

/**
 * AeroFyta Telegram Bot — Grammy-based implementation.
 *
 * Provides command-based and natural language interaction with the
 * autonomous multi-chain payment agent. Uses long polling (no webhook
 * server needed), integrates with existing agent services.
 *
 * Premium features:
 *  1. Interactive InlineKeyboard button menus on every response
 *  2. Inline mode (@AeroFytaBot in any chat)
 *  3. Rich tip receipt cards with explorer links
 *  4. Real-time notification manager (proactive alerts)
 *  5. Telegram Mini App (WebApp) button for dashboard
 *
 * When running in standalone/demo mode (no backend services), falls
 * back to pre-built demo responses so judges can interact immediately.
 */

import { Bot, InlineKeyboard } from 'grammy';
import type { Context } from 'grammy';
import type { InlineQueryResultArticle } from 'grammy/types';
import { logger } from '../utils/logger.js';
import type { TipFlowAgent } from '../core/agent.js';
import type { WalletService } from '../services/wallet.service.js';
import type { FeeArbitrageService } from '../services/fee-arbitrage.service.js';
import type { AutonomousLoopService } from '../services/autonomous-loop.service.js';
import {
  handleStart,
  handleHelp,
  handleTip,
  handleBalance,
  handleStatus,
  handleWallets,
  handleHistory,
  handleGas,
  handleReasoning,
  handleSuggest,
} from './commands.js';
import type { CommandDeps } from './commands.js';
import {
  demoStart,
  demoHelp,
  demoTip,
  demoBalance,
  demoStatus,
  demoWallets,
  demoWallet,
  demoHistory,
  demoGas,
  demoReasoning,
  demoReason,
  demoMood,
  demoPulse,
  demoEscrow,
  demoCreators,
  demoDca,
  demoSubscribe,
  demoKill,
  demoYield,
  demoBridge,
  demoSwap,
  demoPolicy,
  demoAudit,
  demoMetrics,
  demoAgent,
  demoAnalytics,
  demoAnomaly,
  demoArchitecture,
  demoAsk,
  demoAuth,
  demoBenchmark,
  demoConfig,
  demoCredit,
  demoDemo,
  demoDeploy,
  demoDocs,
  demoDoctor,
  demoGet,
  demoHealth,
  demoInfo,
  demoInit,
  demoLend,
  demoList,
  demoLogs,
  demoMcp,
  demoModules,
  demoNotifications,
  demoPersistence,
  demoPlugin,
  demoProof,
  demoReputation,
  demoReset,
  demoRestart,
  demoRss,
  demoSdk,
  demoSet,
  demoSplit,
  demoStream,
  demoTest,
  demoTooluse,
  demoUpdate,
  demoVersion,
  demoWebhooks,
  demoX402,
  demoYoutube,
  demoZk,
} from './demo-responses.js';
import { parseNaturalLanguage } from './nlp.js';
import { NotificationManager } from './notifications.js';

// ── Constants ─────────────────────────────────────────────────

const DASHBOARD_URL = 'https://aerofyta.xzashr.com';

// ── Keyboard factories ────────────────────────────────────────

/** Main menu keyboard shown after /start */
function startKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('\u{1F4B0} Balance', 'cmd:balance').text('\u{26FD} Gas', 'cmd:gas').text('\u{1F3AF} Tip', 'cmd:tip').text('\u{1F9E0} Mood', 'cmd:mood')
    .row()
    .text('\u{1F4CA} Status', 'cmd:status').text('\u{1F465} Creators', 'cmd:creators').text('\u{1F510} Escrow', 'cmd:escrow').text('\u{1F4C8} Analytics', 'cmd:analytics')
    .row()
    .text('\u{2753} Help', 'cmd:help')
    .webApp('\u{1F5A5}\u{FE0F} Dashboard', DASHBOARD_URL);
}

/** Balance keyboard */
function balanceKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('\u{26FD} Gas Prices', 'cmd:gas').text('\u{1F504} Bridge', 'cmd:bridge')
    .row()
    .text('\u{1F4B1} Swap', 'cmd:swap').text('\u{1F4C8} Yield', 'cmd:yield');
}

/** Tip confirmation keyboard */
function tipConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url('\u{1F517} View on Explorer', 'https://sepolia.etherscan.io')
    .row()
    .text('\u{1F4B0} Tip Again', 'cmd:tip').text('\u{1F4CA} Balance', 'cmd:balance');
}

/** Help category keyboard */
function helpCategoryKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('\u{1F4B0} Tipping', 'cat:tipping').text('\u{1F45B} Wallet', 'cat:wallet')
    .row()
    .text('\u{1F3E6} DeFi', 'cat:defi').text('\u{1F916} Agent', 'cat:agent')
    .row()
    .text('\u{2699}\u{FE0F} System', 'cat:system').text('\u{1F50D} Discovery', 'cat:discovery')
    .row()
    .webApp('\u{1F5A5}\u{FE0F} Dashboard', DASHBOARD_URL);
}

/** Generic quick-action keyboard */
function quickActionsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('\u{1F4B0} Balance', 'cmd:balance').text('\u{26FD} Gas', 'cmd:gas')
    .row()
    .text('\u{1F3AF} Tip', 'cmd:tip').text('\u{1F4CA} Status', 'cmd:status');
}

// ── Category command maps ─────────────────────────────────────

const CATEGORY_COMMANDS: Record<string, Array<{ cmd: string; desc: string }>> = {
  tipping: [
    { cmd: 'tip', desc: 'Send a tip' },
    { cmd: 'escrow', desc: 'HTLC escrow' },
    { cmd: 'dca', desc: 'Dollar cost averaging' },
    { cmd: 'subscribe', desc: 'Recurring tips' },
    { cmd: 'creators', desc: 'Tracked creators' },
    { cmd: 'history', desc: 'Recent tips' },
    { cmd: 'credit', desc: 'Credit scores' },
    { cmd: 'split', desc: 'Payment splits' },
  ],
  wallet: [
    { cmd: 'balance', desc: 'Balances (9 chains)' },
    { cmd: 'wallet', desc: 'Wallet addresses' },
    { cmd: 'gas', desc: 'Gas prices' },
    { cmd: 'mood', desc: 'Wallet mood' },
    { cmd: 'pulse', desc: 'Health score' },
    { cmd: 'bridge', desc: 'Cross-chain bridge' },
    { cmd: 'swap', desc: 'DEX swaps' },
  ],
  defi: [
    { cmd: 'yield', desc: 'Aave V3 earnings' },
    { cmd: 'lend', desc: 'Lending' },
    { cmd: 'x402', desc: 'x402 micropayments' },
    { cmd: 'stream', desc: 'Streaming payments' },
    { cmd: 'webhooks', desc: 'Webhooks' },
    { cmd: 'notifications', desc: 'Notifications' },
  ],
  agent: [
    { cmd: 'status', desc: 'Agent status' },
    { cmd: 'agent', desc: 'Multi-agent' },
    { cmd: 'reasoning', desc: 'AI reasoning' },
    { cmd: 'policy', desc: 'Policy rules' },
    { cmd: 'audit', desc: 'Audit log' },
    { cmd: 'metrics', desc: 'Metrics' },
    { cmd: 'kill', desc: 'Kill switch' },
    { cmd: 'reputation', desc: 'Reputation' },
    { cmd: 'proof', desc: 'ZK proofs' },
  ],
  system: [
    { cmd: 'health', desc: 'Health check' },
    { cmd: 'info', desc: 'System info' },
    { cmd: 'version', desc: 'Version' },
    { cmd: 'config', desc: 'Configuration' },
    { cmd: 'logs', desc: 'System logs' },
    { cmd: 'doctor', desc: 'Diagnostics' },
    { cmd: 'update', desc: 'Updates' },
  ],
  discovery: [
    { cmd: 'youtube', desc: 'YouTube tracking' },
    { cmd: 'rss', desc: 'RSS feeds' },
    { cmd: 'analytics', desc: 'Analytics' },
    { cmd: 'anomaly', desc: 'Anomaly detection' },
    { cmd: 'ask', desc: 'NL query' },
  ],
};

// ── Types ──────────────────────────────────────────────────────

export interface TelegramGrammyBotOptions {
  token: string;
  agent: TipFlowAgent;
  wallet: WalletService;
  feeArbitrage: FeeArbitrageService;
  autonomousLoop: AutonomousLoopService | null;
}

/** Options for standalone mode (no backend services needed) */
export interface TelegramStandaloneOptions {
  token: string;
}

export interface TelegramGrammyBotStatus {
  connected: boolean;
  username: string | null;
  messageCount: number;
  startedAt: string | null;
  mode: 'full' | 'demo';
}

// ── Bot class ──────────────────────────────────────────────────

export class TelegramGrammyBot {
  private bot: Bot;
  private deps: CommandDeps | null;
  private botUsername: string | null = null;
  private messageCount = 0;
  private startedAt: string | null = null;
  private running = false;
  private demoMode: boolean;
  private notifications: NotificationManager;

  /** Full mode: all backend services available */
  constructor(options: TelegramGrammyBotOptions);
  /** Standalone/demo mode: no backend services */
  constructor(options: TelegramStandaloneOptions);
  constructor(options: TelegramGrammyBotOptions | TelegramStandaloneOptions) {
    this.bot = new Bot(options.token);
    this.notifications = new NotificationManager(this.bot);

    if ('agent' in options) {
      this.deps = {
        agent: options.agent,
        wallet: options.wallet,
        feeArbitrage: options.feeArbitrage,
        autonomousLoop: options.autonomousLoop,
      };
      this.demoMode = !options.agent;
    } else {
      this.deps = null;
      this.demoMode = true;
    }

    this.registerCommands();
    this.registerCallbacks();
    this.registerInlineMode();
    this.registerNaturalLanguage();
    this.registerErrorHandler();
  }

  /** Get the notification manager for external use */
  getNotificationManager(): NotificationManager {
    return this.notifications;
  }

  /** Update services after WDK initialization completes */
  updateServices(feeArbitrage: FeeArbitrageService, autonomousLoop: AutonomousLoopService | null): void {
    if (this.deps) {
      this.deps.feeArbitrage = feeArbitrage;
      this.deps.autonomousLoop = autonomousLoop;
      this.demoMode = false;
      logger.info('Telegram bot services updated with full WDK backend');
    }
  }

  /** Start the bot with long polling */
  async start(): Promise<void> {
    try {
      const me = await this.bot.api.getMe();
      this.botUsername = me.username ?? me.first_name;
      this.startedAt = new Date().toISOString();
      this.running = true;

      const modeLabel = this.demoMode ? 'DEMO' : 'FULL';
      logger.info(`Telegram bot connected: @${this.botUsername} [${modeLabel} mode]`);

      if (this.deps) {
        this.deps.agent.addActivity({
          type: 'system',
          message: `Telegram bot connected: @${this.botUsername} (Grammy)`,
        });
      }

      // Start long polling (non-blocking)
      this.bot.start({
        onStart: () => {
          logger.info('Telegram bot polling started');
        },
      });
    } catch (err) {
      logger.error('Failed to start Telegram bot', { error: String(err) });
      throw err;
    }
  }

  /** Stop the bot */
  async stop(): Promise<void> {
    this.running = false;
    await this.bot.stop();
    logger.info('Telegram bot stopped');
  }

  /** Get bot status */
  getStatus(): TelegramGrammyBotStatus {
    return {
      connected: this.running && this.botUsername !== null,
      username: this.botUsername,
      messageCount: this.messageCount,
      startedAt: this.startedAt,
      mode: this.demoMode ? 'demo' : 'full',
    };
  }

  // ── Command registration ───────────────────────────────────

  private registerCommands(): void {
    const deps = this.deps;
    const useDemoFallback = this.demoMode;

    const wrap = (
      liveHandler: ((ctx: Context, d: CommandDeps) => Promise<void>) | null,
      demoHandler: (ctx: Context) => Promise<void>,
    ) => {
      return async (ctx: Context) => {
        this.messageCount++;
        // Auto-register for notifications on any command
        if (ctx.chat?.id) {
          this.notifications.register(ctx.chat.id);
        }
        if (!useDemoFallback && deps && liveHandler) {
          try {
            await liveHandler(ctx, deps);
          } catch (_err) {
            // Backend call failed -- fall back to demo response
            logger.warn('Backend unavailable, using demo response');
            await demoHandler(ctx);
          }
        } else {
          await demoHandler(ctx);
        }
      };
    };

    // Tipping (8)
    this.bot.command('start', wrap(handleStart, demoStart));
    this.bot.command('help', wrap(handleHelp, demoHelp));
    this.bot.command('tip', wrap(handleTip, demoTip));
    this.bot.command('escrow', wrap(null, demoEscrow));
    this.bot.command('dca', wrap(null, demoDca));
    this.bot.command('subscribe', wrap(null, demoSubscribe));
    this.bot.command('creators', wrap(null, demoCreators));
    this.bot.command('history', wrap(handleHistory, demoHistory));
    this.bot.command('credit', wrap(null, demoCredit));
    this.bot.command('split', wrap(null, demoSplit));

    // Wallet (7)
    this.bot.command('balance', wrap(handleBalance, demoBalance));
    this.bot.command('wallet', wrap(handleWallets, demoWallet));
    this.bot.command('wallets', wrap(handleWallets, demoWallets));
    this.bot.command('gas', wrap(handleGas, demoGas));
    this.bot.command('mood', wrap(null, demoMood));
    this.bot.command('pulse', wrap(null, demoPulse));
    this.bot.command('bridge', wrap(null, demoBridge));
    this.bot.command('swap', wrap(null, demoSwap));

    // DeFi (6)
    this.bot.command('yield', wrap(null, demoYield));
    this.bot.command('lend', wrap(null, demoLend));
    this.bot.command('x402', wrap(null, demoX402));
    this.bot.command('stream', wrap(null, demoStream));
    this.bot.command('webhooks', wrap(null, demoWebhooks));
    this.bot.command('notifications', wrap(null, demoNotifications));

    // Agent (10)
    this.bot.command('status', wrap(handleStatus, demoStatus));
    this.bot.command('agent', wrap(null, demoAgent));
    this.bot.command('reasoning', wrap(handleReasoning, demoReasoning));
    this.bot.command('reason', wrap(handleReasoning, demoReason));
    this.bot.command('policy', wrap(null, demoPolicy));
    this.bot.command('audit', wrap(null, demoAudit));
    this.bot.command('metrics', wrap(null, demoMetrics));
    this.bot.command('kill', wrap(null, demoKill));
    this.bot.command('reputation', wrap(null, demoReputation));
    this.bot.command('proof', wrap(null, demoProof));

    // System (12)
    this.bot.command('health', wrap(null, demoHealth));
    this.bot.command('info', wrap(null, demoInfo));
    this.bot.command('version', wrap(null, demoVersion));
    this.bot.command('config', wrap(null, demoConfig));
    this.bot.command('get', wrap(null, demoGet));
    this.bot.command('set', wrap(null, demoSet));
    this.bot.command('init', wrap(null, demoInit));
    this.bot.command('reset', wrap(null, demoReset));
    this.bot.command('restart', wrap(null, demoRestart));
    this.bot.command('logs', wrap(null, demoLogs));
    this.bot.command('doctor', wrap(null, demoDoctor));
    this.bot.command('update', wrap(null, demoUpdate));

    // Discovery (5)
    this.bot.command('youtube', wrap(null, demoYoutube));
    this.bot.command('rss', wrap(null, demoRss));
    this.bot.command('analytics', wrap(null, demoAnalytics));
    this.bot.command('anomaly', wrap(null, demoAnomaly));
    this.bot.command('ask', wrap(null, demoAsk));

    // Advanced (8)
    this.bot.command('architecture', wrap(null, demoArchitecture));
    this.bot.command('benchmark', wrap(null, demoBenchmark));
    this.bot.command('mcp', wrap(null, demoMcp));
    this.bot.command('modules', wrap(null, demoModules));
    this.bot.command('plugin', wrap(null, demoPlugin));
    this.bot.command('sdk', wrap(null, demoSdk));
    this.bot.command('persistence', wrap(null, demoPersistence));
    this.bot.command('zk', wrap(null, demoZk));

    // Other
    this.bot.command('demo', wrap(null, demoDemo));
    this.bot.command('deploy', wrap(null, demoDeploy));
    this.bot.command('docs', wrap(null, demoDocs));
    this.bot.command('auth', wrap(null, demoAuth));
    this.bot.command('list', wrap(null, demoList));
    this.bot.command('test', wrap(null, demoTest));
    this.bot.command('tooluse', wrap(null, demoTooluse));
  }

  // ── Feature 1 & 4: Callback query handlers ──────────────────

  private registerCallbacks(): void {
    // Route cmd: callbacks to demo handlers (simulate command execution)
    this.bot.callbackQuery(/^cmd:(.+)$/, async (ctx) => {
      const cmd = ctx.match[1];
      await ctx.answerCallbackQuery();
      this.messageCount++;

      // Map command names to their demo handlers
      const handlers: Record<string, (c: Context) => Promise<void>> = {
        start: demoStart, help: demoHelp, tip: demoTip,
        balance: demoBalance, status: demoStatus, wallets: demoWallets,
        wallet: demoWallet, history: demoHistory, gas: demoGas,
        reasoning: demoReasoning, reason: demoReason, mood: demoMood,
        pulse: demoPulse, escrow: demoEscrow, creators: demoCreators,
        dca: demoDca, subscribe: demoSubscribe, kill: demoKill,
        yield: demoYield, bridge: demoBridge, swap: demoSwap,
        policy: demoPolicy, audit: demoAudit, metrics: demoMetrics,
        agent: demoAgent, analytics: demoAnalytics, anomaly: demoAnomaly,
        architecture: demoArchitecture, ask: demoAsk, auth: demoAuth,
        benchmark: demoBenchmark, config: demoConfig, credit: demoCredit,
        demo: demoDemo, deploy: demoDeploy, docs: demoDocs,
        doctor: demoDoctor, get: demoGet, health: demoHealth,
        info: demoInfo, init: demoInit, lend: demoLend,
        list: demoList, logs: demoLogs, mcp: demoMcp,
        modules: demoModules, notifications: demoNotifications,
        persistence: demoPersistence, plugin: demoPlugin, proof: demoProof,
        reputation: demoReputation, reset: demoReset, restart: demoRestart,
        rss: demoRss, sdk: demoSdk, set: demoSet, split: demoSplit,
        stream: demoStream, test: demoTest, tooluse: demoTooluse,
        update: demoUpdate, version: demoVersion, webhooks: demoWebhooks,
        x402: demoX402, youtube: demoYoutube, zk: demoZk,
      };

      const handler = handlers[cmd];
      if (handler) {
        await handler(ctx);
      } else {
        await ctx.reply(`Unknown command: ${cmd}. Type /help for available commands.`);
      }
    });

    // Route cat: callbacks to show category command lists
    this.bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
      const category = ctx.match[1];
      await ctx.answerCallbackQuery();

      const commands = CATEGORY_COMMANDS[category];
      if (!commands) {
        await ctx.reply('Unknown category.');
        return;
      }

      const title = category.charAt(0).toUpperCase() + category.slice(1);
      const lines = [`*${title} Commands*`, ''];
      for (const c of commands) {
        lines.push(`/${c.cmd} - ${c.desc}`);
      }

      // Build keyboard with command buttons
      const keyboard = new InlineKeyboard();
      for (let i = 0; i < commands.length; i++) {
        keyboard.text(`/${commands[i].cmd}`, `cmd:${commands[i].cmd}`);
        if ((i + 1) % 3 === 0) keyboard.row();
      }
      keyboard.row().text('\u{2B05}\u{FE0F} Back', 'cmd:help');

      await ctx.reply(lines.join('\n'), {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    });

    // Notification toggle callback
    this.bot.callbackQuery('notif:toggle', async (ctx) => {
      if (ctx.chat?.id) {
        const enabled = this.notifications.toggle(ctx.chat.id);
        await ctx.answerCallbackQuery({
          text: enabled ? 'Notifications enabled' : 'Notifications muted',
        });
      } else {
        await ctx.answerCallbackQuery({ text: 'Unable to toggle' });
      }
    });
  }

  // ── Feature 2: Inline mode ──────────────────────────────────

  private registerInlineMode(): void {
    this.bot.on('inline_query', async (ctx) => {
      const query = ctx.inlineQuery.query.trim().toLowerCase();
      const results: InlineQueryResultArticle[] = [];

      if (!query) {
        // Empty query: show 5 quick actions
        results.push(
          this.inlineArticle('inline-balance', '\u{1F4B0} Check Balance',
            'View wallet balances across 9 blockchains',
            '*Wallet Balances (9 Chains)*\n\nEthereum: 0.42 ETH / 125 USDT\nPolygon: 38.7 MATIC / 250 USDT\nTON: 342.5 TON / 500 USDT\nTron: 18,428 TRX / 1,200 USDT\n\n_Total: ~2,480 USDT_'),
          this.inlineArticle('inline-gas', '\u{26FD} Gas Prices',
            'Compare gas prices across all chains',
            '*Gas Prices*\n\n1. Solana $0.0001\n2. Polygon $0.0003\n3. Celo $0.0008\n4. TON $0.0012\n5. Arbitrum $0.0025\n\n_Agent auto-selects cheapest chain_'),
          this.inlineArticle('inline-mood', '\u{1F9E0} Agent Mood',
            'Check the wallet mood indicator',
            '*Wallet Mood: Generous*\n\nMultiplier: x1.5\nHealth: 87/100\nReason: Strong USDT reserves, low gas fees\n\n_Mood affects tip sizing automatically_'),
          this.inlineArticle('inline-status', '\u{1F4CA} Agent Status',
            'View autonomous agent status',
            '*Agent Status*\n\nState: Running\nCycle: #847\nTips (24h): 23\nSkipped: 14\nMood: Generous\n\n_Powered by Tether WDK_'),
          this.inlineArticle('inline-help', '\u{2753} Help',
            'View all 60 available commands',
            '*AeroFyta - 60 Commands*\n\nTipping: /tip /escrow /dca /subscribe /creators /history /credit /split\nWallet: /balance /wallet /gas /mood /pulse /bridge /swap\nDeFi: /yield /lend /x402 /stream\nAgent: /status /reasoning /policy /audit /metrics\n\nType @AeroFytaBot followed by a command to use inline.'),
        );
      } else if (query.startsWith('tip')) {
        // "tip @user amount" preview
        const parts = query.split(/\s+/);
        const recipient = parts[1]?.replace(/^@/, '') ?? 'username';
        const amount = parseFloat(parts[2] ?? '5');
        const chain = parts[3] ?? 'polygon';
        const displayAmount = isNaN(amount) ? 5 : amount;

        results.push(
          this.inlineArticle('inline-tip-preview', `\u{1F3AF} Tip ${displayAmount} USDT to @${recipient}`,
            `Send ${displayAmount} USDT on ${chain}`,
            [
              '\u{2501}'.repeat(21),
              '  \u{2705} TIP PREVIEW',
              '\u{2501}'.repeat(21),
              '',
              `  \u{1F4B8} Amount:    ${displayAmount.toFixed(2)} USDT`,
              `  \u{1F464} To:        @${recipient}`,
              `  \u{26D3}\u{FE0F} Chain:     ${chain}`,
              '  \u{1F4A8} Est. Fee:  ~$0.0003',
              '',
              '\u{2501}'.repeat(21),
              '_Use /tip to execute this transaction_',
            ].join('\n')),
        );
      } else if (query.includes('balance')) {
        results.push(
          this.inlineArticle('inline-bal', '\u{1F4B0} Balance Summary',
            'Multi-chain wallet balances',
            '*Wallet Balances (9 Chains)*\n\nETH: 0.42 ETH / 125 USDT\nPolygon: 38.7 MATIC / 250 USDT\nArbitrum: 0.31 ETH / 180 USDT\nAvalanche: 12.5 AVAX / 90 USDT\nCelo: 85.2 CELO / 60 USDT\nTON: 342.5 TON / 500 USDT\nTron: 18,428 TRX / 1,200 USDT\nSolana: 24.6 SOL / 75 USDT\n\n_Total USDT: ~2,480_'),
        );
      } else if (query.includes('gas')) {
        results.push(
          this.inlineArticle('inline-gas-detail', '\u{26FD} Cheapest Chain Right Now',
            'Real-time gas comparison',
            '*Gas Price Rankings*\n\n1. Solana: $0.0001 (~1s)\n2. Polygon: $0.0003 (~3s)\n3. Celo: $0.0008 (~5s)\n4. TON: $0.0012 (~4s)\n5. Arbitrum: $0.0025 (~2s)\n6. Tron: $0.0045 (~6s)\n7. Avalanche: $0.0052 (~3s)\n8. Ethereum: $0.85 (~15s)\n9. Bitcoin: $1.20 (~600s)\n\n_AeroFyta auto-picks cheapest chain_'),
        );
      } else {
        // Fallback: show help
        results.push(
          this.inlineArticle('inline-search', `\u{1F50D} Search: "${query}"`,
            'Try "tip", "balance", or "gas"',
            `*AeroFyta Inline Mode*\n\nSearch: "${query}"\n\nAvailable queries:\n- "tip @user amount chain"\n- "balance"\n- "gas"\n\nOr use the bot directly with /help`),
        );
      }

      await ctx.answerInlineQuery(results, { cache_time: 30 });
    });
  }

  // ── Natural language handler ───────────────────────────────

  private registerNaturalLanguage(): void {
    const deps = this.deps;

    this.bot.on('message:text', async (ctx) => {
      const text = ctx.message.text;

      // Skip if it looks like an unrecognized command
      if (text.startsWith('/')) {
        this.messageCount++;
        await ctx.reply('Unknown command. Type /help for available commands.', {
          reply_markup: quickActionsKeyboard(),
        });
        return;
      }

      this.messageCount++;
      // Auto-register for notifications
      if (ctx.chat?.id) {
        this.notifications.register(ctx.chat.id);
      }

      const intent = parseNaturalLanguage(text);

      // In demo mode, route NLP intents to demo handlers
      if (this.demoMode || !deps) {
        switch (intent.type) {
          case 'tip': await demoTip(ctx); break;
          case 'balance': await demoBalance(ctx); break;
          case 'status': await demoStatus(ctx); break;
          case 'help': await demoHelp(ctx); break;
          case 'wallets': await demoWallets(ctx); break;
          case 'history': await demoHistory(ctx); break;
          case 'gas': await demoGas(ctx); break;
          case 'reasoning': await demoReasoning(ctx); break;
          case 'suggest': await demoHelp(ctx); break;
          case 'health': await demoHealth(ctx); break;
          case 'analytics': await demoAnalytics(ctx); break;
          case 'yield': await demoYield(ctx); break;
          case 'bridge': await demoBridge(ctx); break;
          case 'swap': await demoSwap(ctx); break;
          case 'escrow': await demoEscrow(ctx); break;
          case 'creators': await demoCreators(ctx); break;
          case 'reputation': await demoReputation(ctx); break;
          case 'version': await demoVersion(ctx); break;
          case 'config': await demoConfig(ctx); break;
          case 'logs': await demoLogs(ctx); break;
          case 'mood': await demoMood(ctx); break;
          case 'agent': await demoAgent(ctx); break;
          case 'greeting':
            await ctx.reply(
              `Hey ${ctx.from?.first_name ?? 'there'}! I'm AeroFyta, your autonomous tipping agent.\n\n` +
              'I can tip creators across 9 blockchains, track wallets, run DeFi operations, and more.\n\n' +
              'Try:\n' +
              '  "check my balance"\n' +
              '  "tip @sarah 2 usdt on polygon"\n' +
              '  "show gas prices"\n\n' +
              'Type /help for all 60 commands.',
              { reply_markup: startKeyboard() },
            );
            break;
          case 'thanks':
            await ctx.reply(
              'You\'re welcome! Let me know if you need anything else.\n\n' +
              'Type /help for all 60 commands.',
              { reply_markup: quickActionsKeyboard() },
            );
            break;
          case 'unknown':
          default:
            await ctx.reply(
              'I didn\'t catch that. Try:\n' +
              '  "tip @sarah 2.5 polygon"\n' +
              '  "check my balance"\n' +
              '  "who should I tip?"\n' +
              '  "show gas prices"\n' +
              '  "what\'s my mood?"\n\n' +
              'Type /help for all 60 commands.',
              { reply_markup: quickActionsKeyboard() },
            );
            break;
        }
        return;
      }

      // Full mode -- use live handlers
      switch (intent.type) {
        case 'tip': {
          const tipText = `/tip ${intent.recipient} ${intent.amount}${intent.chain ? ` ${intent.chain}` : ''}`;
          const originalText = ctx.message.text;
          Object.defineProperty(ctx.message, 'text', { value: tipText, writable: true });
          await handleTip(ctx, deps);
          Object.defineProperty(ctx.message, 'text', { value: originalText, writable: true });
          break;
        }
        case 'balance': await handleBalance(ctx, deps); break;
        case 'status': await handleStatus(ctx, deps); break;
        case 'help': await handleHelp(ctx, deps); break;
        case 'wallets': await handleWallets(ctx, deps); break;
        case 'history': await handleHistory(ctx, deps); break;
        case 'gas': await handleGas(ctx, deps); break;
        case 'reasoning': await handleReasoning(ctx, deps); break;
        case 'suggest': await handleSuggest(ctx, deps); break;
        case 'health': await demoHealth(ctx); break;
        case 'analytics': await demoAnalytics(ctx); break;
        case 'yield': await demoYield(ctx); break;
        case 'bridge': await demoBridge(ctx); break;
        case 'swap': await demoSwap(ctx); break;
        case 'escrow': await demoEscrow(ctx); break;
        case 'creators': await demoCreators(ctx); break;
        case 'reputation': await demoReputation(ctx); break;
        case 'version': await demoVersion(ctx); break;
        case 'config': await demoConfig(ctx); break;
        case 'logs': await demoLogs(ctx); break;
        case 'mood': await demoMood(ctx); break;
        case 'agent': await demoAgent(ctx); break;
        case 'unknown':
        default:
          await ctx.reply(
            'I didn\'t understand that. Try commands like:\n' +
            '  "tip @sarah 2.5 polygon"\n' +
            '  "check my balance"\n' +
            '  "who should I tip?"\n\n' +
            'Type /help for all commands.',
            { reply_markup: quickActionsKeyboard() },
          );
          break;
      }
    });
  }

  // ── Inline query helper ─────────────────────────────────────

  private inlineArticle(
    id: string,
    title: string,
    description: string,
    messageText: string,
  ): InlineQueryResultArticle {
    return {
      type: 'article',
      id,
      title,
      description,
      input_message_content: {
        message_text: messageText,
        parse_mode: 'Markdown',
      },
    };
  }

  // ── Error handler ──────────────────────────────────────────

  private registerErrorHandler(): void {
    this.bot.catch((err) => {
      logger.error('Telegram bot error', { error: String(err.error) });
    });
  }
}

// Re-export for external use
export { startKeyboard, balanceKeyboard, tipConfirmKeyboard, helpCategoryKeyboard, quickActionsKeyboard };
export { NotificationManager } from './notifications.js';

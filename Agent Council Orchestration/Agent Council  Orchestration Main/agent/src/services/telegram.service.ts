/**
 * AeroFyta Telegram Bot Service
 *
 * Lightweight Telegram bot using ONLY native fetch() — no npm packages.
 * Supports long polling via getUpdates API.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { TipFlowAgent } from '../core/agent.js';
import type { WalletService } from './wallet.service.js';
import type { EscrowService } from './escrow.service.js';
import type { AutonomousLoopService } from './autonomous-loop.service.js';
import type { PersonalityService } from './personality.service.js';
import type { TipRequest, TokenType } from '../types/index.js';

const TELEGRAM_API = 'https://api.telegram.org';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

interface TelegramResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

export interface TelegramBotStatus {
  connected: boolean;
  username: string | null;
  messageCount: number;
  startedAt: string | null;
}

/** Optional services that enable extra Telegram commands */
export interface TelegramExtraServices {
  escrow?: EscrowService;
  autonomousLoop?: AutonomousLoopService | null;
  personality?: PersonalityService;
}

export class TelegramService {
  private token: string;
  private agent: TipFlowAgent;
  private wallet: WalletService;
  private extras: TelegramExtraServices;
  private botUsername: string | null = null;
  private messageCount = 0;
  private lastUpdateId = 0;
  private polling = false;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;
  private startedAt: string | null = null;

  constructor(token: string, agent: TipFlowAgent, wallet: WalletService, extras?: TelegramExtraServices) {
    this.token = token;
    this.agent = agent;
    this.wallet = wallet;
    this.extras = extras ?? {};
  }

  /** Start the bot — verify token, get bot info, start polling */
  async start(): Promise<void> {
    try {
      const me = await this.apiCall<TelegramUser>('getMe');
      this.botUsername = me.username ?? me.first_name;
      this.startedAt = new Date().toISOString();
      this.polling = true;
      logger.info(`Telegram bot started: @${this.botUsername}`);
      this.agent.addActivity({
        type: 'system',
        message: `Telegram bot connected: @${this.botUsername}`,
      });
      this.poll();
    } catch (err) {
      logger.error('Failed to start Telegram bot', { error: String(err) });
      throw err;
    }
  }

  /** Stop polling */
  stop(): void {
    this.polling = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    logger.info('Telegram bot stopped');
  }

  /** Get current bot status */
  getStatus(): TelegramBotStatus {
    return {
      connected: this.polling && this.botUsername !== null,
      username: this.botUsername,
      messageCount: this.messageCount,
      startedAt: this.startedAt,
    };
  }

  /** Make a Telegram Bot API call */
  private async apiCall<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    const url = `${TELEGRAM_API}/bot${this.token}/${method}`;
    const options: RequestInit = {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    };

    const res = await fetch(url, options);
    const data = (await res.json()) as TelegramResponse<T>;

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description ?? 'Unknown error'}`);
    }
    return data.result;
  }

  /** Send a message to a chat */
  private async sendMessage(chatId: number, text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<void> {
    try {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      });
    } catch (err) {
      // If Markdown fails, retry without parse mode
      if (parseMode === 'Markdown') {
        try {
          await this.apiCall('sendMessage', {
            chat_id: chatId,
            text: text.replace(/[*_`\[\]()~>#+\-=|{}.!]/g, '\\$&'),
          });
        } catch {
          logger.error('Failed to send Telegram message', { error: String(err) });
        }
      }
    }
  }

  /** Long-poll for updates */
  private async poll(): Promise<void> {
    if (!this.polling) return;

    try {
      const updates = await this.apiCall<TelegramUpdate[]>('getUpdates', {
        offset: this.lastUpdateId + 1,
        timeout: 30,
        allowed_updates: ['message'],
      });

      for (const update of updates) {
        this.lastUpdateId = update.update_id;
        if (update.message?.text) {
          this.messageCount++;
          await this.handleMessage(update.message.chat.id, update.message.text, update.message.from);
        }
      }
    } catch (err) {
      logger.warn('Telegram poll error, retrying in 5s', { error: String(err) });
    }

    // Schedule next poll
    if (this.polling) {
      this.pollTimeout = setTimeout(() => this.poll(), 1000);
    }
  }

  /** Route incoming messages to command handlers */
  private async handleMessage(
    chatId: number,
    text: string,
    from?: { id: number; first_name: string; username?: string },
  ): Promise<void> {
    const trimmed = text.trim();
    const username = from?.username ?? from?.first_name ?? 'User';

    logger.info(`Telegram message from ${username}: ${trimmed}`);

    if (trimmed.startsWith('/start')) {
      await this.handleStart(chatId, username);
    } else if (trimmed.startsWith('/tip')) {
      await this.handleTip(chatId, trimmed, username);
    } else if (trimmed.startsWith('/balance')) {
      await this.handleBalance(chatId);
    } else if (trimmed.startsWith('/status')) {
      await this.handleStatus(chatId);
    } else if (trimmed.startsWith('/mood')) {
      await this.handleMood(chatId);
    } else if (trimmed.startsWith('/history')) {
      await this.handleHistory(chatId);
    } else if (trimmed.startsWith('/escrow')) {
      await this.handleEscrow(chatId, trimmed, username);
    } else if (trimmed.startsWith('/pulse')) {
      await this.handlePulse(chatId);
    } else if (trimmed.startsWith('/fees')) {
      await this.handleFees(chatId);
    } else if (trimmed.startsWith('/address')) {
      await this.handleAddress(chatId);
    } else if (trimmed.startsWith('/help')) {
      await this.handleHelp(chatId);
    } else if (trimmed.startsWith('/')) {
      await this.sendMessage(chatId, `Unknown command. Type /help for available commands.`);
    }
    // Non-command messages are ignored
  }

  /** /start — Welcome message */
  private async handleStart(chatId: number, username: string): Promise<void> {
    const msg = [
      `Welcome to *AeroFyta*, ${username}!`,
      '',
      'I am an autonomous multi-chain payment agent built with Tether WDK.',
      '',
      '*What I can do:*',
      '- Send crypto tips across Ethereum & TON',
      '- Automatically pick the cheapest chain',
      '- Track your tipping history',
      '- Create HTLC escrow tips',
      '- Monitor wallet mood and financial pulse',
      '',
      'Type /help to see all commands.',
    ].join('\n');
    await this.sendMessage(chatId, msg);
  }

  /** /help — Show all commands */
  private async handleHelp(chatId: number): Promise<void> {
    const msg = [
      '*AeroFyta Commands*',
      '',
      '/start — Welcome message with overview',
      '/balance — Show wallet balances across all chains',
      '/tip <address> <amount> [token] — Execute a tip',
      '  token: native (default) or usdt',
      '  Example: /tip 0xABC... 0.01 native',
      '/status — Agent status (mood, cycle count, tips executed)',
      '/mood — Show current wallet mood + modifiers',
      '/history — Recent tip history (last 10)',
      '/escrow create <recipient> <amount> — Create HTLC escrow',
      '/escrow list — List active escrows',
      '/pulse — Show financial pulse scores',
      '/fees — Compare fees across chains',
      '/address — Show wallet addresses',
      '/help — Show this help message',
    ].join('\n');
    await this.sendMessage(chatId, msg);
  }

  /** /status — Agent status (mood, cycle count, tips executed) */
  private async handleStatus(chatId: number): Promise<void> {
    try {
      const state = this.agent.getState();
      const history = this.agent.getHistory();
      const confirmedCount = history.filter(h => h.status === 'confirmed').length;

      const lines = ['*Agent Status*', ''];
      lines.push(`*State:* ${state.status}`);
      lines.push(`*Tips executed:* ${confirmedCount}`);
      lines.push(`*Total attempts:* ${history.length}`);

      // Autonomous loop stats
      const loop = this.extras.autonomousLoop;
      if (loop) {
        const loopStats = loop.getStatus();
        lines.push('');
        lines.push('*Autonomous Loop*');
        lines.push(`  Running: ${loopStats.running ? 'Yes' : 'No'}`);
        lines.push(`  Cycle count: ${loopStats.totalCycles}`);
        lines.push(`  Tips executed (loop): ${loopStats.tipsExecuted}`);
        lines.push(`  Tips skipped: ${loopStats.tipsSkipped}`);
        lines.push(`  Errors: ${loopStats.errors}`);
        if (loopStats.startedAt) {
          const uptimeMin = Math.floor(loopStats.uptime / 60000);
          lines.push(`  Uptime: ${uptimeMin} min`);
        }
      }

      // Mood summary
      if (loop) {
        const moodState = loop.getLastWalletMood();
        if (moodState) {
          lines.push('');
          lines.push(`*Mood:* ${moodState.mood} (x${moodState.tipMultiplier})`);
          lines.push(`*Reason:* ${moodState.reason}`);
        }
      }

      // Personality
      if (this.extras.personality) {
        lines.push(`*Personality:* ${this.extras.personality.getActivePersonality()}`);
      }

      await this.sendMessage(chatId, lines.join('\n'));
    } catch (err) {
      await this.sendMessage(chatId, `Error fetching status: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** /mood — Show current wallet mood + modifiers */
  private async handleMood(chatId: number): Promise<void> {
    try {
      const loop = this.extras.autonomousLoop;
      if (!loop) {
        await this.sendMessage(chatId, 'Autonomous loop not available. Mood tracking requires the loop service.');
        return;
      }

      const moodState = loop.getLastWalletMood();
      const pulse = loop.getLastFinancialPulse();
      const stats = loop.getStatus();

      const lines = ['*Wallet Mood*', ''];

      if (moodState) {
        lines.push(`*Current mood:* ${moodState.mood}`);
        lines.push(`*Tip multiplier:* x${moodState.tipMultiplier}`);
        lines.push(`*Reason:* ${moodState.reason}`);
      } else {
        lines.push('No mood data yet (waiting for first cycle).');
      }

      lines.push('');
      lines.push('*Mood Modifiers*');
      lines.push(`  Batch size: ${stats.moodBatchSize}`);
      lines.push(`  Risk tolerance: ${stats.moodRiskTolerance}`);

      if (stats.moodModifiers) {
        const mods = stats.moodModifiers;
        lines.push(`  Tip multiplier: x${mods.tipMultiplier}`);
        lines.push(`  Creator strategy: ${mods.creatorSelectionStrategy}`);
        lines.push(`  Gas tolerance: x${mods.gasPriceTolerance}`);
        lines.push(`  Learning rate: ${mods.learningRate}`);
      }

      if (pulse) {
        lines.push('');
        lines.push(`*Health score:* ${pulse.healthScore}/100`);
        lines.push(`*Total USDT:* ${pulse.totalAvailableUsdt.toFixed(4)}`);
      }

      await this.sendMessage(chatId, lines.join('\n'));
    } catch (err) {
      await this.sendMessage(chatId, `Error fetching mood: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** /history — Last 10 tips */
  private async handleHistory(chatId: number): Promise<void> {
    try {
      const history = this.agent.getHistory().slice(0, 10);

      if (history.length === 0) {
        await this.sendMessage(chatId, 'No tips sent yet. Use /tip to send your first tip!');
        return;
      }

      const lines = ['*Recent Tips (last 10)*', ''];

      for (const h of history) {
        const status = h.status === 'confirmed' ? 'OK' : 'FAIL';
        const date = new Date(h.createdAt).toLocaleDateString();
        lines.push(`[${status}] ${h.amount} ${h.token} to \`${h.recipient.slice(0, 10)}...\` on ${h.chainId} (${date})`);
      }

      await this.sendMessage(chatId, lines.join('\n'));
    } catch (err) {
      await this.sendMessage(chatId, `Error fetching history: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** /escrow create <recipient> <amount> | /escrow list */
  private async handleEscrow(chatId: number, text: string, username: string): Promise<void> {
    const parts = text.split(/\s+/);
    const subCommand = parts[1]?.toLowerCase();

    if (subCommand === 'list') {
      await this.handleEscrowList(chatId);
    } else if (subCommand === 'create') {
      await this.handleEscrowCreate(chatId, parts, username);
    } else {
      await this.sendMessage(chatId, 'Usage:\n/escrow create <recipient> <amount>\n/escrow list');
    }
  }

  /** /escrow list — List active escrows */
  private async handleEscrowList(chatId: number): Promise<void> {
    try {
      const escrow = this.extras.escrow;
      if (!escrow) {
        await this.sendMessage(chatId, 'Escrow service not available.');
        return;
      }

      const active = escrow.getActiveEscrows();

      if (active.length === 0) {
        await this.sendMessage(chatId, 'No active escrows. Use /escrow create to create one.');
        return;
      }

      const lines = [`*Active Escrows (${active.length})*`, ''];

      for (const e of active.slice(0, 10)) {
        lines.push(`*ID:* ${e.id}`);
        lines.push(`  Amount: ${e.amount} ${e.token}`);
        lines.push(`  To: \`${e.recipient.slice(0, 12)}...\``);
        lines.push(`  Chain: ${e.chainId}`);
        lines.push(`  Status: ${e.status}`);
        lines.push(`  Expires: ${new Date(e.expiresAt).toLocaleString()}`);
        lines.push('');
      }

      await this.sendMessage(chatId, lines.join('\n'));
    } catch (err) {
      await this.sendMessage(chatId, `Error listing escrows: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** /escrow create <recipient> <amount> — Create HTLC escrow */
  private async handleEscrowCreate(chatId: number, parts: string[], username: string): Promise<void> {
    try {
      const escrow = this.extras.escrow;
      if (!escrow) {
        await this.sendMessage(chatId, 'Escrow service not available.');
        return;
      }

      if (parts.length < 4) {
        await this.sendMessage(chatId, 'Usage: /escrow create <recipient> <amount>\nExample: /escrow create 0xABC... 0.01');
        return;
      }

      const recipient = parts[2];
      const amount = parts[3];
      const parsedAmount = parseFloat(amount);

      if (!recipient || recipient.length < 10) {
        await this.sendMessage(chatId, 'Invalid recipient address.');
        return;
      }

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        await this.sendMessage(chatId, 'Invalid amount. Please provide a positive number.');
        return;
      }

      await this.sendMessage(chatId, `Creating escrow of ${amount} USDT for ${recipient.slice(0, 12)}...`);

      const senderAddr = await this.wallet.getAddress('ethereum-sepolia');
      const result = await escrow.createEscrow({
        sender: senderAddr,
        recipient,
        amount,
        token: 'usdt',
        chainId: 'ethereum-sepolia',
        memo: `Telegram escrow from @${username}`,
      });

      const msg = [
        'Escrow created successfully!',
        '',
        `*ID:* ${result.escrow.id}`,
        `*Amount:* ${result.escrow.amount} ${result.escrow.token}`,
        `*To:* \`${result.escrow.recipient.slice(0, 12)}...\``,
        `*Secret:* \`${result.secret.slice(0, 16)}...\``,
        `*Expires:* ${new Date(result.escrow.expiresAt).toLocaleString()}`,
        '',
        'Share the secret with the recipient to release funds.',
      ].join('\n');

      await this.sendMessage(chatId, msg);

      this.agent.addActivity({
        type: 'system',
        message: `Telegram escrow created by @${username}: ${amount} USDT to ${recipient.slice(0, 10)}...`,
      });
    } catch (err) {
      await this.sendMessage(chatId, `Error creating escrow: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** /pulse — Show financial pulse scores */
  private async handlePulse(chatId: number): Promise<void> {
    try {
      const loop = this.extras.autonomousLoop;
      if (!loop) {
        await this.sendMessage(chatId, 'Financial pulse requires the autonomous loop service.');
        return;
      }

      let pulse = loop.getLastFinancialPulse();
      if (!pulse) {
        // Try to compute fresh pulse
        try {
          pulse = await loop.getFinancialPulse();
        } catch {
          await this.sendMessage(chatId, 'No financial pulse data available yet.');
          return;
        }
      }

      const bar = (score: number) => {
        const filled = Math.round(score / 10);
        return '|'.repeat(filled) + '.'.repeat(10 - filled) + ` ${score}/100`;
      };

      const lines = [
        '*Financial Pulse*',
        '',
        `*Health:*         ${bar(pulse.healthScore)}`,
        `*Liquidity:*      ${bar(pulse.liquidityScore)}`,
        `*Diversification:* ${bar(pulse.diversificationScore)}`,
        `*Velocity:*       ${bar(pulse.velocityScore)}`,
        '',
        `*Total USDT:* ${pulse.totalAvailableUsdt.toFixed(4)}`,
      ];

      const moodState = loop.getLastWalletMood();
      if (moodState) {
        lines.push(`*Mood:* ${moodState.mood} (x${moodState.tipMultiplier})`);
      }

      await this.sendMessage(chatId, lines.join('\n'));
    } catch (err) {
      await this.sendMessage(chatId, `Error fetching pulse: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** /tip <address> <amount> [token] — Send a tip */
  private async handleTip(chatId: number, text: string, username: string): Promise<void> {
    // Parse: /tip <address> <amount> [token]
    const parts = text.split(/\s+/);
    if (parts.length < 3) {
      await this.sendMessage(chatId, 'Usage: /tip <address> <amount> [token]\nExample: /tip 0xABC... 0.01 native');
      return;
    }

    const address = parts[1];
    const amount = parts[2];
    const token: TokenType = (parts[3]?.toLowerCase() === 'usdt' ? 'usdt' : 'native');

    // Basic validation
    if (!address || address.length < 10) {
      await this.sendMessage(chatId, 'Invalid address. Please provide a valid wallet address.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await this.sendMessage(chatId, 'Invalid amount. Please provide a positive number.');
      return;
    }

    await this.sendMessage(chatId, `Processing tip of ${amount} ${token} to ${address.slice(0, 10)}...`);

    this.agent.addActivity({
      type: 'system',
      message: `Telegram tip from @${username}: ${amount} ${token} to ${address.slice(0, 10)}...`,
    });

    try {
      const request: TipRequest = {
        id: uuidv4(),
        recipient: address,
        amount,
        token,
        createdAt: new Date().toISOString(),
      };

      const result = await this.agent.executeTip(request);

      if (result.status === 'confirmed') {
        const msg = [
          'Tip sent successfully!',
          '',
          `*Amount:* ${result.amount} ${result.token === 'usdt' ? 'USDT' : result.chainId.includes('ton') ? 'TON' : 'ETH'}`,
          `*To:* \`${result.to}\``,
          `*Chain:* ${result.chainId}`,
          `*Fee:* ${result.fee}`,
          `*TX:* \`${result.txHash.slice(0, 20)}...\``,
          `*Explorer:* ${result.explorerUrl}`,
        ].join('\n');
        await this.sendMessage(chatId, msg);
      } else {
        await this.sendMessage(chatId, `Tip failed: ${result.error ?? 'Unknown error'}`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await this.sendMessage(chatId, `Error: ${errMsg}`);
      logger.error('Telegram tip failed', { error: errMsg });
    }
  }

  /** /balance — Check wallet balances */
  private async handleBalance(chatId: number): Promise<void> {
    try {
      const balances = await this.wallet.getAllBalances();
      const lines = ['*Wallet Balances*', ''];

      for (const b of balances) {
        lines.push(`*${b.chainId}*`);
        lines.push(`  ${b.nativeCurrency}: ${b.nativeBalance}`);
        lines.push(`  USDT: ${b.usdtBalance}`);
        lines.push(`  Address: \`${b.address.slice(0, 12)}...\``);
        lines.push('');
      }

      await this.sendMessage(chatId, lines.join('\n'));
    } catch (err) {
      await this.sendMessage(chatId, `Error fetching balances: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** /fees — Compare fees across chains */
  private async handleFees(chatId: number): Promise<void> {
    try {
      // Use a dummy address and small amount for fee estimation
      const dummyAddress = '0x0000000000000000000000000000000000000001';
      const fees = await this.wallet.estimateAllFees(dummyAddress, '0.001');

      if (fees.length === 0) {
        await this.sendMessage(chatId, 'No fee data available.');
        return;
      }

      const lines = ['*Fee Comparison* (0.001 transfer)', ''];
      for (const f of fees) {
        lines.push(`*${f.chainName}* — ${f.estimatedFeeUsd} (rank #${f.rank})`);
      }
      lines.push('');
      lines.push('The agent automatically picks the cheapest chain when you /tip.');

      await this.sendMessage(chatId, lines.join('\n'));
    } catch (err) {
      await this.sendMessage(chatId, `Error estimating fees: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** /address — Show wallet addresses */
  private async handleAddress(chatId: number): Promise<void> {
    try {
      const addresses = await this.wallet.getAllAddresses();
      const lines = ['*Wallet Addresses*', ''];

      for (const [chain, addr] of Object.entries(addresses)) {
        lines.push(`*${chain}:*`);
        lines.push(`\`${addr}\``);
        lines.push('');
      }

      await this.sendMessage(chatId, lines.join('\n'));
    } catch (err) {
      await this.sendMessage(chatId, `Error fetching addresses: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

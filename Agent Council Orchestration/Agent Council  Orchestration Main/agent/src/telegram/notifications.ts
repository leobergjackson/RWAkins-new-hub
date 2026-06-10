// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// See LICENSE file for details

/**
 * Telegram notification manager for proactive user notifications.
 *
 * Tracks registered chat IDs and broadcasts real-time updates about
 * autonomous loop cycles, tip completions, mood changes, and low
 * balance alerts. Users register via /start and can toggle with
 * /notifications.
 */

import type { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export interface NotificationPreferences {
  enabled: boolean;
  cycles: boolean;
  tips: boolean;
  mood: boolean;
  lowBalance: boolean;
}

// ── NotificationManager ───────────────────────────────────────

export class NotificationManager {
  private chatPrefs: Map<number, NotificationPreferences> = new Map();
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  /** Register a chat for notifications (called on /start) */
  register(chatId: number): void {
    if (!this.chatPrefs.has(chatId)) {
      this.chatPrefs.set(chatId, {
        enabled: true,
        cycles: true,
        tips: true,
        mood: true,
        lowBalance: true,
      });
      logger.info(`Notification: registered chat ${chatId}`);
    }
  }

  /** Unregister a chat */
  unregister(chatId: number): void {
    this.chatPrefs.delete(chatId);
  }

  /** Toggle notifications on/off for a chat */
  toggle(chatId: number): boolean {
    const prefs = this.chatPrefs.get(chatId);
    if (prefs) {
      prefs.enabled = !prefs.enabled;
      return prefs.enabled;
    }
    // Auto-register if not yet registered
    this.chatPrefs.set(chatId, {
      enabled: true,
      cycles: true,
      tips: true,
      mood: true,
      lowBalance: true,
    });
    return true;
  }

  /** Get preferences for a chat */
  getPrefs(chatId: number): NotificationPreferences {
    return this.chatPrefs.get(chatId) ?? {
      enabled: false,
      cycles: false,
      tips: false,
      mood: false,
      lowBalance: false,
    };
  }

  /** Get count of registered chats */
  get registeredCount(): number {
    return this.chatPrefs.size;
  }

  // ── Notification senders ──────────────────────────────────

  /** Notify all registered chats about an autonomous cycle completing */
  async notifyCycleComplete(cycle: number, tips: number, mood: string): Promise<void> {
    const text = [
      '*Autonomous Cycle Complete*',
      '',
      `  Cycle: #${cycle}`,
      `  Tips sent: ${tips}`,
      `  Current mood: ${mood}`,
      '',
      '_Next cycle in ~60s_',
    ].join('\n');

    const keyboard = new InlineKeyboard()
      .text('📊 Status', 'cmd:status')
      .text('🧠 Reasoning', 'cmd:reasoning')
      .row()
      .text('🔕 Mute', 'notif:toggle');

    await this.broadcast(text, keyboard, 'cycles');
  }

  /** Notify about a successful tip */
  async notifyTipSent(amount: number, recipient: string, chain: string): Promise<void> {
    const text = [
      '*Tip Sent*',
      '',
      `  ${amount} USDT to @${recipient}`,
      `  Chain: ${chain}`,
      '',
      '_Autonomous tip by AeroFyta agent_',
    ].join('\n');

    const keyboard = new InlineKeyboard()
      .text('📜 History', 'cmd:history')
      .text('💰 Balance', 'cmd:balance');

    await this.broadcast(text, keyboard, 'tips');
  }

  /** Notify about a mood change */
  async notifyMoodChange(from: string, to: string): Promise<void> {
    const moodEmojis: Record<string, string> = {
      generous: '🎉',
      cautious: '🛡️',
      strategic: '🎯',
      critical: '🚨',
      neutral: '😐',
    };
    const emoji = moodEmojis[to.toLowerCase()] ?? '🔄';

    const text = [
      `*Mood Change ${emoji}*`,
      '',
      `  From: ${from}`,
      `  To: ${to}`,
      '',
      '_Tip multiplier adjusted accordingly_',
    ].join('\n');

    const keyboard = new InlineKeyboard()
      .text('🧠 Mood Details', 'cmd:mood')
      .text('📊 Status', 'cmd:status');

    await this.broadcast(text, keyboard, 'mood');
  }

  /** Notify about low balance on a chain */
  async notifyLowBalance(chain: string, balance: string): Promise<void> {
    const text = [
      '*Low Balance Alert*',
      '',
      `  Chain: ${chain}`,
      `  Balance: ${balance}`,
      '',
      '_Consider bridging funds or topping up._',
    ].join('\n');

    const keyboard = new InlineKeyboard()
      .text('💰 Balance', 'cmd:balance')
      .text('🔄 Bridge', 'cmd:bridge')
      .row()
      .text('🔕 Mute Alerts', 'notif:toggle');

    await this.broadcast(text, keyboard, 'lowBalance');
  }

  // ── Internal ──────────────────────────────────────────────

  private async broadcast(
    text: string,
    keyboard: InlineKeyboard,
    category: keyof Omit<NotificationPreferences, 'enabled'>,
  ): Promise<void> {
    for (const [chatId, prefs] of this.chatPrefs.entries()) {
      if (!prefs.enabled || !prefs[category]) continue;
      try {
        await this.bot.api.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } catch (err) {
        logger.warn(`Failed to send notification to chat ${chatId}`, { error: String(err) });
        // Don't remove — might be a transient failure
      }
    }
  }
}

#!/usr/bin/env npx tsx
// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// See LICENSE file for details

/**
 * AeroFyta Telegram Bot — Standalone Runner
 *
 * Runs ONLY the Telegram bot in demo mode — no Express server,
 * no WDK services, no agent backend required.
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=your_token npx tsx agent/telegram-standalone.ts
 *
 * Or with ts-node:
 *   TELEGRAM_BOT_TOKEN=your_token npx ts-node --esm agent/telegram-standalone.ts
 *
 * The bot responds to all commands with realistic demo data so judges
 * can interact with it immediately.
 */

import { TelegramGrammyBot } from './src/telegram/bot.js';
import { logger } from './src/utils/logger.js';

// ── Config ──────────────────────────────────────────────────────

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error(
    '\n  Missing TELEGRAM_BOT_TOKEN environment variable.\n\n' +
    '  Usage:\n' +
    '    TELEGRAM_BOT_TOKEN=your_token npx tsx agent/telegram-standalone.ts\n\n' +
    '  Get a token from @BotFather on Telegram: https://t.me/BotFather\n',
  );
  process.exit(1);
}

// ── Start ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.info('Starting AeroFyta Telegram bot in STANDALONE demo mode...');

  const bot = new TelegramGrammyBot({ token });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await bot.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await bot.start();

  const status = bot.getStatus();
  logger.info(`Bot running: @${status.username} (demo mode)`);
  logger.info('Press Ctrl+C to stop.');
}

main().catch((err) => {
  logger.error('Failed to start standalone bot', { error: String(err) });
  process.exit(1);
});

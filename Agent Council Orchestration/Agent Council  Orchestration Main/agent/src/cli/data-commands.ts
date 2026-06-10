// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta CLI — Data commands for creators, reputation, youtube, rss, webhooks, notifications

import { readFileSync, writeFileSync } from 'node:fs';

// WDK type imports for data commands interacting with wallet state via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
// Data commands reference WDK wallet addresses for creator payment mappings
export type _WdkRefs = WDK; // eslint-disable-line @typescript-eslint/no-unused-vars

// ── ANSI helpers (zero deps) ────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  white: '\x1b[97m',
};

const ok = `${c.green}\u2705${c.reset}`;
const fail = `${c.red}\u274C${c.reset}`;

function heading(text: string): void {
  console.log(`\n${c.bold}${c.cyan}\u2500\u2500 ${text} ${'─'.repeat(Math.max(0, 52 - text.length))}${c.reset}\n`);
}

function truncAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function baseUrl(): string {
  const port = process.env['PORT'] || '3001';
  return `http://localhost:${port}`;
}

async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${baseUrl()}${path}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiPost(path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Table helper ────────────────────────────────────────────────────

function printTable(headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  );
  const sep = widths.map(w => '─'.repeat(w + 2)).join('┬');
  const headerLine = headers.map((h, i) => ` ${c.bold}${h.padEnd(widths[i] ?? 0)}${c.reset} `).join('│');

  console.log(`  ┌${sep}┐`);
  console.log(`  │${headerLine}│`);
  console.log(`  ├${widths.map(w => '─'.repeat(w + 2)).join('┼')}┤`);
  for (const row of rows) {
    const line = row.map((cell, i) => ` ${(cell || '').padEnd(widths[i] ?? 0)} `).join('│');
    console.log(`  │${line}│`);
  }
  console.log(`  └${widths.map(w => '─'.repeat(w + 2)).join('┴')}┘`);
}

// ── Achievement badges ──────────────────────────────────────────────

const achievementBadges: Record<string, string> = {
  'first_tip': '\uD83C\uDF1F First Tip',
  'consistent': '\uD83D\uDD25 Consistent',
  'generous': '\uD83D\uDC8E Generous',
  'multi_chain': '\uD83C\uDF10 Multi-Chain',
  'early_adopter': '\uD83D\uDE80 Early Adopter',
  'whale': '\uD83D\uDC33 Whale',
  'mentor': '\uD83C\uDFC5 Mentor',
  'community': '\uD83E\uDD1D Community',
};

function formatBadge(achievement: string): string {
  return achievementBadges[achievement] || `\u2B50 ${achievement}`;
}

// ── Command handlers ────────────────────────────────────────────────

async function creatorsListCmd(): Promise<void> {
  heading('Creators');
  try {
    let data = await apiGet('/api/rumble/creators') as Record<string, unknown>;
    let creators = (data['creators'] || data['data'] || data) as Array<Record<string, unknown>>;
    if (!Array.isArray(creators)) {
      data = await apiGet('/api/creators') as Record<string, unknown>;
      creators = (data['creators'] || data['data'] || data) as Array<Record<string, unknown>>;
    }
    if (!Array.isArray(creators) || creators.length === 0) {
      console.log(`  ${c.dim}No creators found.${c.reset}\n`);
      return;
    }
    const headers = ['Name', 'Platform', 'Address', 'Engagement'];
    const rows = creators.map(cr => [
      String(cr['name'] || cr['username'] || 'Unknown'),
      String(cr['platform'] || 'rumble'),
      truncAddr(String(cr['address'] || cr['walletAddress'] || '-')),
      String(cr['engagement'] || cr['engagementScore'] || '-'),
    ]);
    printTable(headers, rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function creatorsTopCmd(): Promise<void> {
  heading('Top 10 Creators');
  try {
    let data: unknown;
    try {
      data = await apiGet('/api/creators/top');
    } catch {
      data = await apiGet('/api/rumble/creators');
    }
    const raw = data as Record<string, unknown>;
    let creators = (raw['creators'] || raw['data'] || raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(creators)) {
      console.log(`  ${c.dim}No creators found.${c.reset}\n`);
      return;
    }
    creators = creators
      .sort((a, b) => Number(b['engagement'] || b['engagementScore'] || 0) - Number(a['engagement'] || a['engagementScore'] || 0))
      .slice(0, 10);
    const headers = ['#', 'Name', 'Platform', 'Engagement'];
    const rows = creators.map((cr, i) => [
      String(i + 1),
      String(cr['name'] || cr['username'] || 'Unknown'),
      String(cr['platform'] || 'rumble'),
      String(cr['engagement'] || cr['engagementScore'] || '-'),
    ]);
    printTable(headers, rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function creatorsDiscoverCmd(): Promise<void> {
  heading('Discover New Creators');
  try {
    const data = await apiGet('/api/creators/discover') as Record<string, unknown>;
    const creators = (data['recommendations'] || data['creators'] || data['data'] || data) as Array<Record<string, unknown>>;
    if (!Array.isArray(creators) || creators.length === 0) {
      console.log(`  ${c.dim}No recommendations available.${c.reset}\n`);
      return;
    }
    const headers = ['Name', 'Platform', 'Category', 'Score'];
    const rows = creators.map(cr => [
      String(cr['name'] || cr['username'] || 'Unknown'),
      String(cr['platform'] || '-'),
      String(cr['category'] || cr['niche'] || '-'),
      String(cr['score'] || cr['relevanceScore'] || '-'),
    ]);
    printTable(headers, rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function reputationShowCmd(addr: string | undefined): Promise<void> {
  heading('Reputation');
  if (!addr) {
    console.log(`  ${fail} Usage: ${c.cyan}aerofyta reputation show <address>${c.reset}\n`);
    return;
  }
  try {
    const data = await apiGet(`/api/reputation/${encodeURIComponent(addr)}`) as Record<string, unknown>;
    const score = Number(data['score'] || data['reputationScore'] || 0);
    const level = String(data['level'] || data['tier'] || 'Unknown');

    console.log(`  ${c.bold}Address:${c.reset}  ${truncAddr(addr)}`);
    console.log(`  ${c.bold}Score:${c.reset}    ${scoreColor(score)}${score}${c.reset}/100`);
    console.log(`  ${c.bold}Level:${c.reset}    ${level}`);

    const achievements = (data['achievements'] || data['badges'] || []) as string[];
    if (Array.isArray(achievements) && achievements.length > 0) {
      console.log(`\n  ${c.bold}Achievements:${c.reset}`);
      for (const ach of achievements) {
        console.log(`    ${formatBadge(ach)}`);
      }
    }

    const stats = data['stats'] as Record<string, unknown> | undefined;
    if (stats) {
      console.log(`\n  ${c.bold}Stats:${c.reset}`);
      if (stats['totalTips'] !== undefined) console.log(`    Tips Sent:     ${stats['totalTips']}`);
      if (stats['totalAmount'] !== undefined) console.log(`    Total Amount:  $${Number(stats['totalAmount']).toFixed(2)}`);
      if (stats['chainsUsed'] !== undefined) console.log(`    Chains Used:   ${stats['chainsUsed']}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function reputationExportCmd(): Promise<void> {
  heading('Export Reputation Passport');
  try {
    const data = await apiGet('/api/reputation/export');
    const filename = 'reputation-passport.json';
    writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  ${ok} Saved reputation passport to ${c.cyan}${filename}${c.reset}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function reputationImportCmd(file: string | undefined): Promise<void> {
  heading('Import Reputation Passport');
  if (!file) {
    console.log(`  ${fail} Usage: ${c.cyan}aerofyta reputation import <file>${c.reset}\n`);
    return;
  }
  try {
    const contents = readFileSync(file, 'utf-8');
    const passport = JSON.parse(contents) as unknown;
    await apiPost('/api/reputation/import', passport);
    console.log(`  ${ok} Imported reputation passport from ${c.cyan}${file}${c.reset}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function youtubeStatusCmd(): Promise<void> {
  heading('YouTube Status');
  try {
    const data = await apiGet('/api/youtube/status') as Record<string, unknown>;
    const hasKey = Boolean(data['apiKeyConfigured'] || data['hasApiKey']);
    console.log(`  ${c.bold}API Key:${c.reset}    ${hasKey ? `${ok} Configured` : `${fail} Not configured`}`);
    if (data['quotaUsed'] !== undefined) {
      console.log(`  ${c.bold}Quota Used:${c.reset} ${data['quotaUsed']}/${data['quotaLimit'] || 10000}`);
    }
    const channels = (data['channels'] || data['trackedChannels'] || []) as Array<Record<string, unknown>>;
    if (Array.isArray(channels) && channels.length > 0) {
      console.log(`\n  ${c.bold}Tracked Channels:${c.reset}`);
      for (const ch of channels) {
        console.log(`    ${c.green}\u25CF${c.reset} ${ch['name'] || ch['title']} ${c.dim}(${ch['subscriberCount'] || '?'} subs)${c.reset}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function youtubeSearchCmd(query: string | undefined): Promise<void> {
  heading('YouTube Search');
  if (!query) {
    console.log(`  ${fail} Usage: ${c.cyan}aerofyta youtube search <query>${c.reset}\n`);
    return;
  }
  try {
    const data = await apiGet(`/api/youtube/search?q=${encodeURIComponent(query)}`) as Record<string, unknown>;
    const results = (data['results'] || data['items'] || data['videos'] || data) as Array<Record<string, unknown>>;
    if (!Array.isArray(results) || results.length === 0) {
      console.log(`  ${c.dim}No results for "${query}".${c.reset}\n`);
      return;
    }
    const headers = ['Title', 'Channel', 'Views', 'Published'];
    const rows = results.map(r => [
      String(r['title'] || 'Untitled').slice(0, 40),
      String(r['channel'] || r['channelTitle'] || '-').slice(0, 20),
      formatViewCount(Number(r['viewCount'] || r['views'] || 0)),
      String(r['publishedAt'] || r['published'] || '-').slice(0, 10),
    ]);
    printTable(headers, rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function rssFeedsCmd(): Promise<void> {
  heading('RSS Feeds');
  try {
    const data = await apiGet('/api/rss/feeds') as Record<string, unknown>;
    const feeds = (data['feeds'] || data['sources'] || data) as Array<Record<string, unknown>>;
    if (!Array.isArray(feeds) || feeds.length === 0) {
      console.log(`  ${c.dim}No RSS feeds configured.${c.reset}\n`);
      return;
    }
    const headers = ['Source', 'URL', 'Items', 'Last Fetched'];
    const rows = feeds.map(f => [
      String(f['name'] || f['title'] || 'Unknown'),
      String(f['url'] || f['feedUrl'] || '-').slice(0, 40),
      String(f['itemCount'] || f['items'] || '-'),
      String(f['lastFetched'] || f['updatedAt'] || '-').slice(0, 19),
    ]);
    printTable(headers, rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function rssRefreshCmd(): Promise<void> {
  heading('Refresh RSS Feeds');
  try {
    const data = await apiPost('/api/rss/refresh') as Record<string, unknown>;
    const count = data['refreshed'] || data['count'] || 0;
    console.log(`  ${ok} Refreshed ${c.bold}${count}${c.reset} RSS feeds`);
    if (data['newItems']) {
      console.log(`  ${c.dim}New items found: ${data['newItems']}${c.reset}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function webhooksListCmd(): Promise<void> {
  heading('Registered Webhooks');
  try {
    const data = await apiGet('/api/webhooks') as Record<string, unknown>;
    const hooks = (data['webhooks'] || data['data'] || data) as Array<Record<string, unknown>>;
    if (!Array.isArray(hooks) || hooks.length === 0) {
      console.log(`  ${c.dim}No webhooks registered.${c.reset}\n`);
      return;
    }
    const headers = ['ID', 'URL', 'Events', 'Status'];
    const rows = hooks.map(h => [
      String(h['id'] || '-').slice(0, 8),
      String(h['url'] || h['endpoint'] || '-').slice(0, 35),
      String(h['events'] || h['eventTypes'] || '-'),
      String(h['active'] !== false ? `${c.green}active${c.reset}` : `${c.red}inactive${c.reset}`),
    ]);
    printTable(headers, rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function webhooksTestCmd(): Promise<void> {
  heading('Test Webhook');
  try {
    const data = await apiPost('/api/webhooks/test') as Record<string, unknown>;
    console.log(`  ${ok} Test event sent`);
    if (data['delivered'] !== undefined) {
      console.log(`  ${c.dim}Delivered to ${data['delivered']} endpoint(s)${c.reset}`);
    }
    if (data['eventId']) {
      console.log(`  ${c.dim}Event ID: ${data['eventId']}${c.reset}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

async function notificationsUnreadCmd(): Promise<void> {
  heading('Unread Notifications');
  try {
    const data = await apiGet('/api/notifications/unread-count') as Record<string, unknown>;
    const count = Number(data['count'] || data['unread'] || 0);
    if (count === 0) {
      console.log(`  ${ok} No unread notifications`);
    } else {
      console.log(`  ${c.yellow}\uD83D\uDD14${c.reset} You have ${c.bold}${count}${c.reset} unread notification${count !== 1 ? 's' : ''}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${fail} ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

// ── Helpers ─────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return c.green;
  if (score >= 40) return c.yellow;
  return c.red;
}

function formatViewCount(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return String(views);
}

// ── Main dispatcher ─────────────────────────────────────────────────

export async function handleDataCommand(
  command: string,
  subcommand: string | undefined,
  args: string[],
): Promise<boolean> {
  try {
    switch (command) {
      case 'creators':
        switch (subcommand) {
          case 'list':    await creatorsListCmd(); return true;
          case 'top':     await creatorsTopCmd(); return true;
          case 'discover': await creatorsDiscoverCmd(); return true;
          default:
            console.log(`\n  ${c.bold}Creator commands:${c.reset}`);
            console.log(`    ${c.cyan}creators list${c.reset}       List all tracked creators`);
            console.log(`    ${c.cyan}creators top${c.reset}        Show top 10 by engagement`);
            console.log(`    ${c.cyan}creators discover${c.reset}   Discover new creators\n`);
            return true;
        }

      case 'reputation':
        switch (subcommand) {
          case 'show':    await reputationShowCmd(args[0]); return true;
          case 'export':  await reputationExportCmd(); return true;
          case 'import':  await reputationImportCmd(args[0]); return true;
          default:
            console.log(`\n  ${c.bold}Reputation commands:${c.reset}`);
            console.log(`    ${c.cyan}reputation show <addr>${c.reset}    Show reputation score & badges`);
            console.log(`    ${c.cyan}reputation export${c.reset}         Export passport to JSON`);
            console.log(`    ${c.cyan}reputation import <file>${c.reset}  Import passport from JSON\n`);
            return true;
        }

      case 'youtube':
        switch (subcommand) {
          case 'status':  await youtubeStatusCmd(); return true;
          case 'search':  await youtubeSearchCmd(args.join(' ') || undefined); return true;
          default:
            console.log(`\n  ${c.bold}YouTube commands:${c.reset}`);
            console.log(`    ${c.cyan}youtube status${c.reset}          Show API key status & channels`);
            console.log(`    ${c.cyan}youtube search <query>${c.reset}  Search for videos\n`);
            return true;
        }

      case 'rss':
        switch (subcommand) {
          case 'feeds':   await rssFeedsCmd(); return true;
          case 'refresh': await rssRefreshCmd(); return true;
          default:
            console.log(`\n  ${c.bold}RSS commands:${c.reset}`);
            console.log(`    ${c.cyan}rss feeds${c.reset}     Show all RSS sources`);
            console.log(`    ${c.cyan}rss refresh${c.reset}   Trigger feed refresh\n`);
            return true;
        }

      case 'webhooks':
        switch (subcommand) {
          case 'list':  await webhooksListCmd(); return true;
          case 'test':  await webhooksTestCmd(); return true;
          default:
            console.log(`\n  ${c.bold}Webhook commands:${c.reset}`);
            console.log(`    ${c.cyan}webhooks list${c.reset}   Show registered webhooks`);
            console.log(`    ${c.cyan}webhooks test${c.reset}   Send test event\n`);
            return true;
        }

      case 'notifications':
        switch (subcommand) {
          case 'unread': await notificationsUnreadCmd(); return true;
          default:
            console.log(`\n  ${c.bold}Notification commands:${c.reset}`);
            console.log(`    ${c.cyan}notifications unread${c.reset}   Show unread count\n`);
            return true;
        }

      default:
        return false;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
      console.log(`  ${fail} Agent is ${c.red}not running${c.reset}. Start with: ${c.cyan}cd agent && npm run dev${c.reset}\n`);
    } else {
      console.log(`  ${fail} ${c.red}${msg}${c.reset}\n`);
    }
    return true;
  }
}

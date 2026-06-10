// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta CLI — Analytics commands for agent insights

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// WDK type imports for analytics CLI operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Analytics commands aggregate WDK on-chain data across all managed wallets
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

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

const BASE_URL = `http://localhost:${process.env['PORT'] || '3001'}`;

// ── Helpers ─────────────────────────────────────────────────────────

function heading(text: string): void {
  console.log(`\n${c.bold}${c.cyan}\u2500\u2500 ${text} ${'\u2500'.repeat(Math.max(0, 52 - text.length))}${c.reset}\n`);
}

function row(label: string, value: string): void {
  console.log(`  ${c.dim}${label.padEnd(22)}${c.reset} ${value}`);
}

function asciiBar(value: number, max: number, width: number = 20): string {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  const empty = width - filled;
  return `${c.green}${'█'.repeat(filled)}${c.dim}${'░'.repeat(empty)}${c.reset}`;
}

function truncAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function tableHeader(columns: Array<{ label: string; width: number }>): void {
  const header = columns.map(col => `${c.bold}${col.label.padEnd(col.width)}${c.reset}`).join(' ');
  console.log(`  ${header}`);
  const separator = columns.map(col => '\u2500'.repeat(col.width)).join(' ');
  console.log(`  ${c.dim}${separator}${c.reset}`);
}

async function apiFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${path}`);
  return res.json();
}

function failMessage(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
    console.log(`  ${c.red}Agent is not running.${c.reset} Start with: ${c.cyan}cd agent && npm run dev${c.reset}\n`);
  } else {
    console.log(`  ${c.red}Error: ${msg}${c.reset}\n`);
  }
}

// ── 1. analytics overview ───────────────────────────────────────────

async function cmdOverview(): Promise<void> {
  heading('Analytics Overview');
  try {
    const [statusData, anomalyData] = await Promise.all([
      apiFetch('/api/agent/status') as Promise<Record<string, unknown>>,
      apiFetch('/api/analytics/anomalies').catch(() => ({ anomalies: [], policiesTriggered: 0 })) as Promise<Record<string, unknown>>,
    ]);

    const totalTips = Number(statusData['totalTips'] ?? 0);
    const totalAmount = Number(statusData['totalAmount'] ?? 0);
    const successRate = Number(statusData['successRate'] ?? 100);
    const mood = String(statusData['mood'] ?? 'unknown');
    const pulse = Number(statusData['pulse'] ?? statusData['healthScore'] ?? 0);

    heading('Tip Summary');
    row('Total Tips Sent', `${c.bold}${totalTips}${c.reset}`);
    row('Total Amount', `${c.yellow}$${totalAmount.toFixed(4)} USDT${c.reset}`);
    row('Success Rate', `${asciiBar(successRate, 100)} ${successRate}%`);

    heading('Creators');
    const activeCreators = Number(statusData['activeCreators'] ?? statusData['creators'] ?? 0);
    const topCreator = String(statusData['topCreator'] ?? 'N/A');
    row('Active Creators', `${c.bold}${activeCreators}${c.reset}`);
    row('Top Creator', `${c.cyan}${topCreator}${c.reset}`);

    heading('Safety & Anomalies');
    const anomalies = Array.isArray(anomalyData['anomalies']) ? anomalyData['anomalies'] as unknown[] : [];
    const policiesTriggered = Number(anomalyData['policiesTriggered'] ?? 0);
    row('Anomalies Detected', anomalies.length > 0 ? `${c.red}${anomalies.length}${c.reset}` : `${c.green}0${c.reset}`);
    row('Policies Triggered', `${policiesTriggered}`);

    heading('Agent State');
    row('Current Mood', `${c.magenta}${mood}${c.reset}`);
    row('Pulse Score', `${asciiBar(pulse, 100)} ${pulse}%`);
  } catch (err) {
    failMessage(err);
  }
}

// ── 2. analytics tips ───────────────────────────────────────────────

async function cmdTips(): Promise<void> {
  heading('Tip Statistics');
  try {
    const historyData = await apiFetch('/api/wallet/history') as Record<string, unknown>;
    const tips = (Array.isArray(historyData['transactions']) ? historyData['transactions'] : Array.isArray(historyData) ? historyData : []) as Array<Record<string, unknown>>;

    if (tips.length === 0) {
      console.log(`  ${c.dim}No tip history found.${c.reset}\n`);
      return;
    }

    // Tips per day (last 7 days)
    heading('Tips Per Day (Last 7 Days)');
    const now = Date.now();
    const dayBuckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dayBuckets[key] = 0;
    }
    for (const tip of tips) {
      const created = String(tip['createdAt'] ?? tip['timestamp'] ?? '');
      const dayKey = created.slice(0, 10);
      if (dayKey in dayBuckets) {
        dayBuckets[dayKey] = (dayBuckets[dayKey] ?? 0) + 1;
      }
    }
    const maxTipsDay = Math.max(...Object.values(dayBuckets), 1);
    for (const [day, count] of Object.entries(dayBuckets)) {
      const label = day.slice(5); // MM-DD
      console.log(`  ${c.dim}${label}${c.reset} ${asciiBar(count, maxTipsDay, 30)} ${count}`);
    }

    // Average tip amount
    heading('Tip Metrics');
    const amounts = tips.map(t => parseFloat(String(t['amount'] ?? '0'))).filter(a => !isNaN(a));
    const totalAmount = amounts.reduce((s, a) => s + a, 0);
    const avgAmount = amounts.length > 0 ? totalAmount / amounts.length : 0;
    row('Average Tip', `${c.yellow}$${avgAmount.toFixed(4)} USDT${c.reset}`);
    row('Total Volume', `${c.yellow}$${totalAmount.toFixed(4)} USDT${c.reset}`);
    row('Tip Count', `${tips.length}`);

    // Most tipped creator
    const recipientCounts: Record<string, number> = {};
    for (const tip of tips) {
      const r = String(tip['recipient'] ?? 'unknown');
      recipientCounts[r] = (recipientCounts[r] ?? 0) + 1;
    }
    const topRecipient = Object.entries(recipientCounts).sort((a, b) => b[1] - a[1])[0];
    if (topRecipient) {
      row('Most Tipped', `${c.cyan}${truncAddr(topRecipient[0])}${c.reset} (${topRecipient[1]} tips)`);
    }

    // Chain distribution
    heading('Chain Distribution');
    const chainCounts: Record<string, number> = {};
    for (const tip of tips) {
      const chain = String(tip['chainId'] ?? tip['chain'] ?? 'unknown');
      chainCounts[chain] = (chainCounts[chain] ?? 0) + 1;
    }
    const maxChainCount = Math.max(...Object.values(chainCounts), 1);
    for (const [chain, count] of Object.entries(chainCounts).sort((a, b) => b[1] - a[1])) {
      const pct = ((count / tips.length) * 100).toFixed(0);
      console.log(`  ${c.cyan}${chain.padEnd(22)}${c.reset} ${asciiBar(count, maxChainCount, 20)} ${count} (${pct}%)`);
    }
  } catch (err) {
    failMessage(err);
  }
}

// ── 3. analytics creators ───────────────────────────────────────────

async function cmdCreators(): Promise<void> {
  heading('Creator Leaderboard');
  try {
    const creatorsData = await apiFetch('/api/creators') as Record<string, unknown>;
    const creators = (Array.isArray(creatorsData['creators']) ? creatorsData['creators'] : Array.isArray(creatorsData) ? creatorsData : []) as Array<Record<string, unknown>>;

    if (creators.length === 0) {
      console.log(`  ${c.dim}No creators found.${c.reset}\n`);
      return;
    }

    tableHeader([
      { label: '#', width: 4 },
      { label: 'Creator', width: 20 },
      { label: 'Tips Recv', width: 10 },
      { label: 'Engagement', width: 14 },
      { label: 'Reputation', width: 12 },
    ]);

    const sorted = [...creators].sort((a, b) => {
      const aTips = Number(a['totalTips'] ?? a['tipsReceived'] ?? 0);
      const bTips = Number(b['totalTips'] ?? b['tipsReceived'] ?? 0);
      return bTips - aTips;
    });

    for (let i = 0; i < sorted.length; i++) {
      const cr = sorted[i]!;
      const rank = `${i < 3 ? c.yellow : c.dim}${(i + 1).toString().padEnd(4)}${c.reset}`;
      const name = String(cr['name'] ?? truncAddr(String(cr['id'] ?? 'unknown'))).padEnd(20);
      const tipsRecv = String(cr['totalTips'] ?? cr['tipsReceived'] ?? 0).padEnd(10);
      const engagement = Number(cr['engagementScore'] ?? cr['engagement'] ?? 0);
      const engBar = `${asciiBar(engagement, 100, 8)} ${engagement.toString().padEnd(4)}`;
      const repTier = String(cr['reputationTier'] ?? cr['tier'] ?? 'bronze');
      const tierColor = repTier.toLowerCase().includes('gold') ? c.yellow :
                        repTier.toLowerCase().includes('silver') ? c.white :
                        repTier.toLowerCase().includes('platinum') ? c.cyan : c.dim;
      const tier = `${tierColor}${repTier}${c.reset}`;

      console.log(`  ${rank}${c.cyan}${name}${c.reset}${tipsRecv}${engBar}  ${tier}`);
    }
  } catch (err) {
    failMessage(err);
  }
}

// ── 4. analytics chains ─────────────────────────────────────────────

async function cmdChains(): Promise<void> {
  heading('Chain Statistics');
  try {
    const balData = await apiFetch('/api/wallet/balances') as Record<string, unknown>;
    const balances = (Array.isArray(balData['balances']) ? balData['balances'] : Array.isArray(balData) ? balData : []) as Array<Record<string, unknown>>;

    if (balances.length === 0) {
      // Try flat object format: { "ethereum-sepolia": { balance, nativeBalance, ... } }
      const entries = Object.entries(balData).filter(([k]) => k !== 'error' && k !== 'ok');
      if (entries.length === 0) {
        console.log(`  ${c.dim}No chain data available.${c.reset}\n`);
        return;
      }

      tableHeader([
        { label: 'Chain', width: 22 },
        { label: 'USDT Balance', width: 14 },
        { label: 'Native Bal', width: 14 },
        { label: 'Tx Count', width: 10 },
        { label: 'Avg Fee', width: 10 },
      ]);

      for (const [chain, data] of entries) {
        const d = data as Record<string, unknown>;
        const usdtBal = String(d['balance'] ?? d['usdtBalance'] ?? '0.0000');
        const nativeBal = String(d['nativeBalance'] ?? '0.0000');
        const txCount = String(d['txCount'] ?? d['transactionCount'] ?? '-');
        const avgFee = String(d['avgFee'] ?? d['averageFee'] ?? '-');
        console.log(`  ${c.cyan}${chain.padEnd(22)}${c.reset}${c.yellow}${usdtBal.padEnd(14)}${c.reset}${nativeBal.padEnd(14)}${txCount.padEnd(10)}${avgFee}`);
      }
      return;
    }

    tableHeader([
      { label: 'Chain', width: 22 },
      { label: 'USDT Balance', width: 14 },
      { label: 'Native Bal', width: 14 },
      { label: 'Tx Count', width: 10 },
      { label: 'Avg Fee', width: 10 },
    ]);

    for (const bal of balances) {
      const chain = String(bal['chainId'] ?? bal['chain'] ?? 'unknown').padEnd(22);
      const usdtBal = String(bal['balance'] ?? bal['usdtBalance'] ?? '0.0000').padEnd(14);
      const nativeBal = String(bal['nativeBalance'] ?? '0.0000').padEnd(14);
      const txCount = String(bal['txCount'] ?? bal['transactionCount'] ?? '-').padEnd(10);
      const avgFee = String(bal['avgFee'] ?? bal['averageFee'] ?? '-');
      console.log(`  ${c.cyan}${chain}${c.reset}${c.yellow}${usdtBal}${c.reset}${nativeBal}${txCount}${avgFee}`);
    }
  } catch (err) {
    failMessage(err);
  }
}

// ── 5. analytics decisions ──────────────────────────────────────────

async function cmdDecisions(): Promise<void> {
  heading('Decision Audit Log');
  try {
    const decData = await apiFetch('/api/analytics/decisions') as Record<string, unknown>;
    const decisions = (Array.isArray(decData['decisions']) ? decData['decisions'] : Array.isArray(decData) ? decData : []) as Array<Record<string, unknown>>;

    if (decisions.length === 0) {
      console.log(`  ${c.dim}No decisions recorded yet.${c.reset}\n`);
      return;
    }

    // Summary stats
    heading('Decision Summary');
    const approved = decisions.filter(d => String(d['decision'] ?? d['result'] ?? '').toLowerCase().includes('approv')).length;
    const rejected = decisions.filter(d => String(d['decision'] ?? d['result'] ?? '').toLowerCase().includes('reject')).length;
    const vetoed = decisions.filter(d => Boolean(d['guardianVeto'] ?? d['vetoed'])).length;
    const flipped = decisions.filter(d => Boolean(d['voteFlip'] ?? d['flipped'])).length;
    const total = decisions.length;

    row('Total Decisions', `${c.bold}${total}${c.reset}`);
    row('Approved', `${c.green}${approved}${c.reset} (${total > 0 ? ((approved / total) * 100).toFixed(0) : 0}%)`);
    row('Rejected', `${c.red}${rejected}${c.reset} (${total > 0 ? ((rejected / total) * 100).toFixed(0) : 0}%)`);

    // Ratio bar
    heading('Approve / Reject Ratio');
    const approveBar = total > 0 ? Math.round((approved / total) * 40) : 0;
    const rejectBar = 40 - approveBar;
    console.log(`  ${c.green}${'█'.repeat(approveBar)}${c.red}${'█'.repeat(rejectBar)}${c.reset}`);
    console.log(`  ${c.green}Approved${c.reset}${' '.repeat(32 - 8)}${c.red}Rejected${c.reset}`);

    row('Guardian Vetoes', vetoed > 0 ? `${c.red}${vetoed}${c.reset}` : `${c.green}0${c.reset}`);
    row('Vote Flips', flipped > 0 ? `${c.yellow}${flipped}${c.reset}` : `${c.dim}0${c.reset}`);

    // Last 20 decisions
    heading('Recent Decisions (Last 20)');
    tableHeader([
      { label: 'Time', width: 12 },
      { label: 'Action', width: 12 },
      { label: 'Result', width: 10 },
      { label: 'Confidence', width: 12 },
      { label: 'Reason', width: 24 },
    ]);

    const recent = decisions.slice(-20).reverse();
    for (const dec of recent) {
      const ts = String(dec['timestamp'] ?? dec['createdAt'] ?? '').slice(11, 19) || '---';
      const action = String(dec['action'] ?? dec['type'] ?? 'tip').slice(0, 12).padEnd(12);
      const result = String(dec['decision'] ?? dec['result'] ?? 'unknown');
      const resultColored = result.toLowerCase().includes('approv')
        ? `${c.green}${result.slice(0, 10).padEnd(10)}${c.reset}`
        : `${c.red}${result.slice(0, 10).padEnd(10)}${c.reset}`;
      const confidence = String(dec['confidence'] ?? dec['overallConfidence'] ?? '-').slice(0, 12).padEnd(12);
      const reason = String(dec['reason'] ?? dec['reasoning'] ?? '').slice(0, 24);
      console.log(`  ${c.dim}${ts.padEnd(12)}${c.reset}${action}${resultColored}${confidence}${reason}`);
    }
  } catch (err) {
    failMessage(err);
  }
}

// ── 6. analytics export ─────────────────────────────────────────────

async function cmdExport(): Promise<void> {
  heading('Export Analytics Report');
  try {
    const endpoints: Record<string, string> = {
      status: '/api/agent/status',
      history: '/api/wallet/history',
      balances: '/api/wallet/balances',
      creators: '/api/creators',
      anomalies: '/api/analytics/anomalies',
      decisions: '/api/analytics/decisions',
    };

    const report: Record<string, unknown> = {
      generatedAt: new Date().toISOString(),
      agentVersion: '1.0.0',
    };

    let successCount = 0;
    let failCount = 0;

    for (const [key, path] of Object.entries(endpoints)) {
      try {
        const data = await apiFetch(path);
        report[key] = data;
        successCount++;
        console.log(`  ${c.green}\u2713${c.reset} Fetched ${c.cyan}${path}${c.reset}`);
      } catch {
        report[key] = { error: 'unavailable' };
        failCount++;
        console.log(`  ${c.red}\u2717${c.reset} Failed  ${c.dim}${path}${c.reset}`);
      }
    }

    const outPath = join(process.cwd(), 'analytics-report.json');
    writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');

    heading('Export Summary');
    row('File', `${c.cyan}${outPath}${c.reset}`);
    row('Endpoints OK', `${c.green}${successCount}${c.reset}`);
    row('Endpoints Failed', failCount > 0 ? `${c.red}${failCount}${c.reset}` : `${c.green}0${c.reset}`);
    row('File Size', `${(JSON.stringify(report).length / 1024).toFixed(1)} KB`);
    console.log(`\n  ${c.dim}Report saved to ${outPath}${c.reset}\n`);
  } catch (err) {
    failMessage(err);
  }
}

// ── Public handler ──────────────────────────────────────────────────

export async function handleAnalyticsCommand(subcommand: string | undefined, _args: string[]): Promise<void> {
  switch (subcommand) {
    case 'overview':
      await cmdOverview();
      break;
    case 'tips':
      await cmdTips();
      break;
    case 'creators':
      await cmdCreators();
      break;
    case 'chains':
      await cmdChains();
      break;
    case 'decisions':
      await cmdDecisions();
      break;
    case 'export':
      await cmdExport();
      break;
    default:
      heading('Analytics Commands');
      console.log(`  ${c.bold}Usage:${c.reset} ${c.cyan}aerofyta analytics${c.reset} ${c.yellow}<subcommand>${c.reset}\n`);
      const subs = [
        ['overview', 'Dashboard summary: tips, creators, anomalies, mood'],
        ['tips', 'Tip statistics: daily breakdown, averages, distribution'],
        ['creators', 'Creator leaderboard: rankings, engagement, reputation'],
        ['chains', 'Per-chain stats: balances, tx counts, fees'],
        ['decisions', 'Decision audit log: approve/reject ratio, vetoes'],
        ['export', 'Export full analytics report to analytics-report.json'],
      ];
      for (const [cmd, desc] of subs) {
        console.log(`    ${c.cyan}${(cmd ?? '').padEnd(16)}${c.reset}${desc}`);
      }
      console.log();
      break;
  }
}

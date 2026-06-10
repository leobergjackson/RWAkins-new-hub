// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta CLI — 18 payment commands for tips, escrow, splits, DCA, streaming, subscriptions, x402

// WDK type imports for payment CLI operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
// Payment CLI commands invoke WDK account.transfer(), escrow, and DCA operations
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon; // eslint-disable-line @typescript-eslint/no-unused-vars

const BASE_URL = `http://localhost:${process.env['PORT'] || '3001'}`;

// ── ANSI helpers ────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[97m',
};

function heading(text: string): void {
  console.log(`\n${c.bold}${c.cyan}\u2500\u2500 ${text} ${'\u2500'.repeat(Math.max(0, 52 - text.length))}${c.reset}\n`);
}

function ok(msg: string): void {
  console.log(`  ${c.green}\u2713${c.reset} ${msg}`);
}

function fail(msg: string): void {
  console.log(`  ${c.red}\u2717${c.reset} ${msg}`);
}

function truncAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── Table formatter ─────────────────────────────────────────────────
function table(headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? '').length))
  );
  const sep = widths.map(w => '\u2500'.repeat(w + 2)).join('\u253C');
  const formatRow = (cells: string[]): string =>
    cells.map((cell, i) => ` ${(cell ?? '').padEnd(widths[i] ?? 0)} `).join('\u2502');

  console.log(`  ${c.dim}\u250C${sep}\u2510${c.reset}`);
  console.log(`  ${c.bold}${formatRow(headers)}${c.reset}`);
  console.log(`  ${c.dim}\u251C${sep}\u2524${c.reset}`);
  for (const row of rows) {
    console.log(`  ${formatRow(row)}`);
  }
  console.log(`  ${c.dim}\u2514${sep}\u2518${c.reset}`);
}

// ── HTTP helpers ────────────────────────────────────────────────────
async function api<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10_000),
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

function handleError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('abort')) {
    fail(`Agent is ${c.red}not running${c.reset}. Start with: ${c.cyan}cd agent && npm run dev${c.reset}`);
  } else {
    fail(`${c.red}${msg}${c.reset}`);
  }
}

// ── 1. tip <addr> <amount> ──────────────────────────────────────────
async function tipSend(args: string[]): Promise<void> {
  const [recipient, amount] = args;
  if (!recipient || !amount) {
    fail(`Usage: ${c.cyan}tip <address> <amount>${c.reset}`);
    return;
  }
  heading('Send Tip');
  try {
    const data = await api('POST', '/api/wallet/tip', {
      recipient,
      amount: parseFloat(amount),
      chain: 'ethereum-sepolia',
    });
    ok(`Tip sent: ${c.yellow}${amount} USDT${c.reset} \u2192 ${truncAddr(recipient)}`);
    const d = data as Record<string, unknown>;
    if (d['txHash']) console.log(`  ${c.dim}TX: ${String(d['txHash'])}${c.reset}`);
    if (d['receipt']) console.log(`  ${c.dim}Receipt: ${JSON.stringify(d['receipt'])}${c.reset}`);
  } catch (err) {
    handleError(err);
  }
}

// ── 2. tip history ──────────────────────────────────────────────────
async function tipHistory(): Promise<void> {
  heading('Tip History (Last 20)');
  try {
    const data = await api<{ tips?: Array<Record<string, unknown>>; history?: Array<Record<string, unknown>> }>('GET', '/api/wallet/history');
    const tips = data.tips ?? data.history ?? [];
    const recent = tips.slice(0, 20);
    if (recent.length === 0) {
      console.log(`  ${c.dim}No tips found.${c.reset}`);
      return;
    }
    table(
      ['#', 'Recipient', 'Amount', 'Chain', 'Date'],
      recent.map((t, i) => [
        String(i + 1),
        truncAddr(String(t['recipient'] ?? '')),
        String(t['amount'] ?? '0'),
        String(t['chainId'] ?? t['chain'] ?? 'unknown'),
        String(t['createdAt'] ?? t['timestamp'] ?? '').slice(0, 19),
      ]),
    );
  } catch (err) {
    handleError(err);
  }
}

// ── 3. escrow create <addr> <amount> ────────────────────────────────
async function escrowCreate(args: string[]): Promise<void> {
  const [recipient, amount] = args;
  if (!recipient || !amount) {
    fail(`Usage: ${c.cyan}escrow create <address> <amount>${c.reset}`);
    return;
  }
  heading('Create Escrow');
  try {
    const data = await api('POST', '/api/escrow', {
      recipient,
      amount: parseFloat(amount),
    });
    const d = data as Record<string, unknown>;
    ok(`Escrow created: ${c.yellow}${amount} USDT${c.reset} \u2192 ${truncAddr(recipient)}`);
    if (d['id']) console.log(`  ${c.dim}Escrow ID: ${String(d['id'])}${c.reset}`);
    if (d['secret']) console.log(`  ${c.dim}Claim secret: ${String(d['secret'])}${c.reset}`);
  } catch (err) {
    handleError(err);
  }
}

// ── 4. escrow claim <id> <secret> ───────────────────────────────────
async function escrowClaim(args: string[]): Promise<void> {
  const [id, secret] = args;
  if (!id || !secret) {
    fail(`Usage: ${c.cyan}escrow claim <id> <secret>${c.reset}`);
    return;
  }
  heading('Claim Escrow');
  try {
    await api('POST', `/api/escrow/${id}/claim`, { secret });
    ok(`Escrow ${c.cyan}${id}${c.reset} claimed successfully`);
  } catch (err) {
    handleError(err);
  }
}

// ── 5. escrow refund <id> ───────────────────────────────────────────
async function escrowRefund(args: string[]): Promise<void> {
  const [id] = args;
  if (!id) {
    fail(`Usage: ${c.cyan}escrow refund <id>${c.reset}`);
    return;
  }
  heading('Refund Escrow');
  try {
    await api('POST', `/api/escrow/${id}/refund`);
    ok(`Escrow ${c.cyan}${id}${c.reset} refunded`);
  } catch (err) {
    handleError(err);
  }
}

// ── 6. escrow list ──────────────────────────────────────────────────
async function escrowList(): Promise<void> {
  heading('Active Escrows');
  try {
    const data = await api<{ escrows?: Array<Record<string, unknown>> }>('GET', '/api/escrow');
    const escrows = data.escrows ?? (Array.isArray(data) ? data as Array<Record<string, unknown>> : []);
    if (escrows.length === 0) {
      console.log(`  ${c.dim}No active escrows.${c.reset}`);
      return;
    }
    table(
      ['ID', 'Recipient', 'Amount', 'Status', 'Created'],
      escrows.map(e => [
        String(e['id'] ?? '').slice(0, 8),
        truncAddr(String(e['recipient'] ?? '')),
        String(e['amount'] ?? '0'),
        String(e['status'] ?? 'pending'),
        String(e['createdAt'] ?? '').slice(0, 19),
      ]),
    );
  } catch (err) {
    handleError(err);
  }
}

// ── 7. split create <name> <shares> ─────────────────────────────────
async function splitCreate(args: string[]): Promise<void> {
  const [name, ...shareParts] = args;
  if (!name || shareParts.length === 0) {
    fail(`Usage: ${c.cyan}split create <name> <addr1:pct1> <addr2:pct2> ...${c.reset}`);
    fail(`Example: ${c.dim}split create team 0xabc:50 0xdef:50${c.reset}`);
    return;
  }
  heading('Create Split');
  const shares = shareParts.map(s => {
    const [address, percent] = s.split(':');
    return { address: address ?? '', percent: parseFloat(percent ?? '0') };
  });
  try {
    const data = await api('POST', '/api/splits', { name, shares });
    const d = data as Record<string, unknown>;
    ok(`Split "${c.cyan}${name}${c.reset}" created with ${shares.length} recipients`);
    if (d['id']) console.log(`  ${c.dim}Split ID: ${String(d['id'])}${c.reset}`);
  } catch (err) {
    handleError(err);
  }
}

// ── 8. split execute <id> <amount> ──────────────────────────────────
async function splitExecute(args: string[]): Promise<void> {
  const [id, amount] = args;
  if (!id || !amount) {
    fail(`Usage: ${c.cyan}split execute <id> <amount>${c.reset}`);
    return;
  }
  heading('Execute Split');
  try {
    const data = await api('POST', `/api/splits/${id}/execute`, {
      amount: parseFloat(amount),
    });
    const d = data as Record<string, unknown>;
    ok(`Split ${c.cyan}${id}${c.reset} executed: ${c.yellow}${amount} USDT${c.reset} distributed`);
    if (d['distributions']) {
      const dists = d['distributions'] as Array<Record<string, unknown>>;
      for (const dist of dists) {
        console.log(`  ${c.dim}\u2514 ${truncAddr(String(dist['address'] ?? ''))} \u2192 ${String(dist['amount'] ?? '')} USDT${c.reset}`);
      }
    }
  } catch (err) {
    handleError(err);
  }
}

// ── 9. dca create <addr> <amount> <interval> ───────────────────────
async function dcaCreate(args: string[]): Promise<void> {
  const [recipient, amount, interval] = args;
  if (!recipient || !amount || !interval) {
    fail(`Usage: ${c.cyan}dca create <address> <totalAmount> <intervalHours>${c.reset}`);
    return;
  }
  heading('Create DCA Plan');
  try {
    const data = await api('POST', '/api/payments/dca', {
      recipient,
      totalAmount: parseFloat(amount),
      intervalHours: parseInt(interval, 10),
      token: 'usdt',
      chainId: 'ethereum-sepolia',
    });
    const d = data as Record<string, unknown>;
    ok(`DCA plan created: ${c.yellow}${amount} USDT${c.reset} \u2192 ${truncAddr(recipient)} every ${interval}h`);
    if (d['id']) console.log(`  ${c.dim}Plan ID: ${String(d['id'])}${c.reset}`);
  } catch (err) {
    handleError(err);
  }
}

// ── 10. dca list ────────────────────────────────────────────────────
async function dcaList(): Promise<void> {
  heading('DCA Plans');
  try {
    const data = await api<{ plans?: Array<Record<string, unknown>> }>('GET', '/api/payments/dca');
    const plans = data.plans ?? (Array.isArray(data) ? data as Array<Record<string, unknown>> : []);
    if (plans.length === 0) {
      console.log(`  ${c.dim}No DCA plans.${c.reset}`);
      return;
    }
    table(
      ['ID', 'Recipient', 'Total', 'Interval', 'Status', 'Progress'],
      plans.map(p => [
        String(p['id'] ?? '').slice(0, 8),
        truncAddr(String(p['recipient'] ?? '')),
        String(p['totalAmount'] ?? '0'),
        `${String(p['intervalHours'] ?? '?')}h`,
        String(p['status'] ?? 'active'),
        `${String(p['executedCount'] ?? p['completed'] ?? '0')}/${String(p['installments'] ?? '?')}`,
      ]),
    );
  } catch (err) {
    handleError(err);
  }
}

// ── 11. dca pause <id> ──────────────────────────────────────────────
async function dcaPause(args: string[]): Promise<void> {
  const [id] = args;
  if (!id) {
    fail(`Usage: ${c.cyan}dca pause <id>${c.reset}`);
    return;
  }
  heading('Pause DCA Plan');
  try {
    await api('POST', `/api/payments/dca/${id}/pause`);
    ok(`DCA plan ${c.cyan}${id}${c.reset} paused`);
  } catch (err) {
    handleError(err);
  }
}

// ── 12. dca resume <id> ─────────────────────────────────────────────
async function dcaResume(args: string[]): Promise<void> {
  const [id] = args;
  if (!id) {
    fail(`Usage: ${c.cyan}dca resume <id>${c.reset}`);
    return;
  }
  heading('Resume DCA Plan');
  try {
    await api('POST', `/api/payments/dca/${id}/resume`);
    ok(`DCA plan ${c.cyan}${id}${c.reset} resumed`);
  } catch (err) {
    handleError(err);
  }
}

// ── 13. stream start <addr> <rate> ──────────────────────────────────
async function streamStart(args: string[]): Promise<void> {
  const [recipient, rate] = args;
  if (!recipient || !rate) {
    fail(`Usage: ${c.cyan}stream start <address> <ratePerSecond>${c.reset}`);
    return;
  }
  heading('Start Payment Stream');
  try {
    const data = await api('POST', '/api/streaming/start', {
      recipient,
      ratePerSecond: parseFloat(rate),
    });
    const d = data as Record<string, unknown>;
    ok(`Stream started: ${c.yellow}${rate} USDT/s${c.reset} \u2192 ${truncAddr(recipient)}`);
    if (d['id'] ?? d['streamId']) console.log(`  ${c.dim}Stream ID: ${String(d['id'] ?? d['streamId'])}${c.reset}`);
  } catch (err) {
    handleError(err);
  }
}

// ── 14. stream stop <id> ────────────────────────────────────────────
async function streamStop(args: string[]): Promise<void> {
  const [id] = args;
  if (!id) {
    fail(`Usage: ${c.cyan}stream stop <id>${c.reset}`);
    return;
  }
  heading('Stop Payment Stream');
  try {
    const data = await api('POST', `/api/streaming/${id}/stop`);
    const d = data as Record<string, unknown>;
    ok(`Stream ${c.cyan}${id}${c.reset} stopped`);
    if (d['totalStreamed']) console.log(`  ${c.dim}Total streamed: ${String(d['totalStreamed'])} USDT${c.reset}`);
  } catch (err) {
    handleError(err);
  }
}

// ── 15. subscribe create <addr> <amount> <interval> ─────────────────
async function subscribeCreate(args: string[]): Promise<void> {
  const [recipient, amount, interval] = args;
  if (!recipient || !amount || !interval) {
    fail(`Usage: ${c.cyan}subscribe create <address> <amount> <intervalDays>${c.reset}`);
    return;
  }
  heading('Create Subscription');
  try {
    const data = await api('POST', '/api/payments/subscriptions', {
      recipient,
      amount: parseFloat(amount),
      intervalDays: parseInt(interval, 10),
    });
    const d = data as Record<string, unknown>;
    ok(`Subscription created: ${c.yellow}${amount} USDT${c.reset} every ${interval}d \u2192 ${truncAddr(recipient)}`);
    if (d['id']) console.log(`  ${c.dim}Subscription ID: ${String(d['id'])}${c.reset}`);
  } catch (err) {
    handleError(err);
  }
}

// ── 16. subscribe list ──────────────────────────────────────────────
async function subscribeList(): Promise<void> {
  heading('Subscriptions');
  try {
    const data = await api<{ subscriptions?: Array<Record<string, unknown>> }>('GET', '/api/payments/subscriptions');
    const subs = data.subscriptions ?? (Array.isArray(data) ? data as Array<Record<string, unknown>> : []);
    if (subs.length === 0) {
      console.log(`  ${c.dim}No subscriptions.${c.reset}`);
      return;
    }
    table(
      ['ID', 'Recipient', 'Amount', 'Interval', 'Status', 'Next'],
      subs.map(s => [
        String(s['id'] ?? '').slice(0, 8),
        truncAddr(String(s['recipient'] ?? '')),
        String(s['amount'] ?? '0'),
        `${String(s['intervalDays'] ?? '?')}d`,
        String(s['status'] ?? 'active'),
        String(s['nextPayment'] ?? s['nextRun'] ?? '').slice(0, 19),
      ]),
    );
  } catch (err) {
    handleError(err);
  }
}

// ── 17. x402 list ───────────────────────────────────────────────────
async function x402List(): Promise<void> {
  heading('x402 Paywalls');
  try {
    const data = await api<{ paywalls?: Array<Record<string, unknown>> }>('GET', '/api/x402/paywalls');
    const walls = data.paywalls ?? (Array.isArray(data) ? data as Array<Record<string, unknown>> : []);
    if (walls.length === 0) {
      console.log(`  ${c.dim}No paywalls configured.${c.reset}`);
      return;
    }
    table(
      ['ID', 'URL', 'Price', 'Currency', 'Hits'],
      walls.map(w => [
        String(w['id'] ?? '').slice(0, 8),
        String(w['url'] ?? w['path'] ?? ''),
        String(w['price'] ?? '0'),
        String(w['currency'] ?? 'USDT'),
        String(w['hits'] ?? w['accessCount'] ?? '0'),
      ]),
    );
  } catch (err) {
    handleError(err);
  }
}

// ── 18. x402 stats ──────────────────────────────────────────────────
async function x402Stats(): Promise<void> {
  heading('x402 Payment Statistics');
  try {
    const data = await api<Record<string, unknown>>('GET', '/api/x402/stats');
    const entries = Object.entries(data);
    if (entries.length === 0) {
      console.log(`  ${c.dim}No x402 stats available.${c.reset}`);
      return;
    }
    for (const [key, value] of entries) {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      console.log(`  ${c.dim}${label.padEnd(24)}${c.reset}${String(value)}`);
    }
  } catch (err) {
    handleError(err);
  }
}

// ── Exported router ─────────────────────────────────────────────────

export async function handlePaymentCommand(
  command: string,
  subcommand: string | undefined,
  args: string[],
): Promise<void> {
  switch (command) {
    case 'tip':
      if (subcommand === 'history') {
        await tipHistory();
      } else {
        // tip <addr> <amount> — subcommand is the address, args[0] is the amount
        const tipArgs = subcommand ? [subcommand, ...args] : args;
        await tipSend(tipArgs);
      }
      break;

    case 'escrow':
      switch (subcommand) {
        case 'create': await escrowCreate(args); break;
        case 'claim': await escrowClaim(args); break;
        case 'refund': await escrowRefund(args); break;
        case 'list': await escrowList(); break;
        default:
          fail(`Usage: ${c.cyan}escrow <create|claim|refund|list>${c.reset}`);
      }
      break;

    case 'split':
      switch (subcommand) {
        case 'create': await splitCreate(args); break;
        case 'execute': await splitExecute(args); break;
        default:
          fail(`Usage: ${c.cyan}split <create|execute>${c.reset}`);
      }
      break;

    case 'dca':
      switch (subcommand) {
        case 'create': await dcaCreate(args); break;
        case 'list': await dcaList(); break;
        case 'pause': await dcaPause(args); break;
        case 'resume': await dcaResume(args); break;
        default:
          fail(`Usage: ${c.cyan}dca <create|list|pause|resume>${c.reset}`);
      }
      break;

    case 'stream':
      switch (subcommand) {
        case 'start': await streamStart(args); break;
        case 'stop': await streamStop(args); break;
        default:
          fail(`Usage: ${c.cyan}stream <start|stop>${c.reset}`);
      }
      break;

    case 'subscribe':
      switch (subcommand) {
        case 'create': await subscribeCreate(args); break;
        case 'list': await subscribeList(); break;
        default:
          fail(`Usage: ${c.cyan}subscribe <create|list>${c.reset}`);
      }
      break;

    case 'x402':
      switch (subcommand) {
        case 'list': await x402List(); break;
        case 'stats': await x402Stats(); break;
        default:
          fail(`Usage: ${c.cyan}x402 <list|stats>${c.reset}`);
      }
      break;

    default:
      fail(`Unknown payment command: ${c.red}${command}${c.reset}`);
  }
}

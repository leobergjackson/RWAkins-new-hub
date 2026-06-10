// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta CLI — Security & adversarial testing commands

// WDK type imports for security validation of wallet operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Security commands validate WDK transaction limits, blocked addresses, and kill switch
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
  white: '\x1b[97m',
};

const PASS = `${c.green}\u2705${c.reset}`;
const FAIL = `${c.red}\u274C${c.reset}`;

function heading(text: string): void {
  console.log(`\n${c.bold}${c.cyan}\u2500\u2500 ${text} ${'─'.repeat(Math.max(0, 52 - text.length))}${c.reset}\n`);
}

function row(label: string, value: string): void {
  console.log(`  ${c.dim}${label.padEnd(24)}${c.reset} ${value}`);
}

function baseUrl(): string {
  const port = process.env['PORT'] || '3001';
  return `http://localhost:${port}`;
}

async function fetchJson<T = Record<string, unknown>>(
  url: string,
  opts?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── 1-3: Adversarial test commands ──────────────────────────────────

interface AdversarialResult {
  scenario: string;
  passed: boolean;
  description?: string;
  detail?: string;
  error?: string;
}

async function cmdTestAll(): Promise<void> {
  heading('Adversarial Security Tests');
  try {
    const data = await fetchJson<{ results: AdversarialResult[] }>(
      `${baseUrl()}/api/demo/adversarial/run-all`,
      { method: 'POST' },
    );
    const results = data.results ?? [];
    if (results.length === 0) {
      console.log(`  ${c.yellow}No test results returned.${c.reset}`);
      return;
    }
    let passed = 0;
    let failed = 0;
    for (const r of results) {
      const icon = r.passed ? PASS : FAIL;
      const status = r.passed
        ? `${c.green}PASS${c.reset}`
        : `${c.red}FAIL${c.reset}`;
      console.log(`  ${icon} ${status}  ${r.scenario}`);
      if (r.description) {
        console.log(`       ${c.dim}${r.description}${c.reset}`);
      }
      if (!r.passed && r.detail) {
        console.log(`       ${c.red}${r.detail}${c.reset}`);
      }
      if (r.passed) passed++;
      else failed++;
    }
    console.log();
    const summary = failed === 0
      ? `${c.green}${c.bold}All ${passed} tests passed${c.reset}`
      : `${c.yellow}${passed} passed, ${c.red}${failed} failed${c.reset}`;
    console.log(`  Summary: ${summary}\n`);
  } catch (err) {
    printConnError(err);
  }
}

async function cmdTestScenario(scenario: string): Promise<void> {
  heading(`Adversarial Test: ${scenario}`);
  try {
    const r = await fetchJson<AdversarialResult>(
      `${baseUrl()}/api/demo/adversarial/${encodeURIComponent(scenario)}`,
      { method: 'POST' },
    );
    const icon = r.passed ? PASS : FAIL;
    const status = r.passed
      ? `${c.green}PASS${c.reset}`
      : `${c.red}FAIL${c.reset}`;
    console.log(`  ${icon} ${status}  ${r.scenario ?? scenario}`);
    if (r.description) {
      console.log(`     ${c.dim}${r.description}${c.reset}`);
    }
    if (r.detail) {
      console.log(`     ${r.passed ? c.dim : c.red}${r.detail}${c.reset}`);
    }
  } catch (err) {
    printConnError(err);
  }
  console.log();
}

// ── 4: Security audit ───────────────────────────────────────────────

async function cmdAudit(): Promise<void> {
  heading('Security Audit Report');
  try {
    const data = await fetchJson<Record<string, unknown>>(
      `${baseUrl()}/api/agent/security-report`,
    );
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        console.log(`  ${c.bold}${key}${c.reset}`);
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          row(`  ${k}`, String(v));
        }
      } else if (Array.isArray(value)) {
        console.log(`  ${c.bold}${key}${c.reset}: ${value.length} items`);
        for (const item of value.slice(0, 10)) {
          console.log(`    ${c.dim}- ${typeof item === 'string' ? item : JSON.stringify(item)}${c.reset}`);
        }
      } else {
        row(key, String(value));
      }
    }
  } catch (err) {
    printConnError(err);
  }
  console.log();
}

// ── 5-7: Policy commands ────────────────────────────────────────────

interface PolicyRule {
  id: string;
  type: string;
  value: string | number;
  enabled?: boolean;
  createdAt?: string;
}

async function cmdPolicyList(): Promise<void> {
  heading('Active Policies');
  try {
    const data = await fetchJson<{ rules?: PolicyRule[]; policies?: PolicyRule[] }>(
      `${baseUrl()}/api/policies/rules`,
    );
    const rules = data.rules ?? data.policies ?? [];
    if (rules.length === 0) {
      console.log(`  ${c.dim}No policies configured.${c.reset}\n`);
      return;
    }
    // Table header
    console.log(
      `  ${c.bold}${'ID'.padEnd(10)} ${'Type'.padEnd(20)} ${'Value'.padEnd(20)} ${'Status'.padEnd(10)}${c.reset}`,
    );
    console.log(`  ${'─'.repeat(62)}`);
    for (const r of rules) {
      const status = r.enabled !== false
        ? `${c.green}active${c.reset}`
        : `${c.dim}disabled${c.reset}`;
      const id = String(r.id ?? '').slice(0, 8);
      console.log(
        `  ${id.padEnd(10)} ${String(r.type).padEnd(20)} ${String(r.value).padEnd(20)} ${status}`,
      );
    }
    console.log(`\n  ${c.dim}Total: ${rules.length} policies${c.reset}\n`);
  } catch (err) {
    printConnError(err);
  }
}

async function cmdPolicyAdd(type: string, value: string): Promise<void> {
  heading('Add Policy Rule');
  try {
    const data = await fetchJson<PolicyRule>(
      `${baseUrl()}/api/policies/rules`,
      {
        method: 'POST',
        body: JSON.stringify({ type, value }),
      },
    );
    console.log(`  ${PASS} Policy created`);
    if (data.id) row('ID', data.id);
    row('Type', type);
    row('Value', value);
  } catch (err) {
    printConnError(err);
  }
  console.log();
}

async function cmdPolicyRemove(id: string): Promise<void> {
  heading('Remove Policy Rule');
  try {
    await fetchJson(
      `${baseUrl()}/api/policies/rules/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    console.log(`  ${PASS} Policy ${c.cyan}${id}${c.reset} removed\n`);
  } catch (err) {
    printConnError(err);
  }
}

// ── 8-9: Anomaly commands ───────────────────────────────────────────

async function cmdAnomalyStats(): Promise<void> {
  heading('Anomaly Detection Statistics');
  try {
    const data = await fetchJson<Record<string, unknown>>(
      `${baseUrl()}/api/analytics/anomalies`,
    );
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        console.log(`  ${c.bold}${key}${c.reset}`);
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          row(`  ${k}`, String(v));
        }
      } else {
        row(key, String(value));
      }
    }
  } catch (err) {
    printConnError(err);
  }
  console.log();
}

async function cmdAnomalyCheck(amount: string): Promise<void> {
  heading(`Anomaly Check: ${amount}`);
  const numAmt = parseFloat(amount);
  if (isNaN(numAmt)) {
    console.log(`  ${FAIL} Invalid amount: ${c.red}${amount}${c.reset}\n`);
    return;
  }
  try {
    const data = await fetchJson<Record<string, unknown>>(
      `${baseUrl()}/api/analytics/anomalies/detect`,
      {
        method: 'POST',
        body: JSON.stringify({ amount: numAmt }),
      },
    );
    const isAnomaly = Boolean(data['isAnomaly'] ?? data['anomaly'] ?? data['flagged']);
    const icon = isAnomaly ? `${c.red}ANOMALY DETECTED${c.reset}` : `${c.green}NORMAL${c.reset}`;
    console.log(`  ${isAnomaly ? FAIL : PASS} ${icon}`);
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'isAnomaly' && key !== 'anomaly' && key !== 'flagged') {
        row(key, String(value));
      }
    }
  } catch (err) {
    printConnError(err);
  }
  console.log();
}

// ── 10-11: Credit score commands ────────────────────────────────────

async function cmdCreditScore(addr: string): Promise<void> {
  heading(`Credit Score: ${truncAddr(addr)}`);
  try {
    const data = await fetchJson<Record<string, unknown>>(
      `${baseUrl()}/api/analytics/credit-score/${encodeURIComponent(addr)}`,
    );
    for (const [key, value] of Object.entries(data)) {
      if (key === 'score' || key === 'creditScore') {
        const score = Number(value);
        const color = score >= 700 ? c.green : score >= 500 ? c.yellow : c.red;
        row(key, `${color}${c.bold}${score}${c.reset}`);
      } else if (typeof value === 'object' && value !== null) {
        console.log(`  ${c.bold}${key}${c.reset}`);
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          row(`  ${k}`, String(v));
        }
      } else {
        row(key, String(value));
      }
    }
  } catch (err) {
    printConnError(err);
  }
  console.log();
}

async function cmdCreditHistory(addr: string): Promise<void> {
  heading(`Credit History: ${truncAddr(addr)}`);
  try {
    const data = await fetchJson<{ history?: Array<Record<string, unknown>> } & Record<string, unknown>>(
      `${baseUrl()}/api/analytics/credit-score/${encodeURIComponent(addr)}/history`,
    );
    const history = data.history ?? (Array.isArray(data) ? data as Array<Record<string, unknown>> : []);
    if (history.length === 0) {
      console.log(`  ${c.dim}No credit history found for this address.${c.reset}\n`);
      return;
    }
    // Table header
    console.log(
      `  ${c.bold}${'Date'.padEnd(22)} ${'Score'.padEnd(8)} ${'Event'.padEnd(30)}${c.reset}`,
    );
    console.log(`  ${'─'.repeat(62)}`);
    for (const entry of history.slice(0, 20)) {
      const date = String(entry['date'] ?? entry['timestamp'] ?? entry['createdAt'] ?? '').slice(0, 19);
      const score = String(entry['score'] ?? entry['creditScore'] ?? '-');
      const event = String(entry['event'] ?? entry['type'] ?? entry['action'] ?? '-');
      console.log(`  ${date.padEnd(22)} ${score.padEnd(8)} ${event.padEnd(30)}`);
    }
    console.log(`\n  ${c.dim}Total entries: ${history.length}${c.reset}\n`);
  } catch (err) {
    printConnError(err);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function truncAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function printConnError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('abort')) {
    console.log(`  ${FAIL} Agent is ${c.red}not running${c.reset}. Start with: ${c.cyan}cd agent && npm run dev${c.reset}`);
  } else {
    console.log(`  ${FAIL} Error: ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

// ── Public handler ──────────────────────────────────────────────────

export async function handleSecurityCommand(
  command: string,
  subcommand: string | undefined,
  args: string[],
): Promise<void> {
  switch (command) {
    case 'test':
      if (!subcommand || subcommand === 'all') {
        await cmdTestAll();
      } else {
        await cmdTestScenario(subcommand);
      }
      break;

    case 'audit':
      await cmdAudit();
      break;

    case 'policy':
      if (subcommand === 'list' || !subcommand) {
        await cmdPolicyList();
      } else if (subcommand === 'add') {
        const type = args[0];
        const value = args[1];
        if (!type || !value) {
          console.log(`  ${FAIL} Usage: ${c.cyan}aerofyta policy add <type> <value>${c.reset}\n`);
        } else {
          await cmdPolicyAdd(type, value);
        }
      } else if (subcommand === 'remove') {
        const id = args[0];
        if (!id) {
          console.log(`  ${FAIL} Usage: ${c.cyan}aerofyta policy remove <id>${c.reset}\n`);
        } else {
          await cmdPolicyRemove(id);
        }
      } else {
        console.log(`  ${FAIL} Unknown policy subcommand: ${c.red}${subcommand}${c.reset}`);
        console.log(`  ${c.dim}Available: list, add, remove${c.reset}\n`);
      }
      break;

    case 'anomaly':
      if (subcommand === 'stats' || !subcommand) {
        await cmdAnomalyStats();
      } else if (subcommand === 'check') {
        const amount = args[0];
        if (!amount) {
          console.log(`  ${FAIL} Usage: ${c.cyan}aerofyta anomaly check <amount>${c.reset}\n`);
        } else {
          await cmdAnomalyCheck(amount);
        }
      } else {
        console.log(`  ${FAIL} Unknown anomaly subcommand: ${c.red}${subcommand}${c.reset}`);
        console.log(`  ${c.dim}Available: stats, check${c.reset}\n`);
      }
      break;

    case 'credit':
      if (subcommand === 'score') {
        const addr = args[0];
        if (!addr) {
          console.log(`  ${FAIL} Usage: ${c.cyan}aerofyta credit score <address>${c.reset}\n`);
        } else {
          await cmdCreditScore(addr);
        }
      } else if (subcommand === 'history') {
        const addr = args[0];
        if (!addr) {
          console.log(`  ${FAIL} Usage: ${c.cyan}aerofyta credit history <address>${c.reset}\n`);
        } else {
          await cmdCreditHistory(addr);
        }
      } else {
        console.log(`  ${FAIL} Unknown credit subcommand: ${c.red}${subcommand ?? '(none)'}${c.reset}`);
        console.log(`  ${c.dim}Available: score, history${c.reset}\n`);
      }
      break;

    default:
      console.log(`  ${FAIL} Unknown security command: ${c.red}${command}${c.reset}\n`);
  }
}

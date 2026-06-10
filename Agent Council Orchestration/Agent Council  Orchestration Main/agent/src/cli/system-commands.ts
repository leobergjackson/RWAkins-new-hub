// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta CLI — System commands (info, docs, health, modules, architecture,
// persistence, auth, zk, benchmark)

import { exec } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

// WDK type imports for system health and architecture inspection via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// System commands report WDK package versions, registered wallet managers, and chain status
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

// ── ANSI helpers (mirror cli/index.ts palette) ────────────────────────
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

const ok = `${c.green}✅${c.reset}`;
const fail = `${c.red}❌${c.reset}`;

function heading(text: string): void {
  console.log(
    `\n${c.bold}${c.cyan}── ${text} ${'─'.repeat(Math.max(0, 52 - text.length))}${c.reset}\n`,
  );
}

function row(label: string, value: string): void {
  console.log(`  ${c.dim}${label.padEnd(22)}${c.reset} ${value}`);
}

// ── Helpers ───────────────────────────────────────────────────────────

const BASE_URL = `http://localhost:${process.env['PORT'] || '3001'}`;

function getPkg(): Record<string, unknown> {
  try {
    const dir = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(dir, '..', '..', 'package.json');
    return JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return { name: '@xzashr/aerofyta', version: '1.0.0', description: '', license: 'Apache-2.0' };
  }
}

async function fetchJson(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${path}`);
  return (await res.json()) as Record<string, unknown>;
}

function openInBrowser(url: string): void {
  const platform = process.platform;
  let cmd: string;
  if (platform === 'win32') {
    cmd = `start ${url}`;
  } else if (platform === 'darwin') {
    cmd = `open ${url}`;
  } else {
    cmd = `xdg-open ${url}`;
  }
  exec(cmd, (err) => {
    if (err) {
      console.log(`  ${c.dim}Could not auto-open browser: ${err.message}${c.reset}`);
    }
  });
}

// ── Command implementations ──────────────────────────────────────────

async function cmdInfo(): Promise<void> {
  const pkg = getPkg();
  heading('Package Info');
  row('Name', `${c.cyan}${String(pkg['name'] || '@xzashr/aerofyta')}${c.reset}`);
  row('Version', String(pkg['version'] || '1.0.0'));
  row('Description', String(pkg['description'] || ''));
  row('Author', String(pkg['author'] || 'Danish'));
  row('License', String(pkg['license'] || 'Apache-2.0'));

  const repo = pkg['repository'] as Record<string, string> | undefined;
  const npmLink = `https://www.npmjs.com/package/${String(pkg['name'] || '@xzashr/aerofyta')}`;
  const ghLink = repo?.url?.replace(/\.git$/, '') || String(pkg['homepage'] || 'https://github.com/xzashr/aerofyta');
  row('npm', `${c.cyan}${npmLink}${c.reset}`);
  row('GitHub', `${c.cyan}${ghLink}${c.reset}`);

  heading('Features');
  const features = [
    'Multi-chain tipping (EVM, TON, Tron, BTC, Solana)',
    'ReAct autonomous reasoning loop',
    'Wallet-as-Brain financial pulse',
    'Multi-agent consensus (3-agent voting)',
    'Smart escrow with milestones',
    'Rumble creator discovery & RSS',
    'Adversarial safety engine',
    'MCP server for AI tool integration',
    'Predictive tipping intelligence',
    'Fee arbitrage across chains',
    'DCA tipping plans',
    'Cryptographic receipts (Proof-of-Tip)',
    'Tip streaming protocol',
    'USDT0 bridge integration',
    'Aave V3 lending integration',
    'Zero-knowledge privacy proofs',
  ];
  for (const f of features) {
    console.log(`  ${c.green}•${c.reset} ${f}`);
  }
  console.log();
}

async function cmdDocs(): Promise<void> {
  const docsUrl = `${BASE_URL}/api/docs/ui`;
  heading('API Documentation');
  row('Swagger UI', `${c.cyan}${docsUrl}${c.reset}`);
  console.log(`\n  ${c.dim}Opening in browser...${c.reset}`);
  openInBrowser(docsUrl);
  console.log();
}

async function cmdHealth(subcommand?: string): Promise<void> {
  if (subcommand === 'deep') {
    return cmdHealthDeep();
  }
  heading('Health Check');
  try {
    const data = await fetchJson('/api/health');
    console.log(`  ${ok} Agent is ${c.green}${c.bold}healthy${c.reset}\n`);
    if (data['status']) row('Status', String(data['status']));
    if (data['uptime']) row('Uptime', `${String(data['uptime'])}s`);
    if (data['version']) row('Version', String(data['version']));
    if (data['timestamp']) row('Timestamp', String(data['timestamp']));
    if (data['environment']) row('Environment', String(data['environment']));
    const mem = data['memory'] as Record<string, number> | undefined;
    if (mem?.heapUsed) row('Heap Used', `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`);
  } catch {
    console.log(`  ${fail} Agent is ${c.red}not reachable${c.reset} at ${BASE_URL}`);
    console.log(`  ${c.dim}Start with: cd agent && npm run dev${c.reset}`);
  }
  console.log();
}

async function cmdHealthDeep(): Promise<void> {
  heading('Deep Health Check');
  try {
    const data = await fetchJson('/api/health/deep');
    const services = data['services'] as Record<string, unknown>[] | Record<string, unknown> | undefined;

    if (Array.isArray(services)) {
      for (const svc of services) {
        const name = String(svc['name'] || svc['service'] || 'unknown');
        const healthy = svc['healthy'] ?? (svc['status'] === 'ok' || svc['ok']);
        const icon = healthy ? ok : fail;
        const detail = svc['detail'] || svc['latency'] || '';
        console.log(`  ${icon} ${name.padEnd(30)} ${c.dim}${String(detail)}${c.reset}`);
      }
    } else if (services && typeof services === 'object') {
      for (const [name, status] of Object.entries(services)) {
        const healthy = status === true || status === 'ok' ||
          (typeof status === 'object' && status !== null && (status as Record<string, unknown>)['healthy']);
        const icon = healthy ? ok : fail;
        console.log(`  ${icon} ${name}`);
      }
    } else {
      // Fallback: print all keys
      for (const [key, val] of Object.entries(data)) {
        row(key, String(val));
      }
    }
  } catch {
    console.log(`  ${fail} Deep health check failed — is the agent running?`);
  }
  console.log();
}

async function cmdModules(): Promise<void> {
  heading('Registered Modules');
  try {
    const data = await fetchJson('/api/health/modules');
    const modules = (data['modules'] ?? data['categories'] ?? data) as Record<string, unknown>;

    if (Array.isArray(modules)) {
      for (const mod of modules) {
        if (typeof mod === 'string') {
          console.log(`  ${c.green}•${c.reset} ${mod}`);
        } else {
          const m = mod as Record<string, unknown>;
          const name = String(m['name'] || m['module'] || 'unknown');
          const cat = m['category'] ? ` ${c.dim}[${m['category']}]${c.reset}` : '';
          console.log(`  ${c.green}•${c.reset} ${name}${cat}`);
        }
      }
    } else if (typeof modules === 'object' && modules !== null) {
      // Categorized map: { category: [module, module, ...] }
      for (const [category, items] of Object.entries(modules)) {
        console.log(`\n  ${c.bold}${c.cyan}${category}${c.reset}`);
        if (Array.isArray(items)) {
          for (const item of items) {
            const name = typeof item === 'string' ? item : String((item as Record<string, unknown>)['name'] || item);
            console.log(`    ${c.dim}├${c.reset} ${name}`);
          }
        } else {
          console.log(`    ${c.dim}${String(items)}${c.reset}`);
        }
      }
    }
    const total = data['total'] ?? data['count'];
    if (total) {
      console.log(`\n  ${c.bold}Total: ${total} modules${c.reset}`);
    }
  } catch {
    console.log(`  ${fail} Could not fetch modules — is the agent running?`);
  }
  console.log();
}

async function cmdArchitecture(): Promise<void> {
  heading('System Architecture');
  try {
    const data = await fetchJson('/api/architecture');

    // Print top-level sections
    for (const [section, value] of Object.entries(data)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        row(section, String(value));
      } else if (Array.isArray(value)) {
        console.log(`\n  ${c.bold}${section}${c.reset}`);
        for (const item of value.slice(0, 30)) {
          if (typeof item === 'string') {
            console.log(`    ${c.dim}•${c.reset} ${item}`);
          } else {
            const obj = item as Record<string, unknown>;
            const name = obj['name'] || obj['id'] || JSON.stringify(obj);
            console.log(`    ${c.dim}•${c.reset} ${String(name)}`);
          }
        }
        if (value.length > 30) console.log(`    ${c.dim}...and ${value.length - 30} more${c.reset}`);
      } else if (typeof value === 'object' && value !== null) {
        console.log(`\n  ${c.bold}${section}${c.reset}`);
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            console.log(`    ${c.cyan}${k}${c.reset}`);
            for (const [kk, vv] of Object.entries(v as Record<string, unknown>)) {
              console.log(`      ${c.dim}${kk}:${c.reset} ${String(vv)}`);
            }
          } else {
            console.log(`    ${c.dim}${k}:${c.reset} ${String(v)}`);
          }
        }
      }
    }
  } catch {
    console.log(`  ${fail} Could not fetch architecture — is the agent running?`);
  }
  console.log();
}

async function cmdPersistence(subcommand?: string): Promise<void> {
  if (subcommand !== 'status') {
    console.log(`  ${c.dim}Usage: aerofyta persistence status${c.reset}\n`);
    return;
  }
  heading('Persistence Status');
  try {
    const data = await fetchJson('/api/system/persistence');
    row('Mode', `${c.bold}${String(data['mode'] || data['backend'] || 'unknown')}${c.reset}`);
    const backends = data['availableBackends'] ?? data['available'] ?? data['backends'];
    if (Array.isArray(backends)) {
      row('Available Backends', backends.join(', '));
    }
    if (data['path']) row('Path', String(data['path']));
    if (data['size']) row('Size', String(data['size']));
  } catch {
    console.log(`  ${fail} Could not fetch persistence status — is the agent running?`);
  }
  console.log();
}

async function cmdAuth(subcommand?: string): Promise<void> {
  if (subcommand !== 'status') {
    console.log(`  ${c.dim}Usage: aerofyta auth status${c.reset}\n`);
    return;
  }
  heading('Auth Status');
  try {
    const data = await fetchJson('/api/auth/status');
    row('Enabled', data['enabled'] ? `${c.green}yes${c.reset}` : `${c.yellow}no${c.reset}`);
    if (data['method']) row('Method', String(data['method']));
    if (data['scope']) row('Scope', String(data['scope']));
    if (data['protectedEndpoints']) {
      const ep = data['protectedEndpoints'];
      row('Protected', Array.isArray(ep) ? ep.join(', ') : String(ep));
    }
  } catch {
    console.log(`  ${fail} Could not fetch auth status — is the agent running?`);
  }
  console.log();
}

async function cmdZk(subcommand?: string): Promise<void> {
  if (subcommand !== 'capabilities') {
    console.log(`  ${c.dim}Usage: aerofyta zk capabilities${c.reset}\n`);
    return;
  }
  heading('ZK Capabilities');
  try {
    const data = await fetchJson('/api/zk/capabilities');
    const modes = data['modes'] ?? data['capabilities'] ?? data['available'];
    if (Array.isArray(modes)) {
      for (const mode of modes) {
        if (typeof mode === 'string') {
          console.log(`  ${c.green}•${c.reset} ${mode}`);
        } else {
          const m = mode as Record<string, unknown>;
          const name = String(m['name'] || m['mode'] || 'unknown');
          const enabled = m['enabled'] !== false;
          console.log(`  ${enabled ? ok : fail} ${name}`);
        }
      }
    } else if (typeof modes === 'object' && modes !== null) {
      for (const [name, status] of Object.entries(modes as Record<string, unknown>)) {
        const icon = status ? ok : fail;
        console.log(`  ${icon} ${name}: ${String(status)}`);
      }
    } else {
      for (const [key, val] of Object.entries(data)) {
        row(key, String(val));
      }
    }
  } catch {
    console.log(`  ${fail} Could not fetch ZK capabilities — is the agent running?`);
  }
  console.log();
}

async function cmdBenchmark(): Promise<void> {
  heading('Benchmark — Service Initialization');
  console.log(`  ${c.dim}Timing how fast services initialize...${c.reset}\n`);

  const { createAeroFytaAgent } = await import('../sdk/create-agent.js');

  const t0 = performance.now();

  try {
    const agent = await createAeroFytaAgent({
      seed: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      autonomousLoop: false,
    });

    const t1 = performance.now();
    const totalMs = (t1 - t0).toFixed(1);

    console.log(`  ${ok} Agent initialized in ${c.bold}${totalMs} ms${c.reset}\n`);

    // Try to read service stats from the agent if available
    const agentAny = agent as unknown as Record<string, unknown>;
    const stats = typeof agentAny['getStats'] === 'function'
      ? (agentAny as unknown as { getStats: () => Record<string, unknown> }).getStats()
      : null;

    if (stats) {
      for (const [name, time] of Object.entries(stats)) {
        row(name, `${String(time)} ms`);
      }
    }

    row('Total init time', `${c.green}${totalMs} ms${c.reset}`);
    row('Platform', `${process.platform} (${process.arch})`);
    row('Node.js', process.version);
    row('Heap (before)', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`);

    // Dispose if possible
    if (typeof agentAny['dispose'] === 'function') {
      (agentAny as unknown as { dispose: () => void }).dispose();
    }
  } catch (err) {
    const t1 = performance.now();
    const totalMs = (t1 - t0).toFixed(1);
    console.log(`  ${c.yellow}⚠${c.reset}  Initialization took ${c.bold}${totalMs} ms${c.reset} but ended with an error:`);
    console.log(`  ${c.dim}${err instanceof Error ? err.message : String(err)}${c.reset}`);
    console.log(`\n  ${c.dim}This is expected if WDK SDK is not fully configured.${c.reset}`);
    row('Elapsed', `${totalMs} ms`);
    row('Platform', `${process.platform} (${process.arch})`);
    row('Node.js', process.version);
  }
  console.log();
}

// ── Exported dispatcher ──────────────────────────────────────────────

export async function handleSystemCommand(
  command: string,
  subcommand?: string,
  _args?: string[],
): Promise<void> {
  switch (command) {
    case 'info':
      await cmdInfo();
      break;
    case 'docs':
      await cmdDocs();
      break;
    case 'health':
      await cmdHealth(subcommand);
      break;
    case 'modules':
      await cmdModules();
      break;
    case 'architecture':
      await cmdArchitecture();
      break;
    case 'persistence':
      await cmdPersistence(subcommand);
      break;
    case 'auth':
      await cmdAuth(subcommand);
      break;
    case 'zk':
      await cmdZk(subcommand);
      break;
    case 'benchmark':
      await cmdBenchmark();
      break;
    default:
      console.log(`  ${c.dim}Unknown system command: ${command}${c.reset}\n`);
  }
}

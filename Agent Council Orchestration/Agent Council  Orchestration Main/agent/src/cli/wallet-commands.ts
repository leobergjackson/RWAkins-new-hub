// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta CLI — Wallet subcommands

import { readFileSync, writeFileSync } from 'node:fs';

// WDK type imports for wallet CLI operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
import type WalletManagerTron from '@tetherto/wdk-wallet-tron';
// CLI wallet commands query WDK getBalance(), getTokenBalance(), and account.getAddress()
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon | WalletManagerTron; // eslint-disable-line @typescript-eslint/no-unused-vars

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
  blue: '\x1b[34m',
  white: '\x1b[97m',
};

const BASE_URL = 'http://localhost:3001';
const SERVER_ERR = `${c.red}\u274C${c.reset} Server not running — start with: ${c.cyan}npx @xzashr/aerofyta start${c.reset}`;

// ── Helpers ─────────────────────────────────────────────────────────

function heading(text: string): void {
  console.log(`\n${c.bold}${c.cyan}\u2500\u2500 ${text} ${'\u2500'.repeat(Math.max(0, 52 - text.length))}${c.reset}\n`);
}

function truncAddr(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

async function apiFetch(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const init: RequestInit = {
    method: options?.method ?? 'GET',
    signal: AbortSignal.timeout(8000),
  };
  if (options?.body) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

function isConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('fetch') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('UND_ERR') ||
    msg.includes('network') ||
    msg.includes('abort')
  );
}

// ── Faucet URLs ─────────────────────────────────────────────────────

const FAUCETS: Array<{ chain: string; url: string }> = [
  { chain: 'Ethereum Sepolia', url: 'https://sepoliafaucet.com' },
  { chain: 'TON Testnet', url: 'https://t.me/testgiver_ton_bot' },
  { chain: 'Tron Nile', url: 'https://nileex.io/join/getJoinPage' },
  { chain: 'Bitcoin Testnet', url: 'https://coinfaucet.eu/en/btc-testnet/' },
  { chain: 'Solana Devnet', url: 'https://faucet.solana.com' },
];

// ── Subcommands ─────────────────────────────────────────────────────

async function walletShow(): Promise<void> {
  heading('Wallet Addresses');
  try {
    const data = (await apiFetch('/api/wallet/addresses')) as Record<string, unknown>;
    const addresses = (data['addresses'] ?? data) as Record<string, string>[] | Record<string, string>;

    if (Array.isArray(addresses)) {
      console.log(
        `  ${c.dim}${'Chain'.padEnd(22)}${'Address'.padEnd(48)}${c.reset}`,
      );
      console.log(`  ${c.dim}${'\u2500'.repeat(70)}${c.reset}`);
      for (const entry of addresses) {
        const chain = String(entry['chain'] ?? entry['network'] ?? 'unknown');
        const addr = String(entry['address'] ?? '');
        console.log(
          `  ${c.cyan}${chain.padEnd(22)}${c.reset}${truncAddr(addr)}`,
        );
      }
    } else {
      console.log(
        `  ${c.dim}${'Chain'.padEnd(22)}${'Address'.padEnd(48)}${c.reset}`,
      );
      console.log(`  ${c.dim}${'\u2500'.repeat(70)}${c.reset}`);
      for (const [chain, addr] of Object.entries(addresses)) {
        console.log(
          `  ${c.cyan}${chain.padEnd(22)}${c.reset}${truncAddr(String(addr))}`,
        );
      }
    }
  } catch (err) {
    if (isConnectionError(err)) {
      console.log(`  ${SERVER_ERR}`);
    } else {
      console.log(`  ${c.red}\u274C${c.reset} ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log();
}

async function walletFund(): Promise<void> {
  heading('Faucet URLs');
  console.log(`  ${c.dim}Use these faucets to get testnet tokens:${c.reset}\n`);
  for (const f of FAUCETS) {
    console.log(`  ${c.green}\u25CF${c.reset} ${c.bold}${f.chain.padEnd(22)}${c.reset}${c.cyan}${f.url}${c.reset}`);
  }
  console.log(`\n  ${c.dim}After funding, run: ${c.cyan}aerofyta wallet balance${c.reset}`);
  console.log();
}

async function walletExport(): Promise<void> {
  heading('Export Addresses');
  try {
    const data = (await apiFetch('/api/wallet/addresses')) as Record<string, unknown>;
    const outFile = 'wallet-addresses.json';
    writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  ${c.green}\u2705${c.reset} Saved to ${c.cyan}${outFile}${c.reset}`);
  } catch (err) {
    if (isConnectionError(err)) {
      console.log(`  ${SERVER_ERR}`);
    } else {
      console.log(`  ${c.red}\u274C${c.reset} ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log();
}

async function walletImport(file: string | undefined): Promise<void> {
  heading('Import Addresses');
  if (!file) {
    console.log(`  ${c.red}\u274C${c.reset} Usage: ${c.cyan}aerofyta wallet import <file.json>${c.reset}`);
    console.log();
    return;
  }

  try {
    const raw = readFileSync(file, 'utf-8');
    const data = JSON.parse(raw) as unknown;

    console.log(`  ${c.green}\u2705${c.reset} Loaded ${c.cyan}${file}${c.reset}\n`);
    console.log(`  ${c.dim}${'Chain'.padEnd(22)}${'Address'.padEnd(48)}${c.reset}`);
    console.log(`  ${c.dim}${'\u2500'.repeat(70)}${c.reset}`);

    if (Array.isArray(data)) {
      for (const entry of data) {
        const rec = entry as Record<string, string>;
        const chain = String(rec['chain'] ?? rec['network'] ?? 'unknown');
        const addr = String(rec['address'] ?? '');
        console.log(`  ${c.cyan}${chain.padEnd(22)}${c.reset}${truncAddr(addr)}`);
      }
    } else if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      const addresses = (obj['addresses'] ?? obj) as Record<string, string>;
      for (const [chain, addr] of Object.entries(addresses)) {
        console.log(`  ${c.cyan}${chain.padEnd(22)}${c.reset}${truncAddr(String(addr))}`);
      }
    }

    console.log(`\n  ${c.yellow}\u26A0${c.reset}  ${c.dim}Read-only display \u2014 seed phrases cannot be imported via CLI.${c.reset}`);
  } catch (err) {
    console.log(`  ${c.red}\u274C${c.reset} Failed to read ${c.cyan}${file}${c.reset}: ${err instanceof Error ? err.message : String(err)}`);
  }
  console.log();
}

async function walletBalance(): Promise<void> {
  heading('Wallet Balances');
  try {
    const data = (await apiFetch('/api/wallet/balances')) as Record<string, unknown>;
    const balances = (data['balances'] ?? data) as Record<string, unknown>[] | Record<string, unknown>;

    console.log(
      `  ${c.dim}${'Chain'.padEnd(22)}${'Token'.padEnd(10)}${'Balance'.padEnd(18)}${c.reset}`,
    );
    console.log(`  ${c.dim}${'\u2500'.repeat(50)}${c.reset}`);

    const printRow = (chain: string, token: string, balance: string): void => {
      const num = parseFloat(balance);
      const color = isNaN(num) || num <= 0 ? c.red : c.green;
      console.log(
        `  ${c.cyan}${chain.padEnd(22)}${c.reset}${token.padEnd(10)}${color}${balance}${c.reset}`,
      );
    };

    if (Array.isArray(balances)) {
      for (const entry of balances) {
        const rec = entry as Record<string, string>;
        printRow(
          String(rec['chain'] ?? rec['network'] ?? 'unknown'),
          String(rec['token'] ?? 'USDT'),
          String(rec['balance'] ?? '0'),
        );
      }
    } else {
      for (const [chain, val] of Object.entries(balances)) {
        const balStr = typeof val === 'object' && val !== null
          ? String((val as Record<string, unknown>)['balance'] ?? val)
          : String(val);
        const token = typeof val === 'object' && val !== null
          ? String((val as Record<string, unknown>)['token'] ?? 'USDT')
          : 'USDT';
        printRow(chain, token, balStr);
      }
    }
  } catch (err) {
    if (isConnectionError(err)) {
      console.log(`  ${SERVER_ERR}`);
    } else {
      console.log(`  ${c.red}\u274C${c.reset} ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log();
}

async function walletHistory(): Promise<void> {
  heading('Transaction History');
  try {
    const data = (await apiFetch('/api/wallet/history')) as Record<string, unknown>;
    const txs = (data['transactions'] ?? data['history'] ?? []) as Record<string, string>[];

    if (!Array.isArray(txs) || txs.length === 0) {
      console.log(`  ${c.dim}No transactions found.${c.reset}`);
    } else {
      console.log(
        `  ${c.dim}${'Date'.padEnd(22)}${'Type'.padEnd(10)}${'Amount'.padEnd(14)}${'Chain'.padEnd(16)}${c.reset}`,
      );
      console.log(`  ${c.dim}${'\u2500'.repeat(62)}${c.reset}`);
      for (const tx of txs.slice(0, 20)) {
        const date = String(tx['date'] ?? tx['timestamp'] ?? '').slice(0, 19);
        const type = String(tx['type'] ?? 'tip');
        const amt = String(tx['amount'] ?? '0');
        const chain = String(tx['chain'] ?? tx['network'] ?? '');
        console.log(
          `  ${date.padEnd(22)}${c.yellow}${type.padEnd(10)}${c.reset}${c.green}$${amt.padEnd(13)}${c.reset}${c.cyan}${chain}${c.reset}`,
        );
      }
    }
  } catch (err) {
    if (isConnectionError(err)) {
      console.log(`  ${SERVER_ERR}`);
      console.log(`  ${c.dim}Start the server first to view transaction history.${c.reset}`);
    } else {
      console.log(`  ${c.red}\u274C${c.reset} ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log();
}

async function walletGaslessTest(): Promise<void> {
  heading('Gasless Transaction Test');
  console.log(`  ${c.dim}Testing ERC-4337 gasless transaction capability...${c.reset}\n`);
  try {
    const data = (await apiFetch('/api/wallet/gasless-test', { method: 'POST' })) as Record<string, unknown>;
    const success = Boolean(data['success'] ?? data['ok']);
    if (success) {
      console.log(`  ${c.green}\u2705${c.reset} Gasless transaction ${c.green}${c.bold}supported${c.reset}`);
      if (data['txHash']) console.log(`  ${c.dim}TX: ${data['txHash']}${c.reset}`);
      if (data['chain']) console.log(`  ${c.dim}Chain: ${data['chain']}${c.reset}`);
      if (data['paymaster']) console.log(`  ${c.dim}Paymaster: ${data['paymaster']}${c.reset}`);
    } else {
      console.log(`  ${c.yellow}\u26A0${c.reset}  Gasless test returned: ${c.dim}${JSON.stringify(data)}${c.reset}`);
    }
  } catch (err) {
    if (isConnectionError(err)) {
      console.log(`  ${SERVER_ERR}`);
    } else {
      console.log(`  ${c.red}\u274C${c.reset} Gasless test failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log();
}

async function walletSignerVerify(): Promise<void> {
  heading('Signer Verification');
  console.log(`  ${c.dim}Verifying WDK signer alignment across chains...${c.reset}\n`);
  try {
    const data = (await apiFetch('/api/wallet/verify-signer', { method: 'POST' })) as Record<string, unknown>;
    const aligned = Boolean(data['aligned'] ?? data['verified'] ?? data['success']);

    if (aligned) {
      console.log(`  ${c.green}\u2705${c.reset} Signer is ${c.green}${c.bold}aligned${c.reset} across all chains`);
    } else {
      console.log(`  ${c.red}\u274C${c.reset} Signer ${c.red}${c.bold}misalignment${c.reset} detected`);
    }

    const chains = (data['chains'] ?? data['results']) as Record<string, unknown>[] | undefined;
    if (Array.isArray(chains)) {
      console.log();
      for (const ch of chains) {
        const rec = ch as Record<string, unknown>;
        const name = String(rec['chain'] ?? rec['name'] ?? 'unknown');
        const ok = Boolean(rec['verified'] ?? rec['aligned'] ?? rec['ok']);
        const icon = ok ? `${c.green}\u2713${c.reset}` : `${c.red}\u2717${c.reset}`;
        console.log(`  ${icon} ${name}`);
      }
    }
  } catch (err) {
    if (isConnectionError(err)) {
      console.log(`  ${SERVER_ERR}`);
    } else {
      console.log(`  ${c.red}\u274C${c.reset} Verification failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log();
}

// ── Help ────────────────────────────────────────────────────────────

function walletHelp(): void {
  heading('Wallet Commands');
  const cmds: Array<[string, string]> = [
    ['show', 'Display all wallet addresses across chains'],
    ['fund', 'Print faucet URLs for each testnet chain'],
    ['export', 'Save wallet addresses to wallet-addresses.json'],
    ['import <file>', 'Display addresses from a JSON file (read-only)'],
    ['balance', 'Show balances per chain with color indicators'],
    ['history', 'Show recent transaction history'],
    ['gasless-test', 'Test ERC-4337 gasless transaction support'],
    ['signer-verify', 'Verify WDK signer alignment across chains'],
  ];
  for (const [cmd, desc] of cmds) {
    console.log(`  ${c.cyan}${'wallet ' + cmd}${c.reset}${''.padEnd(Math.max(1, 24 - cmd.length))}${desc}`);
  }
  console.log();
}

// ── Exported handler ────────────────────────────────────────────────

export async function handleWalletCommand(
  subcommand: string | undefined,
  args: string[],
): Promise<void> {
  switch (subcommand) {
    case 'show':
      await walletShow();
      break;
    case 'fund':
      await walletFund();
      break;
    case 'export':
      await walletExport();
      break;
    case 'import':
      await walletImport(args[0]);
      break;
    case 'balance':
      await walletBalance();
      break;
    case 'history':
      await walletHistory();
      break;
    case 'gasless-test':
      await walletGaslessTest();
      break;
    case 'signer-verify':
      await walletSignerVerify();
      break;
    case 'help':
    default:
      walletHelp();
      break;
  }
}

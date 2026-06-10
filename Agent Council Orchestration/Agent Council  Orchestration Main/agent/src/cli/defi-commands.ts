// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta CLI — DeFi commands (deploy, proof, yield, swap, bridge, lend)

// WDK type imports for DeFi CLI operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type Usdt0ProtocolEvm from '@tetherto/wdk-protocol-bridge-usdt0-evm';
import type SwapProtocolVelora from '@tetherto/wdk-protocol-swap-velora-evm';
import type LendingProtocolAave from '@tetherto/wdk-protocol-lending-aave-evm';
// DeFi CLI commands invoke WDK bridge, swap, and lending protocol methods
export type _WdkRefs = WDK | WalletManagerEvm | Usdt0ProtocolEvm | SwapProtocolVelora | LendingProtocolAave; // eslint-disable-line @typescript-eslint/no-unused-vars

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

function row(label: string, value: string): void {
  console.log(`  ${c.dim}${label.padEnd(22)}${c.reset} ${value}`);
}

function etherscanLink(hash: string): string {
  return `${c.cyan}https://sepolia.etherscan.io/tx/${hash}${c.reset}`;
}

function colorApy(apy: number): string {
  if (apy > 0) return `${c.green}${apy.toFixed(2)}%${c.reset}`;
  if (apy < 0) return `${c.red}${apy.toFixed(2)}%${c.reset}`;
  return `${c.dim}0.00%${c.reset}`;
}

function truncAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const BASE_URL = `http://localhost:${process.env['PORT'] || '3001'}`;

// ── API helper ──────────────────────────────────────────────────────

async function apiGet<T = Record<string, unknown>>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T = Record<string, unknown>>(path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── 1. deploy ───────────────────────────────────────────────────────

async function cmdDeploy(): Promise<void> {
  heading('Deploy Smart Contracts');
  console.log(`  To deploy AeroFyta contracts to Sepolia, run:\n`);
  console.log(`    ${c.cyan}npm run deploy:contracts${c.reset}\n`);
  console.log(`  ${c.dim}This will deploy ProofOfTip, TipEscrow, and ReputationRegistry${c.reset}`);
  console.log(`  ${c.dim}to Ethereum Sepolia testnet using your configured seed.${c.reset}\n`);
  console.log(`  ${c.yellow}Prerequisites:${c.reset}`);
  console.log(`    1. Sepolia ETH in your wallet (faucet: ${c.cyan}https://sepoliafaucet.com${c.reset})`);
  console.log(`    2. WDK_SEED set in .env`);
  console.log(`    3. Run from the ${c.cyan}agent/${c.reset} directory\n`);
}

// ── 2. deploy status ────────────────────────────────────────────────

interface DeployedContracts {
  [name: string]: {
    address: string;
    txHash?: string;
    deployedAt?: string;
    network?: string;
  };
}

async function cmdDeployStatus(): Promise<void> {
  heading('Deployed Contracts');

  const { readFileSync, existsSync } = await import('node:fs');
  const { resolve, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const dir = dirname(fileURLToPath(import.meta.url));
  const contractsPath = resolve(dir, '..', '..', '.deployed-contracts.json');

  if (!existsSync(contractsPath)) {
    console.log(`  ${fail} No deployed contracts found.`);
    console.log(`  ${c.dim}Run ${c.cyan}aerofyta deploy${c.reset}${c.dim} for instructions.${c.reset}\n`);
    return;
  }

  try {
    const data = JSON.parse(readFileSync(contractsPath, 'utf-8')) as DeployedContracts;
    const entries = Object.entries(data);
    if (entries.length === 0) {
      console.log(`  ${c.dim}No contracts in .deployed-contracts.json${c.reset}\n`);
      return;
    }

    for (const [name, info] of entries) {
      console.log(`  ${ok} ${c.bold}${name}${c.reset}`);
      row('Address', `${c.cyan}${info.address}${c.reset}`);
      row('Etherscan', `${c.cyan}https://sepolia.etherscan.io/address/${info.address}${c.reset}`);
      if (info.txHash) row('Deploy TX', etherscanLink(info.txHash));
      if (info.deployedAt) row('Deployed', info.deployedAt);
      if (info.network) row('Network', info.network);
      console.log();
    }
  } catch (err) {
    console.log(`  ${fail} Failed to read contracts file: ${c.red}${err instanceof Error ? err.message : String(err)}${c.reset}\n`);
  }
}

// ── 3. proof generate ───────────────────────────────────────────────

interface ProofResult {
  txHashes?: string[];
  proofs?: Array<{ txHash: string; type?: string }>;
  count?: number;
  error?: string;
}

async function cmdProofGenerate(): Promise<void> {
  heading('Generate Proofs');
  console.log(`  ${c.dim}Generating on-chain proofs for all pending tips...${c.reset}\n`);

  try {
    const data = await apiPost<ProofResult>('/api/proof/generate-all');
    const hashes = data.txHashes ?? data.proofs?.map(p => p.txHash) ?? [];

    if (hashes.length === 0) {
      console.log(`  ${c.dim}No pending tips to generate proofs for.${c.reset}\n`);
      return;
    }

    for (const hash of hashes) {
      console.log(`  ${ok} ${etherscanLink(hash)}`);
    }
    console.log(`\n  ${c.green}${c.bold}${hashes.length}${c.reset} proof(s) generated.\n`);
  } catch (err) {
    handleError('Proof generation failed', err);
  }
}

// ── 4. proof show ───────────────────────────────────────────────────

interface ProofBundle {
  proofs?: Array<{
    txHash: string;
    type?: string;
    timestamp?: string;
    sender?: string;
    recipient?: string;
    amount?: string;
  }>;
  count?: number;
}

async function cmdProofShow(): Promise<void> {
  heading('Saved Proofs');

  try {
    const data = await apiGet<ProofBundle>('/api/proof/bundle');
    const proofs = data.proofs ?? [];

    if (proofs.length === 0) {
      console.log(`  ${c.dim}No proofs saved. Run ${c.cyan}aerofyta proof generate${c.reset}${c.dim} first.${c.reset}\n`);
      return;
    }

    for (const proof of proofs) {
      console.log(`  ${ok} ${c.bold}${proof.type ?? 'ProofOfTip'}${c.reset}`);
      row('TX Hash', etherscanLink(proof.txHash));
      if (proof.sender) row('Sender', truncAddr(proof.sender));
      if (proof.recipient) row('Recipient', truncAddr(proof.recipient));
      if (proof.amount) row('Amount', `${proof.amount} USDT`);
      if (proof.timestamp) row('Timestamp', proof.timestamp);
      console.log();
    }

    console.log(`  ${c.dim}Total: ${proofs.length} proof(s)${c.reset}\n`);
  } catch (err) {
    handleError('Failed to fetch proofs', err);
  }
}

// ── 5. yield show ───────────────────────────────────────────────────

interface LendingPosition {
  protocol?: string;
  asset?: string;
  supplied?: number;
  apy?: number;
  earned?: number;
  chain?: string;
}

interface LendingResponse {
  positions?: LendingPosition[];
}

async function cmdYieldShow(): Promise<void> {
  heading('Current Yield Positions');

  try {
    const data = await apiGet<LendingResponse>('/api/lending/positions');
    const positions = data.positions ?? [];

    if (positions.length === 0) {
      console.log(`  ${c.dim}No active lending positions.${c.reset}`);
      console.log(`  ${c.dim}Use ${c.cyan}aerofyta lend supply <amount>${c.reset}${c.dim} to get started.${c.reset}\n`);
      return;
    }

    for (const pos of positions) {
      console.log(`  ${c.bold}${pos.protocol ?? 'Aave V3'}${c.reset} ${c.dim}on${c.reset} ${pos.chain ?? 'Sepolia'}`);
      row('Asset', pos.asset ?? 'USDT');
      row('Supplied', `${(pos.supplied ?? 0).toFixed(4)}`);
      row('APY', colorApy(pos.apy ?? 0));
      row('Earned', `${c.green}+${(pos.earned ?? 0).toFixed(6)}${c.reset}`);
      console.log();
    }
  } catch (err) {
    handleError('Failed to fetch positions', err);
  }
}

// ── 6. yield project ────────────────────────────────────────────────

interface YieldProjection {
  amount?: number;
  apy?: number;
  projections?: {
    '7d'?: number;
    '30d'?: number;
    '90d'?: number;
    '365d'?: number;
  };
}

async function cmdYieldProject(amount: string | undefined): Promise<void> {
  heading('Projected Yield');

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    console.log(`  ${fail} Usage: ${c.cyan}aerofyta yield project <amount>${c.reset}`);
    console.log(`  ${c.dim}Example: aerofyta yield project 100${c.reset}\n`);
    return;
  }

  try {
    const data = await apiGet<YieldProjection>(`/api/lending/projected-yield?amount=${encodeURIComponent(amount)}`);
    const proj = data.projections ?? {};

    console.log(`  ${c.bold}Supply Amount:${c.reset} ${amount} USDT`);
    if (data.apy !== undefined) console.log(`  ${c.bold}Current APY:${c.reset}   ${colorApy(data.apy)}\n`);

    console.log(`  ${c.bold}Projected Earnings:${c.reset}`);
    row('7 days', `${c.green}+${(proj['7d'] ?? 0).toFixed(6)} USDT${c.reset}`);
    row('30 days', `${c.green}+${(proj['30d'] ?? 0).toFixed(6)} USDT${c.reset}`);
    row('90 days', `${c.green}+${(proj['90d'] ?? 0).toFixed(6)} USDT${c.reset}`);
    row('365 days', `${c.green}+${(proj['365d'] ?? 0).toFixed(6)} USDT${c.reset}`);
    console.log();
  } catch (err) {
    handleError('Failed to fetch yield projections', err);
  }
}

// ── 7. swap quote ───────────────────────────────────────────────────

interface SwapQuote {
  quoteId?: string;
  from?: string;
  to?: string;
  amountIn?: string;
  amountOut?: string;
  rate?: number;
  fee?: string;
  expiresAt?: string;
  route?: string;
}

async function cmdSwapQuote(from: string | undefined, to: string | undefined, amount: string | undefined): Promise<void> {
  heading('Swap Quote');

  if (!from || !to || !amount) {
    console.log(`  ${fail} Usage: ${c.cyan}aerofyta swap quote <from> <to> <amount>${c.reset}`);
    console.log(`  ${c.dim}Example: aerofyta swap quote USDT ETH 10${c.reset}\n`);
    return;
  }

  try {
    const data = await apiGet<SwapQuote>(`/api/swap/quote?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`);

    console.log(`  ${ok} Quote received\n`);
    if (data.quoteId) row('Quote ID', `${c.bold}${data.quoteId}${c.reset}`);
    row('From', `${data.amountIn ?? amount} ${data.from ?? from}`);
    row('To', `${c.green}${data.amountOut ?? '???'}${c.reset} ${data.to ?? to}`);
    if (data.rate !== undefined) row('Rate', `1 ${from} = ${data.rate} ${to}`);
    if (data.fee) row('Fee', data.fee);
    if (data.route) row('Route', data.route);
    if (data.expiresAt) row('Expires', data.expiresAt);

    if (data.quoteId) {
      console.log(`\n  ${c.dim}Execute with:${c.reset} ${c.cyan}aerofyta swap execute ${data.quoteId}${c.reset}\n`);
    }
  } catch (err) {
    handleError('Failed to get swap quote', err);
  }
}

// ── 8. swap execute ─────────────────────────────────────────────────

interface SwapResult {
  txHash?: string;
  status?: string;
  amountOut?: string;
  token?: string;
}

async function cmdSwapExecute(quoteId: string | undefined): Promise<void> {
  heading('Execute Swap');

  if (!quoteId) {
    console.log(`  ${fail} Usage: ${c.cyan}aerofyta swap execute <quoteId>${c.reset}`);
    console.log(`  ${c.dim}Get a quoteId first: aerofyta swap quote USDT ETH 10${c.reset}\n`);
    return;
  }

  console.log(`  ${c.dim}Executing swap for quote ${c.cyan}${quoteId}${c.reset}${c.dim}...${c.reset}\n`);

  try {
    const data = await apiPost<SwapResult>('/api/swap/execute', { quoteId });

    console.log(`  ${ok} Swap ${c.green}${c.bold}executed${c.reset}`);
    if (data.txHash) {
      row('TX Hash', etherscanLink(data.txHash));
    }
    if (data.amountOut) row('Received', `${c.green}${data.amountOut}${c.reset} ${data.token ?? ''}`);
    if (data.status) row('Status', data.status);
    console.log();
  } catch (err) {
    handleError('Swap execution failed', err);
  }
}

// ── 9. bridge quote ─────────────────────────────────────────────────

interface BridgeQuote {
  quoteId?: string;
  from?: string;
  to?: string;
  amount?: string;
  fee?: string;
  estimatedTime?: string;
  route?: string;
}

async function cmdBridgeQuote(from: string | undefined, to: string | undefined, amount: string | undefined): Promise<void> {
  heading('Bridge Quote');

  if (!from || !to || !amount) {
    console.log(`  ${fail} Usage: ${c.cyan}aerofyta bridge quote <fromChain> <toChain> <amount>${c.reset}`);
    console.log(`  ${c.dim}Example: aerofyta bridge quote ethereum-sepolia ton-testnet 5${c.reset}\n`);
    return;
  }

  try {
    const data = await apiGet<BridgeQuote>(`/api/bridge/quote?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`);

    console.log(`  ${ok} Bridge quote received\n`);
    row('From Chain', data.from ?? from);
    row('To Chain', data.to ?? to);
    row('Amount', `${data.amount ?? amount} USDT`);
    if (data.fee) row('Bridge Fee', data.fee);
    if (data.estimatedTime) row('Est. Time', data.estimatedTime);
    if (data.route) row('Route', data.route);
    console.log();
  } catch (err) {
    handleError('Failed to get bridge quote', err);
  }
}

// ── 10. bridge status ───────────────────────────────────────────────

interface BridgeStatus {
  pending?: Array<{
    id?: string;
    from?: string;
    to?: string;
    amount?: string;
    status?: string;
    txHash?: string;
  }>;
  routes?: Array<{ from: string; to: string; available: boolean }>;
  isAvailable?: boolean;
}

async function cmdBridgeStatus(): Promise<void> {
  heading('Bridge Status');

  try {
    const data = await apiGet<BridgeStatus>('/api/bridge/status');

    row('Available', data.isAvailable ? `${c.green}Yes${c.reset}` : `${c.red}No${c.reset}`);

    if (data.routes && data.routes.length > 0) {
      console.log(`\n  ${c.bold}Routes:${c.reset}`);
      for (const route of data.routes) {
        const icon = route.available ? `${c.green}\u25CF${c.reset}` : `${c.red}\u25CB${c.reset}`;
        console.log(`    ${icon} ${route.from} \u2192 ${route.to}`);
      }
    }

    const pending = data.pending ?? [];
    if (pending.length > 0) {
      console.log(`\n  ${c.bold}Pending Transfers:${c.reset}`);
      for (const tx of pending) {
        console.log(`    ${c.yellow}\u25CF${c.reset} ${tx.from ?? '?'} \u2192 ${tx.to ?? '?'}: ${tx.amount ?? '?'} USDT (${tx.status ?? 'pending'})`);
        if (tx.txHash) console.log(`      ${etherscanLink(tx.txHash)}`);
      }
    } else {
      console.log(`\n  ${c.dim}No pending bridge transfers.${c.reset}`);
    }
    console.log();
  } catch (err) {
    handleError('Failed to fetch bridge status', err);
  }
}

// ── 11. lend supply ─────────────────────────────────────────────────

interface LendResult {
  txHash?: string;
  amount?: string;
  status?: string;
  protocol?: string;
}

async function cmdLendSupply(amount: string | undefined): Promise<void> {
  heading('Supply to Lending Protocol');

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    console.log(`  ${fail} Usage: ${c.cyan}aerofyta lend supply <amount>${c.reset}`);
    console.log(`  ${c.dim}Example: aerofyta lend supply 10${c.reset}\n`);
    return;
  }

  console.log(`  ${c.dim}Supplying ${amount} USDT to Aave V3...${c.reset}\n`);

  try {
    const data = await apiPost<LendResult>('/api/lending/supply', { amount: parseFloat(amount) });

    console.log(`  ${ok} ${c.green}${c.bold}Supplied${c.reset} ${amount} USDT`);
    if (data.protocol) row('Protocol', data.protocol);
    if (data.txHash) row('TX Hash', etherscanLink(data.txHash));
    if (data.status) row('Status', data.status);
    console.log();
  } catch (err) {
    handleError('Supply failed', err);
  }
}

// ── 12. lend withdraw ───────────────────────────────────────────────

async function cmdLendWithdraw(amount: string | undefined): Promise<void> {
  heading('Withdraw from Lending Protocol');

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    console.log(`  ${fail} Usage: ${c.cyan}aerofyta lend withdraw <amount>${c.reset}`);
    console.log(`  ${c.dim}Example: aerofyta lend withdraw 5${c.reset}\n`);
    return;
  }

  console.log(`  ${c.dim}Withdrawing ${amount} USDT from Aave V3...${c.reset}\n`);

  try {
    const data = await apiPost<LendResult>('/api/lending/withdraw', { amount: parseFloat(amount) });

    console.log(`  ${ok} ${c.green}${c.bold}Withdrawn${c.reset} ${amount} USDT`);
    if (data.protocol) row('Protocol', data.protocol);
    if (data.txHash) row('TX Hash', etherscanLink(data.txHash));
    if (data.status) row('Status', data.status);
    console.log();
  } catch (err) {
    handleError('Withdrawal failed', err);
  }
}

// ── 13. lend positions ──────────────────────────────────────────────

async function cmdLendPositions(): Promise<void> {
  heading('Lending Positions');

  try {
    const data = await apiGet<LendingResponse>('/api/lending/positions');
    const positions = data.positions ?? [];

    if (positions.length === 0) {
      console.log(`  ${c.dim}No active lending positions.${c.reset}`);
      console.log(`  ${c.dim}Use ${c.cyan}aerofyta lend supply <amount>${c.reset}${c.dim} to start earning yield.${c.reset}\n`);
      return;
    }

    for (const pos of positions) {
      const protocol = pos.protocol ?? 'Aave V3';
      const chain = pos.chain ?? 'Sepolia';
      console.log(`  ${c.bold}${protocol}${c.reset} ${c.dim}on${c.reset} ${chain}`);
      row('Asset', pos.asset ?? 'USDT');
      row('Supplied', `${(pos.supplied ?? 0).toFixed(4)}`);
      row('APY', colorApy(pos.apy ?? 0));
      row('Earned', `${c.green}+${(pos.earned ?? 0).toFixed(6)}${c.reset}`);
      console.log();
    }
  } catch (err) {
    handleError('Failed to fetch lending positions', err);
  }
}

// ── Error helper ────────────────────────────────────────────────────

function handleError(context: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
    console.log(`  ${fail} Agent is ${c.red}not running${c.reset}. Start with: ${c.cyan}cd agent && npm run dev${c.reset}`);
  } else {
    console.log(`  ${fail} ${context}: ${c.red}${msg}${c.reset}`);
  }
  console.log();
}

// ── Exported handler ────────────────────────────────────────────────

export async function handleDefiCommand(
  command: string,
  subcommand: string | undefined,
  args: string[],
): Promise<void> {
  switch (command) {
    case 'deploy':
      if (subcommand === 'status') {
        await cmdDeployStatus();
      } else {
        await cmdDeploy();
      }
      break;

    case 'proof':
      if (subcommand === 'generate') {
        await cmdProofGenerate();
      } else if (subcommand === 'show') {
        await cmdProofShow();
      } else {
        console.log(`  ${fail} Usage: ${c.cyan}aerofyta proof <generate|show>${c.reset}\n`);
      }
      break;

    case 'yield':
      if (subcommand === 'project') {
        await cmdYieldProject(args[0]);
      } else if (subcommand === 'show' || !subcommand) {
        await cmdYieldShow();
      } else {
        console.log(`  ${fail} Usage: ${c.cyan}aerofyta yield <show|project <amount>>${c.reset}\n`);
      }
      break;

    case 'swap':
      if (subcommand === 'quote') {
        await cmdSwapQuote(args[0], args[1], args[2]);
      } else if (subcommand === 'execute') {
        await cmdSwapExecute(args[0]);
      } else {
        console.log(`  ${fail} Usage: ${c.cyan}aerofyta swap <quote <from> <to> <amount>|execute <quoteId>>${c.reset}\n`);
      }
      break;

    case 'bridge':
      if (subcommand === 'quote') {
        await cmdBridgeQuote(args[0], args[1], args[2]);
      } else if (subcommand === 'status' || !subcommand) {
        await cmdBridgeStatus();
      } else {
        console.log(`  ${fail} Usage: ${c.cyan}aerofyta bridge <quote <from> <to> <amount>|status>${c.reset}\n`);
      }
      break;

    case 'lend':
      if (subcommand === 'supply') {
        await cmdLendSupply(args[0]);
      } else if (subcommand === 'withdraw') {
        await cmdLendWithdraw(args[0]);
      } else if (subcommand === 'positions' || !subcommand) {
        await cmdLendPositions();
      } else {
        console.log(`  ${fail} Usage: ${c.cyan}aerofyta lend <supply <amount>|withdraw <amount>|positions>${c.reset}\n`);
      }
      break;

    default:
      console.log(`  ${fail} Unknown DeFi command: ${c.red}${command}${c.reset}\n`);
      break;
  }
}

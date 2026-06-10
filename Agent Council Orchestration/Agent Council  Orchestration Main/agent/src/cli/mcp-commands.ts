// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta CLI — MCP, SDK, and Plugin introspection commands.

import { PRESETS, listPresets } from '../sdk/presets.js';
import type { HookEvent } from '../sdk/hooks.js';
import { UniversalAdapter } from '../sdk/adapters/index.js';

// WDK type imports for MCP toolkit introspection via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type { WdkMcpServer } from '@tetherto/wdk-mcp-toolkit';
// MCP commands list WDK built-in tools (WALLET_TOOLS, PRICING_TOOLS, etc.)
export type _WdkRefs = WDK | WdkMcpServer; // eslint-disable-line @typescript-eslint/no-unused-vars

// ── ANSI helpers (shared with CLI) ────────────────────────────────
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

function tableRow(cols: string[], widths: number[]): void {
  const formatted = cols.map((col, i) => col.padEnd(widths[i] ?? 20)).join(' ');
  console.log(`  ${formatted}`);
}

// ── API base URL ─────────────────────────────────────────────────
const PORT = process.env['PORT'] || '3001';
const API_BASE = `http://localhost:${PORT}/api`;

// ── MCP Tool Categories (from mcp-server.ts) ─────────────────────
// This mirrors the tool definitions registered in src/mcp-server.ts.

interface ToolEntry {
  name: string;
  description: string;
}

interface ToolCategory {
  name: string;
  source: 'wdk-builtin' | 'aerofyta-custom';
  tools: ToolEntry[];
}

const MCP_TOOL_CATEGORIES: ToolCategory[] = [
  {
    name: 'Wallet (WDK Built-in)',
    source: 'wdk-builtin',
    tools: [
      { name: 'get_balance', description: 'Get wallet balance for a chain' },
      { name: 'get_address', description: 'Get wallet address for a chain' },
      { name: 'send_transaction', description: 'Send a transaction on-chain' },
      { name: 'sign_message', description: 'Sign a message with wallet key' },
      { name: 'get_transaction', description: 'Get transaction details by hash' },
      { name: 'list_accounts', description: 'List all WDK accounts' },
      { name: 'create_account', description: 'Create a new WDK account' },
      { name: 'get_nonce', description: 'Get current nonce for account' },
      { name: 'estimate_gas', description: 'Estimate gas for a transaction' },
      { name: 'get_chain_info', description: 'Get chain configuration info' },
      { name: 'transfer_token', description: 'Transfer ERC-20/TRC-20 tokens' },
      { name: 'get_token_balance', description: 'Get token balance for address' },
      { name: 'approve_token', description: 'Approve token spending allowance' },
      { name: 'get_allowance', description: 'Get token allowance for spender' },
      { name: 'batch_transfer', description: 'Batch multiple transfers' },
    ],
  },
  {
    name: 'Pricing (WDK Built-in)',
    source: 'wdk-builtin',
    tools: [
      { name: 'get_price', description: 'Get current token price' },
      { name: 'get_price_history', description: 'Get historical price data' },
      { name: 'get_price_change', description: 'Get price change percentage' },
      { name: 'convert_amount', description: 'Convert between currencies' },
      { name: 'list_supported_tokens', description: 'List all priced tokens' },
    ],
  },
  {
    name: 'Indexer (WDK Built-in)',
    source: 'wdk-builtin',
    tools: [
      { name: 'get_indexed_balance', description: 'Get indexed balance from API' },
      { name: 'get_transfers', description: 'Get transfer history' },
      { name: 'get_token_transfers', description: 'Get ERC-20 transfer history' },
      { name: 'search_transactions', description: 'Search indexed transactions' },
      { name: 'get_block_info', description: 'Get block information' },
    ],
  },
  {
    name: 'Bridge (WDK Built-in)',
    source: 'wdk-builtin',
    tools: [
      { name: 'bridge_quote', description: 'Get cross-chain bridge quote' },
      { name: 'bridge_execute', description: 'Execute cross-chain bridge transfer' },
    ],
  },
  {
    name: 'Swap (WDK Built-in)',
    source: 'wdk-builtin',
    tools: [
      { name: 'swap_quote', description: 'Get DEX swap quote' },
      { name: 'swap_execute', description: 'Execute DEX swap' },
    ],
  },
  {
    name: 'Lending (WDK Built-in)',
    source: 'wdk-builtin',
    tools: [
      { name: 'lending_supply', description: 'Supply assets to lending pool' },
      { name: 'lending_withdraw', description: 'Withdraw from lending pool' },
      { name: 'lending_borrow', description: 'Borrow from lending pool' },
      { name: 'lending_repay', description: 'Repay lending pool debt' },
      { name: 'lending_rates', description: 'Get current lending rates' },
      { name: 'lending_positions', description: 'Get current lending positions' },
    ],
  },
  {
    name: 'Safety',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_check_policies', description: 'Get current safety policies and limits' },
      { name: 'aerofyta_kill_switch', description: 'Toggle emergency kill switch' },
      { name: 'aerofyta_get_security_report', description: 'Get full security audit report' },
      { name: 'aerofyta_get_risk_assessment', description: 'Assess risk for a transaction' },
      { name: 'aerofyta_get_anomaly_stats', description: 'Get anomaly detection statistics' },
      { name: 'aerofyta_get_safety_status', description: 'Get overall safety system status' },
    ],
  },
  {
    name: 'Economics',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_creator_score', description: 'Get creator engagement score' },
      { name: 'aerofyta_pool_status', description: 'Community tipping pool status' },
      { name: 'aerofyta_split_config', description: 'Get/set tip split configuration' },
      { name: 'aerofyta_bonus_check', description: 'Check milestone bonus eligibility' },
    ],
  },
  {
    name: 'Autonomous Loop',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_loop_status', description: 'Get autonomous loop state' },
      { name: 'aerofyta_loop_control', description: 'Start/stop/pause autonomous loop' },
    ],
  },
  {
    name: 'Wallet Ops',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_routing_analysis', description: 'Analyze optimal chain routing' },
      { name: 'aerofyta_preflight', description: 'Preflight transaction validation' },
      { name: 'aerofyta_fee_estimate', description: 'Estimate transaction fees' },
      { name: 'aerofyta_paymaster_status', description: 'Get gasless paymaster status' },
    ],
  },
  {
    name: 'Bridge',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_bridge_routes', description: 'List available bridge routes' },
      { name: 'aerofyta_bridge_transfer', description: 'Execute bridge transfer' },
    ],
  },
  {
    name: 'x402',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_x402_status', description: 'Get x402 payment protocol status' },
      { name: 'aerofyta_services', description: 'List registered x402 services' },
      { name: 'aerofyta_skills', description: 'List available x402 skills' },
      { name: 'aerofyta_accounts', description: 'Get x402 accounts' },
      { name: 'aerofyta_verify_tx', description: 'Verify x402 transaction' },
    ],
  },
  {
    name: 'Wallet (Per-Chain)',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_get_balance', description: 'Get balance for specific chain' },
      { name: 'aerofyta_get_address', description: 'Get address for specific chain' },
      { name: 'aerofyta_send_transaction', description: 'Send transaction on specific chain' },
      { name: 'aerofyta_get_history', description: 'Get transaction history' },
      { name: 'aerofyta_estimate_fee_detailed', description: 'Detailed fee estimation' },
    ],
  },
  {
    name: 'DeFi',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_aave_supply', description: 'Supply assets to Aave V3' },
      { name: 'aerofyta_aave_withdraw', description: 'Withdraw from Aave V3' },
      { name: 'aerofyta_get_yield_rates', description: 'Get current yield rates' },
      { name: 'aerofyta_swap_quote', description: 'Get swap quote via Velora' },
      { name: 'aerofyta_bridge_quote', description: 'Get USDT0 bridge quote' },
    ],
  },
  {
    name: 'Agent',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_agent_status', description: 'Get full agent status' },
      { name: 'aerofyta_financial_pulse', description: 'Get wallet financial pulse' },
      { name: 'aerofyta_mood_modifiers', description: 'Get mood-based behavior modifiers' },
      { name: 'aerofyta_reputation_score', description: 'Get address reputation score' },
    ],
  },
  {
    name: 'Payment',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_create_escrow', description: 'Create HTLC escrow' },
      { name: 'aerofyta_claim_escrow', description: 'Claim escrowed funds' },
      { name: 'aerofyta_start_dca', description: 'Start dollar-cost averaging plan' },
      { name: 'aerofyta_create_subscription', description: 'Create recurring subscription' },
      { name: 'aerofyta_record_engagement', description: 'Record content engagement' },
    ],
  },
  {
    name: 'Data',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_search_youtube', description: 'Search YouTube/Rumble creators' },
      { name: 'aerofyta_creator_stats', description: 'Get creator statistics' },
      { name: 'aerofyta_rss_feeds', description: 'Get RSS feed data' },
      { name: 'aerofyta_webhook_events', description: 'List webhook events' },
    ],
  },
  {
    name: 'x402 Micropayments',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_x402_paywalls', description: 'List active paywalls' },
      { name: 'aerofyta_x402_create_paywall', description: 'Create x402 paywall' },
    ],
  },
  {
    name: 'Analytics',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_get_creator_analytics', description: 'Get creator analytics dashboard' },
      { name: 'aerofyta_get_top_creators', description: 'Get top-ranked creators' },
      { name: 'aerofyta_get_tip_history', description: 'Get tip history with filters' },
      { name: 'aerofyta_get_decision_log', description: 'Get autonomous decision log' },
    ],
  },
  {
    name: 'Treasury',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_get_treasury_status', description: 'Get treasury allocation status' },
      { name: 'aerofyta_get_yield_opportunities', description: 'Get yield farming opportunities' },
      { name: 'aerofyta_rebalance_portfolio', description: 'Rebalance treasury portfolio' },
    ],
  },
  {
    name: 'Governance',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_create_proposal', description: 'Create governance proposal' },
      { name: 'aerofyta_vote_on_proposal', description: 'Vote on governance proposal' },
      { name: 'aerofyta_get_proposals', description: 'List governance proposals' },
    ],
  },
  {
    name: 'Automation',
    source: 'aerofyta-custom',
    tools: [
      { name: 'aerofyta_create_dca_plan', description: 'Create DCA tipping plan' },
      { name: 'aerofyta_pause_dca', description: 'Pause/resume DCA plan' },
      { name: 'aerofyta_list_subscriptions', description: 'List active subscriptions' },
      { name: 'aerofyta_process_conditional_payment', description: 'Process conditional payment' },
    ],
  },
];

// ── Hook Event Descriptions ──────────────────────────────────────

const HOOK_EVENTS: Array<{ event: HookEvent; description: string; phase: string }> = [
  { event: 'beforeTip', description: 'Fires before a tip is sent on-chain', phase: 'Tipping' },
  { event: 'afterTip', description: 'Fires after a tip is confirmed', phase: 'Tipping' },
  { event: 'tipBlocked', description: 'Fires when a tip is blocked by safety', phase: 'Tipping' },
  { event: 'beforeEscrow', description: 'Fires before an escrow is created', phase: 'Escrow' },
  { event: 'afterEscrow', description: 'Fires after an escrow is locked', phase: 'Escrow' },
  { event: 'escrowClaimed', description: 'Fires when escrow funds are claimed', phase: 'Escrow' },
  { event: 'escrowRefunded', description: 'Fires when escrow is refunded/expired', phase: 'Escrow' },
  { event: 'moodChanged', description: 'Fires when agent mood changes state', phase: 'Intelligence' },
  { event: 'pulseUpdated', description: 'Fires when financial pulse recalculates', phase: 'Intelligence' },
  { event: 'anomalyDetected', description: 'Fires when anomaly detection triggers', phase: 'Safety' },
  { event: 'policyViolation', description: 'Fires on policy rule violation', phase: 'Safety' },
  { event: 'learningUpdate', description: 'Fires when agent learns new pattern', phase: 'Learning' },
  { event: 'reputationChanged', description: 'Fires when address reputation updates', phase: 'Learning' },
  { event: 'cycleStart', description: 'Fires at start of autonomous cycle', phase: 'Autonomous' },
  { event: 'cycleEnd', description: 'Fires at end of autonomous cycle', phase: 'Autonomous' },
  { event: 'agentStarted', description: 'Fires when agent initializes', phase: 'Lifecycle' },
  { event: 'agentStopped', description: 'Fires when agent shuts down', phase: 'Lifecycle' },
  // Note: 17 unique events, convenience methods group some
];

// ── Adapter Descriptions ─────────────────────────────────────────

interface AdapterInfo {
  name: string;
  className: string;
  defaultChain: string;
  methods: string[];
}

const ADAPTER_INFO: AdapterInfo[] = [
  {
    name: 'EVM (Ethereum, Polygon, Arbitrum)',
    className: 'EVMAdapter',
    defaultChain: 'ethereum-sepolia',
    methods: ['getAddress', 'getBalance', 'sendTransaction', 'transfer'],
  },
  {
    name: 'TON',
    className: 'TONAdapter',
    defaultChain: 'ton-testnet',
    methods: ['getAddress', 'getBalance', 'sendTransaction', 'transfer'],
  },
  {
    name: 'Tron',
    className: 'TronAdapter',
    defaultChain: 'tron-nile',
    methods: ['getAddress', 'getBalance', 'sendTransaction', 'transfer'],
  },
  {
    name: 'Bitcoin',
    className: 'BitcoinAdapter',
    defaultChain: 'bitcoin-testnet',
    methods: ['getAddress', 'getBalance', 'sendTransaction', 'transfer'],
  },
  {
    name: 'Solana',
    className: 'SolanaAdapter',
    defaultChain: 'solana-devnet',
    methods: ['getAddress', 'getBalance', 'sendTransaction', 'transfer'],
  },
];

// ── Command Handlers ─────────────────────────────────────────────

async function mcpTools(): Promise<void> {
  heading('MCP Tools (All Categories)');

  let totalTools = 0;

  // Try fetching live data from server first
  let liveData: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${API_BASE}/mcp/tools`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      liveData = await res.json() as Record<string, unknown>;
    }
  } catch {
    // Server not reachable — fall back to static catalog
  }

  if (liveData && Array.isArray(liveData['tools'])) {
    const tools = liveData['tools'] as Array<{ name: string; description?: string; category?: string }>;
    console.log(`  ${ok} Live data from agent server (port ${PORT})\n`);
    const grouped = new Map<string, typeof tools>();
    for (const tool of tools) {
      const cat = tool.category || 'uncategorized';
      const list = grouped.get(cat) || [];
      list.push(tool);
      grouped.set(cat, list);
    }
    for (const [cat, catTools] of grouped) {
      console.log(`  ${c.bold}${c.cyan}${cat}${c.reset} ${c.dim}(${catTools.length} tools)${c.reset}`);
      for (const t of catTools) {
        console.log(`    ${c.dim}\u251C${c.reset} ${c.white}${t.name.padEnd(40)}${c.reset} ${c.dim}${t.description || ''}${c.reset}`);
      }
      totalTools += catTools.length;
      console.log();
    }
  } else {
    console.log(`  ${c.yellow}\u26A0${c.reset}  Using static catalog ${c.dim}(server not reachable on port ${PORT})${c.reset}\n`);

    for (const category of MCP_TOOL_CATEGORIES) {
      const sourceTag = category.source === 'wdk-builtin'
        ? `${c.blue}WDK${c.reset}`
        : `${c.magenta}AeroFyta${c.reset}`;
      console.log(`  ${c.bold}${c.cyan}${category.name}${c.reset} ${sourceTag} ${c.dim}(${category.tools.length} tools)${c.reset}`);
      for (const tool of category.tools) {
        console.log(`    ${c.dim}\u251C${c.reset} ${c.white}${tool.name.padEnd(40)}${c.reset} ${c.dim}${tool.description}${c.reset}`);
      }
      totalTools += category.tools.length;
      console.log();
    }
  }

  const builtinCount = MCP_TOOL_CATEGORIES.filter(c => c.source === 'wdk-builtin').reduce((s, c) => s + c.tools.length, 0);
  const customCount = MCP_TOOL_CATEGORIES.filter(c => c.source === 'aerofyta-custom').reduce((s, c) => s + c.tools.length, 0);

  heading('Summary');
  row('WDK Built-in Tools', `${builtinCount}`);
  row('AeroFyta Custom Tools', `${customCount}`);
  row('Total MCP Tools', `${c.bold}${c.green}${totalTools}${c.reset}`);
  row('Categories', `${MCP_TOOL_CATEGORIES.length}`);
  console.log();
}

async function mcpStatus(): Promise<void> {
  heading('MCP Server Status');

  // Check if MCP server config exists
  row('MCP Transport', 'stdio (for IDE/agent integration)');
  row('Config Location', 'src/mcp-server.ts');

  // Check agent API reachability (MCP tools proxy through this)
  try {
    const res = await fetch(`${API_BASE}/agent/status`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      console.log(`\n  ${ok} Agent API is ${c.green}${c.bold}reachable${c.reset} on port ${PORT}`);
      row('MCP Tool Backend', `${c.green}available${c.reset}`);
    } else {
      console.log(`\n  ${fail} Agent API responded with HTTP ${res.status}`);
    }
  } catch {
    console.log(`\n  ${c.yellow}\u26A0${c.reset}  Agent API is ${c.red}not reachable${c.reset} on port ${PORT}`);
    console.log(`  ${c.dim}MCP tools that proxy to the agent will not work until the server is running.${c.reset}`);
    console.log(`  ${c.dim}Start with:${c.reset} ${c.cyan}cd agent && npm run dev${c.reset}`);
  }

  const builtinCount = MCP_TOOL_CATEGORIES.filter(c => c.source === 'wdk-builtin').reduce((s, c) => s + c.tools.length, 0);
  const customCount = MCP_TOOL_CATEGORIES.filter(c => c.source === 'aerofyta-custom').reduce((s, c) => s + c.tools.length, 0);

  heading('Tool Inventory');
  row('WDK Built-in', `~${builtinCount} tools (WALLET + PRICING + INDEXER + BRIDGE + SWAP + LENDING)`);
  row('AeroFyta Custom', `${customCount} tools`);
  row('Total', `${c.bold}${builtinCount + customCount}+ tools${c.reset}`);
  row('Categories', `${MCP_TOOL_CATEGORIES.length}`);

  heading('WDK Protocols Registered');
  row('Bridge', 'USDT0 (Ethereum EVM)');
  row('Swap', 'Velora DEX (EVM)');
  row('Lending', 'Aave V3 (EVM)');
  console.log();
}

function sdkPresets(): void {
  heading('SDK Presets');

  const presets = listPresets();
  console.log(`  ${c.dim}Ready-made agent configurations for common use cases.${c.reset}\n`);

  for (const preset of presets) {
    const presetDef = PRESETS[preset.id as keyof typeof PRESETS];
    console.log(`  ${c.bold}${c.cyan}${preset.id}${c.reset} ${c.dim}\u2014${c.reset} ${preset.name}`);
    console.log(`  ${c.dim}${preset.description}${c.reset}`);
    console.log(`  ${c.dim}Features:${c.reset} ${preset.features.map(f => `${c.green}${f}${c.reset}`).join(', ')}`);

    const cfg = presetDef.config;
    const limitsStr = cfg.safetyLimits
      ? `max_single=${cfg.safetyLimits.maxSingleTip}, max_daily=${cfg.safetyLimits.maxDailySpend}, confirm_above=${cfg.safetyLimits.requireConfirmationAbove}`
      : 'default';
    const exploreRate = 'explorationRate' in cfg ? (cfg as Record<string, unknown>).explorationRate : 'default';
    console.log(`  ${c.dim}Config:${c.reset} llm=${c.yellow}${cfg.llmProvider}${c.reset}, loop=${cfg.autonomousLoop ? `${c.green}on${c.reset}` : `${c.red}off${c.reset}`}, explore=${exploreRate}`);
    console.log(`  ${c.dim}Limits:${c.reset} ${limitsStr}`);
    console.log();
  }

  heading('Usage');
  console.log(`  ${c.dim}import { createFromPreset } from 'aerofyta-agent';${c.reset}`);
  console.log(`  ${c.dim}const agent = await createFromPreset('tipBot', { seed: '...' });${c.reset}\n`);
}

function sdkHooksList(): void {
  heading('SDK Hook Event Types');

  console.log(`  ${c.dim}Subscribe to agent lifecycle events for external integrations.${c.reset}\n`);

  // Group by phase
  const phases = new Map<string, typeof HOOK_EVENTS>();
  for (const hook of HOOK_EVENTS) {
    const list = phases.get(hook.phase) || [];
    list.push(hook);
    phases.set(hook.phase, list);
  }

  const widths = [22, 44];
  tableRow(
    [`${c.bold}Event${c.reset}`, `${c.bold}Description${c.reset}`],
    widths,
  );
  tableRow(['\u2500'.repeat(22), '\u2500'.repeat(44)], widths);

  for (const [phase, hooks] of phases) {
    console.log(`\n  ${c.bold}${c.magenta}${phase}${c.reset}`);
    for (const hook of hooks) {
      tableRow(
        [`${c.cyan}${hook.event}${c.reset}`, `${c.dim}${hook.description}${c.reset}`],
        widths,
      );
    }
  }

  heading('Summary');
  row('Total Events', `${HOOK_EVENTS.length}`);
  row('Phases', `${phases.size} (${[...phases.keys()].join(', ')})`);

  heading('Usage');
  console.log(`  ${c.dim}import { HookRegistry } from 'aerofyta-agent';${c.reset}`);
  console.log(`  ${c.dim}const hooks = new HookRegistry();${c.reset}`);
  console.log(`  ${c.dim}hooks.on('afterTip', (event, data) => { ... });${c.reset}\n`);
}

function sdkAdapters(): void {
  heading('SDK Chain Adapters');

  console.log(`  ${c.dim}Normalize any WDK wallet into a uniform ChainWallet interface.${c.reset}\n`);

  const supportedChains = UniversalAdapter.getSupportedChains();

  for (const adapter of ADAPTER_INFO) {
    console.log(`  ${c.bold}${c.cyan}${adapter.className}${c.reset} ${c.dim}\u2014${c.reset} ${adapter.name}`);
    console.log(`    ${c.dim}Default chain:${c.reset} ${c.yellow}${adapter.defaultChain}${c.reset}`);
    console.log(`    ${c.dim}Methods:${c.reset}       ${adapter.methods.map(m => `${c.green}${m}()${c.reset}`).join(', ')}`);
    console.log();
  }

  console.log(`  ${c.bold}${c.cyan}UniversalAdapter${c.reset} ${c.dim}\u2014 Auto-detects chain type from chainId${c.reset}`);
  console.log();

  heading('Supported Chains');
  for (const chain of supportedChains) {
    const family = chain.includes('ethereum') || chain.includes('polygon') || chain.includes('arbitrum')
      ? 'EVM'
      : chain.includes('ton') ? 'TON'
      : chain.includes('tron') ? 'Tron'
      : chain.includes('bitcoin') ? 'Bitcoin'
      : chain.includes('solana') ? 'Solana'
      : 'Unknown';
    console.log(`    ${c.dim}\u251C${c.reset} ${chain.padEnd(24)} ${c.dim}(${family})${c.reset}`);
  }

  heading('Summary');
  row('Adapters', `${ADAPTER_INFO.length} + UniversalAdapter`);
  row('Supported Chains', `${supportedChains.length}`);

  heading('Usage');
  console.log(`  ${c.dim}import { UniversalAdapter } from 'aerofyta-agent';${c.reset}`);
  console.log(`  ${c.dim}const wallet = UniversalAdapter.fromWDKAccount(account, 'ethereum-sepolia');${c.reset}`);
  console.log(`  ${c.dim}const balance = await wallet.getBalance();${c.reset}\n`);
}

async function pluginStatus(): Promise<void> {
  heading('Plugin / Module Status');

  // Try fetching from server
  let data: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${API_BASE}/architecture`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      data = await res.json() as Record<string, unknown>;
    }
  } catch {
    // Try health endpoint
  }

  if (!data) {
    try {
      const res = await fetch(`${API_BASE}/health/modules`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        data = await res.json() as Record<string, unknown>;
      }
    } catch {
      // Server not reachable
    }
  }

  if (!data) {
    try {
      const res = await fetch(`${API_BASE}/agent/status`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        data = await res.json() as Record<string, unknown>;
      }
    } catch {
      // Still not reachable
    }
  }

  if (data) {
    console.log(`  ${ok} Agent is ${c.green}${c.bold}running${c.reset} on port ${PORT}\n`);

    // Display whatever the server returned
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        console.log(`  ${c.bold}${c.cyan}${key}${c.reset}`);
        for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
          row(`  ${subKey}`, String(subVal));
        }
        console.log();
      } else {
        row(key, String(value));
      }
    }
  } else {
    console.log(`  ${fail} Agent is ${c.red}not running${c.reset} on port ${PORT}\n`);
    console.log(`  ${c.dim}Cannot query module status without a running server.${c.reset}`);
    console.log(`  ${c.dim}Start with:${c.reset} ${c.cyan}cd agent && npm run dev${c.reset}\n`);

    // Show static list of known service modules
    heading('Registered Service Modules (Static)');
    const modules = [
      { name: 'WalletService', group: 'Core', status: 'registered' },
      { name: 'AIService', group: 'Core', status: 'registered' },
      { name: 'AutonomousLoopService', group: 'Core', status: 'registered' },
      { name: 'OrchestratorService', group: 'Core', status: 'registered' },
      { name: 'SafetyService', group: 'Safety', status: 'registered' },
      { name: 'RiskEngineService', group: 'Safety', status: 'registered' },
      { name: 'PolicyEnforcementService', group: 'Safety', status: 'registered' },
      { name: 'AnomalyDetectionService', group: 'Safety', status: 'registered' },
      { name: 'RpcFailoverService', group: 'Safety', status: 'registered' },
      { name: 'EscrowService', group: 'Payments', status: 'registered' },
      { name: 'DcaService', group: 'Payments', status: 'registered' },
      { name: 'StreamingService', group: 'Payments', status: 'registered' },
      { name: 'AutoPaymentsService', group: 'Payments', status: 'registered' },
      { name: 'TipSplitterService', group: 'Payments', status: 'registered' },
      { name: 'AtomicSwapService', group: 'Payments', status: 'registered' },
      { name: 'SmartEscrowService', group: 'Payments', status: 'registered' },
      { name: 'WalletOpsService', group: 'Wallet', status: 'registered' },
      { name: 'SwapService', group: 'DeFi', status: 'registered' },
      { name: 'BridgeService', group: 'DeFi', status: 'registered' },
      { name: 'LendingService', group: 'DeFi', status: 'registered' },
      { name: 'FeeArbitrageService', group: 'DeFi', status: 'registered' },
      { name: 'EconomicsService', group: 'Economics', status: 'registered' },
      { name: 'TreasuryService', group: 'Economics', status: 'registered' },
      { name: 'RevenueSmoothingService', group: 'Economics', status: 'registered' },
      { name: 'SelfSustainingService', group: 'Economics', status: 'registered' },
      { name: 'MemoryService', group: 'Data', status: 'registered' },
      { name: 'ReputationService', group: 'Data', status: 'registered' },
      { name: 'CreatorAnalyticsService', group: 'Data', status: 'registered' },
      { name: 'CreatorDiscoveryService', group: 'Data', status: 'registered' },
      { name: 'DecisionLogService', group: 'Data', status: 'registered' },
      { name: 'TaxReportingService', group: 'Data', status: 'registered' },
      { name: 'PersonalityService', group: 'Platform', status: 'registered' },
      { name: 'PlatformAdapterService', group: 'Platform', status: 'registered' },
      { name: 'AgentIdentityService', group: 'Platform', status: 'registered' },
      { name: 'RumbleService', group: 'Platform', status: 'registered' },
      { name: 'ProofOfEngagementService', group: 'Platform', status: 'registered' },
      { name: 'GovernanceService', group: 'Advanced', status: 'registered' },
      { name: 'MultiStrategyService', group: 'Advanced', status: 'registered' },
      { name: 'TradingSwarmService', group: 'Advanced', status: 'registered' },
      { name: 'ZKPrivacyService', group: 'Advanced', status: 'registered' },
      { name: 'DeFiStrategyService', group: 'Advanced', status: 'registered' },
    ];

    // Group by group
    const grouped = new Map<string, typeof modules>();
    for (const mod of modules) {
      const list = grouped.get(mod.group) || [];
      list.push(mod);
      grouped.set(mod.group, list);
    }

    for (const [group, mods] of grouped) {
      console.log(`  ${c.bold}${c.magenta}${group}${c.reset} ${c.dim}(${mods.length} modules)${c.reset}`);
      for (const mod of mods) {
        console.log(`    ${c.dim}\u251C${c.reset} ${c.white}${mod.name.padEnd(30)}${c.reset} ${c.green}${mod.status}${c.reset}`);
      }
      console.log();
    }

    row('Total Modules', `${modules.length}`);
    row('Groups', `${grouped.size}`);
    console.log();
  }
}

// ── Public Handler ───────────────────────────────────────────────

export async function handleMcpCommand(
  command: string,
  subcommand: string | undefined,
  _args: string[],
): Promise<void> {
  const key = subcommand ? `${command} ${subcommand}` : command;

  switch (key) {
    case 'mcp tools':
      await mcpTools();
      break;
    case 'mcp status':
      await mcpStatus();
      break;
    case 'sdk presets':
      sdkPresets();
      break;
    case 'sdk hooks':
      // Default to 'list' if no further subcommand
      sdkHooksList();
      break;
    case 'sdk hooks list':
      sdkHooksList();
      break;
    case 'sdk adapters':
      sdkAdapters();
      break;
    case 'plugin status':
      await pluginStatus();
      break;
    default:
      heading('MCP / SDK / Plugin Commands');
      console.log(`  ${c.bold}Usage:${c.reset}\n`);
      const cmds = [
        ['mcp tools', 'List all 97+ MCP tools in categorized table'],
        ['mcp status', 'Check MCP server reachability and tool count'],
        ['sdk presets', 'Show all 5 SDK presets with configs'],
        ['sdk hooks list', 'Show all 18 hook event types'],
        ['sdk adapters', 'Show all 5 chain adapters with methods'],
        ['plugin status', 'Show all registered service modules'],
      ];
      for (const [cmd, desc] of cmds) {
        console.log(`    ${c.cyan}aerofyta ${(cmd ?? '').padEnd(20)}${c.reset}${desc}`);
      }
      console.log();
      break;
  }
}

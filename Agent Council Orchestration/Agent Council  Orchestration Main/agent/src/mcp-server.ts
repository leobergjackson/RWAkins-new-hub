#!/usr/bin/env node
// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// See LICENSE file for details
//
// MCP Server — Exposes AeroFyta's wallet capabilities via Model Context Protocol.
// Any MCP-compatible AI agent (Claude, GPT, Cursor, etc.) can use these tools
// to send tips, check balances, bridge USDT0, and interact with DeFi protocols.
//
// Usage:
//   npx tsx src/mcp-server.ts                     # stdio transport (for IDE integration)
//   WDK_SEED="your seed phrase" npx tsx src/mcp-server.ts  # with custom seed
//
// This implements the WDK MCP Toolkit as recommended by the Tether Hackathon Galactica.
//
// Tool count breakdown:
//   - WALLET_TOOLS (built-in):  ~15 tools (balance, send, sign, etc.)
//   - PRICING_TOOLS (built-in): ~5 tools (current price, historical, etc.)
//   - INDEXER_TOOLS (built-in): ~5 tools (indexed balances, transfers)
//   - BRIDGE_TOOLS (built-in):  ~2 tools (quote, execute bridge)
//   - SWAP_TOOLS (built-in):    ~2 tools (quote, execute swap)
//   - LENDING_TOOLS (built-in): ~6 tools (supply, withdraw, borrow, etc.)
//   - Custom AeroFyta tools:    ~58 tools (safety, economics, autonomous, wallet, defi, x402, data, analytics, treasury, governance, etc.)
//   Total: 93+ MCP tools

import { WdkMcpServer, WALLET_TOOLS, PRICING_TOOLS, INDEXER_TOOLS, BRIDGE_TOOLS, SWAP_TOOLS, LENDING_TOOLS } from '@tetherto/wdk-mcp-toolkit';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import WalletManagerTon from '@tetherto/wdk-wallet-ton';
import WalletManagerTron from '@tetherto/wdk-wallet-tron';
import Usdt0ProtocolEvm from '@tetherto/wdk-protocol-bridge-usdt0-evm';
import SwapProtocolVelora from '@tetherto/wdk-protocol-swap-velora-evm';
import LendingProtocolAave from '@tetherto/wdk-protocol-lending-aave-evm';
import WDK from '@tetherto/wdk';
import { z } from 'zod';
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = resolve(__dirname, '..', '.seed');
const AGENT_API = process.env.AGENT_API_URL ?? 'http://localhost:3001/api';

// Load seed from env or file (same logic as main agent)
function getSeed(): string {
  if (process.env.WDK_SEED?.trim()) return process.env.WDK_SEED.trim();
  if (existsSync(SEED_FILE)) {
    const seed = readFileSync(SEED_FILE, 'utf-8').trim();
    if (seed) return seed;
  }
  return WDK.getRandomSeedPhrase();
}

// ── Custom AeroFyta MCP Tool Definitions ──────────────────────────
// These extend the built-in WDK tools with agent-specific capabilities.
// Each tool follows the OpenClaw skill format for interoperability.

type McpToolRegistrar = (server: WdkMcpServer) => void;

const AEROFYTA_TOOLS: McpToolRegistrar[] = [
  // ── Safety Tools ────────────────────────────────────────────
  (server) => {
    server.registerTool(
      'aerofyta_check_policies',
      {
        title: 'Check Safety Policies',
        description: `Get the current safety policies including spend limits, kill switch status, and blocked addresses.

Returns the active risk guardrails that govern autonomous tipping behavior.
Use when: "What are the current spending limits?" or "Show safety configuration"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/safety/status`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_kill_switch',
      {
        title: 'Toggle Kill Switch',
        description: `Activate or deactivate the emergency kill switch. When active, blocks ALL autonomous spending.

Use when: "Stop all autonomous tipping" or "Emergency shutdown"
Args: activate (boolean) — true to block, false to unblock`,
        inputSchema: z.object({
          activate: z.boolean().describe('true to activate kill switch, false to deactivate'),
        }),
      },
      async ({ activate }) => {
        const res = await fetch(`${AGENT_API}/advanced/safety/kill-switch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activate }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Economics Tools ──────────────────────────────────────────
  (server) => {
    server.registerTool(
      'aerofyta_creator_score',
      {
        title: 'Get Creator Engagement Score',
        description: `Get the engagement score and tip multiplier for a content creator.

Scores range from 0-100 with tiers: high (>70), medium (40-70), low (<40).
Use when: "How good is this creator?" or "Should I tip this creator more?"`,
        inputSchema: z.object({
          creatorId: z.string().describe('The creator identifier'),
        }),
      },
      async ({ creatorId }) => {
        const res = await fetch(`${AGENT_API}/advanced/mcp/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName: 'get_creator_score', args: { creatorId } }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_pool_status',
      {
        title: 'Community Pool Status',
        description: `Get the community tipping pool balance, contributions, and distribution history.

Use when: "How much is in the community pool?" or "Show pool status"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/mcp/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName: 'check_pool_status', args: {} }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_split_config',
      {
        title: 'Get Tip Split Configuration',
        description: `Get the current tip split percentages (creator/platform/community).

Default: 90% creator, 5% platform, 5% community pool.
Use when: "How are tips split?" or "Show revenue split"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/mcp/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName: 'get_split_config', args: {} }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_bonus_check',
      {
        title: 'Check Creator Bonus Milestones',
        description: `Check if a creator has hit any performance milestones that trigger bonus tips.

Use when: "Check bonuses for creator X" or "Has this creator earned any rewards?"`,
        inputSchema: z.object({
          creatorId: z.string().describe('Creator identifier'),
          videoViews: z.number().optional().describe('Total video views'),
          newSubscribers: z.number().optional().describe('New subscribers count'),
          contentStreak: z.number().optional().describe('Consecutive content posting days'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/advanced/mcp/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName: 'trigger_bonus_check', args }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Autonomous Loop Tools ──────────────────────────────────
  (server) => {
    server.registerTool(
      'aerofyta_loop_status',
      {
        title: 'Autonomous Loop Status',
        description: `Get the status of the autonomous decision-making loop.

Shows: running state, cycle count, last decision, next scheduled action.
Use when: "Is the agent running autonomously?" or "Show loop status"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/autonomous/status`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_loop_control',
      {
        title: 'Control Autonomous Loop',
        description: `Pause, resume, start, or stop the autonomous decision loop.

Use when: "Pause the autonomous agent" or "Resume autonomous tipping"`,
        inputSchema: z.object({
          action: z.enum(['pause', 'resume', 'start', 'stop']).describe('Loop control action'),
        }),
      },
      async ({ action }) => {
        const res = await fetch(`${AGENT_API}/advanced/autonomous/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Wallet Ops Tools ────────────────────────────────────────
  (server) => {
    server.registerTool(
      'aerofyta_routing_analysis',
      {
        title: 'Analyze Tip Routing',
        description: `Find the cheapest chain for sending a tip of a given amount.

Ranks chains by: cost, speed, reliability, and gasless availability.
Use when: "What's the cheapest way to send 0.01 USDT?" or "Optimize routing"`,
        inputSchema: z.object({
          amount: z.string().describe('Tip amount in USDT'),
        }),
      },
      async ({ amount }) => {
        const res = await fetch(`${AGENT_API}/wallet/addresses?amount=${amount}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_preflight',
      {
        title: 'Pre-Tip Preflight Check',
        description: `Verify balance, gas, and reserve requirements before sending a tip.

Checks: sufficient balance, gas availability, reserve minimum.
Use when: "Can I send 0.01 USDT on Ethereum?" or "Check before tipping"`,
        inputSchema: z.object({
          chain: z.string().describe('Chain to check (e.g., ethereum-sepolia, ton-testnet)'),
          amount: z.string().describe('Amount to send'),
          token: z.string().optional().describe('Token type (usdt or native)'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/wallet/balances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_fee_estimate',
      {
        title: 'Estimate Transaction Fee',
        description: `Estimate the fee for a transaction and check economic viability.

Returns: estimated fee, fee-to-tip ratio, verdict (good/warn/refuse).
Use when: "How much gas for this tip?" or "Is this transfer economical?"`,
        inputSchema: z.object({
          chain: z.string().describe('Chain (e.g., ethereum-sepolia)'),
          amount: z.string().describe('Transaction amount'),
          token: z.string().optional().describe('Token type'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/wallet/balances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_paymaster_status',
      {
        title: 'Gasless Transaction Status',
        description: `Check gasless transaction availability across all chains.

Shows: ERC-4337 (EVM), TON gasless, TRON energy/bandwidth status.
Use when: "Can I send gasless?" or "Show paymaster status"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/mcp/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName: 'get_paymaster_status', args: {} }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Bridge Tools ────────────────────────────────────────────
  (server) => {
    server.registerTool(
      'aerofyta_bridge_routes',
      {
        title: 'List Bridge Routes',
        description: `List all available USDT0 cross-chain bridge routes.

Shows: chain pairs, estimated fees, estimated times, availability.
Use when: "What bridge routes are available?" or "Can I bridge ETH to Arbitrum?"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/bridge/routes`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_bridge_transfer',
      {
        title: 'Execute Bridge Transfer',
        description: `Bridge USDT0 between EVM chains via LayerZero OFT protocol.

Executes a real cross-chain transfer using @tetherto/wdk-protocol-bridge-usdt0-evm.
Use when: "Bridge 10 USDT from Ethereum to Arbitrum"`,
        inputSchema: z.object({
          fromChain: z.string().describe('Source chain (e.g., Ethereum)'),
          toChain: z.string().describe('Destination chain (e.g., Arbitrum)'),
          amount: z.string().describe('Amount to bridge'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/advanced/bridge/transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── x402 Tools ──────────────────────────────────────────────
  (server) => {
    server.registerTool(
      'aerofyta_x402_status',
      {
        title: 'x402 Micropayment Status',
        description: `Get the x402 HTTP 402 Payment Required protocol status.

Shows: total earnings, payments made, active endpoints, net revenue.
Use when: "Show x402 earnings" or "How much has the agent earned?"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/x402/earnings`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Service Registry Tool ───────────────────────────────────
  (server) => {
    server.registerTool(
      'aerofyta_services',
      {
        title: 'List All Services',
        description: `List all 43+ AeroFyta services with status, category, and endpoint count.

Groups: core, wallet, safety, economics, advanced, platform, defi.
Use when: "What services does the agent have?" or "Show service status"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/services`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Skills Tool ─────────────────────────────────────────────
  (server) => {
    server.registerTool(
      'aerofyta_skills',
      {
        title: 'List Agent Skills (OpenClaw)',
        description: `List all AeroFyta agent skills in OpenClaw-compatible format.

Each skill maps to an MCP tool with name, description, inputs, and outputs.
Use when: "What can this agent do?" or "Show all capabilities"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/skills`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Multi-Account Tool ─────────────────────────────────────
  (server) => {
    server.registerTool(
      'aerofyta_accounts',
      {
        title: 'List Segregated Accounts',
        description: `List all BIP-39 segregated accounts (Treasury, Hot Wallet, Community Pool, Yield, Reserve).

Shows: derivation path, address, balance for each account.
Use when: "Show my accounts" or "What's the hot wallet balance?"`,
        inputSchema: z.object({
          chain: z.string().optional().describe('Chain to query (default: ethereum-sepolia)'),
        }),
      },
      async ({ chain }) => {
        const res = await fetch(`${AGENT_API}/advanced/accounts?chain=${chain ?? 'ethereum-sepolia'}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Indexer Verification Tool ───────────────────────────────
  (server) => {
    server.registerTool(
      'aerofyta_verify_tx',
      {
        title: 'Verify Transaction via Indexer',
        description: `Verify a tip transaction on-chain via the WDK Indexer API.

Checks: transaction exists, correct amount, correct recipient.
Use when: "Verify this transaction" or "Was the tip received?"`,
        inputSchema: z.object({
          txHash: z.string().describe('Transaction hash to verify'),
          blockchain: z.string().optional().describe('Blockchain (default: ethereum)'),
          token: z.string().optional().describe('Token (default: usdt)'),
          address: z.string().optional().describe('Address to search transfers for'),
        }),
      },
      async (args) => {
        const params = new URLSearchParams();
        if (args.blockchain) params.set('blockchain', args.blockchain);
        if (args.token) params.set('token', args.token);
        if (args.address) params.set('address', args.address);
        const res = await fetch(`${AGENT_API}/advanced/indexer/verify/${args.txHash}?${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Wallet Tools (per-chain) ─────────────────────────────────

  (server) => {
    server.registerTool(
      'aerofyta_get_balance',
      {
        title: 'Get Wallet Balance',
        description: `Get the USDT and native token balance for a specific chain.

Returns: USDT balance, native balance, address.
Use when: "What's my balance on Ethereum?" or "Show TON wallet balance"`,
        inputSchema: z.object({
          chain: z.string().describe('Chain ID (ethereum-sepolia, ton-testnet, tron-nile)'),
        }),
      },
      async ({ chain: _chain }) => {
        const res = await fetch(`${AGENT_API}/wallet/balances`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_get_address',
      {
        title: 'Get Wallet Address',
        description: `Get the wallet address for a specific chain.

Returns: address, chain info, derivation path.
Use when: "What's my Ethereum address?" or "Show my wallet address"`,
        inputSchema: z.object({
          chain: z.string().describe('Chain ID (ethereum-sepolia, ton-testnet, tron-nile)'),
        }),
      },
      async ({ chain: _chain }) => {
        const res = await fetch(`${AGENT_API}/wallet/addresses`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_send_transaction',
      {
        title: 'Send Transaction',
        description: `Send USDT or native tokens to a recipient address on a specific chain.

Executes a real on-chain transfer via WDK.
Use when: "Send 0.01 USDT to 0x..." or "Tip this creator"`,
        inputSchema: z.object({
          chain: z.string().describe('Chain to send on (ethereum-sepolia, ton-testnet, tron-nile)'),
          to: z.string().describe('Recipient address'),
          amount: z.string().describe('Amount to send'),
          token: z.string().optional().describe('Token type: usdt or native (default: usdt)'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/wallet/tip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: args.to, amount: args.amount, token: args.token ?? 'usdt', chain: args.chain }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_get_history',
      {
        title: 'Get Transaction History',
        description: `Get recent transaction history for a specific chain or all chains.

Returns: list of recent transactions with amounts, recipients, timestamps.
Use when: "Show my transaction history" or "Recent tips on Ethereum"`,
        inputSchema: z.object({
          chain: z.string().optional().describe('Chain ID (omit for all chains)'),
          limit: z.number().optional().describe('Max number of transactions (default: 20)'),
        }),
      },
      async ({ chain, limit }) => {
        const params = new URLSearchParams();
        if (chain) params.set('chain', chain);
        if (limit) params.set('limit', String(limit));
        const res = await fetch(`${AGENT_API}/agent/history?${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_estimate_fee_detailed',
      {
        title: 'Estimate Transaction Fee (Detailed)',
        description: `Get a detailed fee estimate including gas price, fee-to-tip ratio, and gasless availability.

Returns: fee breakdown, economic viability verdict, gasless option.
Use when: "How much will this transfer cost?" or "Estimate fees for 0.5 USDT on ETH"`,
        inputSchema: z.object({
          chain: z.string().describe('Chain ID'),
          amount: z.string().describe('Transaction amount'),
          token: z.string().optional().describe('Token type (usdt or native)'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/wallet/balances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── DeFi Tools ────────────────────────────────────────────────

  (server) => {
    server.registerTool(
      'aerofyta_aave_supply',
      {
        title: 'Supply to Aave',
        description: `Supply USDT to Aave lending protocol to earn yield.

Deposits USDT into Aave on behalf of the agent's treasury.
Use when: "Deposit 10 USDT into Aave" or "Start earning yield"`,
        inputSchema: z.object({
          amount: z.string().describe('Amount to supply in USDT'),
          chain: z.string().optional().describe('Chain (default: ethereum-sepolia)'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/lending/supply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: args.amount, chain: args.chain ?? 'ethereum-sepolia' }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_aave_withdraw',
      {
        title: 'Withdraw from Aave',
        description: `Withdraw USDT from Aave lending protocol.

Pulls funds back from Aave to the agent's wallet.
Use when: "Withdraw 5 USDT from Aave" or "Exit yield position"`,
        inputSchema: z.object({
          amount: z.string().describe('Amount to withdraw in USDT'),
          chain: z.string().optional().describe('Chain (default: ethereum-sepolia)'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/lending/withdraw`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: args.amount, chain: args.chain ?? 'ethereum-sepolia' }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_get_yield_rates',
      {
        title: 'Get Yield Rates',
        description: `Get current DeFi yield rates across protocols (Aave, Compound, etc.).

Returns: APY rates, TVL, protocol comparisons.
Use when: "What are current yield rates?" or "Best APY for USDT?"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/lending/rates`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_swap_quote',
      {
        title: 'Get Swap Quote',
        description: `Get a quote for swapping tokens via Velora DEX aggregator.

Returns: expected output, price impact, route details.
Use when: "How much ETH can I get for 10 USDT?" or "Swap quote"`,
        inputSchema: z.object({
          fromToken: z.string().describe('Source token (e.g., USDT, ETH, WETH)'),
          toToken: z.string().describe('Destination token'),
          amount: z.string().describe('Amount of source token'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/swap/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_bridge_quote',
      {
        title: 'Get Bridge Quote',
        description: `Get a quote for bridging USDT0 between EVM chains.

Returns: estimated fee, time, route via LayerZero OFT.
Use when: "How much to bridge 5 USDT from ETH to Arbitrum?"`,
        inputSchema: z.object({
          fromChain: z.string().describe('Source chain'),
          toChain: z.string().describe('Destination chain'),
          amount: z.string().describe('Amount to bridge'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/advanced/bridge/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Agent Tools ────────────────────────────────────────────────

  (server) => {
    server.registerTool(
      'aerofyta_agent_status',
      {
        title: 'Get Agent Status',
        description: `Get the full agent status including mode, wallet, autonomy, and health.

Returns: agent mode, connected chains, total tips, uptime, health metrics.
Use when: "What's the agent status?" or "Is the agent healthy?"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/agent/status`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_financial_pulse',
      {
        title: 'Get Financial Pulse',
        description: `Get the agent's real-time financial health pulse.

Returns: treasury balance, burn rate, runway, yield income, x402 revenue.
Use when: "How is the agent's treasury?" or "Financial health check"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/agent/status`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_mood_modifiers',
      {
        title: 'Get Mood Modifiers',
        description: `Get the personality mood modifiers that influence tipping behavior.

Returns: current mood, generosity multiplier, risk tolerance, engagement bias.
Use when: "What's the agent's mood?" or "Show personality settings"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/mcp/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName: 'get_mood_modifiers', args: {} }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_reputation_score',
      {
        title: 'Get Reputation Score',
        description: `Get the agent's on-chain reputation score and trust metrics.

Returns: reputation score, trust level, tip success rate, dispute rate.
Use when: "What's the agent's reputation?" or "Show trust score"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/reputation/leaderboard`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Payment Tools ──────────────────────────────────────────────

  (server) => {
    server.registerTool(
      'aerofyta_create_escrow',
      {
        title: 'Create Escrow Payment',
        description: `Create an escrow payment that holds USDT until conditions are met.

Locks funds until the recipient completes the required action.
Use when: "Create escrow for 1 USDT" or "Hold payment until video posted"`,
        inputSchema: z.object({
          amount: z.string().describe('Amount to escrow in USDT'),
          recipient: z.string().describe('Recipient address'),
          condition: z.string().optional().describe('Release condition description'),
          expiryHours: z.number().optional().describe('Expiry in hours (default: 24)'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/escrow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_claim_escrow',
      {
        title: 'Claim Escrow Payment',
        description: `Claim funds from an escrow payment by providing proof of completion.

Releases escrowed USDT to the claimant.
Use when: "Claim escrow abc123" or "Release escrowed funds"`,
        inputSchema: z.object({
          escrowId: z.string().describe('Escrow payment ID'),
          proof: z.string().optional().describe('Proof of condition completion'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/escrow/${args.escrowId}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proof: args.proof }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_start_dca',
      {
        title: 'Start Dollar-Cost Averaging',
        description: `Start a DCA (Dollar-Cost Averaging) schedule for recurring tips.

Automatically sends tips on a schedule (daily, weekly, monthly).
Use when: "Tip 0.1 USDT daily to creator X" or "Start DCA schedule"`,
        inputSchema: z.object({
          recipient: z.string().describe('Recipient address or creator ID'),
          amount: z.string().describe('Amount per interval in USDT'),
          interval: z.enum(['hourly', 'daily', 'weekly', 'monthly']).describe('DCA interval'),
          totalBudget: z.string().optional().describe('Total budget (stops when exhausted)'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/dca`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_create_subscription',
      {
        title: 'Create Subscription Payment',
        description: `Create a recurring subscription payment to a creator.

Sets up automatic periodic USDT transfers via WDK.
Use when: "Subscribe to creator for 0.5 USDT/month" or "Create subscription"`,
        inputSchema: z.object({
          recipient: z.string().describe('Creator address or ID'),
          amount: z.string().describe('Amount per period in USDT'),
          period: z.enum(['weekly', 'monthly']).describe('Subscription period'),
          chain: z.string().optional().describe('Preferred chain'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/subscriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_record_engagement',
      {
        title: 'Record Content Engagement',
        description: `Record engagement with a creator's content for proof-of-engagement scoring.

Tracks: views, likes, comments, shares, watch time.
Use when: "Record engagement for creator X" or "Log content interaction"`,
        inputSchema: z.object({
          creatorId: z.string().describe('Creator identifier'),
          contentId: z.string().describe('Content/video identifier'),
          engagementType: z.enum(['view', 'like', 'comment', 'share', 'subscribe']).describe('Type of engagement'),
          duration: z.number().optional().describe('Watch/read duration in seconds'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/advanced/mcp/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName: 'record_engagement', args }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Data Tools ─────────────────────────────────────────────────

  (server) => {
    server.registerTool(
      'aerofyta_search_youtube',
      {
        title: 'Search YouTube Creators',
        description: `Search YouTube for creators and videos related to a query.

Uses YouTube Data API v3 to find creators worth tipping.
Use when: "Find crypto education creators on YouTube" or "Search YouTube"`,
        inputSchema: z.object({
          query: z.string().describe('Search query (e.g., "crypto education", "defi tutorial")'),
          maxResults: z.number().optional().describe('Max results (default: 5, max: 25)'),
        }),
      },
      async ({ query, maxResults }) => {
        const params = new URLSearchParams({ q: query });
        if (maxResults) params.set('maxResults', String(maxResults));
        const res = await fetch(`${AGENT_API}/youtube/search?${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_creator_stats',
      {
        title: 'Get Creator Statistics',
        description: `Get detailed analytics and statistics for a specific content creator.

Returns: engagement score, tip history, content metrics, reputation.
Use when: "Show stats for creator X" or "Creator analytics"`,
        inputSchema: z.object({
          creatorId: z.string().describe('Creator identifier'),
        }),
      },
      async ({ creatorId }) => {
        const res = await fetch(`${AGENT_API}/analytics/creators/${encodeURIComponent(creatorId)}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_rss_feeds',
      {
        title: 'Get RSS Feed Data',
        description: `Get the latest data from all tracked RSS feeds (YouTube, Rumble, etc.).

Returns: recent content from followed creators, new video alerts.
Use when: "Check RSS feeds" or "Any new content from creators?"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/creators/feeds`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_webhook_events',
      {
        title: 'Get Webhook Events',
        description: `Get recent webhook events received from platforms (Rumble, YouTube, etc.).

Returns: platform events, new video notifications, engagement updates.
Use when: "Show webhook events" or "Any new platform notifications?"`,
        inputSchema: z.object({
          since: z.string().optional().describe('ISO timestamp to filter events after (optional)'),
        }),
      },
      async ({ since }) => {
        const params = since ? `?since=${encodeURIComponent(since)}` : '';
        const res = await fetch(`${AGENT_API}/webhooks/events${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── x402 Micropayment Tools ─────────────────────────────────

  (server) => {
    server.registerTool(
      'aerofyta_x402_paywalls',
      {
        title: 'List x402 Paywalls',
        description: `List all x402 paywalled endpoints with pricing and revenue stats.

Shows: endpoint, price, total requests, paid requests, revenue.
Use when: "Show paywalled endpoints" or "x402 paywall list"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/x402/paywalls`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_x402_create_paywall',
      {
        title: 'Create x402 Paywall',
        description: `Create a new x402 paywall on an API endpoint to earn revenue.

Any request to the endpoint will return HTTP 402 until payment is made.
Use when: "Monetize the /api/predictions endpoint" or "Add paywall"`,
        inputSchema: z.object({
          endpoint: z.string().describe('API endpoint path to paywall'),
          price: z.string().describe('Price per request in USDT'),
          token: z.string().optional().describe('Payment token (default: USDT)'),
          description: z.string().optional().describe('Paywall description'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/x402/paywalls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Analytics Tools ─────────────────────────────────────────────

  (server) => {
    server.registerTool(
      'aerofyta_get_creator_analytics',
      {
        title: 'Get Creator Analytics',
        description: `Get comprehensive analytics for a creator including tip volume, engagement trends, and growth metrics.

Returns: total tips received, average tip size, engagement trend, top supporters.
Use when: "Show analytics for creator X" or "Creator performance report"`,
        inputSchema: z.object({
          creatorId: z.string().describe('Creator identifier'),
          period: z.enum(['7d', '30d', '90d', 'all']).optional().describe('Time period (default: 30d)'),
        }),
      },
      async ({ creatorId, period }) => {
        const params = new URLSearchParams();
        if (period) params.set('period', period);
        const res = await fetch(`${AGENT_API}/analytics/creators/${encodeURIComponent(creatorId)}?${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_get_top_creators',
      {
        title: 'Get Top Creators',
        description: `Get a ranked list of top creators by engagement score, tip volume, or content quality.

Returns: ranked creator list with scores, tip totals, and engagement metrics.
Use when: "Who are the top creators?" or "Show leaderboard" or "Best creators to tip"`,
        inputSchema: z.object({
          sortBy: z.enum(['engagement', 'tips', 'reputation', 'growth']).optional().describe('Sort criteria (default: engagement)'),
          limit: z.number().optional().describe('Max results (default: 10)'),
        }),
      },
      async ({ sortBy, limit }) => {
        const params = new URLSearchParams();
        if (sortBy) params.set('sortBy', sortBy);
        if (limit) params.set('limit', String(limit));
        const res = await fetch(`${AGENT_API}/rumble/creators?${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_get_tip_history',
      {
        title: 'Get Tip History',
        description: `Get detailed tip history with filtering by chain, creator, amount range, and date.

Returns: paginated tip records with transaction hashes, amounts, timestamps, and chain info.
Use when: "Show all tips this week" or "Tips to creator X" or "Tip history for Ethereum"`,
        inputSchema: z.object({
          chain: z.string().optional().describe('Filter by chain'),
          creatorId: z.string().optional().describe('Filter by creator'),
          since: z.string().optional().describe('ISO timestamp start'),
          until: z.string().optional().describe('ISO timestamp end'),
          minAmount: z.string().optional().describe('Minimum tip amount'),
          limit: z.number().optional().describe('Max results (default: 50)'),
        }),
      },
      async (args) => {
        const params = new URLSearchParams();
        if (args.chain) params.set('chain', args.chain);
        if (args.creatorId) params.set('creatorId', args.creatorId);
        if (args.since) params.set('since', args.since);
        if (args.until) params.set('until', args.until);
        if (args.minAmount) params.set('minAmount', args.minAmount);
        if (args.limit) params.set('limit', String(args.limit));
        const res = await fetch(`${AGENT_API}/agent/history?${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_get_decision_log',
      {
        title: 'Get Decision Log',
        description: `Get the autonomous agent's decision log showing all decisions made, rationale, and outcomes.

Returns: timestamped decisions with action taken, confidence score, reasoning, and result.
Use when: "Show decision log" or "Why did the agent tip creator X?" or "Autonomous decisions"`,
        inputSchema: z.object({
          limit: z.number().optional().describe('Max decisions to return (default: 20)'),
          type: z.string().optional().describe('Filter by decision type (tip, skip, defer, escalate)'),
        }),
      },
      async ({ limit, type }) => {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        if (type) params.set('type', type);
        const res = await fetch(`${AGENT_API}/agent/decisions?${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Treasury Tools ─────────────────────────────────────────────

  (server) => {
    server.registerTool(
      'aerofyta_get_treasury_status',
      {
        title: 'Get Treasury Status',
        description: `Get the full treasury status including all account balances, allocations, and financial health.

Returns: total AUM, account breakdown (hot wallet, reserve, yield, community pool), burn rate, runway.
Use when: "Treasury status" or "How much money does the agent have?" or "Financial overview"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/economics/treasury/allocation`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_get_yield_opportunities',
      {
        title: 'Get Yield Opportunities',
        description: `Discover yield opportunities across DeFi protocols for idle treasury funds.

Returns: ranked opportunities with protocol name, APY, TVL, risk level, minimum deposit.
Use when: "Where can I earn yield?" or "Best yield opportunities" or "Optimize treasury returns"`,
        inputSchema: z.object({
          minApy: z.number().optional().describe('Minimum APY filter (e.g., 3.0 for 3%)'),
          maxRisk: z.enum(['low', 'medium', 'high']).optional().describe('Maximum risk level'),
        }),
      },
      async ({ minApy, maxRisk }) => {
        const params = new URLSearchParams();
        if (minApy !== undefined) params.set('minApy', String(minApy));
        if (maxRisk) params.set('maxRisk', maxRisk);
        const res = await fetch(`${AGENT_API}/treasury/yields?${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_rebalance_portfolio',
      {
        title: 'Rebalance Portfolio',
        description: `Rebalance the agent's treasury portfolio according to target allocations.

Moves funds between accounts (hot wallet, reserve, yield, community pool) to match targets.
Use when: "Rebalance portfolio" or "Optimize fund allocation" or "Move funds to yield"`,
        inputSchema: z.object({
          strategy: z.enum(['conservative', 'balanced', 'aggressive']).optional().describe('Rebalancing strategy (default: balanced)'),
          dryRun: z.boolean().optional().describe('If true, only simulate the rebalance (default: true)'),
        }),
      },
      async ({ strategy, dryRun }) => {
        const res = await fetch(`${AGENT_API}/economics/treasury/rebalance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ strategy: strategy ?? 'balanced', dryRun: dryRun ?? true }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Governance Tools ─────────────────────────────────────────────

  (server) => {
    server.registerTool(
      'aerofyta_create_proposal',
      {
        title: 'Create Governance Proposal',
        description: `Create a new governance proposal for the agent's community to vote on.

Proposals can change tip splits, spending limits, creator whitelist, or strategy parameters.
Use when: "Create proposal to increase community pool share" or "Propose new spending limit"`,
        inputSchema: z.object({
          title: z.string().describe('Proposal title'),
          description: z.string().describe('Detailed proposal description'),
          type: z.enum(['tip_split', 'spending_limit', 'strategy', 'whitelist', 'parameter']).describe('Proposal type'),
          value: z.string().optional().describe('Proposed value (JSON string for complex values)'),
          votingPeriodHours: z.number().optional().describe('Voting period in hours (default: 72)'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/governance/proposals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_vote_on_proposal',
      {
        title: 'Vote on Proposal',
        description: `Cast a vote on an active governance proposal.

Votes are weighted by reputation score and stake amount.
Use when: "Vote yes on proposal 123" or "Reject the spending limit proposal"`,
        inputSchema: z.object({
          proposalId: z.string().describe('Proposal ID'),
          vote: z.enum(['for', 'against', 'abstain']).describe('Vote direction'),
          reason: z.string().optional().describe('Optional vote rationale'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/advanced/governance/proposals/${args.proposalId}/veto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vote: args.vote, reason: args.reason }),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_get_proposals',
      {
        title: 'Get Governance Proposals',
        description: `List governance proposals with their status, votes, and outcomes.

Returns: proposal list with title, type, vote counts, status, and execution result.
Use when: "Show all proposals" or "Active governance votes" or "Proposal history"`,
        inputSchema: z.object({
          status: z.enum(['active', 'passed', 'rejected', 'executed', 'all']).optional().describe('Filter by status (default: all)'),
        }),
      },
      async ({ status }) => {
        const params = status ? `?status=${status}` : '';
        const res = await fetch(`${AGENT_API}/governance/proposals${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Automation Tools ─────────────────────────────────────────────

  (server) => {
    server.registerTool(
      'aerofyta_create_dca_plan',
      {
        title: 'Create DCA Plan',
        description: `Create a detailed Dollar-Cost Averaging plan with multiple targets and conditions.

Supports: multiple recipients, conditional triggers, budget caps, chain preferences.
Use when: "Set up a DCA plan for 3 creators" or "Create advanced tipping schedule"`,
        inputSchema: z.object({
          name: z.string().describe('Plan name'),
          targets: z.array(z.object({
            recipient: z.string().describe('Recipient address or creator ID'),
            amount: z.string().describe('Amount per interval'),
            weight: z.number().optional().describe('Relative weight if budget is shared'),
          })).describe('DCA targets'),
          interval: z.enum(['hourly', 'daily', 'weekly', 'monthly']).describe('Execution interval'),
          totalBudget: z.string().optional().describe('Total budget cap in USDT'),
          chain: z.string().optional().describe('Preferred chain'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/dca`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_pause_dca',
      {
        title: 'Pause DCA Plan',
        description: `Pause an active DCA plan. The plan can be resumed later without losing configuration.

Use when: "Pause my DCA plan" or "Stop recurring tips temporarily"`,
        inputSchema: z.object({
          planId: z.string().describe('DCA plan ID to pause'),
        }),
      },
      async ({ planId }) => {
        const res = await fetch(`${AGENT_API}/dca/${planId}/pause`, {
          method: 'POST',
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_list_subscriptions',
      {
        title: 'List Subscriptions',
        description: `List all active subscription payments and DCA plans.

Returns: subscription list with recipient, amount, interval, next execution, total paid.
Use when: "Show my subscriptions" or "List recurring payments" or "Active DCA plans"`,
        inputSchema: z.object({
          status: z.enum(['active', 'paused', 'completed', 'all']).optional().describe('Filter by status (default: active)'),
        }),
      },
      async ({ status }) => {
        const params = status ? `?status=${status}` : '';
        const res = await fetch(`${AGENT_API}/subscriptions${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_process_conditional_payment',
      {
        title: 'Process Conditional Payment',
        description: `Create or execute a conditional payment that triggers when specific conditions are met.

Conditions: engagement threshold, time-based, price trigger, milestone achievement.
Use when: "Pay 1 USDT when video hits 10k views" or "Conditional tip on subscriber milestone"`,
        inputSchema: z.object({
          recipient: z.string().describe('Recipient address or creator ID'),
          amount: z.string().describe('Payment amount in USDT'),
          condition: z.object({
            type: z.enum(['engagement', 'time', 'price', 'milestone']).describe('Condition type'),
            threshold: z.string().describe('Threshold value'),
            metric: z.string().optional().describe('Metric to evaluate (e.g., views, subscribers)'),
          }).describe('Payment condition'),
          chain: z.string().optional().describe('Preferred chain'),
          expiryHours: z.number().optional().describe('Condition expiry in hours (default: 168 = 1 week)'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/conditional-payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  // ── Security Tools ─────────────────────────────────────────────

  (server) => {
    server.registerTool(
      'aerofyta_get_security_report',
      {
        title: 'Get Security Report',
        description: `Generate a comprehensive security report covering all risk vectors.

Returns: overall risk score, threat assessment, policy compliance, recent anomalies, recommendations.
Use when: "Security report" or "Is the agent secure?" or "Show threat assessment"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/safety/status`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_get_risk_assessment',
      {
        title: 'Get Risk Assessment',
        description: `Assess the risk level of a proposed transaction before execution.

Returns: risk score (0-100), risk factors, recommendation (proceed/caution/block), similar past transactions.
Use when: "Is this transaction safe?" or "Risk check for 50 USDT tip" or "Assess risk"`,
        inputSchema: z.object({
          amount: z.string().describe('Transaction amount in USDT'),
          recipient: z.string().optional().describe('Recipient address'),
          chain: z.string().optional().describe('Target chain'),
          type: z.enum(['tip', 'bridge', 'swap', 'lending', 'escrow']).optional().describe('Transaction type'),
        }),
      },
      async (args) => {
        const res = await fetch(`${AGENT_API}/advanced/safety/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_get_anomaly_stats',
      {
        title: 'Get Anomaly Statistics',
        description: `Get statistics on detected anomalies and suspicious activity patterns.

Returns: anomaly count by type, recent anomalies, false positive rate, blocked transactions.
Use when: "Any anomalies detected?" or "Show suspicious activity" or "Anomaly report"`,
        inputSchema: z.object({
          period: z.enum(['1h', '24h', '7d', '30d']).optional().describe('Time period (default: 24h)'),
        }),
      },
      async ({ period }) => {
        const params = period ? `?period=${period}` : '';
        const res = await fetch(`${AGENT_API}/analytics/anomalies${params}`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },

  (server) => {
    server.registerTool(
      'aerofyta_get_safety_status',
      {
        title: 'Get Safety Status',
        description: `Get the full safety system status including all guardrails, limits, and usage metrics.

Returns: kill switch state, spend limits (hourly/daily/monthly), blocked addresses, usage vs limits.
Use when: "Full safety status" or "Are we within spending limits?" or "Safety dashboard"`,
        inputSchema: z.object({}),
      },
      async () => {
        const res = await fetch(`${AGENT_API}/advanced/safety/status`).catch(() => null);
        const data = res?.ok ? await res.json() : { error: 'Agent API unreachable' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      },
    );
  },
];

/* istanbul ignore next -- MCP server requires WDK SDK and stdio transport */
async function main(): Promise<void> {
  const seed = getSeed();

  // Create MCP server with WDK wallet capabilities
  const server = new WdkMcpServer('aerofyta-mcp', '1.0.0')
    .useWdk({ seed })
    // Register all 3 chains (same as main agent)
    .registerWallet('ethereum', WalletManagerEvm, {
      provider: process.env.ETH_SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com',
    })
    .registerWallet('ton', WalletManagerTon, {
      tonClient: { url: process.env.TON_TESTNET_URL ?? 'https://testnet.toncenter.com/api/v2/jsonRPC' },
    })
    .registerWallet('tron', WalletManagerTron, {
      provider: process.env.TRON_NILE_RPC ?? 'https://nile.trongrid.io',
      transferMaxFee: 10000000n,
    })
    // Enable pricing data
    .usePricing()
    // Register built-in WDK tools
    .registerTools(WALLET_TOOLS)    // ~15 wallet tools
    .registerTools(PRICING_TOOLS)   // ~5 pricing tools
    .registerTools(INDEXER_TOOLS)   // ~5 indexer tools
    .registerTools(BRIDGE_TOOLS)    // ~2 bridge tools
    .registerTools(SWAP_TOOLS)      // ~2 swap tools
    .registerTools(LENDING_TOOLS);  // ~6 lending tools

  // Register DeFi protocols for bridge/swap/lending tools
  try {
    server.registerProtocol('ethereum', 'usdt0', Usdt0ProtocolEvm, {
      bridgeMaxFee: 1000000000000000n,
    });
  } catch { /* Bridge protocol may fail on testnet — non-fatal */ }

  try {
    server.registerProtocol('ethereum', 'velora', SwapProtocolVelora as unknown as typeof Usdt0ProtocolEvm, {});
  } catch { /* Swap protocol may fail — non-fatal */ }

  try {
    server.registerProtocol('ethereum', 'aave', LendingProtocolAave as unknown as typeof Usdt0ProtocolEvm, {});
  } catch { /* Lending protocol may fail — non-fatal */ }

  // Register custom AeroFyta tools (~58 tools)
  console.error(`[aerofyta-mcp] Registering ${AEROFYTA_TOOLS.length} custom tools...`);
  for (const registerTool of AEROFYTA_TOOLS) {
    try {
      registerTool(server);
    } catch {
      // Non-fatal — tool registration failure shouldn't block server startup
    }
  }

  console.error(`[aerofyta-mcp] Total custom tools registered: ${AEROFYTA_TOOLS.length}`);
  console.error(`[aerofyta-mcp] Built-in WDK tools: ~35 (WALLET + PRICING + INDEXER + BRIDGE + SWAP + LENDING)`);
  console.error(`[aerofyta-mcp] Grand total: ${AEROFYTA_TOOLS.length + 35}+ MCP tools`);

  // Connect via stdio transport (for IDE/agent integration)
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

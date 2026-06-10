// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — OpenClaw Built-in Tool Definitions (extracted from openclaw.service.ts)

import { logger } from '../utils/logger.js';
import type { ToolDefinition, ToolResult } from './openclaw.service.js';

/** Minimal interface for the WalletService to avoid circular imports */
interface WalletServiceRef {
  sendTransaction(chainId: string, recipient: string, amount: string): Promise<{ hash: string; fee: string }>;
  sendUsdtTransfer(chainId: string, recipient: string, amount: string): Promise<{ hash: string; fee: string }>;
}

/**
 * Create built-in tool definitions for the OpenClaw agent framework.
 * @param getWalletService - Getter function to lazily retrieve the wallet service
 */
export function createBuiltInTools(
  getWalletService: () => WalletServiceRef | null,
): ToolDefinition[] {
  return [
    // ── Data Tools (agent logic layer — read-only) ──
    {
      name: 'price_check',
      description: 'Fetch real-time token prices from CoinGecko',
      category: 'data',
      parameters: [{ name: 'tokens', type: 'string[]', required: true, description: 'Token IDs (e.g., ["bitcoin", "ethereum", "tether"])' }],
      permissions: ['read'],
      maxConcurrency: 5,
      timeoutMs: 10000,
      executor: async (params: Record<string, unknown>): Promise<ToolResult> => {
        const start = Date.now();
        try {
          const tokens = (params.tokens as string[]).join(',');
          const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${tokens}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`, {
            signal: AbortSignal.timeout(8000),
          });
          const data = await resp.json();
          return { success: true, data, executionTimeMs: Date.now() - start };
        } catch (err) {
          return { success: false, data: null, executionTimeMs: Date.now() - start, error: String(err) };
        }
      },
    },
    {
      name: 'gas_estimate',
      description: 'Estimate gas prices across multiple EVM chains',
      category: 'data',
      parameters: [{ name: 'chains', type: 'string[]', required: false, description: 'Chain names to check' }],
      permissions: ['read'],
      maxConcurrency: 3,
      timeoutMs: 15000,
      executor: async (params: Record<string, unknown>): Promise<ToolResult> => {
        const start = Date.now();
        const chains: Record<string, string> = {
          ethereum: 'https://cloudflare-eth.com',
          polygon: 'https://polygon-rpc.com',
          arbitrum: 'https://arb1.arbitrum.io/rpc',
          optimism: 'https://mainnet.optimism.io',
          base: 'https://mainnet.base.org',
        };
        const selected = (params.chains as string[]) ?? Object.keys(chains);
        const results: Record<string, { gasPrice: string; maxPriorityFee: string }> = {};

        await Promise.allSettled(
          selected.filter(c => chains[c]).map(async (chain) => {
            try {
              const resp = await fetch(chains[chain], {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1 }),
                signal: AbortSignal.timeout(5000),
              });
              const data = await resp.json() as { result: string };
              const gasPrice = parseInt(data.result, 16);
              results[chain] = { gasPrice: `${(gasPrice / 1e9).toFixed(2)} gwei`, maxPriorityFee: '0' };
            } catch { /* skip failed chains */ }
          }),
        );

        return { success: true, data: results, executionTimeMs: Date.now() - start };
      },
    },
    {
      name: 'risk_assess',
      description: 'Assess risk of a transaction or address',
      category: 'safety',
      parameters: [
        { name: 'address', type: 'string', required: true, description: 'Target address to assess' },
        { name: 'amount', type: 'number', required: false, description: 'Transaction amount in USD' },
      ],
      permissions: ['read'],
      maxConcurrency: 3,
      timeoutMs: 10000,
      executor: async (params: Record<string, unknown>): Promise<ToolResult> => {
        const start = Date.now();
        const address = params.address as string;
        try {
          const resp = await fetch('https://cloudflare-eth.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([
              { jsonrpc: '2.0', method: 'eth_getTransactionCount', params: [address, 'latest'], id: 1 },
              { jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 2 },
              { jsonrpc: '2.0', method: 'eth_getCode', params: [address, 'latest'], id: 3 },
            ]),
            signal: AbortSignal.timeout(5000),
          });
          const results = await resp.json() as Array<{ result: string }>;
          const txCount = parseInt(results[0]?.result ?? '0', 16);
          const balance = parseInt(results[1]?.result ?? '0', 16) / 1e18;
          const isContract = (results[2]?.result ?? '0x') !== '0x';

          let riskScore = 50;
          if (txCount > 100) riskScore -= 20;
          else if (txCount === 0) riskScore += 25;
          if (balance > 0.1) riskScore -= 10;
          if (isContract) riskScore += 10;
          if ((params.amount as number) > 100) riskScore += 15;
          riskScore = Math.max(0, Math.min(100, riskScore));

          return {
            success: true,
            data: {
              address, txCount, balanceEth: balance.toFixed(4), isContract, riskScore,
              riskLevel: riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : 'high',
              recommendation: riskScore < 30 ? 'safe to proceed' : riskScore < 60 ? 'proceed with caution' : 'requires manual review',
            },
            executionTimeMs: Date.now() - start,
          };
        } catch (err) {
          return { success: false, data: null, executionTimeMs: Date.now() - start, error: String(err) };
        }
      },
    },
    {
      name: 'market_data',
      description: 'Fetch DeFi market data from DeFi Llama',
      category: 'data',
      parameters: [{ name: 'type', type: 'string', required: true, description: 'Data type: "tvl", "yields", "dexVolume"' }],
      permissions: ['read'],
      maxConcurrency: 2,
      timeoutMs: 15000,
      executor: async (params: Record<string, unknown>): Promise<ToolResult> => {
        const start = Date.now();
        const type = params.type as string;
        try {
          let url: string;
          if (type === 'tvl') url = 'https://api.llama.fi/protocols';
          else if (type === 'yields') url = 'https://yields.llama.fi/pools';
          else if (type === 'dexVolume') url = 'https://api.llama.fi/overview/dexs';
          else return { success: false, data: null, executionTimeMs: Date.now() - start, error: `Unknown type: ${type}` };

          const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
          const data = await resp.json();

          let summary: unknown;
          if (type === 'tvl' && Array.isArray(data)) {
            summary = (data as Array<{ name: string; tvl: number; chain: string }>).slice(0, 20).map((p: { name: string; tvl: number; chain: string }) => ({
              name: p.name, tvl: p.tvl, chain: p.chain,
            }));
          } else if (type === 'yields' && (data as { data: unknown[] }).data) {
            summary = ((data as { data: Array<{ pool: string; apy: number; tvlUsd: number; project: string; chain: string }> }).data)
              .filter((p: { apy: number; tvlUsd: number }) => p.apy > 0 && p.tvlUsd > 100000)
              .slice(0, 20)
              .map((p: { pool: string; apy: number; tvlUsd: number; project: string; chain: string }) => ({
                pool: p.pool, apy: p.apy, tvlUsd: p.tvlUsd, project: p.project, chain: p.chain,
              }));
          } else {
            summary = data;
          }

          return { success: true, data: summary, executionTimeMs: Date.now() - start };
        } catch (err) {
          return { success: false, data: null, executionTimeMs: Date.now() - start, error: String(err) };
        }
      },
    },

    // ── Wallet Tools (WDK execution layer) ──
    {
      name: 'wallet_balance',
      description: 'Check wallet balance on a specific chain (WDK execution layer)',
      category: 'wallet',
      parameters: [
        { name: 'address', type: 'string', required: true, description: 'Wallet address' },
        { name: 'chain', type: 'string', required: true, description: 'Chain name' },
      ],
      permissions: ['read'],
      maxConcurrency: 5,
      timeoutMs: 10000,
      executor: async (params: Record<string, unknown>): Promise<ToolResult> => {
        const start = Date.now();
        const address = params.address as string;
        const chain = params.chain as string;
        const rpcs: Record<string, string> = {
          ethereum: 'https://cloudflare-eth.com',
          polygon: 'https://polygon-rpc.com',
          arbitrum: 'https://arb1.arbitrum.io/rpc',
          bsc: 'https://bsc-dataseed.binance.org',
        };
        const rpc = rpcs[chain];
        if (!rpc) return { success: false, data: null, executionTimeMs: Date.now() - start, error: `Unsupported chain: ${chain}` };

        try {
          const resp = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 1 }),
            signal: AbortSignal.timeout(5000),
          });
          const data = await resp.json() as { result: string };
          const balance = parseInt(data.result, 16) / 1e18;
          return { success: true, data: { address, chain, balance: balance.toFixed(6), balanceWei: data.result }, executionTimeMs: Date.now() - start };
        } catch (err) {
          return { success: false, data: null, executionTimeMs: Date.now() - start, error: String(err) };
        }
      },
    },
    {
      name: 'wallet_send',
      description: 'Send tokens from wallet (WDK execution layer) — REQUIRES wallet_executor role',
      category: 'wallet',
      parameters: [
        { name: 'to', type: 'string', required: true, description: 'Recipient address' },
        { name: 'amount', type: 'number', required: true, description: 'Amount to send' },
        { name: 'token', type: 'string', required: true, description: 'Token symbol (USDT, XAUT, ETH)' },
        { name: 'chain', type: 'string', required: true, description: 'Target chain' },
      ],
      permissions: ['execute'],
      maxConcurrency: 1,
      timeoutMs: 30000,
      executor: async (params: Record<string, unknown>): Promise<ToolResult> => {
        const start = Date.now();
        const to = params.to as string;
        const amount = params.amount as number;
        const token = (params.token as string ?? 'ETH').toUpperCase();
        const chain = params.chain as string ?? 'ethereum-sepolia';
        const walletService = getWalletService();

        if (walletService) {
          try {
            let result: { hash: string; fee: string };
            if (token === 'USDT' || token === 'USAT' || token === 'XAUT') {
              result = await walletService.sendUsdtTransfer(chain, to, amount.toString());
            } else {
              result = await walletService.sendTransaction(chain, to, amount.toString());
            }
            logger.info('Wallet send executed via WDK (OpenClaw)', { to, amount, token, chain, txHash: result.hash });
            return {
              success: true,
              data: { action: 'send', to, amount, token, chain, status: 'executed', txHash: result.hash, fee: result.fee },
              executionTimeMs: Date.now() - start,
              txHash: result.hash,
            };
          } catch (err) {
            logger.warn('WDK wallet send failed in OpenClaw', { to, amount, token, chain, error: String(err) });
            return {
              success: false,
              data: { action: 'send', to, amount, token, chain, status: 'failed', error: String(err) },
              executionTimeMs: Date.now() - start,
              error: `WDK send failed: ${String(err)}`,
            };
          }
        }

        const txPlan = {
          action: 'send', to, amount, token, chain,
          status: 'planned',
          note: 'WalletService not connected — transaction planned but not executed',
          timestamp: new Date().toISOString(),
        };
        logger.info('Wallet send planned via OpenClaw (no WalletService)', txPlan);
        return { success: true, data: txPlan, executionTimeMs: Date.now() - start };
      },
    },
  ];
}

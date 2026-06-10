// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Wallet Monitoring Swarm
// REAL blockchain monitoring via free public APIs and RPCs.

import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

// ── Public blockchain API endpoints (free, no keys) ──────────
const CHAIN_RPCS: Record<string, { type: 'evm_rpc' | 'rest' | 'solana_rpc'; url: string; explorer?: string }> = {
  'ethereum-sepolia': {
    type: 'evm_rpc',
    url: 'https://rpc.sepolia.org',
    explorer: 'https://api-sepolia.etherscan.io/api',
  },
  'ethereum': {
    type: 'evm_rpc',
    url: 'https://cloudflare-eth.com',
    explorer: 'https://api.etherscan.io/api',
  },
  'bitcoin': {
    type: 'rest',
    url: 'https://blockstream.info/api',
  },
  'bitcoin-testnet': {
    type: 'rest',
    url: 'https://blockstream.info/testnet/api',
  },
  'tron': {
    type: 'rest',
    url: 'https://api.trongrid.io',
  },
  'tron-nile': {
    type: 'rest',
    url: 'https://nile.trongrid.io',
  },
  'solana': {
    type: 'solana_rpc',
    url: 'https://api.mainnet-beta.solana.com',
  },
  'solana-devnet': {
    type: 'solana_rpc',
    url: 'https://api.devnet.solana.com',
  },
};

// ── Types ──────────────────────────────────────────────────────

export interface SwarmAgent {
  id: string;
  name: string;
  type: 'balance_monitor' | 'tx_watcher' | 'whale_tracker' | 'anomaly_detector' | 'price_sentinel';
  status: 'active' | 'paused' | 'error';
  assignedChains: string[];
  watchedAddresses: string[];
  alertCount: number;
  lastHeartbeat: string;
  metrics: {
    eventsProcessed: number;
    alertsTriggered: number;
    uptimeMs: number;
    startedAt: string;
    lastCheckResult?: string;
    rpcCallCount: number;
    rpcErrorCount: number;
  };
}

export interface SwarmAlert {
  id: string;
  agentId: string;
  agentName: string;
  type: 'large_transfer' | 'low_balance' | 'whale_movement' | 'anomaly' | 'price_change' | 'new_tx' | 'threshold_breach';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  chainId: string;
  address?: string;
  amount?: number;
  token?: string;
  txHash?: string;
  timestamp: string;
  acknowledged: boolean;
  /** Real on-chain data backing this alert */
  onChainData?: Record<string, unknown>;
}

export interface WatchRule {
  id: string;
  agentId: string;
  type: 'balance_below' | 'balance_above' | 'tx_value_above' | 'inactivity' | 'frequency_spike';
  chainId: string;
  address: string;
  threshold: number;
  token: string;
  active: boolean;
  triggeredCount: number;
  lastTriggeredAt?: string;
  /** Last known balance from real RPC check */
  lastKnownBalance?: number;
}

export interface SwarmStats {
  totalAgents: number;
  activeAgents: number;
  totalAlerts: number;
  unacknowledgedAlerts: number;
  criticalAlerts: number;
  totalWatchRules: number;
  activeWatchRules: number;
  chainsMonitored: string[];
  addressesWatched: number;
  eventsProcessedTotal: number;
  dataSource: string;
  rpcCallsTotal: number;
  rpcErrorsTotal: number;
  supportedChains: string[];
}

// ── Real blockchain query functions ─────────────────────────

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/** Get ETH/EVM native balance via JSON-RPC eth_getBalance */
async function getEvmBalance(rpcUrl: string, address: string): Promise<{ balanceWei: string; balanceEth: number }> {
  const res = await fetchWithTimeout(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'],
    }),
  });
  const data = await res.json() as { result?: string; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  const wei = data.result ?? '0x0';
  const balanceEth = parseInt(wei, 16) / 1e18;
  return { balanceWei: wei, balanceEth };
}

/** Get EVM transaction count (nonce) — useful for detecting new transactions */
async function getEvmTxCount(rpcUrl: string, address: string): Promise<number> {
  const res = await fetchWithTimeout(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_getTransactionCount', params: [address, 'latest'],
    }),
  });
  const data = await res.json() as { result?: string };
  return parseInt(data.result ?? '0x0', 16);
}

/** Get latest EVM block number */
async function getEvmBlockNumber(rpcUrl: string): Promise<number> {
  const res = await fetchWithTimeout(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
  });
  const data = await res.json() as { result?: string };
  return parseInt(data.result ?? '0x0', 16);
}

/** Get Bitcoin address info via Blockstream API */
async function getBtcAddressInfo(baseUrl: string, address: string): Promise<{
  funded: number; spent: number; balance: number; txCount: number;
}> {
  const res = await fetchWithTimeout(`${baseUrl}/address/${address}`);
  const data = await res.json() as {
    chain_stats?: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
  };
  const stats = data.chain_stats ?? { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 };
  return {
    funded: stats.funded_txo_sum / 1e8,
    spent: stats.spent_txo_sum / 1e8,
    balance: (stats.funded_txo_sum - stats.spent_txo_sum) / 1e8,
    txCount: stats.tx_count,
  };
}

/** Get Solana balance via JSON-RPC */
async function getSolanaBalance(rpcUrl: string, address: string): Promise<{ lamports: number; sol: number }> {
  const res = await fetchWithTimeout(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address],
    }),
  });
  const data = await res.json() as { result?: { value?: number } };
  const lamports = data.result?.value ?? 0;
  return { lamports, sol: lamports / 1e9 };
}

/** Get TRON account balance via TronGrid API */
async function getTronBalance(baseUrl: string, address: string): Promise<{ balanceSun: number; balanceTrx: number }> {
  const res = await fetchWithTimeout(`${baseUrl}/v1/accounts/${address}`);
  const data = await res.json() as { data?: Array<{ balance?: number }> };
  const balanceSun = data.data?.[0]?.balance ?? 0;
  return { balanceSun, balanceTrx: balanceSun / 1e6 };
}

// ── Service ────────────────────────────────────────────────────

/**
 * WalletSwarmService — Multi-Agent Wallet Monitoring Swarm
 *
 * Deploys a swarm of specialized monitoring agents that perform REAL
 * blockchain queries via free public APIs and RPCs:
 * - EVM chains: eth_getBalance, eth_getTransactionCount via public RPCs
 * - Bitcoin: Blockstream.info REST API
 * - Solana: getBalance via public RPC
 * - TRON: TronGrid REST API
 *
 * No API keys required — uses free public endpoints.
 *
 * Covers hackathon idea: "Wallet monitoring swarm"
 */
export class WalletSwarmService {
  private agents: Map<string, SwarmAgent> = new Map();
  private alerts: SwarmAlert[] = [];
  private rules: Map<string, WatchRule> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private monitorTimer: ReturnType<typeof setInterval> | null = null;
  private rpcCallsTotal = 0;
  private rpcErrorsTotal = 0;

  constructor() {
    this.heartbeatTimer = setInterval(() => this.processHeartbeats(), 30_000);
    // Run real monitoring every 60s (respects rate limits of free APIs)
    this.monitorTimer = setInterval(() => this.runMonitoringCycle().catch(() => {}), 60_000);
    this.initializeDefaultSwarm();
    logger.info('Wallet monitoring swarm initialized — REAL blockchain RPC monitoring');
  }

  private initializeDefaultSwarm(): void {
    const defaultAgents: Array<{ name: string; type: SwarmAgent['type']; chains: string[] }> = [
      { name: 'BalanceGuard-Alpha', type: 'balance_monitor', chains: ['ethereum-sepolia', 'ethereum'] },
      { name: 'TxSentinel-Beta', type: 'tx_watcher', chains: ['ethereum-sepolia', 'tron-nile'] },
      { name: 'WhaleEye-Gamma', type: 'whale_tracker', chains: ['ethereum', 'bitcoin'] },
      { name: 'AnomalyHunter-Delta', type: 'anomaly_detector', chains: ['ethereum', 'solana-devnet'] },
      { name: 'PriceWatch-Epsilon', type: 'price_sentinel', chains: ['ethereum', 'bitcoin', 'solana'] },
    ];

    const now = new Date().toISOString();
    for (const def of defaultAgents) {
      const agent: SwarmAgent = {
        id: `swarm_${randomUUID().slice(0, 6)}`,
        name: def.name,
        type: def.type,
        status: 'active',
        assignedChains: def.chains,
        watchedAddresses: [],
        alertCount: 0,
        lastHeartbeat: now,
        metrics: {
          eventsProcessed: 0,
          alertsTriggered: 0,
          uptimeMs: 0,
          startedAt: now,
          rpcCallCount: 0,
          rpcErrorCount: 0,
        },
      };
      this.agents.set(agent.id, agent);
    }
  }

  // ── Real Blockchain Monitoring ─────────────────────────────

  /**
   * Run one monitoring cycle: check all watched addresses via real RPCs.
   * Called every 60 seconds.
   */
  private async runMonitoringCycle(): Promise<void> {
    const activeRules = [...this.rules.values()].filter(r => r.active);
    if (activeRules.length === 0) return;

    for (const rule of activeRules) {
      const agent = this.agents.get(rule.agentId);
      if (!agent || agent.status !== 'active') continue;

      const chainConfig = CHAIN_RPCS[rule.chainId];
      if (!chainConfig) continue;

      try {
        let currentBalance = 0;

        if (chainConfig.type === 'evm_rpc') {
          const result = await getEvmBalance(chainConfig.url, rule.address);
          currentBalance = result.balanceEth;
          this.rpcCallsTotal++;
          agent.metrics.rpcCallCount++;
        } else if (chainConfig.type === 'solana_rpc') {
          const result = await getSolanaBalance(chainConfig.url, rule.address);
          currentBalance = result.sol;
          this.rpcCallsTotal++;
          agent.metrics.rpcCallCount++;
        } else if (rule.chainId.startsWith('bitcoin')) {
          const result = await getBtcAddressInfo(chainConfig.url, rule.address);
          currentBalance = result.balance;
          this.rpcCallsTotal++;
          agent.metrics.rpcCallCount++;
        } else if (rule.chainId.startsWith('tron')) {
          const result = await getTronBalance(chainConfig.url, rule.address);
          currentBalance = result.balanceTrx;
          this.rpcCallsTotal++;
          agent.metrics.rpcCallCount++;
        }

        agent.metrics.eventsProcessed++;
        agent.metrics.lastCheckResult = `balance=${currentBalance} at ${new Date().toISOString()}`;

        // Check rule thresholds against real balance
        let triggered = false;
        let alertType: SwarmAlert['type'] = 'threshold_breach';
        let severity: SwarmAlert['severity'] = 'info';
        let title = '';
        let message = '';

        switch (rule.type) {
          case 'balance_below':
            if (currentBalance <= rule.threshold) {
              triggered = true;
              alertType = 'low_balance';
              severity = 'warning';
              title = `Low balance: ${currentBalance.toFixed(6)} on ${rule.chainId}`;
              message = `Address ${rule.address} balance (${currentBalance.toFixed(6)}) fell below threshold (${rule.threshold})`;
            }
            break;
          case 'balance_above':
            if (currentBalance >= rule.threshold) {
              triggered = true;
              alertType = 'whale_movement';
              severity = 'info';
              title = `High balance: ${currentBalance.toFixed(6)} on ${rule.chainId}`;
              message = `Address ${rule.address} balance (${currentBalance.toFixed(6)}) exceeded threshold (${rule.threshold})`;
            }
            break;
          case 'tx_value_above':
            // Detect balance change since last check
            if (rule.lastKnownBalance != null) {
              const diff = Math.abs(currentBalance - rule.lastKnownBalance);
              if (diff >= rule.threshold) {
                triggered = true;
                alertType = 'large_transfer';
                severity = diff >= rule.threshold * 10 ? 'critical' : 'warning';
                title = `Large balance change: ${diff.toFixed(6)} on ${rule.chainId}`;
                message = `Address ${rule.address} balance changed by ${diff.toFixed(6)} (prev: ${rule.lastKnownBalance.toFixed(6)}, now: ${currentBalance.toFixed(6)})`;
              }
            }
            break;
        }

        // Update last known balance
        rule.lastKnownBalance = currentBalance;

        if (triggered) {
          rule.triggeredCount++;
          rule.lastTriggeredAt = new Date().toISOString();
          agent.alertCount++;
          agent.metrics.alertsTriggered++;

          const alert: SwarmAlert = {
            id: `alert_${randomUUID().slice(0, 8)}`,
            agentId: agent.id,
            agentName: agent.name,
            type: alertType,
            severity,
            title,
            message,
            chainId: rule.chainId,
            address: rule.address,
            amount: currentBalance,
            token: rule.token,
            timestamp: new Date().toISOString(),
            acknowledged: false,
            onChainData: { balance: currentBalance, threshold: rule.threshold, ruleType: rule.type },
          };

          this.alerts.push(alert);
          if (this.alerts.length > 500) this.alerts.splice(0, 100);

          logger.info(`Swarm alert: ${title} [${severity}] — real on-chain balance check`);
        }
      } catch (err) {
        this.rpcErrorsTotal++;
        agent.metrics.rpcErrorCount++;
        agent.metrics.lastCheckResult = `error: ${err} at ${new Date().toISOString()}`;
        logger.warn(`Swarm RPC error for ${rule.address} on ${rule.chainId}: ${err}`);
      }
    }
  }

  /**
   * Manually check a single address on any supported chain.
   * Returns real on-chain data.
   */
  async checkAddress(chainId: string, address: string): Promise<{
    chainId: string;
    address: string;
    balance: number;
    unit: string;
    raw?: Record<string, unknown>;
    error?: string;
  }> {
    const chainConfig = CHAIN_RPCS[chainId];
    if (!chainConfig) {
      return { chainId, address, balance: 0, unit: 'unknown', error: `Unsupported chain: ${chainId}. Supported: ${Object.keys(CHAIN_RPCS).join(', ')}` };
    }

    try {
      this.rpcCallsTotal++;

      if (chainConfig.type === 'evm_rpc') {
        const result = await getEvmBalance(chainConfig.url, address);
        const txCount = await getEvmTxCount(chainConfig.url, address);
        this.rpcCallsTotal++;
        return {
          chainId, address, balance: result.balanceEth, unit: 'ETH',
          raw: { balanceWei: result.balanceWei, txCount },
        };
      } else if (chainConfig.type === 'solana_rpc') {
        const result = await getSolanaBalance(chainConfig.url, address);
        return {
          chainId, address, balance: result.sol, unit: 'SOL',
          raw: { lamports: result.lamports },
        };
      } else if (chainId.startsWith('bitcoin')) {
        const result = await getBtcAddressInfo(chainConfig.url, address);
        return {
          chainId, address, balance: result.balance, unit: 'BTC',
          raw: { funded: result.funded, spent: result.spent, txCount: result.txCount },
        };
      } else if (chainId.startsWith('tron')) {
        const result = await getTronBalance(chainConfig.url, address);
        return {
          chainId, address, balance: result.balanceTrx, unit: 'TRX',
          raw: { balanceSun: result.balanceSun },
        };
      }

      return { chainId, address, balance: 0, unit: 'unknown', error: 'Chain type not handled' };
    } catch (err) {
      this.rpcErrorsTotal++;
      return { chainId, address, balance: 0, unit: 'unknown', error: String(err) };
    }
  }

  /**
   * Get the latest block number for a supported EVM chain.
   */
  async getBlockNumber(chainId: string): Promise<{ chainId: string; blockNumber: number; error?: string }> {
    const chainConfig = CHAIN_RPCS[chainId];
    if (!chainConfig || chainConfig.type !== 'evm_rpc') {
      return { chainId, blockNumber: 0, error: 'Not an EVM chain or unsupported' };
    }
    try {
      this.rpcCallsTotal++;
      const blockNumber = await getEvmBlockNumber(chainConfig.url);
      return { chainId, blockNumber };
    } catch (err) {
      this.rpcErrorsTotal++;
      return { chainId, blockNumber: 0, error: String(err) };
    }
  }

  // ── Agent Management ─────────────────────────────────────

  deployAgent(params: {
    name: string;
    type: SwarmAgent['type'];
    chains: string[];
    watchAddresses?: string[];
  }): SwarmAgent {
    const now = new Date().toISOString();
    const agent: SwarmAgent = {
      id: `swarm_${randomUUID().slice(0, 6)}`,
      name: params.name,
      type: params.type,
      status: 'active',
      assignedChains: params.chains,
      watchedAddresses: params.watchAddresses ?? [],
      alertCount: 0,
      lastHeartbeat: now,
      metrics: {
        eventsProcessed: 0,
        alertsTriggered: 0,
        uptimeMs: 0,
        startedAt: now,
        rpcCallCount: 0,
        rpcErrorCount: 0,
      },
    };

    this.agents.set(agent.id, agent);
    logger.info(`Swarm agent deployed: ${agent.name} (${agent.type}) on chains: ${params.chains.join(', ')}`);
    return agent;
  }

  pauseAgent(agentId: string): SwarmAgent | { error: string } {
    const agent = this.agents.get(agentId);
    if (!agent) return { error: `Agent ${agentId} not found` };
    agent.status = 'paused';
    return agent;
  }

  resumeAgent(agentId: string): SwarmAgent | { error: string } {
    const agent = this.agents.get(agentId);
    if (!agent) return { error: `Agent ${agentId} not found` };
    agent.status = 'active';
    agent.lastHeartbeat = new Date().toISOString();
    return agent;
  }

  removeAgent(agentId: string): { success: boolean; error?: string } {
    if (!this.agents.has(agentId)) return { success: false, error: 'Agent not found' };
    this.agents.delete(agentId);
    return { success: true };
  }

  getAgent(agentId: string): SwarmAgent | null {
    return this.agents.get(agentId) ?? null;
  }

  listAgents(): SwarmAgent[] {
    return [...this.agents.values()];
  }

  // ── Watch Rules ──────────────────────────────────────────

  addWatchRule(params: {
    agentId: string;
    type: WatchRule['type'];
    chainId: string;
    address: string;
    threshold: number;
    token?: string;
  }): WatchRule | { error: string } {
    const agent = this.agents.get(params.agentId);
    if (!agent) return { error: `Agent ${params.agentId} not found` };

    if (!CHAIN_RPCS[params.chainId]) {
      return { error: `Unsupported chain: ${params.chainId}. Supported: ${Object.keys(CHAIN_RPCS).join(', ')}` };
    }

    const rule: WatchRule = {
      id: `rule_${randomUUID().slice(0, 8)}`,
      agentId: params.agentId,
      type: params.type,
      chainId: params.chainId,
      address: params.address,
      threshold: params.threshold,
      token: params.token ?? 'native',
      active: true,
      triggeredCount: 0,
    };

    this.rules.set(rule.id, rule);
    if (!agent.watchedAddresses.includes(params.address)) {
      agent.watchedAddresses.push(params.address);
    }
    logger.info(`Watch rule added: ${rule.type} on ${params.chainId}/${params.address} (threshold: ${params.threshold})`);
    return rule;
  }

  listRules(agentId?: string): WatchRule[] {
    const all = [...this.rules.values()];
    if (agentId) return all.filter(r => r.agentId === agentId);
    return all;
  }

  // ── Alerts ───────────────────────────────────────────────

  getAlerts(limit?: number, severity?: string): SwarmAlert[] {
    let filtered = [...this.alerts].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (severity) filtered = filtered.filter(a => a.severity === severity);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  acknowledgeAlert(alertId: string): SwarmAlert | { error: string } {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return { error: `Alert ${alertId} not found` };
    alert.acknowledged = true;
    return alert;
  }

  acknowledgeAll(): number {
    let count = 0;
    for (const alert of this.alerts) {
      if (!alert.acknowledged) { alert.acknowledged = true; count++; }
    }
    return count;
  }

  // ── Internal ───────────────────────────────────────────────

  private processHeartbeats(): void {
    for (const agent of this.agents.values()) {
      if (agent.status === 'active') {
        agent.lastHeartbeat = new Date().toISOString();
        agent.metrics.uptimeMs += 30_000;
      }
    }
  }

  // ── Stats ────────────────────────────────────────────────

  getStats(): SwarmStats {
    const agents = [...this.agents.values()];
    const allChains = new Set(agents.flatMap(a => a.assignedChains));

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      totalAlerts: this.alerts.length,
      unacknowledgedAlerts: this.alerts.filter(a => !a.acknowledged).length,
      criticalAlerts: this.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
      totalWatchRules: this.rules.size,
      activeWatchRules: [...this.rules.values()].filter(r => r.active).length,
      chainsMonitored: [...allChains],
      addressesWatched: new Set(agents.flatMap(a => a.watchedAddresses)).size,
      eventsProcessedTotal: agents.reduce((s, a) => s + a.metrics.eventsProcessed, 0),
      dataSource: 'real_blockchain_rpc',
      rpcCallsTotal: this.rpcCallsTotal,
      rpcErrorsTotal: this.rpcErrorsTotal,
      supportedChains: Object.keys(CHAIN_RPCS),
    };
  }

  destroy(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.monitorTimer) clearInterval(this.monitorTimer);
  }
}

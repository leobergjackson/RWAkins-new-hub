// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta Agent SDK — Clean high-level SDK class for third-party developers.
//
// Usage:
//   import { AeroFytaSDK } from '@xzashr/aerofyta';
//   const sdk = new AeroFytaSDK('http://localhost:3001');
//   const balances = await sdk.getBalances();
//   await sdk.tipCreator('0x...', 2.5, 'ethereum');

// ── Types ─────────────────────────────────────────────────────────

export interface ChainBalance {
  chainId: string;
  chainName: string;
  address: string;
  nativeBalance: string;
  usdtBalance: string;
  nativeSymbol: string;
}

export interface TipResult {
  id: string;
  status: 'completed' | 'pending' | 'failed';
  chainId: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  fee: string;
  explorerUrl: string;
  reasoning: string;
  confidence: number;
  executionTimeMs: number;
}

export interface Tip {
  id: string;
  recipient: string;
  amount: string;
  token: string;
  chainId: string;
  txHash: string;
  status: string;
  createdAt: string;
  reasoning?: string;
}

export interface EscrowResult {
  id: string;
  status: 'created' | 'active';
  hashLock: string;
  timelock: number;
  amount: string;
  recipient: string;
  chainId: string;
  expiresAt: string;
}

export interface AgentStatus {
  online: boolean;
  uptime: number;
  version: string;
  mood: string;
  cyclesRun: number;
  tipsProcessed: number;
  activeEscrows: number;
  supportedChains: string[];
}

export interface BrainState {
  mood: { type: string; multiplier: number; reason: string };
  pulse: {
    liquidity: number;
    diversification: number;
    velocity: number;
    healthScore: number;
  };
  preferredChain: string;
  riskTolerance: number;
  batchSize: number;
}

export interface ReasoningResult {
  answer: string;
  steps: Array<{ step: number; action: string; observation: string; thought: string }>;
  confidence: number;
  tokensUsed: number;
  durationMs: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  url: string;
  capabilities: string[];
  status: 'online' | 'offline';
}

export interface ServiceResult {
  requestId: string;
  agentId: string;
  service: string;
  status: 'completed' | 'pending' | 'failed';
  result: unknown;
  durationMs: number;
}

export interface GaslessSimulation {
  chain: string;
  recipient: string;
  amount: number;
  userOperation: {
    sender: string;
    nonce: string;
    callData: string;
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
  bundlerEndpoint: string;
  paymasterAddress: string;
  estimatedGasSaved: string;
  estimatedGasSavedUsd: string;
  normalGasCost: string;
  normalGasCostUsd: string;
  supported: boolean;
}

export interface SDKConfig {
  /** AeroFyta agent API URL */
  apiUrl: string;
  /** Optional API key for authenticated access */
  apiKey?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Retry failed requests up to N times (default: 2) */
  retries?: number;
}

// ── SDK Class ─────────────────────────────────────────────────────

/**
 * AeroFytaSDK — The official SDK for integrating AeroFyta's autonomous
 * payment agent capabilities into any application.
 *
 * Provides wallet operations, tipping, escrow, AI reasoning, agent-to-agent
 * communication, and gasless transaction simulation.
 *
 * @example
 * ```typescript
 * const sdk = new AeroFytaSDK('http://localhost:3001', 'my-api-key');
 *
 * // Get balances across all chains
 * const balances = await sdk.getBalances();
 *
 * // Tip a creator
 * const tip = await sdk.tipCreator('0xRecipient', 2.5, 'ethereum');
 *
 * // Simulate gasless transfer
 * const sim = await sdk.simulateGasless('ethereum', '0xRecipient', 10);
 *
 * // Run AI reasoning
 * const result = await sdk.runReasoning('What chain is best for micro-tips?');
 * ```
 */
export class AeroFytaSDK {
  private readonly apiUrl: string;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly headers: Record<string, string>;

  constructor(apiUrl: string, apiKey?: string);
  constructor(config: SDKConfig);
  constructor(configOrUrl: string | SDKConfig, apiKey?: string) {
    if (typeof configOrUrl === 'string') {
      this.apiUrl = configOrUrl.replace(/\/+$/, '');
      this.timeout = 30000;
      this.retries = 2;
      this.headers = {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      };
    } else {
      this.apiUrl = configOrUrl.apiUrl.replace(/\/+$/, '');
      this.timeout = configOrUrl.timeout ?? 30000;
      this.retries = configOrUrl.retries ?? 2;
      this.headers = {
        'Content-Type': 'application/json',
        ...(configOrUrl.apiKey ? { 'X-API-Key': configOrUrl.apiKey } : {}),
      };
    }
  }

  // ── Wallet Operations ───────────────────────────────────────────

  /** Get balances across all supported chains */
  async getBalances(): Promise<ChainBalance[]> {
    const data = await this.get<{ balances: Record<string, { nativeBalance: string; usdtBalance: string }> }>('/api/wallet/balances');
    return Object.entries(data.balances).map(([chainId, bal]) => ({
      chainId,
      chainName: this.chainName(chainId),
      address: '',
      nativeBalance: bal.nativeBalance,
      usdtBalance: bal.usdtBalance,
      nativeSymbol: this.nativeSymbol(chainId),
    }));
  }

  /** Get wallet address for a specific chain */
  async getWalletAddress(chain: string): Promise<string> {
    const data = await this.get<{ addresses: Record<string, string> }>('/api/wallet/addresses');
    const addr = data.addresses[chain];
    if (!addr) throw new AeroFytaSDKError(`No wallet found for chain: ${chain}`, 'CHAIN_NOT_FOUND');
    return addr;
  }

  /** Get all wallet addresses */
  async getAllAddresses(): Promise<Record<string, string>> {
    const data = await this.get<{ addresses: Record<string, string> }>('/api/wallet/addresses');
    return data.addresses;
  }

  // ── Tipping ─────────────────────────────────────────────────────

  /** Tip a creator through the full AI reasoning pipeline */
  async tipCreator(creator: string, amount: number, chain?: string): Promise<TipResult> {
    const start = Date.now();
    const result = await this.post<{
      id: string; status: string; chainId: string; txHash: string;
      from: string; to: string; amount: string; token: string; fee: string;
      explorerUrl: string; decision: { reasoning: string; confidence: number };
    }>('/api/tip', {
      recipient: creator,
      amount: String(amount),
      ...(chain ? { preferredChain: chain } : {}),
    });
    return {
      id: result.id,
      status: result.status as TipResult['status'],
      chainId: result.chainId,
      txHash: result.txHash,
      from: result.from,
      to: result.to,
      amount: result.amount,
      token: result.token,
      fee: result.fee,
      explorerUrl: result.explorerUrl,
      reasoning: result.decision?.reasoning ?? '',
      confidence: result.decision?.confidence ?? 0,
      executionTimeMs: Date.now() - start,
    };
  }

  /** Get tip history */
  async getTipHistory(limit = 20): Promise<Tip[]> {
    const data = await this.get<{ tips: Tip[] }>(`/api/agent/history?limit=${limit}`);
    return data.tips;
  }

  /** Parse natural language into a tip intent */
  async parseTipIntent(text: string): Promise<{
    recipient: string; amount: string; token: string; chain: string;
    message: string; confidence: number;
  }> {
    return this.post('/api/tip/parse', { text });
  }

  // ── Escrow ──────────────────────────────────────────────────────

  /** Create a new HTLC escrow */
  async createEscrow(recipient: string, amount: number, timelock: number): Promise<EscrowResult> {
    return this.post<EscrowResult>('/api/escrow', {
      recipient,
      amount: String(amount),
      timelock,
    });
  }

  /** Claim an escrow with the pre-image */
  async claimEscrow(id: string, preimage: string): Promise<void> {
    await this.post(`/api/escrow/${id}/claim`, { preimage });
  }

  /** List active escrows */
  async listEscrows(): Promise<EscrowResult[]> {
    const data = await this.get<{ escrows: EscrowResult[] }>('/api/escrow');
    return data.escrows;
  }

  // ── Agent Intelligence ──────────────────────────────────────────

  /** Get current agent status */
  async getAgentStatus(): Promise<AgentStatus> {
    return this.get<AgentStatus>('/api/agent/state');
  }

  /** Get the brain state (mood, pulse, preferences) */
  async getBrainState(): Promise<BrainState> {
    return this.get<BrainState>('/api/brain/state');
  }

  /** Run AI reasoning on a prompt */
  async runReasoning(prompt: string): Promise<ReasoningResult> {
    return this.post<ReasoningResult>('/api/openclaw/reason', { prompt });
  }

  /** Chat with the agent */
  async chat(message: string): Promise<{ response: string; intent?: string; confidence?: number }> {
    return this.post('/api/chat', { message });
  }

  // ── Agent-to-Agent (A2A) ────────────────────────────────────────

  /** Discover other agents on the network */
  async discoverAgents(): Promise<Agent[]> {
    const data = await this.get<{ agents: Agent[] }>('/api/a2a/discover');
    return data.agents;
  }

  /** Request a service from another agent */
  async requestService(agentId: string, service: string, params?: Record<string, unknown>): Promise<ServiceResult> {
    return this.post<ServiceResult>('/api/a2a/request', {
      agentId,
      service,
      params: params ?? {},
    });
  }

  // ── Gasless Transactions ────────────────────────────────────────

  /** Simulate a gasless (ERC-4337) transfer */
  async simulateGasless(chain: string, recipient: string, amount: number): Promise<GaslessSimulation> {
    return this.get<GaslessSimulation>(
      `/api/gasless/simulate?chain=${encodeURIComponent(chain)}&recipient=${encodeURIComponent(recipient)}&amount=${amount}`
    );
  }

  // ── Fee Comparison ──────────────────────────────────────────────

  /** Compare fees across chains for a transfer */
  async compareFees(recipient: string, amount: number): Promise<Array<{
    chainId: string; chainName: string; estimatedFeeUsd: string; savingsVsHighest: string;
  }>> {
    const data = await this.get<{ comparison: Array<{
      chainId: string; chainName: string; estimatedFeeUsd: string; savingsVsHighest: string;
    }> }>(`/api/fees/compare?recipient=${recipient}&amount=${amount}`);
    return data.comparison;
  }

  // ── Health ──────────────────────────────────────────────────────

  /** Check if the agent is healthy */
  async isHealthy(): Promise<boolean> {
    try {
      const data = await this.get<{ status: string }>('/api/health/full');
      return data.status === 'ok' || data.status === 'healthy';
    } catch {
      return false;
    }
  }

  /** Get full health report */
  async health(): Promise<{ status: string; uptime: number; version: string }> {
    return this.get('/api/health/full');
  }

  // ── Events ──────────────────────────────────────────────────────

  /** Subscribe to real-time events via Server-Sent Events */
  onEvent(callback: (event: { type: string; message: string; timestamp: string; detail?: string }) => void): { close: () => void } {
    const eventSource = new EventSource(`${this.apiUrl}/api/activity/stream`);
    eventSource.onmessage = (ev) => {
      try {
        callback(JSON.parse(ev.data));
      } catch { /* ignore parse errors */ }
    };
    return { close: () => eventSource.close() };
  }

  // ── Internal HTTP helpers ───────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const res = await fetch(`${this.apiUrl}${path}`, {
          method,
          headers: this.headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new AeroFytaSDKError(
            `HTTP ${res.status}: ${text}`,
            res.status === 401 ? 'UNAUTHORIZED' : res.status === 404 ? 'NOT_FOUND' : 'HTTP_ERROR',
            res.status,
          );
        }

        return await res.json() as T;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (err instanceof AeroFytaSDKError && err.statusCode && err.statusCode < 500) {
          throw err; // Don't retry client errors
        }
        if (attempt < this.retries) {
          await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new AeroFytaSDKError('Request failed', 'UNKNOWN');
  }

  // ── Chain helpers ───────────────────────────────────────────────

  private chainName(id: string): string {
    const names: Record<string, string> = {
      ethereum: 'Ethereum', polygon: 'Polygon', arbitrum: 'Arbitrum',
      optimism: 'Optimism', avalanche: 'Avalanche', bsc: 'BNB Chain',
      ton: 'TON', tron: 'Tron', solana: 'Solana',
    };
    return names[id] ?? id;
  }

  private nativeSymbol(id: string): string {
    const symbols: Record<string, string> = {
      ethereum: 'ETH', polygon: 'MATIC', arbitrum: 'ETH',
      optimism: 'ETH', avalanche: 'AVAX', bsc: 'BNB',
      ton: 'TON', tron: 'TRX', solana: 'SOL',
    };
    return symbols[id] ?? 'NATIVE';
  }
}

// ── Error Class ─────────────────────────────────────────────────

export class AeroFytaSDKError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'AeroFytaSDKError';
  }
}

export default AeroFytaSDK;

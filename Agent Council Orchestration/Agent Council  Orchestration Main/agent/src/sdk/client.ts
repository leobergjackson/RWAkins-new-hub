// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta SDK HTTP Client — Connect to a running AeroFyta agent over HTTP.
//
// Usage:
//   import { TipFlowClient } from 'aerofyta-agent';
//   const client = new TipFlowClient('http://localhost:3001');
//   await client.sendTip({ recipient: '0x...', amount: '0.01', token: 'usdt' });

// ── Types ────────────────────────────────────────────────────────

export interface TipFlowConfig {
  /** AeroFyta agent API URL */
  apiUrl: string;
  /** Optional API key for x402 monetized endpoints */
  apiKey?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

export interface SendTipParams {
  recipient: string;
  amount: string;
  token?: 'usdt' | 'native' | 'usat' | 'xaut';
  preferredChain?: string;
  message?: string;
}

export interface TipResultDTO {
  id: string;
  status: string;
  chainId: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  fee: string;
  explorerUrl: string;
  decision: {
    selectedChain: string;
    reasoning: string;
    confidence: number;
    steps: Array<{ step: number; action: string; detail: string }>;
  };
}

export interface EngagementScore {
  score: number;
  breakdown: {
    watchCompletion: number;
    rewatchBonus: number;
    frequency: number;
    loyalty: number;
    categoryPremium: number;
  };
  suggestedMultiplier: number;
  reasoning: string;
}

export interface TipPolicy {
  name: string;
  description: string;
  trigger: { type: string; threshold?: number };
  conditions: Array<{ field: string; operator: string; value: unknown }>;
  action: {
    type: string;
    amount: { mode: string; base: number; min?: number; max?: number };
    chain: string;
    token: string;
  };
}

// ── SDK Client ───────────────────────────────────────────────────

/**
 * TipFlowClient — HTTP client for connecting to a running AeroFyta agent.
 *
 * Use this when you want to talk to a remote AeroFyta instance over HTTP.
 * For in-process usage, use `createAeroFytaAgent()` instead.
 */
export class TipFlowClient {
  private apiUrl: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config: TipFlowConfig | string) {
    if (typeof config === 'string') {
      this.apiUrl = config;
      this.timeout = 30000;
      this.headers = { 'Content-Type': 'application/json' };
    } else {
      this.apiUrl = config.apiUrl;
      this.timeout = config.timeout ?? 30000;
      this.headers = {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
      };
    }
  }

  // ── Core Tipping ─────────────────────────────────────────────────

  /** Send a tip through the full AI pipeline (10-step execution) */
  async sendTip(params: SendTipParams): Promise<TipResultDTO> {
    return this.post<TipResultDTO>('/api/tip', params);
  }

  /** Parse natural language into a tip intent */
  async parseTip(text: string): Promise<{
    recipient: string;
    amount: string;
    token: string;
    chain: string;
    message: string;
    confidence: number;
  }> {
    return this.post('/api/tip/parse', { text });
  }

  /** Get wallet balances across all chains */
  async getBalances(): Promise<Record<string, { nativeBalance: string; usdtBalance: string }>> {
    const result = await this.get<{ balances: Record<string, { nativeBalance: string; usdtBalance: string }> }>('/api/wallet/balances');
    return result.balances;
  }

  /** Get wallet addresses across all chains */
  async getAddresses(): Promise<Record<string, string>> {
    const result = await this.get<{ addresses: Record<string, string> }>('/api/wallet/addresses');
    return result.addresses;
  }

  // ── Engagement & Analytics ──────────────────────────────────────

  /** Calculate engagement score between a user and creator */
  async getEngagementScore(userId: string, creatorId: string): Promise<EngagementScore> {
    return this.get(`/api/rumble/engagement/${userId}/${creatorId}`);
  }

  /** Get engagement-weighted tip recommendations */
  async getEngagementRecommendations(userId: string, baseTip = 0.01): Promise<Array<{
    creatorName: string;
    engagementScore: number;
    adjustedAmount: number;
    reasoning: string;
  }>> {
    const result = await this.get<{ recommendations: Array<{
      creatorName: string;
      engagementScore: number;
      adjustedAmount: number;
      reasoning: string;
    }> }>(`/api/rumble/engagement-tips/${userId}?baseTip=${baseTip}`);
    return result.recommendations;
  }

  // ── Programmable Policies ────────────────────────────────────────

  /** Create a programmable tip policy */
  async createPolicy(policy: TipPolicy & { createdBy?: string }): Promise<{ id: string }> {
    return this.post('/api/policies', {
      ...policy,
      createdBy: policy.createdBy ?? 'sdk',
    });
  }

  /** List all tip policies */
  async listPolicies(): Promise<TipPolicy[]> {
    const result = await this.get<{ policies: TipPolicy[] }>('/api/policies');
    return result.policies;
  }

  /** Evaluate policies against current context */
  async evaluatePolicies(context: Record<string, unknown>): Promise<Array<{
    policyName: string;
    triggered: boolean;
    conditionsMet: boolean;
    reason: string;
  }>> {
    const result = await this.post<{ evaluations: Array<{
      policyName: string;
      triggered: boolean;
      conditionsMet: boolean;
      reason: string;
    }> }>('/api/policies/evaluate', context);
    return result.evaluations;
  }

  // ── Real-time Events ────────────────────────────────────────────

  /** Subscribe to real-time tip events via SSE */
  onTipEvent(callback: (event: {
    type: string;
    message: string;
    detail?: string;
    chainId?: string;
    timestamp: string;
  }) => void): { close: () => void } {
    const eventSource = new EventSource(`${this.apiUrl}/api/activity/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch {
        // Ignore parse errors
      }
    };

    return {
      close: () => eventSource.close(),
    };
  }

  // ── Agent State ─────────────────────────────────────────────────

  /** Get current agent state (status, current decision, etc.) */
  async getAgentState(): Promise<{
    status: string;
    currentDecision?: { selectedChain: string; confidence: number; steps: unknown[] };
  }> {
    return this.get('/api/agent/state');
  }

  /** Get tip history */
  async getHistory(limit = 20): Promise<Array<{
    id: string;
    recipient: string;
    amount: string;
    token: string;
    chainId: string;
    txHash: string;
    status: string;
    createdAt: string;
  }>> {
    const result = await this.get<{ tips: Array<{
      id: string;
      recipient: string;
      amount: string;
      token: string;
      chainId: string;
      txHash: string;
      status: string;
      createdAt: string;
    }> }>(`/api/agent/history?limit=${limit}`);
    return result.tips;
  }

  // ── Fees & Economics ────────────────────────────────────────────

  /** Compare fees across all chains */
  async compareFees(recipient: string, amount: string): Promise<Array<{
    chainId: string;
    chainName: string;
    estimatedFeeUsd: string;
    savingsVsHighest: string;
  }>> {
    const result = await this.get<{ comparison: Array<{
      chainId: string;
      chainName: string;
      estimatedFeeUsd: string;
      savingsVsHighest: string;
    }> }>(`/api/fees/compare?recipient=${recipient}&amount=${amount}`);
    return result.comparison;
  }

  // ── Health ──────────────────────────────────────────────────────

  /** Check agent health */
  async health(): Promise<{ status: string; uptime: number }> {
    return this.get('/api/health/full');
  }

  // ── HTTP Helpers ─────────────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.apiUrl}${path}`, {
        headers: this.headers,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return await res.json() as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.apiUrl}${path}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return await res.json() as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

export default TipFlowClient;

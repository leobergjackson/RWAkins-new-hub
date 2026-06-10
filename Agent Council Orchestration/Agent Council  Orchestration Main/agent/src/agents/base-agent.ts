// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Base Agent — Abstract class for all autonomous agents in the multi-agent system

import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';
import type { MessageBus, AgentMessage, MessageType } from './message-bus.js';

// ── Types ──────────────────────────────────────────────────────

export interface AgentContext {
  /** Current cycle number from orchestrator */
  cycleNumber: number;
  /** Timestamp of cycle start */
  timestamp: string;
  /** Balances across chains: chainId -> { native, usdt } */
  balances: Map<string, { native: string; usdt: string }>;
  /** Recent tip history from this session */
  recentTips: TipRecord[];
  /** Active proposals awaiting votes */
  activeProposals: Proposal[];
  /** Shared state from other agents */
  sharedState: Map<string, unknown>;
}

export interface TipRecord {
  id: string;
  recipient: string;
  amount: string;
  chain: string;
  timestamp: string;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface AgentAnalysis {
  agentId: string;
  agentName: string;
  summary: string;
  confidence: number; // 0-1
  recommendations: string[];
  data: Record<string, unknown>;
  timestamp: string;
}

export interface Proposal {
  id: string;
  type: 'TIP' | 'REBALANCE' | 'YIELD_DEPLOY' | 'BRIDGE' | 'WATCHLIST_ADD';
  proposedBy: string;
  description: string;
  data: Record<string, unknown>;
  votes: Vote[];
  status: 'pending' | 'approved' | 'rejected' | 'vetoed' | 'executed';
  createdAt: string;
  resolvedAt?: string;
}

export interface Vote {
  agentId: string;
  agentName: string;
  decision: 'approve' | 'reject' | 'abstain';
  confidence: number; // 0-1
  reasoning: string;
  timestamp: string;
}

export interface Action {
  id: string;
  proposalId: string;
  type: 'SEND_TIP' | 'REBALANCE' | 'SUPPLY_YIELD' | 'BRIDGE_FUNDS' | 'ADD_WATCHLIST';
  params: Record<string, unknown>;
}

export interface ExecutionResult {
  actionId: string;
  agentId: string;
  success: boolean;
  txHash?: string;
  error?: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export type AgentStatus = 'idle' | 'analyzing' | 'voting' | 'executing' | 'error';

// ── Base Agent ─────────────────────────────────────────────────

export abstract class BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly walletIndex: number;

  protected bus: MessageBus | null = null;
  protected inbox: AgentMessage[] = [];
  protected status: AgentStatus = 'idle';
  protected lastError: string | null = null;
  protected cyclesCompleted = 0;
  private startedAt: string;

  constructor(name: string, role: string, walletIndex: number) {
    this.id = `agent-${name.toLowerCase().replace(/\s+/g, '-')}-${randomUUID().slice(0, 8)}`;
    this.name = name;
    this.role = role;
    this.walletIndex = walletIndex;
    this.startedAt = new Date().toISOString();
  }

  // ── Abstract methods — each agent must implement ──

  /** Analyze current context and produce insights */
  abstract analyze(context: AgentContext): Promise<AgentAnalysis>;

  /** Vote on a proposal */
  abstract vote(proposal: Proposal): Promise<Vote>;

  /** Execute an approved action */
  abstract execute(action: Action): Promise<ExecutionResult>;

  // ── Message bus integration ──

  /** Connect this agent to the message bus */
  connectBus(bus: MessageBus): void {
    this.bus = bus;
    bus.subscribe(this.id, '*', (msg) => this.receiveMessage(msg));
    logger.info(`Agent ${this.name} connected to message bus`, { id: this.id, role: this.role });
  }

  /** Disconnect from message bus */
  disconnectBus(): void {
    if (this.bus) {
      this.bus.unsubscribe(this.id);
      this.bus = null;
    }
  }

  /** Send a message to another agent or broadcast */
  sendMessage(to: string | '*', type: MessageType, payload: unknown, correlationId?: string): void {
    if (!this.bus) {
      logger.warn(`Agent ${this.name}: cannot send message — not connected to bus`);
      return;
    }
    const msg = this.bus.createMessage(this.id, to, type, payload, correlationId);
    this.bus.publish(msg).catch((err) => {
      logger.error(`Agent ${this.name}: failed to publish message`, { error: String(err) });
    });
  }

  /** Receive a message (called by message bus) */
  receiveMessage(message: AgentMessage): void {
    this.inbox.push(message);
    // Keep inbox bounded
    if (this.inbox.length > 500) {
      this.inbox = this.inbox.slice(-500);
    }
  }

  /** Get message history for this agent */
  getMessageHistory(): AgentMessage[] {
    return [...this.inbox];
  }

  // ── Status and metadata ──

  getStatus(): AgentStatus {
    return this.status;
  }

  getInfo(): {
    id: string;
    name: string;
    role: string;
    walletIndex: number;
    status: AgentStatus;
    cyclesCompleted: number;
    lastError: string | null;
    inboxSize: number;
    startedAt: string;
  } {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      walletIndex: this.walletIndex,
      status: this.status,
      cyclesCompleted: this.cyclesCompleted,
      lastError: this.lastError,
      inboxSize: this.inbox.length,
      startedAt: this.startedAt,
    };
  }

  protected setStatus(status: AgentStatus): void {
    this.status = status;
  }

  protected setError(error: string): void {
    this.lastError = error;
    this.status = 'error';
    logger.error(`Agent ${this.name}: ${error}`);
  }

  protected incrementCycles(): void {
    this.cyclesCompleted++;
  }
}

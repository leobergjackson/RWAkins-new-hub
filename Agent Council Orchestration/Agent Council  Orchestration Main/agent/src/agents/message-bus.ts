// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Multi-Agent Message Bus — In-memory pub/sub for inter-agent communication

import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export type MessageType =
  | 'PROPOSAL'
  | 'VOTE'
  | 'VETO'
  | 'EXECUTE'
  | 'RESULT'
  | 'ALERT'
  | 'HEARTBEAT'
  | 'QUERY'
  | 'RESPONSE';

export interface AgentMessage {
  id: string;
  correlationId: string;
  from: string;
  to: string | '*'; // '*' = broadcast
  type: MessageType;
  payload: unknown;
  timestamp: string;
}

export type MessageHandler = (message: AgentMessage) => void | Promise<void>;

interface Subscription {
  agentId: string;
  types: MessageType[] | '*';
  handler: MessageHandler;
}

// ── Message Bus ────────────────────────────────────────────────

export class MessageBus {
  private subscriptions: Map<string, Subscription[]> = new Map();
  private history: AgentMessage[] = [];
  private maxHistory = 2000;

  /** Create a new message with auto-generated ID and timestamp */
  createMessage(
    from: string,
    to: string | '*',
    type: MessageType,
    payload: unknown,
    correlationId?: string,
  ): AgentMessage {
    return {
      id: randomUUID(),
      correlationId: correlationId ?? randomUUID(),
      from,
      to,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  /** Subscribe an agent to messages */
  subscribe(agentId: string, types: MessageType[] | '*', handler: MessageHandler): void {
    const existing = this.subscriptions.get(agentId) ?? [];
    existing.push({ agentId, types, handler });
    this.subscriptions.set(agentId, existing);
    logger.debug(`MessageBus: ${agentId} subscribed to ${Array.isArray(types) ? types.join(',') : types}`);
  }

  /** Unsubscribe all handlers for an agent */
  unsubscribe(agentId: string): void {
    this.subscriptions.delete(agentId);
    logger.debug(`MessageBus: ${agentId} unsubscribed`);
  }

  /** Publish a message — delivers to targeted agent or broadcasts */
  async publish(message: AgentMessage): Promise<void> {
    this.history.push(message);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    const deliveries: Promise<void>[] = [];

    for (const [agentId, subs] of this.subscriptions) {
      // Skip sender
      if (agentId === message.from) continue;

      // Targeted message — only deliver to intended recipient
      if (message.to !== '*' && message.to !== agentId) continue;

      for (const sub of subs) {
        const typeMatch = sub.types === '*' || sub.types.includes(message.type);
        if (typeMatch) {
          deliveries.push(
            Promise.resolve(sub.handler(message)).catch((err) => {
              logger.error(`MessageBus: delivery failed to ${agentId}`, { error: String(err) });
            }),
          );
        }
      }
    }

    await Promise.all(deliveries);
  }

  /** Get full message history */
  getHistory(): AgentMessage[] {
    return [...this.history];
  }

  /** Get messages for a specific agent (sent or received) */
  getAgentMessages(agentId: string): AgentMessage[] {
    return this.history.filter(
      (m) => m.from === agentId || m.to === agentId || m.to === '*',
    );
  }

  /** Get messages by correlation ID (conversation thread) */
  getThread(correlationId: string): AgentMessage[] {
    return this.history.filter((m) => m.correlationId === correlationId);
  }

  /** Get all subscribed agent IDs */
  getSubscribedAgents(): string[] {
    return [...this.subscriptions.keys()];
  }

  /** Clear history */
  clearHistory(): void {
    this.history = [];
  }

  /** Stats */
  getStats(): { totalMessages: number; subscribedAgents: number; historySize: number } {
    return {
      totalMessages: this.history.length,
      subscribedAgents: this.subscriptions.size,
      historySize: this.history.length,
    };
  }
}

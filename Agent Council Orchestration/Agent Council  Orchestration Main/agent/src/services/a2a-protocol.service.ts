// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// Agent-to-Agent (A2A) Payment Protocol Service
//
// Enables machine-to-machine commerce: autonomous agents can register,
// discover services, negotiate prices, and settle payments over WDK.

import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import { logger } from '../utils/logger.js';

// ── Interfaces ──────────────────────────────────────────────────────

export interface AgentIdentity {
  id: string;
  name: string;
  walletAddress: string;
  capabilities: string[];
  reputationScore: number;
  registeredAt: string;
}

export interface ServiceListing {
  id: string;
  agentId: string;
  serviceName: string;
  price: number;
  currency: string;
  chain: string;
  description: string;
  executionTimeMs: number;
  publishedAt: string;
}

export type A2ATransactionStatus =
  | 'requested'
  | 'negotiating'
  | 'accepted'
  | 'payment_pending'
  | 'payment_sent'
  | 'delivered'
  | 'confirmed'
  | 'disputed'
  | 'resolved';

export interface A2ATransaction {
  id: string;
  requestorId: string;
  providerId: string;
  serviceId: string;
  serviceName: string;
  amount: number;
  platformFee: number;
  currency: string;
  chain: string;
  status: A2ATransactionStatus;
  txHash: string | null;
  requestedAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  disputeReason: string | null;
}

export interface NegotiationResult {
  accepted: boolean;
  originalPrice: number;
  finalPrice: number;
  message: string;
}

// ── Constants ───────────────────────────────────────────────────────

const PLATFORM_FEE_RATE = 0.02; // 2% platform fee

// ── Service ─────────────────────────────────────────────────────────

export class A2AProtocolService extends EventEmitter {
  private agents = new Map<string, AgentIdentity>();
  private services = new Map<string, ServiceListing>();
  private transactions = new Map<string, A2ATransaction>();

  // ── Agent Registration ──────────────────────────────────────────

  registerAgent(identity: Omit<AgentIdentity, 'registeredAt'>): AgentIdentity {
    if (this.agents.has(identity.id)) {
      logger.warn(`A2A: Agent ${identity.id} already registered — updating`);
    }
    const agent: AgentIdentity = {
      ...identity,
      registeredAt: new Date().toISOString(),
    };
    this.agents.set(agent.id, agent);
    this.emit('agent:registered', agent);
    logger.info(`A2A: Agent registered — ${agent.name} (${agent.id})`);
    return agent;
  }

  getAgent(agentId: string): AgentIdentity | undefined {
    return this.agents.get(agentId);
  }

  listAgents(): AgentIdentity[] {
    return Array.from(this.agents.values());
  }

  // ── Service Publishing ──────────────────────────────────────────

  publishService(listing: Omit<ServiceListing, 'id' | 'publishedAt'>): ServiceListing {
    const agent = this.agents.get(listing.agentId);
    if (!agent) {
      throw new Error(`A2A: Agent ${listing.agentId} not registered`);
    }
    const service: ServiceListing = {
      ...listing,
      id: `svc_${crypto.randomUUID().slice(0, 8)}`,
      publishedAt: new Date().toISOString(),
    };
    this.services.set(service.id, service);
    this.emit('service:published', service);
    logger.info(`A2A: Service published — ${service.serviceName} by ${agent.name} @ ${service.price} ${service.currency}`);
    return service;
  }

  // ── Service Discovery ───────────────────────────────────────────

  discoverServices(query?: string): ServiceListing[] {
    const all = Array.from(this.services.values());
    if (!query) return all;
    const lowerQuery = query.toLowerCase();
    return all.filter(
      (s) =>
        s.serviceName.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery),
    );
  }

  getService(serviceId: string): ServiceListing | undefined {
    return this.services.get(serviceId);
  }

  getServiceByAgentAndName(agentId: string, serviceName: string): ServiceListing | undefined {
    return Array.from(this.services.values()).find(
      (s) => s.agentId === agentId && s.serviceName === serviceName,
    );
  }

  // ── Service Request & Transaction ───────────────────────────────

  requestService(requestorId: string, agentId: string, serviceName: string): A2ATransaction {
    const requestor = this.agents.get(requestorId);
    if (!requestor) throw new Error(`A2A: Requestor ${requestorId} not registered`);

    const service = this.getServiceByAgentAndName(agentId, serviceName);
    if (!service) throw new Error(`A2A: Service "${serviceName}" not found for agent ${agentId}`);

    const platformFee = parseFloat((service.price * PLATFORM_FEE_RATE).toFixed(6));

    const tx: A2ATransaction = {
      id: `a2a_${crypto.randomUUID().slice(0, 12)}`,
      requestorId,
      providerId: agentId,
      serviceId: service.id,
      serviceName: service.serviceName,
      amount: service.price,
      platformFee,
      currency: service.currency,
      chain: service.chain,
      status: 'requested',
      txHash: null,
      requestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveredAt: null,
      disputeReason: null,
    };

    this.transactions.set(tx.id, tx);
    this.emit('transaction:requested', tx);
    logger.info(`A2A: Transaction ${tx.id} requested — ${requestor.name} → ${agentId} for "${serviceName}"`);
    return tx;
  }

  // ── Price Negotiation ───────────────────────────────────────────

  negotiatePrice(agentId: string, serviceName: string, maxBudget: number): NegotiationResult {
    const service = this.getServiceByAgentAndName(agentId, serviceName);
    if (!service) {
      return { accepted: false, originalPrice: 0, finalPrice: 0, message: `Service "${serviceName}" not found` };
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      return { accepted: false, originalPrice: service.price, finalPrice: service.price, message: 'Agent not found' };
    }

    // Simple negotiation: agents with high reputation are firmer on price.
    // Accept if budget >= price. If budget is within 20%, counter-offer at midpoint.
    if (maxBudget >= service.price) {
      return {
        accepted: true,
        originalPrice: service.price,
        finalPrice: service.price,
        message: `${agent.name} accepts at listed price`,
      };
    }

    const flexibility = agent.reputationScore >= 90 ? 0.05 : 0.20;
    const minimumAcceptable = service.price * (1 - flexibility);

    if (maxBudget >= minimumAcceptable) {
      const midpoint = parseFloat(((maxBudget + service.price) / 2).toFixed(6));
      return {
        accepted: true,
        originalPrice: service.price,
        finalPrice: midpoint,
        message: `${agent.name} counter-offers at ${midpoint} ${service.currency} (negotiated down from ${service.price})`,
      };
    }

    return {
      accepted: false,
      originalPrice: service.price,
      finalPrice: service.price,
      message: `${agent.name} declines — minimum acceptable is ${minimumAcceptable.toFixed(6)} ${service.currency}`,
    };
  }

  // ── Payment Execution ───────────────────────────────────────────

  executePayment(txId: string): A2ATransaction {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error(`A2A: Transaction ${txId} not found`);
    if (tx.status !== 'requested' && tx.status !== 'accepted' && tx.status !== 'negotiating') {
      throw new Error(`A2A: Transaction ${txId} cannot be paid in status "${tx.status}"`);
    }

    // In a real implementation this would call WDK wallet.transfer().
    // For hackathon scope, we simulate the payment with a deterministic hash.
    const simulatedHash = `0x${crypto.createHash('sha256').update(tx.id + Date.now()).digest('hex')}`;

    tx.status = 'payment_sent';
    tx.txHash = simulatedHash;
    tx.updatedAt = new Date().toISOString();

    this.emit('transaction:payment_sent', tx);
    logger.info(`A2A: Payment sent for ${tx.id} — hash ${simulatedHash.slice(0, 16)}...`);
    return tx;
  }

  // ── Delivery Confirmation ───────────────────────────────────────

  confirmDelivery(txId: string): A2ATransaction {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error(`A2A: Transaction ${txId} not found`);
    if (tx.status !== 'payment_sent') {
      throw new Error(`A2A: Transaction ${txId} cannot confirm delivery in status "${tx.status}"`);
    }

    tx.status = 'confirmed';
    tx.deliveredAt = new Date().toISOString();
    tx.updatedAt = new Date().toISOString();

    // Update provider reputation
    const provider = this.agents.get(tx.providerId);
    if (provider) {
      provider.reputationScore = Math.min(100, provider.reputationScore + 1);
    }

    // Update requestor reputation (good payer)
    const requestor = this.agents.get(tx.requestorId);
    if (requestor) {
      requestor.reputationScore = Math.min(100, requestor.reputationScore + 0.5);
    }

    this.emit('transaction:confirmed', tx);
    logger.info(`A2A: Delivery confirmed for ${tx.id} — reputations updated`);
    return tx;
  }

  // ── Dispute ─────────────────────────────────────────────────────

  disputeTransaction(txId: string, reason: string): A2ATransaction {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error(`A2A: Transaction ${txId} not found`);
    if (tx.status !== 'payment_sent' && tx.status !== 'delivered') {
      throw new Error(`A2A: Transaction ${txId} cannot be disputed in status "${tx.status}"`);
    }

    tx.status = 'disputed';
    tx.disputeReason = reason;
    tx.updatedAt = new Date().toISOString();

    // Penalize provider reputation on dispute
    const provider = this.agents.get(tx.providerId);
    if (provider) {
      provider.reputationScore = Math.max(0, provider.reputationScore - 5);
    }

    this.emit('transaction:disputed', tx);
    logger.warn(`A2A: Transaction ${tx.id} disputed — "${reason}"`);
    return tx;
  }

  // ── Transaction Queries ─────────────────────────────────────────

  getTransaction(txId: string): A2ATransaction | undefined {
    return this.transactions.get(txId);
  }

  listTransactions(agentId?: string): A2ATransaction[] {
    const all = Array.from(this.transactions.values());
    if (!agentId) return all;
    return all.filter((t) => t.requestorId === agentId || t.providerId === agentId);
  }

  // ── Stats ───────────────────────────────────────────────────────

  getStats() {
    const txs = Array.from(this.transactions.values());
    const confirmed = txs.filter((t) => t.status === 'confirmed');
    const totalVolume = confirmed.reduce((sum, t) => sum + t.amount, 0);
    const totalFees = confirmed.reduce((sum, t) => sum + t.platformFee, 0);
    return {
      totalAgents: this.agents.size,
      totalServices: this.services.size,
      totalTransactions: txs.length,
      confirmedTransactions: confirmed.length,
      totalVolume: parseFloat(totalVolume.toFixed(6)),
      totalPlatformFees: parseFloat(totalFees.toFixed(6)),
      feeRate: `${PLATFORM_FEE_RATE * 100}%`,
    };
  }
}

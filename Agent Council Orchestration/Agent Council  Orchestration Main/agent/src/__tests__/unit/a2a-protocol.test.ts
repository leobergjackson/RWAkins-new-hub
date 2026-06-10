/**
 * Unit Tests: A2A (Agent-to-Agent) Protocol Service
 *
 * Tests agent registration, service publishing, discovery, price negotiation,
 * payment execution, delivery confirmation, disputes, and reputation updates.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { A2AProtocolService } from '../../services/a2a-protocol.service.js';

// ── Constants ────────────────────────────────────────────────────

const AGENT_ALICE = {
  id: 'agent_alice',
  name: 'Alice Bot',
  walletAddress: '0x' + 'a'.repeat(40),
  capabilities: ['data-analysis', 'sentiment-scoring'],
  reputationScore: 80,
};

const AGENT_BOB = {
  id: 'agent_bob',
  name: 'Bob Bot',
  walletAddress: '0x' + 'b'.repeat(40),
  capabilities: ['content-curation', 'summarization'],
  reputationScore: 60,
};

// ── Suite: Agent Registration ──────────────────────────────────

describe('A2AProtocolService — Agent Registration', () => {
  let a2a: A2AProtocolService;

  before(() => {
    a2a = new A2AProtocolService();
  });

  it('registers a new agent and returns the agent identity', () => {
    const agent = a2a.registerAgent(AGENT_ALICE);
    assert.equal(agent.id, 'agent_alice');
    assert.equal(agent.name, 'Alice Bot');
    assert.ok(agent.registeredAt, 'Should set registeredAt timestamp');
  });

  it('retrieves a registered agent by ID', () => {
    const agent = a2a.getAgent('agent_alice');
    assert.ok(agent);
    assert.equal(agent.id, 'agent_alice');
    assert.equal(agent.capabilities.length, 2);
  });

  it('allows re-registration (update) of an existing agent', () => {
    const updated = a2a.registerAgent({ ...AGENT_ALICE, name: 'Alice Bot v2' });
    assert.equal(updated.name, 'Alice Bot v2');
    const fetched = a2a.getAgent('agent_alice');
    assert.equal(fetched?.name, 'Alice Bot v2');
  });

  it('lists all registered agents', () => {
    a2a.registerAgent(AGENT_BOB);
    const agents = a2a.listAgents();
    assert.ok(agents.length >= 2);
    const ids = agents.map(a => a.id);
    assert.ok(ids.includes('agent_alice'));
    assert.ok(ids.includes('agent_bob'));
  });

  it('returns undefined for an unregistered agent', () => {
    const agent = a2a.getAgent('agent_nonexistent');
    assert.equal(agent, undefined);
  });
});

// ── Suite: Service Publishing ──────────────────────────────────

describe('A2AProtocolService — Service Publishing', () => {
  let a2a: A2AProtocolService;

  before(() => {
    a2a = new A2AProtocolService();
    a2a.registerAgent(AGENT_ALICE);
    a2a.registerAgent(AGENT_BOB);
  });

  it('publishes a service listing for a registered agent', () => {
    const service = a2a.publishService({
      agentId: 'agent_alice',
      serviceName: 'Sentiment Analysis',
      price: 0.5,
      currency: 'USDT',
      chain: 'ethereum-sepolia',
      description: 'Analyze text sentiment',
      executionTimeMs: 2000,
    });

    assert.ok(service.id.startsWith('svc_'));
    assert.equal(service.serviceName, 'Sentiment Analysis');
    assert.equal(service.price, 0.5);
    assert.ok(service.publishedAt);
  });

  it('throws when publishing for an unregistered agent', () => {
    assert.throws(() => {
      a2a.publishService({
        agentId: 'agent_ghost',
        serviceName: 'Ghost Service',
        price: 1.0,
        currency: 'USDT',
        chain: 'ethereum-sepolia',
        description: 'Should fail',
        executionTimeMs: 1000,
      });
    }, /not registered/);
  });
});

// ── Suite: Service Discovery ────────────────────────────────────

describe('A2AProtocolService — Service Discovery', () => {
  let a2a: A2AProtocolService;

  before(() => {
    a2a = new A2AProtocolService();
    a2a.registerAgent(AGENT_ALICE);
    a2a.registerAgent(AGENT_BOB);
    a2a.publishService({
      agentId: 'agent_alice',
      serviceName: 'Sentiment Analysis',
      price: 0.5,
      currency: 'USDT',
      chain: 'ethereum-sepolia',
      description: 'AI-powered sentiment scoring',
      executionTimeMs: 2000,
    });
    a2a.publishService({
      agentId: 'agent_bob',
      serviceName: 'Content Summary',
      price: 0.3,
      currency: 'USDT',
      chain: 'ethereum-sepolia',
      description: 'Summarize articles and posts',
      executionTimeMs: 1500,
    });
  });

  it('discovers all services when no query is provided', () => {
    const all = a2a.discoverServices();
    assert.ok(all.length >= 2);
  });

  it('discovers services matching a query string', () => {
    const found = a2a.discoverServices('sentiment');
    assert.equal(found.length, 1);
    assert.equal(found[0].serviceName, 'Sentiment Analysis');
  });

  it('returns empty array for non-matching query', () => {
    const found = a2a.discoverServices('blockchain');
    assert.equal(found.length, 0);
  });

  it('finds a service by agent ID and name', () => {
    const service = a2a.getServiceByAgentAndName('agent_alice', 'Sentiment Analysis');
    assert.ok(service);
    assert.equal(service.price, 0.5);
  });
});

// ── Suite: Price Negotiation ────────────────────────────────────

describe('A2AProtocolService — Price Negotiation', () => {
  let a2a: A2AProtocolService;

  before(() => {
    a2a = new A2AProtocolService();
    a2a.registerAgent(AGENT_ALICE);
    a2a.registerAgent({ ...AGENT_BOB, reputationScore: 95 }); // High rep = less flexible
    a2a.publishService({
      agentId: 'agent_alice',
      serviceName: 'Sentiment Analysis',
      price: 1.0,
      currency: 'USDT',
      chain: 'ethereum-sepolia',
      description: 'Sentiment analysis',
      executionTimeMs: 2000,
    });
    a2a.publishService({
      agentId: 'agent_bob',
      serviceName: 'Premium Summary',
      price: 2.0,
      currency: 'USDT',
      chain: 'ethereum-sepolia',
      description: 'Premium summarization',
      executionTimeMs: 3000,
    });
  });

  it('accepts at listed price when budget >= price', () => {
    const result = a2a.negotiatePrice('agent_alice', 'Sentiment Analysis', 1.5);
    assert.equal(result.accepted, true);
    assert.equal(result.finalPrice, 1.0);
  });

  it('negotiates a midpoint price when budget is within flexibility range', () => {
    // Alice has rep=80, flexibility=20%, price=1.0, minimum=0.80
    // Budget of 0.85 is within range: midpoint = (0.85 + 1.0) / 2
    const result = a2a.negotiatePrice('agent_alice', 'Sentiment Analysis', 0.85);
    assert.equal(result.accepted, true);
    assert.ok(result.finalPrice < result.originalPrice);
    assert.ok(result.finalPrice >= 0.85);
  });

  it('rejects when budget is below minimum acceptable', () => {
    const result = a2a.negotiatePrice('agent_alice', 'Sentiment Analysis', 0.5);
    assert.equal(result.accepted, false);
  });

  it('high-reputation agents have less price flexibility', () => {
    // Bob has rep=95, flexibility=5%, price=2.0, minimum=1.90
    // Budget of 1.85 is below minimum
    const result = a2a.negotiatePrice('agent_bob', 'Premium Summary', 1.85);
    assert.equal(result.accepted, false);
  });

  it('returns not found for non-existent service', () => {
    const result = a2a.negotiatePrice('agent_alice', 'Nonexistent', 10);
    assert.equal(result.accepted, false);
  });
});

// ── Suite: Payment Execution ────────────────────────────────────

describe('A2AProtocolService — Payment & Delivery', () => {
  let a2a: A2AProtocolService;
  let txId: string;

  before(() => {
    a2a = new A2AProtocolService();
    a2a.registerAgent(AGENT_ALICE);
    a2a.registerAgent(AGENT_BOB);
    a2a.publishService({
      agentId: 'agent_bob',
      serviceName: 'Content Summary',
      price: 0.3,
      currency: 'USDT',
      chain: 'ethereum-sepolia',
      description: 'Summarize articles',
      executionTimeMs: 1500,
    });

    // Create a transaction
    const tx = a2a.requestService('agent_alice', 'agent_bob', 'Content Summary');
    txId = tx.id;
  });

  it('creates a transaction in requested status', () => {
    const tx = a2a.getTransaction(txId);
    assert.ok(tx);
    assert.equal(tx.status, 'requested');
    assert.equal(tx.requestorId, 'agent_alice');
    assert.equal(tx.providerId, 'agent_bob');
    assert.ok(tx.platformFee > 0, 'Should include platform fee');
  });

  it('executes payment and sets status to payment_sent', () => {
    const tx = a2a.executePayment(txId);
    assert.equal(tx.status, 'payment_sent');
    assert.ok(tx.txHash, 'Should have a simulated tx hash');
    assert.ok(tx.txHash.startsWith('0x'));
  });

  it('confirms delivery and updates reputation', () => {
    const tx = a2a.confirmDelivery(txId);
    assert.equal(tx.status, 'confirmed');
    assert.ok(tx.deliveredAt, 'Should have a delivery timestamp');

    // Check reputation increased
    const bob = a2a.getAgent('agent_bob');
    assert.ok(bob);
    assert.ok(bob.reputationScore > 60, 'Provider reputation should increase');
  });

  it('throws when executing payment on already confirmed TX', () => {
    assert.throws(() => {
      a2a.executePayment(txId);
    }, /cannot be paid/);
  });
});

// ── Suite: Reputation Updates ───────────────────────────────────

describe('A2AProtocolService — Reputation & Disputes', () => {
  let a2a: A2AProtocolService;

  before(() => {
    a2a = new A2AProtocolService();
    a2a.registerAgent({ ...AGENT_ALICE, reputationScore: 80 });
    a2a.registerAgent({ ...AGENT_BOB, reputationScore: 70 });
    a2a.publishService({
      agentId: 'agent_bob',
      serviceName: 'Content Summary',
      price: 0.3,
      currency: 'USDT',
      chain: 'ethereum-sepolia',
      description: 'Summarize articles',
      executionTimeMs: 1500,
    });
  });

  it('dispute decreases provider reputation by 5', () => {
    const tx = a2a.requestService('agent_alice', 'agent_bob', 'Content Summary');
    a2a.executePayment(tx.id);

    const beforeRep = a2a.getAgent('agent_bob')!.reputationScore;
    a2a.disputeTransaction(tx.id, 'Poor quality output');

    const afterRep = a2a.getAgent('agent_bob')!.reputationScore;
    assert.equal(afterRep, beforeRep - 5);
  });

  it('reputation never goes below 0', () => {
    // Set Bob's reputation very low
    const bob = a2a.getAgent('agent_bob')!;
    bob.reputationScore = 2;

    const tx = a2a.requestService('agent_alice', 'agent_bob', 'Content Summary');
    a2a.executePayment(tx.id);
    a2a.disputeTransaction(tx.id, 'Terrible output');

    assert.ok(a2a.getAgent('agent_bob')!.reputationScore >= 0);
  });

  it('getStats returns aggregate transaction statistics', () => {
    const stats = a2a.getStats();
    assert.ok(typeof stats.totalTransactions === 'number');
    assert.ok(stats.totalTransactions >= 2);
  });
});

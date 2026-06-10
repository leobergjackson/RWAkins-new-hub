// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// Agent-to-Agent Registry — Pre-populated demo agents for the A2A network
//
// Each demo agent represents an autonomous micro-service that charges
// USDT for its capability, demonstrating machine-to-machine commerce.

import crypto from 'node:crypto';
import { A2AProtocolService } from './a2a-protocol.service.js';
import { logger } from '../utils/logger.js';

/** Derive a deterministic pseudo-wallet address from agent name (demo only). */
function deriveAddress(name: string): string {
  const hash = crypto.createHash('sha256').update(`aerofyta-a2a-${name}`).digest('hex');
  return `0x${hash.slice(0, 40)}`;
}

/** Demo agent definitions */
const DEMO_AGENTS = [
  {
    id: 'agent-data-oracle',
    name: 'DataOracle',
    capabilities: ['market-data', 'price-feed', 'historical-data'],
    reputationScore: 92,
    service: {
      serviceName: 'market-data',
      price: 0.10,
      currency: 'USDT',
      chain: 'ethereum',
      description: 'Real-time and historical market data feed for any token pair. Returns OHLCV, volume, and 24h change.',
      executionTimeMs: 1200,
    },
  },
  {
    id: 'agent-sentiment-analyzer',
    name: 'SentimentAnalyzer',
    capabilities: ['sentiment-analysis', 'creator-scoring', 'nlp'],
    reputationScore: 87,
    service: {
      serviceName: 'creator-sentiment',
      price: 0.25,
      currency: 'USDT',
      chain: 'ethereum',
      description: 'Analyzes creator sentiment from social feeds and content. Returns sentiment score, trend direction, and confidence level.',
      executionTimeMs: 3500,
    },
  },
  {
    id: 'agent-gas-optimizer',
    name: 'GasOptimizer',
    capabilities: ['gas-optimization', 'chain-routing', 'fee-estimation'],
    reputationScore: 95,
    service: {
      serviceName: 'optimal-route',
      price: 0.05,
      currency: 'USDT',
      chain: 'polygon',
      description: 'Finds the cheapest chain route for a given transfer. Compares gas fees across EVM, TON, Tron, and Solana.',
      executionTimeMs: 800,
    },
  },
] as const;

/**
 * Seed the A2A protocol with demo agents and their services.
 * Safe to call multiple times — idempotent (skips if agents already exist).
 */
export function seedA2ARegistry(protocol: A2AProtocolService): void {
  if (protocol.listAgents().length > 0) {
    logger.info('A2A registry: already seeded, skipping');
    return;
  }

  for (const def of DEMO_AGENTS) {
    const walletAddress = deriveAddress(def.name);

    protocol.registerAgent({
      id: def.id,
      name: def.name,
      walletAddress,
      capabilities: [...def.capabilities],
      reputationScore: def.reputationScore,
    });

    protocol.publishService({
      agentId: def.id,
      serviceName: def.service.serviceName,
      price: def.service.price,
      currency: def.service.currency,
      chain: def.service.chain,
      description: def.service.description,
      executionTimeMs: def.service.executionTimeMs,
    });
  }

  logger.info(`A2A registry: seeded ${DEMO_AGENTS.length} demo agents with services`);
}

/** Export agent definitions for tests or introspection */
export { DEMO_AGENTS };

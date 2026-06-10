/**
 * Swagger / OpenAPI 3.0 configuration for AeroFyta Agent API.
 *
 * Combines swagger-jsdoc auto-discovery with the existing hand-crafted
 * OpenAPI spec so that Swagger UI shows every documented endpoint.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { getOpenApiSpec } from './routes/openapi.js';

// ── Base definition (merged with JSDoc annotations) ──────────────────

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
  openapi: '3.0.3',
  info: {
    title: 'AeroFyta Agent API',
    version: '1.1.0',
    description:
      'Autonomous Multi-Chain Payment Agent powered by Tether WDK.\n\n' +
      '- **603+ API endpoints** across 35 route modules\n' +
      '- **97+ MCP tools** for agentic reasoning\n' +
      '- **12 WDK packages** — EVM, TON, Tron, Solana, BTC, ERC-4337, TON Gasless, Aave, Velora, USDT0 Bridge\n' +
      '- **ReAct reasoning loop** with Thought / Action / Observation chains\n' +
      '- **HTLC escrow**, DCA, streaming payments, atomic swaps, x402 micropayments\n' +
      '- **Agent-to-Agent (A2A)** payment protocol with service discovery & negotiation\n' +
      '- **Decision audit trail** with cryptographic proof bundles\n\n' +
      'Built for the Tether Hackathon Galactica: WDK Edition 1.',
    license: {
      name: 'Apache 2.0',
      url: 'https://www.apache.org/licenses/LICENSE-2.0',
    },
    contact: {
      name: 'AeroFyta',
      url: 'https://github.com/agdanish/aerofyta',
    },
  },
  servers: [
    { url: 'http://localhost:3001/api', description: 'Local development' },
    { url: 'https://aerofyta.agdanish.com/api', description: 'Production' },
  ],
  tags: [
    { name: 'System', description: 'Health checks, network status, and system info' },
    { name: 'Agent', description: 'Agent status, reasoning, tool-use, activity stream' },
    { name: 'Wallet', description: 'Addresses, balances, HD wallets, gasless status, signer info' },
    { name: 'Tips', description: 'Send single, batch, split, gasless, and scheduled tips' },
    { name: 'Escrow', description: 'HTLC hash-time-locked escrow — create, claim, release, refund' },
    { name: 'DeFi', description: 'Lending, bridge, swap, yield strategies, DCA, streaming' },
    { name: 'Creators', description: 'Creator discovery, RSS feeds, YouTube channels, reputation' },
    { name: 'Payments', description: 'Subscriptions, streaming payments, x402 micropayments' },
    { name: 'Security', description: 'Safety policies, risk engine, tiered approvals, ZK proofs' },
    { name: 'A2A', description: 'Agent-to-Agent payment protocol — registration, services, negotiation' },
    { name: 'Audit', description: 'Decision audit trail, statistics, cryptographic proof bundles' },
  ],
  components: {
    schemas: {},
  },
  paths: {},
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  // Scan route files for @openapi / @swagger JSDoc annotations
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './dist/routes/*.js',
  ],
};

/**
 * Generate the merged OpenAPI spec.
 *
 * 1. swagger-jsdoc scans JSDoc annotations and builds a spec.
 * 2. We merge in the existing hand-crafted paths from openapi.ts so
 *    nothing is lost.
 */
export function generateSwaggerSpec(): Record<string, unknown> {
  // Generate spec from JSDoc annotations
  const jsdocSpec = swaggerJsdoc(options) as Record<string, unknown>;

  // Pull in the existing hand-crafted spec
  const existingSpec = getOpenApiSpec();

  // Merge paths: JSDoc paths take priority, then existing
  const jsdocPaths = (jsdocSpec.paths ?? {}) as Record<string, unknown>;
  const existingPaths = (existingSpec.paths ?? {}) as Record<string, unknown>;
  const mergedPaths: Record<string, unknown> = { ...existingPaths, ...jsdocPaths };

  // Merge components/schemas
  const jsdocSchemas = ((jsdocSpec.components as Record<string, unknown>)?.schemas ?? {}) as Record<string, unknown>;
  const existingSchemas = ((existingSpec.components as Record<string, unknown>)?.schemas ?? {}) as Record<string, unknown>;
  const mergedSchemas: Record<string, unknown> = { ...existingSchemas, ...jsdocSchemas };

  // Merge tags (deduplicate by name)
  const jsdocTags = (jsdocSpec.tags ?? []) as Array<{ name: string; description?: string }>;
  const existingTags = (existingSpec.tags ?? []) as Array<{ name: string; description?: string }>;
  const tagMap = new Map<string, { name: string; description?: string }>();
  for (const tag of [...existingTags, ...jsdocTags]) {
    tagMap.set(tag.name, tag);
  }

  return {
    ...jsdocSpec,
    info: swaggerDefinition.info,
    servers: swaggerDefinition.servers,
    tags: Array.from(tagMap.values()),
    paths: mergedPaths,
    components: {
      ...((jsdocSpec.components as Record<string, unknown>) ?? {}),
      schemas: mergedSchemas,
    },
  };
}

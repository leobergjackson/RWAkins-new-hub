/**
 * OpenAPI 3.0 routes — serves full spec + Swagger UI.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { getOpenApiSpec } from './openapi.js';

/** Build the comprehensive OpenAPI 3.0 spec covering ALL major endpoint groups. */
function getFullOpenApiSpec() {
  const base = getOpenApiSpec();

  // Merge additional tags
  const extraTags = [
    { name: 'Wallet', description: 'Addresses, balances, transfers and gasless status' },
    { name: 'Agent', description: 'Agent status, tool-use, tool-policy, reasoning stream' },
    { name: 'Payments', description: 'Escrow, DCA, subscriptions, streaming, splits, x402' },
    { name: 'DeFi', description: 'Lending, bridge, swap, yield strategies' },
    { name: 'Analytics', description: 'Anomaly detection, credit scoring, reputation' },
    { name: 'Demo', description: 'Demo runner — full scenario, step-by-step, adversarial' },
    { name: 'Data', description: 'YouTube, RSS, webhooks, notifications' },
  ];

  const existingTagNames = new Set((base.tags as Array<{ name: string }>).map(t => t.name));
  for (const tag of extraTags) {
    if (!existingTagNames.has(tag.name)) {
      (base.tags as Array<{ name: string; description: string }>).push(tag);
    }
  }

  // ── Additional paths covering every major endpoint group ──

  const extraPaths: Record<string, unknown> = {
    // ── Wallet ──────────────────────────────────────────────
    '/wallet/transfer': {
      post: {
        tags: ['Wallet'],
        summary: 'Transfer funds between chains',
        description: 'Execute a cross-chain or same-chain token transfer.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['to', 'amount', 'chainId'],
                properties: {
                  to: { type: 'string', description: 'Recipient address' },
                  amount: { type: 'string', description: 'Amount to transfer' },
                  chainId: { type: 'string', description: 'Source chain ID' },
                  token: { type: 'string', enum: ['native', 'usdt'], default: 'native' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Transfer result with tx hash' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/wallet/gasless-status': {
      get: {
        tags: ['Wallet'],
        summary: 'Gasless transaction availability',
        description: 'Check ERC-4337 and TON gasless support status across all chains.',
        responses: {
          '200': {
            description: 'Gasless status per chain',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    erc4337: { type: 'boolean' },
                    tonGasless: { type: 'boolean' },
                    chains: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          chainId: { type: 'string' },
                          gaslessAvailable: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Agent ───────────────────────────────────────────────
    '/agent/status': {
      get: {
        tags: ['Agent'],
        summary: 'Full agent status',
        description: 'Returns current agent mode, active tools, decision state and loop status.',
        responses: {
          '200': {
            description: 'Agent status object',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mode: { type: 'string', enum: ['idle', 'analyzing', 'executing', 'learning'] },
                    activeTools: { type: 'array', items: { type: 'string' } },
                    loopRunning: { type: 'boolean' },
                    lastDecision: { type: 'object' },
                    uptime: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/agent/tool-use': {
      get: {
        tags: ['Agent'],
        summary: 'List available agent tools',
        description: 'Returns the full list of MCP tools the agent can invoke, with descriptions and parameter schemas.',
        responses: {
          '200': {
            description: 'Array of tool definitions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tools: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          description: { type: 'string' },
                          parameters: { type: 'object' },
                        },
                      },
                    },
                    count: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/agent/tool-policy': {
      get: {
        tags: ['Agent'],
        summary: 'Get tool invocation policies',
        description: 'Returns the policy rules governing which tools the agent can invoke autonomously vs requiring human approval.',
        responses: {
          '200': {
            description: 'Policy rules',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    autonomous: { type: 'array', items: { type: 'string' } },
                    requiresApproval: { type: 'array', items: { type: 'string' } },
                    blocked: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/agent/reasoning': {
      get: {
        tags: ['Agent'],
        summary: 'Reasoning stream (SSE)',
        description: 'Server-Sent Events stream of Thought/Action/Observation steps as the agent reasons in real time.',
        responses: {
          '200': { description: 'SSE stream (text/event-stream) with ReAct reasoning steps' },
        },
      },
    },

    // ── Payments ────────────────────────────────────────────
    '/escrow/create': {
      post: {
        tags: ['Payments'],
        summary: 'Create HTLC escrow',
        description: 'Create a hash-time-locked escrow hold with SHA-256 hashlock and timeout.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['recipient', 'amount'],
                properties: {
                  recipient: { type: 'string' },
                  amount: { type: 'string' },
                  hashlock: { type: 'string', description: 'SHA-256 hash of secret preimage' },
                  timeoutMinutes: { type: 'number', default: 60 },
                  chainId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Escrow created with ID and expiry' },
        },
      },
    },
    '/escrow/{id}/release': {
      post: {
        tags: ['Payments'],
        summary: 'Release escrow with preimage',
        description: 'Release escrowed funds by providing the secret preimage matching the hashlock.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['preimage'],
                properties: { preimage: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Escrow released, funds transferred' },
          '400': { description: 'Invalid preimage' },
        },
      },
    },
    '/dca/plans': {
      get: {
        tags: ['Payments'],
        summary: 'List DCA plans',
        description: 'Returns all active dollar-cost-averaging plans with execution history.',
        responses: { '200': { description: 'DCA plans array' } },
      },
      post: {
        tags: ['Payments'],
        summary: 'Create DCA plan',
        description: 'Set up a recurring dollar-cost-averaging plan.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['recipient', 'amount', 'frequency'],
                properties: {
                  recipient: { type: 'string' },
                  amount: { type: 'string' },
                  frequency: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'] },
                  token: { type: 'string', enum: ['native', 'usdt'] },
                  chainId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'DCA plan created' } },
      },
    },
    '/streaming/start': {
      post: {
        tags: ['Payments'],
        summary: 'Start payment stream',
        description: 'Begin a continuous micro-payment stream to a recipient at a configurable rate.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['recipient', 'ratePerSecond'],
                properties: {
                  recipient: { type: 'string' },
                  ratePerSecond: { type: 'string', description: 'Amount per second in token units' },
                  token: { type: 'string', enum: ['native', 'usdt'] },
                  chainId: { type: 'string' },
                  maxDuration: { type: 'number', description: 'Max duration in seconds' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Stream started with stream ID' } },
      },
    },
    '/streaming/active': {
      get: {
        tags: ['Payments'],
        summary: 'List active payment streams',
        description: 'Returns all currently active payment streams with accumulated amounts.',
        responses: { '200': { description: 'Active streams array' } },
      },
    },
    '/x402/pay': {
      post: {
        tags: ['Payments'],
        summary: 'x402 HTTP payment',
        description: 'Execute an x402 protocol payment — pay for API access with a 402 payment header.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url', 'maxAmount'],
                properties: {
                  url: { type: 'string', description: 'Target URL requiring payment' },
                  maxAmount: { type: 'string', description: 'Max amount willing to pay' },
                  token: { type: 'string', enum: ['native', 'usdt'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Payment successful, resource returned' },
          '402': { description: 'Payment required' },
        },
      },
    },
    '/subscriptions': {
      get: {
        tags: ['Payments'],
        summary: 'List subscriptions',
        description: 'Returns all recurring subscription payments.',
        responses: { '200': { description: 'Subscriptions array' } },
      },
      post: {
        tags: ['Payments'],
        summary: 'Create subscription',
        description: 'Set up a recurring subscription payment to a creator or service.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['recipient', 'amount', 'interval'],
                properties: {
                  recipient: { type: 'string' },
                  amount: { type: 'string' },
                  interval: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                  token: { type: 'string', enum: ['native', 'usdt'] },
                  chainId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Subscription created' } },
      },
    },

    // ── DeFi ────────────────────────────────────────────────
    '/defi/lending/positions': {
      get: {
        tags: ['DeFi'],
        summary: 'List lending positions',
        description: 'Returns all active lending and borrowing positions with APY and health factor.',
        responses: {
          '200': {
            description: 'Lending positions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    positions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          type: { type: 'string', enum: ['supply', 'borrow'] },
                          amount: { type: 'string' },
                          apy: { type: 'number' },
                          healthFactor: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/defi/bridge/quote': {
      post: {
        tags: ['DeFi'],
        summary: 'Get bridge quote',
        description: 'Get a cross-chain bridge quote with estimated fees and duration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fromChain', 'toChain', 'amount'],
                properties: {
                  fromChain: { type: 'string' },
                  toChain: { type: 'string' },
                  amount: { type: 'string' },
                  token: { type: 'string', enum: ['native', 'usdt'] },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Bridge quote with estimated time and fees' } },
      },
    },
    '/defi/swap/quote': {
      post: {
        tags: ['DeFi'],
        summary: 'Get swap quote',
        description: 'Get a token swap quote across supported DEXs.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fromToken', 'toToken', 'amount'],
                properties: {
                  fromToken: { type: 'string' },
                  toToken: { type: 'string' },
                  amount: { type: 'string' },
                  chainId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Swap quote with price impact and route' } },
      },
    },
    '/defi/yield/strategies': {
      get: {
        tags: ['DeFi'],
        summary: 'List yield strategies',
        description: 'Returns available yield optimization strategies with estimated APY.',
        responses: {
          '200': {
            description: 'Yield strategies',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    strategies: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          apy: { type: 'number' },
                          risk: { type: 'string', enum: ['low', 'medium', 'high'] },
                          chainId: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Analytics ───────────────────────────────────────────
    '/analytics/anomalies': {
      get: {
        tags: ['Analytics'],
        summary: 'Detected anomalies',
        description: 'Returns anomaly detection results from transaction pattern analysis.',
        responses: {
          '200': {
            description: 'Anomalies list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    anomalies: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          type: { type: 'string' },
                          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                          description: { type: 'string' },
                          detectedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/analytics/credit-score': {
      get: {
        tags: ['Analytics'],
        summary: 'Agent credit score',
        description: 'Returns the agent on-chain credit score computed from transaction history and reputation.',
        responses: {
          '200': {
            description: 'Credit score',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', minimum: 0, maximum: 1000 },
                    factors: { type: 'object' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/analytics/reputation': {
      get: {
        tags: ['Analytics'],
        summary: 'Reputation passport',
        description: 'Returns cross-chain reputation passport data aggregated from on-chain activity.',
        responses: {
          '200': {
            description: 'Reputation passport',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    score: { type: 'number' },
                    level: { type: 'string' },
                    badges: { type: 'array', items: { type: 'string' } },
                    history: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Demo ────────────────────────────────────────────────
    '/demo/run-full': {
      post: {
        tags: ['Demo'],
        summary: 'Run full demo scenario',
        description: 'Execute the complete demo scenario end-to-end, streaming results via SSE.',
        responses: {
          '200': { description: 'SSE stream of demo steps and results' },
        },
      },
    },
    '/demo/step': {
      post: {
        tags: ['Demo'],
        summary: 'Run single demo step',
        description: 'Execute a single numbered demo step for interactive presentations.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['step'],
                properties: {
                  step: { type: 'number', description: 'Step number (1-based)' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Step result' } },
      },
    },
    '/demo/adversarial': {
      post: {
        tags: ['Demo'],
        summary: 'Run adversarial test',
        description: 'Execute adversarial safety tests — prompt injection, amount manipulation, address spoofing.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  scenario: { type: 'string', enum: ['prompt-injection', 'amount-overflow', 'address-spoof', 'all'] },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Adversarial test results' } },
      },
    },

    // ── Data ────────────────────────────────────────────────
    '/data/youtube/channels': {
      get: {
        tags: ['Data'],
        summary: 'Monitored YouTube channels',
        description: 'Returns all YouTube channels the agent is monitoring for engagement-based tipping.',
        responses: { '200': { description: 'Channel list with engagement stats' } },
      },
    },
    '/data/rss/feeds': {
      get: {
        tags: ['Data'],
        summary: 'RSS feed sources',
        description: 'Returns all RSS feed sources being aggregated for creator activity detection.',
        responses: { '200': { description: 'RSS feeds array' } },
      },
    },
    '/data/webhooks': {
      get: {
        tags: ['Data'],
        summary: 'Registered webhooks',
        description: 'Returns all registered webhook endpoints for external event ingestion.',
        responses: { '200': { description: 'Webhooks array' } },
      },
      post: {
        tags: ['Data'],
        summary: 'Register webhook',
        description: 'Register a new webhook endpoint for receiving external events.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url', 'events'],
                properties: {
                  url: { type: 'string', format: 'uri' },
                  events: { type: 'array', items: { type: 'string' } },
                  secret: { type: 'string', description: 'HMAC signing secret' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Webhook registered' } },
      },
    },
    '/data/notifications': {
      get: {
        tags: ['Data'],
        summary: 'Recent notifications',
        description: 'Returns recent push notifications and alerts generated by the agent.',
        responses: { '200': { description: 'Notifications array' } },
      },
    },
  };

  // Merge extra paths (don't overwrite existing)
  const paths = base.paths as Record<string, unknown>;
  for (const [path, def] of Object.entries(extraPaths)) {
    if (!paths[path]) {
      paths[path] = def;
    }
  }

  return base;
}

/** Swagger UI HTML page pointing at /api/docs */
function apiDocsHtml(): string {
  const config = JSON.stringify({
    theme: 'kepler',
    layout: 'modern',
    darkMode: true,
    hideModels: false,
    hideDownloadButton: false,
    hideTestRequestButton: false,
    customCss: '.dark-mode { --scalar-color-accent: #85c742; --scalar-background-1: #0a0e1a; --scalar-background-2: #111827; --scalar-background-3: #1a1f2e; }',
    metaData: {
      title: 'AeroFyta API Reference',
      description: 'Autonomous Multi-Chain Payment Agent — 603 API endpoints powered by Tether WDK',
    },
    servers: [{ url: 'http://localhost:3001', description: 'Local Agent' }],
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AeroFyta API Reference</title>
  <style>body { margin: 0; }</style>
</head>
<body>
  <script id="api-reference" data-url="/api/docs" data-configuration='${config}'></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.70"></script>
</body>
</html>`;
}

/**
 * Register OpenAPI documentation routes on the given Express router.
 *
 * - GET /docs      — OpenAPI 3.0 JSON specification (overrides the basic one)
 * - GET /docs/ui   — Scalar API Reference (modern interactive explorer)
 */
export function registerOpenApiRoutes(router: Router): void {
  // Override the basic /docs endpoint with the comprehensive spec
  router.get('/docs', (_req, res) => {
    res.json(getFullOpenApiSpec());
  });

  // Swagger UI HTML page
  router.get('/docs/ui', (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(apiDocsHtml());
  });
}

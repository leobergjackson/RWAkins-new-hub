/**
 * OpenAPI 3.0 specification for the AeroFyta API.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export function getOpenApiSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'AeroFyta API',
      version: '1.0.0',
      description: 'AI-powered multi-chain tipping agent API',
      license: { name: 'Apache 2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' },
    },
    servers: [{ url: '/api', description: 'AeroFyta Agent' }],
    tags: [
      { name: 'System', description: 'Health checks and system info' },
      { name: 'Wallet', description: 'Wallet addresses, balances and receive info' },
      { name: 'Tips', description: 'Send single, batch and split tips' },
      { name: 'Scheduling', description: 'Schedule and manage future tips' },
      { name: 'Agent', description: 'Agent state, history, statistics and SSE streams' },
      { name: 'Contacts', description: 'Address book management' },
      { name: 'Templates', description: 'Reusable tip templates' },
      { name: 'Conditions', description: 'Conditional / smart tips' },
      { name: 'Webhooks', description: 'Gas prices, fee comparison, prices' },
      { name: 'Chat', description: 'Conversational agent interface' },
    ],
    paths: {
      // ── System ────────────────────────────────────────────────
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Service health check',
          description: 'Returns current service status, AI mode, and registered chains.',
          responses: {
            '200': {
              description: 'Health status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      agent: { type: 'string', example: 'idle' },
                      ai: { type: 'string', example: 'rule-based' },
                      chains: { type: 'array', items: { type: 'string' }, example: ['ethereum-sepolia', 'ton-testnet'] },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/network/health': {
        get: {
          tags: ['System'],
          summary: 'Network health per chain',
          description: 'Checks connectivity to each registered blockchain and returns latency and block number.',
          responses: {
            '200': {
              description: 'Network health array',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      chains: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            chainId: { type: 'string' },
                            chainName: { type: 'string' },
                            status: { type: 'string', enum: ['healthy', 'degraded', 'down'] },
                            latencyMs: { type: 'number' },
                            blockNumber: { type: 'number' },
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
      '/docs': {
        get: {
          tags: ['System'],
          summary: 'OpenAPI specification',
          description: 'Returns this OpenAPI 3.0 JSON specification.',
          responses: {
            '200': { description: 'OpenAPI spec JSON' },
          },
        },
      },
      '/chains': {
        get: {
          tags: ['System'],
          summary: 'Supported chains',
          description: 'Returns configuration for all supported blockchains.',
          responses: {
            '200': {
              description: 'Chain configs',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      chains: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ChainConfig' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/prices': {
        get: {
          tags: ['System'],
          summary: 'Approximate crypto prices',
          description: 'Returns approximate prices for ETH, TON, and USDT for conversion estimates.',
          responses: {
            '200': {
              description: 'Prices',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      prices: { type: 'object', example: { ETH: 2500, TON: 2.5, USDT: 1.0 } },
                      lastUpdated: { type: 'string', format: 'date-time' },
                      note: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ── Wallet ────────────────────────────────────────────────
      '/wallet/addresses': {
        get: {
          tags: ['Wallet'],
          summary: 'Get all wallet addresses',
          description: 'Returns wallet addresses for every registered chain.',
          responses: {
            '200': {
              description: 'Addresses by chain',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      addresses: { type: 'object', additionalProperties: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/wallet/balances': {
        get: {
          tags: ['Wallet'],
          summary: 'Get all wallet balances',
          description: 'Returns native and USDT balances for every registered chain.',
          responses: {
            '200': {
              description: 'Balances',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      balances: { type: 'array', items: { $ref: '#/components/schemas/WalletBalance' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/wallet/receive': {
        get: {
          tags: ['Wallet'],
          summary: 'Receive info with QR codes',
          description: 'Returns wallet addresses with QR code URLs and explorer links for receiving funds.',
          responses: {
            '200': {
              description: 'Receive info per chain',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      wallets: { type: 'array', items: { $ref: '#/components/schemas/WalletReceiveInfo' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/wallet/seed': {
        get: {
          tags: ['Wallet'],
          summary: 'Get seed phrase (demo only)',
          description: 'Returns the wallet seed phrase. For demo and setup display only.',
          responses: {
            '200': {
              description: 'Seed phrase',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { seed: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },

      // ── Tips ──────────────────────────────────────────────────
      '/tip': {
        post: {
          tags: ['Tips'],
          summary: 'Send a tip',
          description: 'Execute a single tip to a recipient. The agent selects the optimal chain automatically.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipient', 'amount'],
                  properties: {
                    recipient: { type: 'string', description: 'Recipient wallet address' },
                    amount: { type: 'string', description: 'Amount to send' },
                    token: { type: 'string', enum: ['native', 'usdt'], default: 'native' },
                    preferredChain: { type: 'string', description: 'Preferred chain ID' },
                    message: { type: 'string', description: 'Optional tip message' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Tip result',
              content: { 'application/json': { schema: { type: 'object', properties: { result: { $ref: '#/components/schemas/TipResult' } } } } },
            },
            '400': { description: 'Validation error' },
          },
        },
      },
      '/tip/batch': {
        post: {
          tags: ['Tips'],
          summary: 'Batch tip to multiple recipients',
          description: 'Send tips to up to 10 recipients in a single batch.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipients'],
                  properties: {
                    recipients: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['address', 'amount'],
                        properties: {
                          address: { type: 'string' },
                          amount: { type: 'string' },
                          message: { type: 'string' },
                        },
                      },
                      maxItems: 10,
                    },
                    token: { type: 'string', enum: ['native', 'usdt'], default: 'native' },
                    preferredChain: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Batch result' },
            '400': { description: 'Validation error' },
          },
        },
      },
      '/tip/split': {
        post: {
          tags: ['Tips'],
          summary: 'Split tip by percentage',
          description: 'Split a total amount among up to 5 recipients by percentage.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipients', 'totalAmount'],
                  properties: {
                    recipients: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['address', 'percentage'],
                        properties: {
                          address: { type: 'string' },
                          percentage: { type: 'number', minimum: 0, maximum: 100 },
                          name: { type: 'string' },
                        },
                      },
                      maxItems: 5,
                    },
                    totalAmount: { type: 'string' },
                    token: { type: 'string', enum: ['native', 'usdt'], default: 'native' },
                    chainId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Split result' },
            '400': { description: 'Validation error' },
          },
        },
      },
      '/tip/parse': {
        post: {
          tags: ['Tips'],
          summary: 'Parse natural language tip',
          description: 'Parse a natural language string into structured tip parameters using AI/regex.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: { input: { type: 'string', description: 'Natural language tip command' } },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Parsed tip',
              content: { 'application/json': { schema: { type: 'object', properties: { parsed: { $ref: '#/components/schemas/NLPTipParse' }, source: { type: 'string', enum: ['llm', 'regex'] } } } } },
            },
          },
        },
      },
      '/tip/estimate': {
        get: {
          tags: ['Tips'],
          summary: 'Estimate tip fees',
          description: 'Estimate transaction fees across all chains for a given recipient and amount.',
          parameters: [
            { name: 'recipient', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'amount', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Fee estimates per chain' },
          },
        },
      },
      '/tip/gasless': {
        post: {
          tags: ['Tips'],
          summary: 'Send gasless tip (ERC-4337)',
          description: 'Send a tip with zero gas fees using ERC-4337 account abstraction.',
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
                    token: { type: 'string', enum: ['native', 'usdt'], default: 'native' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Gasless tip result' },
          },
        },
      },

      // ── Scheduling ────────────────────────────────────────────
      '/tip/schedule': {
        post: {
          tags: ['Scheduling'],
          summary: 'Schedule a future tip',
          description: 'Schedule a tip to be executed at a future time, optionally recurring.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipient', 'amount', 'scheduledAt'],
                  properties: {
                    recipient: { type: 'string' },
                    amount: { type: 'string' },
                    token: { type: 'string', enum: ['native', 'usdt'], default: 'native' },
                    chain: { type: 'string' },
                    message: { type: 'string' },
                    scheduledAt: { type: 'string', format: 'date-time' },
                    recurring: { type: 'boolean', default: false },
                    interval: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Scheduled tip created' },
            '400': { description: 'Validation error' },
          },
        },
      },
      '/tip/scheduled': {
        get: {
          tags: ['Scheduling'],
          summary: 'List scheduled tips',
          description: 'Returns all scheduled tips with their current status.',
          responses: {
            '200': { description: 'List of scheduled tips' },
          },
        },
      },
      '/tip/schedule/{id}': {
        delete: {
          tags: ['Scheduling'],
          summary: 'Cancel a scheduled tip',
          description: 'Cancel a pending scheduled tip by ID.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Cancelled' },
            '404': { description: 'Not found' },
          },
        },
      },

      // ── Agent ─────────────────────────────────────────────────
      '/agent/state': {
        get: {
          tags: ['Agent'],
          summary: 'Get agent state',
          description: 'Returns the current agent state including status and current decision.',
          responses: {
            '200': {
              description: 'Agent state',
              content: { 'application/json': { schema: { type: 'object', properties: { state: { $ref: '#/components/schemas/AgentState' } } } } },
            },
          },
        },
      },
      '/agent/events': {
        get: {
          tags: ['Agent'],
          summary: 'SSE event stream',
          description: 'Server-Sent Events stream for real-time agent state updates.',
          responses: {
            '200': { description: 'SSE stream (text/event-stream)' },
          },
        },
      },
      '/activity': {
        get: {
          tags: ['Agent'],
          summary: 'Recent activity log',
          description: 'Returns the most recent activity events.',
          responses: { '200': { description: 'Activity events' } },
        },
      },
      '/activity/stream': {
        get: {
          tags: ['Agent'],
          summary: 'Activity SSE stream',
          description: 'Server-Sent Events stream for real-time activity events.',
          responses: { '200': { description: 'SSE stream (text/event-stream)' } },
        },
      },
      '/agent/history': {
        get: {
          tags: ['Agent'],
          summary: 'Tip history',
          description: 'Returns full tip history with transaction details.',
          responses: { '200': { description: 'Tip history entries' } },
        },
      },
      '/agent/history/export': {
        get: {
          tags: ['Agent'],
          summary: 'Export history as CSV',
          description: 'Download tip history as a CSV file.',
          parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['csv'], default: 'csv' } }],
          responses: { '200': { description: 'CSV file download' } },
        },
      },
      '/agent/stats': {
        get: {
          tags: ['Agent'],
          summary: 'Agent statistics',
          description: 'Returns aggregate statistics about tips, fees, and chain usage.',
          responses: { '200': { description: 'Agent stats' } },
        },
      },

      // ── Contacts ──────────────────────────────────────────────
      '/contacts': {
        get: {
          tags: ['Contacts'],
          summary: 'List contacts',
          description: 'Returns all saved contacts from the address book.',
          responses: { '200': { description: 'Contacts list' } },
        },
        post: {
          tags: ['Contacts'],
          summary: 'Add a contact',
          description: 'Save a new contact to the address book.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'address'],
                  properties: {
                    name: { type: 'string' },
                    address: { type: 'string' },
                    chain: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Contact created' },
          },
        },
      },
      '/contacts/{id}': {
        delete: {
          tags: ['Contacts'],
          summary: 'Delete a contact',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Deleted' },
            '404': { description: 'Not found' },
          },
        },
      },

      // ── Templates ─────────────────────────────────────────────
      '/templates': {
        get: {
          tags: ['Templates'],
          summary: 'List templates',
          description: 'Returns all saved tip templates.',
          responses: { '200': { description: 'Templates list' } },
        },
        post: {
          tags: ['Templates'],
          summary: 'Create a template',
          description: 'Save a new reusable tip template.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'recipient', 'amount'],
                  properties: {
                    name: { type: 'string' },
                    recipient: { type: 'string' },
                    amount: { type: 'string' },
                    token: { type: 'string', enum: ['native', 'usdt'], default: 'native' },
                    chainId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Template created' } },
        },
      },
      '/templates/{id}': {
        delete: {
          tags: ['Templates'],
          summary: 'Delete a template',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Deleted' },
            '404': { description: 'Not found' },
          },
        },
      },

      // ── Conditions ────────────────────────────────────────────
      '/conditions': {
        get: {
          tags: ['Conditions'],
          summary: 'List conditions',
          description: 'Returns all conditional tip rules.',
          responses: { '200': { description: 'Conditions list' } },
        },
        post: {
          tags: ['Conditions'],
          summary: 'Create a condition',
          description: 'Create a new conditional tip rule that fires automatically.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['type', 'tip'],
                  properties: {
                    type: { type: 'string', enum: ['gas_below', 'balance_above', 'time_of_day', 'price_change'] },
                    params: {
                      type: 'object',
                      properties: {
                        threshold: { type: 'string' },
                        currency: { type: 'string' },
                        timeStart: { type: 'string' },
                        timeEnd: { type: 'string' },
                      },
                    },
                    tip: {
                      type: 'object',
                      required: ['recipient', 'amount'],
                      properties: {
                        recipient: { type: 'string' },
                        amount: { type: 'string' },
                        token: { type: 'string', enum: ['native', 'usdt'] },
                        chainId: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Condition created' } },
        },
      },
      '/conditions/{id}': {
        delete: {
          tags: ['Conditions'],
          summary: 'Cancel a condition',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Cancelled' },
            '404': { description: 'Not found' },
          },
        },
      },

      // ── Webhooks (Fee / Gas / Gasless) ────────────────────────
      '/gas': {
        get: {
          tags: ['Webhooks'],
          summary: 'Real-time gas prices',
          description: 'Returns current gas prices across all supported chains.',
          responses: { '200': { description: 'Gas prices per chain' } },
        },
      },
      '/fees/compare': {
        get: {
          tags: ['Webhooks'],
          summary: 'Compare fees across chains',
          description: 'Compare transaction fees for a given transfer across all chains, with cost-saving recommendation.',
          parameters: [
            { name: 'recipient', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'amount', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Fee comparison with recommendation' } },
        },
      },
      '/gasless/status': {
        get: {
          tags: ['Webhooks'],
          summary: 'Gasless availability',
          description: 'Check whether ERC-4337 and TON gasless transactions are available.',
          responses: { '200': { description: 'Gasless status' } },
        },
      },
      '/tx/{hash}/status': {
        get: {
          tags: ['Webhooks'],
          summary: 'Transaction confirmation status',
          description: 'Check on-chain confirmation status for a transaction hash.',
          parameters: [
            { name: 'hash', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'chain', in: 'query', schema: { type: 'string', default: 'ethereum-sepolia' } },
          ],
          responses: {
            '200': { description: 'Transaction status' },
            '400': { description: 'Invalid request' },
          },
        },
      },

      // ── Chat ──────────────────────────────────────────────────
      '/chat': {
        post: {
          tags: ['Chat'],
          summary: 'Chat with agent',
          description: 'Send a natural language message to the AeroFyta agent. Supports tip execution, balance checks, fee queries, and more.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: { message: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Agent response',
              content: { 'application/json': { schema: { type: 'object', properties: { message: { $ref: '#/components/schemas/ChatMessage' } } } } },
            },
          },
        },
      },

      // ── Leaderboard / Achievements ────────────────────────────
      '/leaderboard': {
        get: {
          tags: ['Agent'],
          summary: 'Top tip recipients',
          description: 'Returns leaderboard of most-tipped addresses.',
          responses: { '200': { description: 'Leaderboard entries' } },
        },
      },
      '/achievements': {
        get: {
          tags: ['Agent'],
          summary: 'Achievement progress',
          description: 'Returns gamification achievements with progress tracking.',
          responses: { '200': { description: 'Achievements' } },
        },
      },
    },

    components: {
      schemas: {
        ChainConfig: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            blockchain: { type: 'string' },
            isTestnet: { type: 'boolean' },
            nativeCurrency: { type: 'string' },
            explorerUrl: { type: 'string' },
          },
        },
        WalletBalance: {
          type: 'object',
          properties: {
            chainId: { type: 'string' },
            address: { type: 'string' },
            nativeBalance: { type: 'string' },
            nativeCurrency: { type: 'string' },
            usdtBalance: { type: 'string' },
          },
        },
        WalletReceiveInfo: {
          type: 'object',
          properties: {
            chainId: { type: 'string' },
            chainName: { type: 'string' },
            address: { type: 'string' },
            qrCodeUrl: { type: 'string' },
            explorerUrl: { type: 'string' },
            nativeCurrency: { type: 'string' },
          },
        },
        TipResult: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tipId: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'failed'] },
            chainId: { type: 'string' },
            txHash: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            amount: { type: 'string' },
            token: { type: 'string' },
            fee: { type: 'string' },
            explorerUrl: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            error: { type: 'string' },
          },
        },
        NLPTipParse: {
          type: 'object',
          properties: {
            recipient: { type: 'string' },
            amount: { type: 'string' },
            token: { type: 'string', enum: ['native', 'usdt'] },
            chain: { type: 'string' },
            message: { type: 'string' },
            confidence: { type: 'number' },
            rawInput: { type: 'string' },
          },
        },
        AgentState: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['idle', 'analyzing', 'reasoning', 'executing', 'confirming'] },
            currentTip: { type: 'object' },
            currentDecision: { type: 'object' },
            lastError: { type: 'string' },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            role: { type: 'string', enum: ['user', 'agent'] },
            content: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            action: { type: 'object' },
          },
        },
      },
    },
  };
}

# AeroFyta API Reference

Full OpenAPI 3.0 spec available at `http://localhost:3001/api/docs` when the agent is running.

---

## Key API Endpoints

### Multi-Strategy Agent
- `GET /api/strategies/summary` — 4-track strategy overview
- `GET /api/strategies/decisions` — All autonomous decisions with reasoning
- `GET /api/strategies/lending/positions` — Active Aave V3 positions
- `GET /api/strategies/defi/actions` — Recent swaps, bridges, rebalances
- `GET /api/strategies/wallets/health` — 9-chain wallet health

### Autonomous Tipping
- `GET /api/autonomous/status` — Loop status + decision history
- `POST /api/autonomous/start` — Start autonomous mode
- `GET /api/autonomous/decisions` — Chain-of-thought reasoning

### Safety
- `POST /api/safety/kill-switch` — Emergency stop all autonomous activity
- `GET /api/safety/status` — Budget, limits, pending approvals

### Wallets
- `GET /api/wallet/balances` — Cross-chain balances (9 chains)
- `GET /api/wallet/addresses` — All wallet addresses
- `GET /api/fees/compare` — Cross-chain fee comparison with cheapest recommendation

### DeFi
- `POST /api/orchestrator/propose` — Multi-agent consensus for any action (tip, lend, swap, bridge)
- `GET /api/fees/optimal-timing` — Congestion analysis and timing recommendation

---

## Services Architecture (64 Services)

### Core (8 services)
| Service | Description |
|---------|-------------|
| Agent | 10-step decision pipeline with scheduler and conditions |
| AI | Groq/Ollama LLM + NLP + intent detection + confidence scoring |
| Autonomous Loop | Self-directed decision cycle every 60s |
| Multi-Strategy | 4-track strategy engine (tip, lend, DeFi, wallet) |
| Memory | Pattern storage, learning, and recall |
| Personality | 5 distinct agent personas |
| Agent Identity | Agent self-description and capability registry |
| Decision Log | Full audit trail of every autonomous decision |

### Wallet (8 services)
| Service | Description |
|---------|-------------|
| Wallet | WDK operations, HD derivation, multi-account, gasless |
| Wallet Ops | Routing analysis, preflight checks, fee estimation |
| Bridge | USDT0 cross-chain bridge via LayerZero |
| Swap | Token swaps via Velora DEX |
| Fee Arbitrage | Cross-chain fee monitoring with optimal timing |
| Indexer | WDK Indexer API client for on-chain verification |
| RPC Failover | Automatic fallback across multiple RPC endpoints |
| Retry | Transaction retry with exponential backoff |

### Safety (4 services)
| Service | Description |
|---------|-------------|
| Safety | Kill switch, blocked addresses, policy enforcement |
| Risk Engine | Real-time risk scoring per transaction |
| Limits | Daily/weekly/per-tip spending enforcement |
| Tip Policy | Configurable rules for autonomous execution |

### Economics (10 services)
| Service | Description |
|---------|-------------|
| Economics | Economic viability checks, circuit breaker |
| Treasury | Auto-rebalancing, idle fund deployment to Aave V3 |
| Lending | Aave V3 supply/withdraw/borrow operations |
| DCA | Dollar Cost Averaging scheduled purchases |
| Revenue Smoothing | Predictable creator income from irregular tips |
| Creator Analytics | Engagement scoring and trend analysis |
| Reputation | Time-decaying creator scores, Bronze-to-Diamond tiers |
| Escrow | Conditional tip holding with release conditions |
| Streaming | Continuous micro-tipping protocol (pay-per-second) |
| Tip Queue | Ordered tip processing with priority |

### Platform (9 services)
| Service | Description |
|---------|-------------|
| Rumble | Creator profiles, watch-time, events, pools |
| Telegram | Bot with 7 commands for notifications |
| Platform Adapter | Multi-platform abstraction layer |
| Creator Discovery | Find and recommend new creators |
| Proof of Engagement | Verify viewer engagement before tipping |
| Tip Propagation | Viral tipping mechanics |
| Demo | Pre-seeded data for judges |
| Event Simulator | Simulated Rumble events for testing |
| Contacts | Address book with groups and import/export |

### Advanced (7 services)
| Service | Description |
|---------|-------------|
| x402 | HTTP 402 micropayment protocol |
| Orchestrator | Multi-agent consensus (3 sub-agents, 2-of-3 voting) |
| Predictor | Anticipate tips before user asks |
| Export | Multi-format export (CSV/JSON/MD/Summary) |
| Receipt | Cryptographic Proof-of-Tip (WDK sign/verify) |
| Webhooks | HTTP callbacks for tip events |
| Templates | Reusable tip configurations |

### Utility (5 services)
| Service | Description |
|---------|-------------|
| Conditions | Conditional tip triggers (gas_below, balance_above, time_of_day) |
| Challenges | Daily/weekly gamified tipping challenges |
| Goals | Fundraising tip goals with progress tracking |
| Tags | Color-coded address tagging |
| ENS | .eth name resolution with caching |

---

## Environment Variables

```bash
# Required
WDK_SEED=your twelve word seed phrase here

# Optional — AI
GROQ_API_KEY=gsk_...                          # Groq LLM (free tier)
OLLAMA_HOST=http://localhost:11434             # Local LLM fallback

# Optional — Integrations
TELEGRAM_BOT_TOKEN=your_token                 # Telegram bot
ERC4337_BUNDLER_URL=https://...               # Gasless (Pimlico)
ERC4337_PAYMASTER_URL=https://...             # Gasless (Pimlico)
ETH_MAINNET_RPC=https://cloudflare-eth.com    # ENS resolution
```

See `agent/.env.example` for the full template.

---

## Third-Party Services

All external services are free. No paid subscriptions required.

| Service | Purpose | Cost |
|---------|---------|------|
| **Tether WDK** (12 packages) | Core wallet SDK — all chain operations | Free (Apache 2.0) |
| **Groq API** | LLM inference (Llama/Mixtral models) | Free tier |
| **Ollama** (optional) | Local LLM inference (phi3:mini) | Free |
| **Bitfinex Public API** | Real-time crypto pricing | Free (no key) |
| **DeFi Llama API** | DeFi yield rates for treasury optimization | Free (no key) |
| **WDK Indexer API** | Unified cross-chain balance/transfer data | Free |
| **Public RPC endpoints** | Sepolia (publicnode.com), TON (toncenter.com), TRON (nile.trongrid.io) | Free |
| **Aave V3** | Yield generation on Sepolia testnet | Free (testnet) |

---

## Project Structure

```
Tether-WDK-Hackathon/
├── agent/                              # Node.js agent server
│   └── src/
│       ├── core/agent.ts               # 10-step pipeline + scheduler
│       ├── services/                   # 64 services (see Services Architecture)
│       │   ├── multi-strategy.service.ts  # 4-track strategy engine
│       │   ├── autonomous-loop.service.ts # 60s decision cycle
│       │   ├── lending.service.ts         # Aave V3 operations
│       │   ├── swap.service.ts            # Velora DEX swaps
│       │   ├── bridge.service.ts          # USDT0 cross-chain bridge
│       │   └── ...                        # 46 more services
│       ├── routes/
│       │   ├── api.ts                  # REST/SSE endpoints
│       │   ├── advanced.ts             # Advanced endpoints
│       │   └── openapi.ts              # OpenAPI 3.0 spec
│       ├── mcp-server.ts              # 55+ MCP tools (WDK + custom)
│       ├── sdk/                        # SDK exports
│       ├── __tests__/                  # Automated tests
│       └── index.ts                    # Express 5 entry point
├── dashboard/                          # React frontend
│   └── src/
│       ├── components/                 # 118 React components
│       ├── hooks/                      # Custom hooks
│       ├── lib/                        # API client, i18n, utils
│       └── types/                      # TypeScript interfaces
├── docs/                               # Detailed documentation
│   ├── API.md                          # API endpoints, services, env vars
│   └── FEATURES.md                     # Full feature descriptions
├── model-council/                      # 8-model research council output
├── Dockerfile                          # Multi-stage production build
├── docker-compose.yml                  # One-command startup
├── package.json                        # Root orchestrator
├── SKILL.md                            # OpenClaw agent skills
├── LICENSE                             # Apache 2.0
└── README.md
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `npm install` fails on WDK packages | Ensure Node.js 22+ (`node -v`). Delete `node_modules` and `package-lock.json`, then retry. |
| Agent won't start / `SEED_PHRASE` error | Copy `agent/.env.example` to `agent/.env` and fill in a valid 12-word BIP39 seed phrase. |
| Dashboard shows "Failed to load data" | Make sure the agent is running on port 3001 first (`cd agent && npm run dev`). |
| `GROQ_API_KEY` / `GEMINI_API_KEY` missing | The agent works without LLM keys (falls back to rule-based mode). Add free API keys from [groq.com](https://console.groq.com) or [aistudio.google.com](https://aistudio.google.com) for full AI-driven decisions. |
| WDK wallet initialization fails | This is normal on first run — the agent creates wallets automatically. If it persists, check that your seed phrase is valid BIP39. |
| Port 3001 already in use | Kill existing process: `lsof -i :3001` (macOS/Linux) or `netstat -ano \| findstr 3001` (Windows), then kill the PID. |
| TypeScript compilation errors | Run `cd agent && npx tsc --noEmit` and `cd dashboard && npx tsc --noEmit` to check. Both should compile with 0 errors. |
| CORS errors in browser console | The agent defaults to allowing `http://localhost:5173`. Set `CORS_ORIGIN` in `agent/.env` if your dashboard runs on a different port. |

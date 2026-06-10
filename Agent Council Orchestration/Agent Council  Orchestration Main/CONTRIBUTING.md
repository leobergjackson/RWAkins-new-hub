# Contributing to AeroFyta

Thank you for your interest in contributing to AeroFyta. This guide covers everything you need to get started.

## Getting Started

### Prerequisites

- **Node.js 22+** (required for Tether WDK compatibility)
- **npm 10+**
- **Git**

### Setup

```bash
git clone https://github.com/agdanish/aerofyta.git
cd aerofyta
npm install
npm run dev
```

The dashboard opens at `http://localhost:5173` and the agent API at `http://localhost:3001`.

### Environment Variables (Optional)

```bash
cp agent/.env.example agent/.env
```

| Variable | Required | Source |
|----------|----------|--------|
| `GROQ_API_KEY` | Optional | [console.groq.com](https://console.groq.com) (free) |
| `YOUTUBE_API_KEY` | Optional | [Google Cloud Console](https://console.cloud.google.com) |
| `WDK_SEED` | Auto-generated | 12-word BIP-39 mnemonic |

Without API keys, the agent falls back to rule-based reasoning.

---

## Project Structure

```
aerofyta/
├── agent/                  # Backend — Express + WDK + Agent Core
│   └── src/
│       ├── core/           # Agent brain, ReAct engine, consensus
│       ├── services/       # WDK wallet ops, risk engine, yield
│       ├── controllers/    # Express route handlers
│       ├── routes/         # API route definitions (603 endpoints)
│       ├── mcp-server.ts   # MCP tool server (97+ tools)
│       ├── cli/            # CLI commands (107 commands)
│       ├── telegram/       # Telegram bot integration
│       ├── sdk/            # Published npm SDK
│       ├── middleware/     # Auth, rate limiting, error handling
│       ├── __tests__/     # Vitest test suites
│       └── types/         # TypeScript type definitions
├── dashboard/              # Frontend — React + Vite + Tailwind
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page-level views (42 pages)
│       └── hooks/          # Custom React hooks
├── contracts/              # Solidity smart contracts
│   ├── AgentRegistry.sol
│   ├── TipSplitter.sol
│   └── AgentEscrow.sol
├── extension/              # Chrome extension for in-page tipping
└── docs/                   # Documentation
```

---

## Code Standards

### TypeScript

- **Strict mode** enabled — no `any` casts, no `as any`
- Explicit return types on all exported functions
- Use `interface` over `type` for object shapes
- Prefer `const` over `let`; never use `var`

### Formatting

- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line expressions
- No semicolons (project uses ASI)

### License Headers

Every source file must include the Apache 2.0 header:

```typescript
// Copyright 2026 Danish A G
// SPDX-License-Identifier: Apache-2.0
```

### Error Handling

- All wallet operations must have try/catch with meaningful error messages
- Never swallow errors silently — log and propagate
- Use the project's standardized error types from `agent/src/types/`

### Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Files | kebab-case | `wallet-manager.ts` |
| Classes | PascalCase | `WalletManager` |
| Functions | camelCase | `getWalletHealth()` |
| Constants | UPPER_SNAKE | `MAX_TIP_AMOUNT` |
| Types/Interfaces | PascalCase | `WalletState` |

---

## How to Add a New Chain

1. **Install the WDK package** for the chain:
   ```bash
   cd agent && npm install @tetherto/wdk-wallet-<chain>
   ```

2. **Register the wallet provider** in `agent/src/services/` — create a new service file following the pattern of existing chain services.

3. **Add chain config** to the chain registry in `agent/src/core/` with:
   - Chain ID and name
   - RPC endpoints (testnet + mainnet)
   - Gas estimation parameters
   - USDT contract address

4. **Add API routes** in `agent/src/routes/` for chain-specific operations.

5. **Add dashboard support** in `dashboard/src/` — wallet display, chain selector, transaction history.

6. **Add tests** — minimum: wallet creation, balance check, transaction send.

7. **Update documentation** — README chain table, API docs, feature list.

---

## How to Add a New MCP Tool

MCP tools expose agent capabilities to external AI systems.

1. **Define the tool** in `agent/src/mcp-server.ts`:
   ```typescript
   server.tool('tool-name', 'Description of what it does', {
     param1: z.string().describe('Parameter description'),
   }, async ({ param1 }) => {
     // Implementation
     return { content: [{ type: 'text', text: JSON.stringify(result) }] }
   })
   ```

2. **Follow naming conventions**: `verb-noun` format (e.g., `get-balance`, `send-tip`, `check-health`).

3. **Include input validation** using Zod schemas.

4. **Return structured JSON** — MCP consumers expect parseable output.

5. **Add tests** for the tool handler logic.

---

## How to Add a New OpenClaw Skill

OpenClaw skills are reasoning patterns the agent uses during its ReAct loop.

1. **Create the skill file** in the skills directory following the existing pattern.

2. **Define the skill interface**:
   - Name and description
   - Input parameters
   - Expected output format
   - Reasoning template (Thought/Action/Observe/Reflect/Decide)

3. **Register the skill** in the agent's skill registry.

4. **Add consensus rules** — define how the 3 agents (TipExecutor, Guardian, TreasuryOptimizer) should evaluate this skill's output.

5. **Test the full loop** — skill invocation through consensus to execution.

---

## Pull Request Process

1. **Fork and branch** — create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature main
   ```

2. **Write code** — follow the standards above.

3. **Write tests** — all new features require tests. Run the full suite:
   ```bash
   cd agent && npm test
   ```

4. **Lint and type-check**:
   ```bash
   npm run build
   ```

5. **Commit with clear messages**:
   ```
   feat: add Celo chain support with gasless tipping
   fix: handle WDK timeout on TON wallet creation
   docs: update chain compatibility table
   ```

6. **Open a PR** against `main` with:
   - Summary of changes
   - Link to related issue (if any)
   - Screenshots for UI changes
   - Test results

7. **Review** — all PRs require at least one approval.

---

## Testing Requirements

- **Unit tests** for all business logic (agent reasoning, risk scoring, fee calculation)
- **Integration tests** for WDK wallet operations (use testnet)
- **API tests** for all new endpoints
- **No mocked WDK calls** in integration tests — use real testnet transactions
- Run the full suite before submitting:
  ```bash
  cd agent && npm test
  ```

---

## Reporting Issues

- Use GitHub Issues with a clear title and reproduction steps
- Include Node.js version, OS, and relevant error output
- For security issues, see [SECURITY.md](./SECURITY.md)

---

## License

By contributing, you agree that your contributions will be licensed under the [Apache 2.0 License](./LICENSE).

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — OpenClaw RBAC Role Definitions (extracted from openclaw.service.ts)

import type { AgentRole } from './openclaw.service.js';

/** Get default RBAC roles for the OpenClaw agent framework */
export function getDefaultRoles(): AgentRole[] {
  return [
    {
      id: 'wallet_executor',
      name: 'Wallet Executor',
      permissions: ['read', 'write', 'execute'],
      allowedTools: ['wallet_balance', 'wallet_send', 'wallet_create', 'wallet_sign', 'wallet_history'],
      maxBudgetUsd: 100,
      maxTransactionsPerHour: 50,
      requiresApproval: false,
      description: 'Executes wallet operations (WDK layer) — separated from agent reasoning',
    },
    {
      id: 'strategy_planner',
      name: 'Strategy Planner',
      permissions: ['read'],
      allowedTools: ['price_check', 'gas_estimate', 'risk_assess', 'yield_scan', 'market_data'],
      maxBudgetUsd: 0,
      maxTransactionsPerHour: 0,
      requiresApproval: false,
      description: 'Plans strategies using data tools — no execution permissions (agent logic layer)',
    },
    {
      id: 'safety_guardian',
      name: 'Safety Guardian',
      permissions: ['read', 'admin'],
      allowedTools: ['*'],
      maxBudgetUsd: 0,
      maxTransactionsPerHour: 0,
      requiresApproval: false,
      description: 'Monitors and can veto any operation — highest privilege for safety',
    },
    {
      id: 'defi_operator',
      name: 'DeFi Operator',
      permissions: ['read', 'write', 'execute'],
      allowedTools: ['swap_quote', 'swap_execute', 'bridge_transfer', 'lending_supply', 'lending_withdraw', 'yield_deposit'],
      maxBudgetUsd: 500,
      maxTransactionsPerHour: 20,
      requiresApproval: true,
      description: 'Interacts with DeFi protocols — requires approval for execution',
    },
    {
      id: 'tip_agent',
      name: 'Tip Agent',
      permissions: ['read', 'write', 'execute'],
      allowedTools: ['wallet_send', 'price_check', 'creator_lookup', 'engagement_score', 'tip_history'],
      maxBudgetUsd: 50,
      maxTransactionsPerHour: 100,
      requiresApproval: false,
      description: 'Autonomous tipping agent — sends tips based on engagement data',
    },
  ];
}

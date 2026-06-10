// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Multi-Agent System — Barrel exports

export { MessageBus, type AgentMessage, type MessageType, type MessageHandler } from './message-bus.js';

export {
  BaseAgent,
  type AgentContext,
  type AgentAnalysis,
  type Proposal,
  type Vote,
  type Action,
  type ExecutionResult,
  type AgentStatus,
  type TipRecord,
} from './base-agent.js';

export { TipExecutorAgent } from './tip-executor.agent.js';
export { GuardianAgent } from './guardian.agent.js';
export { TreasuryOptimizerAgent } from './treasury-optimizer.agent.js';
export { DiscoveryAgent } from './discovery.agent.js';

export {
  MultiAgentOrchestrator,
  type CycleResult,
  type DecisionRecord,
  type OrchestratorStatus,
} from './orchestrator.js';

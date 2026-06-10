// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta Agent SDK — Plug autonomous payment intelligence into any Tether WDK app.
//
// Usage:
//   import { createAeroFytaAgent } from 'aerofyta-agent/create';
//   import { AIService, SafetyService } from 'aerofyta-agent';

// ── Core Agent Intelligence ─────────────────────────────────────────
/** AI service providing intent detection, chain reasoning, and NLP capabilities */
export { AIService } from '../services/ai.service.js';
/** Multi-agent orchestrator for consensus-based decision making */
export { OrchestratorService } from '../services/orchestrator.service.js';
/** OpenClaw ReAct reasoning engine with tool use */
export { OpenClawService } from '../services/openclaw.service.js';
export type { ToolDefinition, ToolResult } from '../services/openclaw.service.js';

// ── Wallet-as-Brain ─────────────────────────────────────────────────
/**
 * Financial pulse metrics that drive the agent's mood and decision-making.
 * Calculates liquidity, diversification, and velocity scores from on-chain data.
 */
export {
  calculateFinancialPulse,
  getWalletMood,
  getMoodPreferredChain,
  getMoodBatchSize,
  getMoodRiskTolerance,
  getMoodModifiers,
} from '../services/financial-pulse.js';
export type {
  FinancialPulse,
  WalletMood,
  WalletMoodState,
  MoodModifiers,
} from '../services/financial-pulse.js';

// ── Autonomous Loop ─────────────────────────────────────────────────
/** Service that runs the 60-second autonomous ReAct cycle for proactive agent behavior */
export { AutonomousLoopService } from '../services/autonomous-loop.service.js';

// ── Multi-Agent Consensus ───────────────────────────────────────────
/** Alias for OrchestratorService, used for multi-agent consensus workflows */
export { OrchestratorService as ConsensusOrchestrator } from '../services/orchestrator.service.js';

// ── Safety & Security ───────────────────────────────────────────────
/** Core safety service enforcing spend limits, kill switch, and policy validation */
export { SafetyService } from '../services/safety.service.js';
export type { PolicyValidation, ApprovalTier } from '../services/safety.service.js';
/** Risk assessment engine computing risk scores for transactions */
export { RiskEngineService } from '../services/risk-engine.service.js';
export type { RiskLevel, RiskAssessment } from '../services/risk-engine.service.js';
/** Rule-based policy enforcement for automated compliance */
export { PolicyEnforcementService } from '../services/policy-enforcement.service.js';
/** Statistical anomaly detection using z-score analysis */
export { AnomalyDetectionService } from '../services/anomaly-detection.service.js';
/** Credit scoring service for recipient trustworthiness evaluation */
export { CreditScoringService } from '../services/credit-scoring.service.js';
export {
  validateSeverityEscalation,
} from '../services/orchestrator.service.js';
export type {
  SeverityLevel,
  DataIntegrityResult,
  DeEscalationAuditEntry,
} from '../services/orchestrator.service.js';

// ── Payment Primitives ──────────────────────────────────────────────
/** HTLC-based escrow service for trustless conditional payments */
export { EscrowService } from '../services/escrow.service.js';
/** Dollar-cost averaging plan management */
export { DcaService } from '../services/dca.service.js';
/** Streaming payment service for continuous micro-payments */
export { StreamingService } from '../services/streaming.service.js';
/** Recurring and scheduled payment automation */
export { AutoPaymentsService } from '../services/auto-payments.service.js';
/** Tip splitting service for distributing payments among multiple recipients */
export { TipSplitterService } from '../services/tip-splitter.service.js';
/** Cross-chain atomic swap service */
export { AtomicSwapService } from '../services/atomic-swap.service.js';
/** Advanced escrow with milestone-based releases */
export { SmartEscrowService } from '../services/smart-escrow.service.js';

// ── Wallet & Chain Operations ───────────────────────────────────────
/** Multi-chain wallet service wrapping Tether WDK */
export { WalletService } from '../services/wallet.service.js';
/** Advanced wallet operations (batch transfers, gas estimation) */
export { WalletOpsService } from '../services/wallet-ops.service.js';
/** Token swap service with DEX aggregation */
export { SwapService } from '../services/swap.service.js';
/** Cross-chain bridge service */
export { BridgeService } from '../services/bridge.service.js';
/** DeFi lending and borrowing integration */
export { LendingService } from '../services/lending.service.js';
/** Fee arbitrage service for optimizing transaction costs across chains */
export { FeeArbitrageService } from '../services/fee-arbitrage.service.js';

// ── Data & Analytics ────────────────────────────────────────────────
/** Portable reputation passport with cross-chain attestations */
export { ReputationPassportService } from '../services/reputation-passport.service.js';
/** Persistent memory service for agent learning and context */
export { MemoryService } from '../services/memory.service.js';
/** Zero-knowledge proof generation and verification */
export { ZKProofService } from '../services/zk-proof.service.js';
/** Creator analytics with engagement scoring */
export { CreatorAnalyticsService } from '../services/creator-analytics.service.js';
/** Creator discovery service for finding and ranking content creators */
export { CreatorDiscoveryService } from '../services/creator-discovery.service.js';
/** Address reputation tracking and scoring */
export { ReputationService } from '../services/reputation.service.js';
/** Programmable tip policy engine */
export { TipPolicyService } from '../services/tip-policy.service.js';
/** Immutable decision audit log */
export { DecisionLogService } from '../services/decision-log.service.js';
/** Tax reporting and export service */
export { TaxReportingService } from '../services/tax-reporting.service.js';

// ── Platform & Identity ────────────────────────────────────────────
/** Agent identity management (DID, keys, attestations) */
export { AgentIdentityService } from '../services/agent-identity.service.js';
/** Multi-platform adapter (Telegram, Discord, web) */
export { PlatformAdapterService } from '../services/platform-adapter.service.js';
/** Agent personality and communication style */
export { PersonalityService } from '../services/personality.service.js';
/** Rumble video platform integration */
export { RumbleService } from '../services/rumble.service.js';
/** Proof-of-engagement verification for content consumption */
export { ProofOfEngagementService } from '../services/proof-of-engagement.service.js';

// ── Economics ───────────────────────────────────────────────────────
/** Protocol economics: fee collection, revenue sharing */
export { EconomicsService } from '../services/economics.service.js';
/** Treasury management with rebalancing strategies */
export { TreasuryService } from '../services/treasury.service.js';
/** Revenue smoothing for predictable agent income */
export { RevenueSmoothingService } from '../services/revenue-smoothing.service.js';
/** Self-sustaining agent economics (earn to cover operating costs) */
export { SelfSustainingService } from '../services/self-sustaining.service.js';
/** Bitfinex price feed integration */
export { BitfinexPricingService } from '../services/bitfinex-pricing.service.js';

// ── Advanced ────────────────────────────────────────────────────────
/** On-chain governance with proposal and voting mechanics */
export { GovernanceService } from '../services/governance.service.js';
/** Multi-strategy portfolio management */
export { MultiStrategyService } from '../services/multi-strategy.service.js';
/** Trading swarm with consensus-driven execution */
export { TradingSwarmService } from '../services/trading-swarm.service.js';
/** Wallet swarm for distributed operations */
export { WalletSwarmService } from '../services/wallet-swarm.service.js';
/** Zero-knowledge privacy layer for anonymous transactions */
export { ZKPrivacyService } from '../services/zk-privacy.service.js';
/** DeFi strategy service for yield optimization */
export { DeFiStrategyService } from '../services/defi-strategy.service.js';

// ── Persistence ─────────────────────────────────────────────────────
/**
 * Create a persistence provider for durable agent state.
 * Supports JSON file, SQLite, and PostgreSQL backends.
 */
export {
  createPersistence,
  JsonFilePersistence,
  SqlitePersistence,
} from '../services/persistence.service.js';
export type {
  PersistenceProvider,
  PersistenceMode,
} from '../services/persistence.service.js';

// ── Service Registry ────────────────────────────────────────────────
/** Central registry managing all agent service instances */
export { ServiceRegistry } from '../services/service-registry.js';

// ── SDK Client (HTTP) ───────────────────────────────────────────────
/**
 * HTTP client for connecting to a remote AeroFyta agent instance.
 * Use this when the agent runs as a standalone server.
 */
export { TipFlowClient } from './client.js';
export type { TipFlowConfig, SendTipParams } from './client.js';

// ── High-Level SDK ───────────────────────────────────────────────
/**
 * AeroFytaSDK — clean, high-level SDK class wrapping all AeroFyta
 * capabilities for third-party developers. Supports wallets, tipping,
 * escrow, AI reasoning, A2A discovery, and gasless simulation.
 *
 * @example
 * ```typescript
 * import { AeroFytaSDK } from '@xzashr/aerofyta';
 * const sdk = new AeroFytaSDK('http://localhost:3001', 'my-key');
 * const balances = await sdk.getBalances();
 * ```
 */
export { AeroFytaSDK, AeroFytaSDKError as SDKError } from './agent-sdk.js';
export type {
  ChainBalance,
  TipResult as SDKTipResult,
  Tip as SDKTip,
  EscrowResult as SDKEscrowResult,
  AgentStatus as SDKAgentStatus,
  BrainState as SDKBrainState,
  ReasoningResult as SDKReasoningResult,
  Agent as SDKAgent,
  ServiceResult as SDKServiceResult,
  GaslessSimulation,
  SDKConfig,
} from './agent-sdk.js';

// ── Factory ─────────────────────────────────────────────────────────
/**
 * Create a fully-configured AeroFyta agent with one function call.
 * @param config - Agent configuration (seed phrase required, everything else optional)
 * @returns Agent object with tip(), escrow, swap, ask(), reason(), shutdown(), isHealthy() methods
 * @example
 * ```typescript
 * const agent = await createAeroFytaAgent({ seed: '...' });
 * await agent.tip('0x...', 0.01);
 * const health = agent.isHealthy();
 * await agent.shutdown();
 * ```
 */
export { createAeroFytaAgent } from './create-agent.js';
export type { AeroFytaConfig, AeroFytaAgent, HealthCheckResult } from './create-agent.js';

// ── Errors ──────────────────────────────────────────────────────────
/**
 * Structured error class for all SDK operations.
 * Includes machine-readable code, originating method, and optional details.
 */
export { AeroFytaSDKError, validateNonEmptyString, validatePositiveAmount, validateChainId } from './errors.js';

// ── Retry Utility ───────────────────────────────────────────────────
/**
 * Retry async operations with exponential backoff.
 * Used internally by the WDK plugin; also available for custom integrations.
 */
export { withRetry } from './retry.js';

// ── Middleware ───────────────────────────────────────────────────────
/**
 * Express middleware that injects an AeroFyta agent into every request.
 * Includes built-in rate limiting (configurable, 60 req/min default).
 */
export { aerofytaMiddleware, RateLimiter } from './middleware.js';
export type { AeroFytaMiddlewareConfig, RateLimitConfig } from './middleware.js';

// ── WDK Protocol Plugin ─────────────────────────────────────────────
/**
 * WDK protocol plugin that registers AeroFyta as a first-class protocol
 * alongside Aave, Velora, etc. in the Tether WDK ecosystem.
 */
export { AeroFytaProtocol } from './wdk-plugin.js';
export type { AeroFytaProtocolConfig, ProtocolTipResult, CreatorEvaluation, Recommendation, ProtocolEscrowParams, ProtocolAgentStatus, ProtocolFinancialPulse } from './wdk-plugin.js';

// ── Presets ─────────────────────────────────────────────────────────
/**
 * Ready-made agent configurations for common use cases.
 * Includes tipBot, treasuryManager, escrowAgent, paymentProcessor, and advisor.
 */
export { PRESETS, createFromPreset, listPresets } from './presets.js';
export type { AgentPreset, PresetName } from './presets.js';

// ── Lifecycle Hooks ─────────────────────────────────────────────────
/**
 * Event hook registry for subscribing to agent lifecycle events
 * (tips, escrows, anomalies, mood changes, cycle events).
 */
export { HookRegistry } from './hooks.js';
export type { HookEvent, HookHandler, TipEventData, BlockEventData, AnomalyEventData, MoodEventData, EscrowEventData, CycleEventData } from './hooks.js';

// ── Chain Adapters ──────────────────────────────────────────────────
/**
 * Chain adapter layer that normalizes any WDK wallet into a uniform ChainWallet interface.
 * Supports EVM, TON, Tron, Bitcoin, and Solana chains.
 */
export { EVMAdapter, TONAdapter, TronAdapter, BitcoinAdapter, SolanaAdapter, UniversalAdapter } from './adapters/index.js';
export type { ChainWallet, WDKAccount } from './adapters/index.js';

// ── Types (re-export all important domain types) ────────────────────
export type {
  ChainId,
  TokenType,
  ChainConfig,
  WalletBalance,
  TipRequest,
  TipResult,
  AgentDecision,
  AgentState,
  ReasoningStep,
  ChainAnalysis,
  FeeComparison,
  NLPTipParse,
  ChatIntent,
  ChatMessage,
  ExtractedEntities,
  ContentAnalysis,
  ConfirmationResult,
  BatchTipRequest,
  BatchTipResult,
  TipHistoryEntry,
  ScheduledTip,
  TipTemplate,
  Contact,
  SplitRecipient,
  SplitTipRequest,
  SplitTipResult,
  ActivityEvent,
  ActivityEventType,
  LeaderboardEntry,
  Achievement,
  TipCondition,
  ConditionType,
  WebhookConfig,
  TipReceipt,
  DerivedWallet,
  TipLink,
  PersonalityType,
  MessageType,
  AgentSettings,
  ENSResolveResult,
  ENSReverseResult,
  AddressTag,
  Challenge,
  StreakData,
  TipGoal,
  HtlcStatus,
  HtlcEscrowFields,
  LLMProvider,
  TipDecision,
  IntentResult,
  ChainReasoning,
  RiskExplanation,
  TipRefusal,
  AgentStats,
  CSVImportRow,
  CSVImportResult,
  RuleBasedCapabilities,
} from '../types/index.js';

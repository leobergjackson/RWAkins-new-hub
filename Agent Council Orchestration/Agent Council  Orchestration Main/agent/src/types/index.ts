/** Supported blockchain networks */
export type ChainId = 'ethereum-sepolia' | 'ton-testnet' | 'tron-nile' | 'ethereum-sepolia-gasless' | 'ton-testnet-gasless' | 'bitcoin-testnet' | 'solana-devnet' | 'plasma' | 'stable' | 'polygon-mainnet';

/** Token types supported for tipping */
export type TokenType = 'native' | 'usdt' | 'usat' | 'xaut' | 'xaut';

/** Chain configuration for WDK wallet modules */
export interface ChainConfig {
  id: ChainId;
  name: string;
  blockchain: string;
  isTestnet: boolean;
  nativeCurrency: string;
  explorerUrl: string;
  rpcUrl?: string;
}

/** Wallet balance information */
export interface WalletBalance {
  chainId: ChainId;
  address: string;
  nativeBalance: string;
  nativeCurrency: string;
  usdtBalance: string;
}

/** Tip request from the user */
export interface TipRequest {
  id: string;
  recipient: string;
  amount: string;
  token: TokenType;
  preferredChain?: ChainId;
  message?: string;
  createdAt: string;
}

/** Batch tip request — tip multiple recipients at once */
export interface BatchTipRequest {
  recipients: Array<{
    address: string;
    amount: string;
    message?: string;
  }>;
  token: TokenType;
  preferredChain?: ChainId;
}

/** Batch tip result */
export interface BatchTipResult {
  id: string;
  total: number;
  succeeded: number;
  failed: number;
  results: TipResult[];
  totalAmount: string;
  totalFees: string;
  createdAt: string;
}

/** Agent reasoning step */
export interface ReasoningStep {
  step: number;
  action: string;
  detail: string;
  timestamp: string;
}

/** Chain analysis result */
export interface ChainAnalysis {
  chainId: ChainId;
  chainName: string;
  available: boolean;
  balance: string;
  estimatedFee: string;
  estimatedFeeUsd: string;
  networkStatus: 'healthy' | 'congested' | 'down';
  score: number;
  reason: string;
}

/** Agent decision result */
export interface AgentDecision {
  selectedChain: ChainId;
  reasoning: string;
  analyses: ChainAnalysis[];
  steps: ReasoningStep[];
  confidence: number;
  feeComparison?: FeeComparison[];
  feeSavings?: string;
}

/** Result of polling for on-chain transaction confirmation */
export interface ConfirmationResult {
  confirmed: boolean;
  blockNumber: number;
  gasUsed: string;
  /** True if TX was broadcast successfully but confirmation requires chain-specific verification (TON/Tron) */
  broadcast?: boolean;
}

/** Transaction result */
export interface TipResult {
  id: string;
  tipId: string;
  status: 'pending' | 'confirmed' | 'failed';
  chainId: ChainId;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  token: TokenType;
  fee: string;
  explorerUrl: string;
  decision: AgentDecision;
  createdAt: string;
  confirmedAt?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
  retryCount?: number;
  memo?: string;
}

/** Dashboard state */
export interface AgentState {
  status: 'idle' | 'analyzing' | 'reasoning' | 'executing' | 'confirming';
  currentTip?: TipRequest;
  currentDecision?: AgentDecision;
  lastError?: string;
}

/** Tip history entry for analytics */
export interface TipHistoryEntry {
  id: string;
  recipient: string;
  amount: string;
  token: TokenType;
  chainId: ChainId;
  txHash: string;
  status: 'confirmed' | 'failed';
  fee: string;
  createdAt: string;
  reasoning: string;
  memo?: string;
}

/** Natural language tip parse result */
export interface NLPTipParse {
  recipient: string;
  amount: string;
  token: 'native' | 'usdt' | 'usat' | 'xaut';
  chain?: string;
  message?: string;
  confidence: number;
  rawInput: string;
}

/** Scheduled tip — a tip that will be executed at a future time */
export interface ScheduledTip {
  id: string;
  recipient: string;
  amount: string;
  token: TokenType;
  chain?: ChainId;
  message?: string;
  scheduledAt: string;
  status: 'scheduled' | 'executed' | 'failed';
  createdAt: string;
  executedAt?: string;
  result?: TipResult;
  recurring?: boolean;
  interval?: 'daily' | 'weekly' | 'monthly';
  lastExecuted?: string;
}

/** Reusable tip template — saved tip configurations */
export interface TipTemplate {
  id: string;
  name: string;
  recipient: string;
  amount: string;
  token: 'native' | 'usdt' | 'usat' | 'xaut';
  chainId?: string;
  createdAt: string;
}

/** Address book contact */
export interface Contact {
  id: string;
  name: string;
  address: string;
  chain?: ChainId;
  group?: string;
  tipCount: number;
  lastTipped?: string;
}

/** Fee comparison result for cross-chain cost optimization */
export interface FeeComparison {
  chainId: ChainId;
  chainName: string;
  estimatedFee: string;
  estimatedFeeUsd: string;
  savingsVsHighest: string;
  rank: number;
}

/** Split tip recipient with percentage allocation */
export interface SplitRecipient {
  address: string;
  percentage: number;  // 0-100
  name?: string;       // optional contact name
}

/** Split tip request — divide a tip among multiple recipients proportionally */
export interface SplitTipRequest {
  recipients: SplitRecipient[];
  totalAmount: string;
  token: 'native' | 'usdt' | 'usat' | 'xaut';
  chainId?: string;
}

/** Split tip result — aggregate results from all split transfers */
export interface SplitTipResult {
  totalAmount: string;
  results: Array<{
    recipient: string;
    amount: string;
    percentage: number;
    hash?: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
  successCount: number;
  failCount: number;
}

/** Activity event types for live tip feed */
export type ActivityEventType =
  | 'tip_sent'
  | 'tip_failed'
  | 'tip_scheduled'
  | 'chain_selected'
  | 'fee_optimized'
  | 'nlp_parsed'
  | 'contact_saved'
  | 'batch_started'
  | 'condition_triggered'
  | 'condition_created'
  | 'tip_retrying'
  | 'system';

/** Activity event for real-time activity feed */
export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  message: string;
  detail?: string;
  timestamp: string;
  chainId?: ChainId;
}

/** Leaderboard entry — top tip recipients */
export interface LeaderboardEntry {
  address: string;
  totalTips: number;
  totalVolume: string;
  rank: number;
}

/** Achievement — gamification badge with progress tracking */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress: number;
  target: number;
}

/** Condition types for smart conditional tipping */
export type ConditionType = 'gas_below' | 'balance_above' | 'time_of_day';

/** A conditional tip — executes automatically when conditions are met */
export interface TipCondition {
  id: string;
  type: ConditionType;
  params: {
    threshold?: string;    // gas price threshold (gwei) or balance threshold
    currency?: string;     // ETH, TON
    timeStart?: string;    // HH:MM format
    timeEnd?: string;      // HH:MM format
  };
  tip: {
    recipient: string;
    amount: string;
    token: 'native' | 'usdt' | 'usat' | 'xaut';
    chainId?: string;
  };
  status: 'active' | 'triggered' | 'cancelled';
  createdAt: string;
  triggeredAt?: string;
}

/** Chat message for conversational interface */
export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  action?: {
    type: 'tip_executed' | 'balance_check' | 'fee_estimate' | 'address_lookup';
    data?: Record<string, unknown>;
  };
}

/** Detected intent from user chat message */
export interface ChatIntent {
  intent:
    | 'tip' | 'check_balance' | 'view_history' | 'find_creator' | 'set_policy'
    | 'check_status' | 'help' | 'analytics' | 'bridge' | 'swap' | 'lend'
    | 'balance' | 'fees' | 'address' | 'history'  // legacy aliases
    | 'unknown';
  params: Record<string, string>;
  confidence: number;
  reasoning: string;
  entities: ExtractedEntities;
}

/** Entities extracted from user input by NLP/rule engine */
export interface ExtractedEntities {
  amounts: Array<{ value: number; currency: string; raw: string }>;
  addresses: Array<{ value: string; type: 'evm' | 'ton' | 'tron'; raw: string }>;
  creators: string[];
  chains: string[];
  tokens: string[];
}

/** Content analysis result from rule-based NLP */
export interface ContentAnalysis {
  sentiment: { label: 'positive' | 'negative' | 'neutral'; score: number; keywords: string[] };
  topics: Array<{ name: string; confidence: number }>;
  keyPhrases: string[];
  language: string;
  wordCount: number;
}

/** Structured summary of rule-based AI capabilities */
export interface RuleBasedCapabilities {
  engine: string;
  version: string;
  provider: 'rule-based';
  intents: Array<{ name: string; description: string; examples: string[] }>;
  entityTypes: Array<{ name: string; description: string; patterns: string[] }>;
  analysisFeatures: string[];
  limitations: string[];
}

/** Webhook configuration for external notifications */
export interface WebhookConfig {
  id: string;
  url: string;
  events: string[]; // 'tip.sent', 'tip.failed', 'tip.scheduled', 'condition.triggered'
  createdAt: string;
  lastTriggered?: string;
  failCount: number;
}

/** Tip receipt for shareable/printable receipt */
export interface TipReceipt {
  receiptId: string;
  timestamp: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  chain: string;
  chainName: string;
  txHash: string;
  fee: string;
  status: 'confirmed' | 'pending';
  blockNumber?: number;
  explorerUrl: string;
  memo?: string;
}

/** Retry information for failed transactions */
export interface RetryInfo {
  attempt: number;
  maxRetries: number;
  lastError: string;
  nextRetryIn?: number;
}

/** Derived wallet from HD path */
export interface DerivedWallet {
  index: number;
  address: string;
  chainId: ChainId;
  chainName: string;
  isActive: boolean;
}

/** Shareable tip link — pre-filled tip request URL */
export interface TipLink {
  id: string;
  recipient: string;
  amount: string;
  token: TokenType;
  message?: string;
  chainId?: ChainId;
  url: string;
  createdAt: string;
}

/** Agent personality types */
export type PersonalityType = 'professional' | 'friendly' | 'pirate' | 'emoji' | 'minimal';

/** Message types the personality system can format */
export type MessageType = 'greeting' | 'tip_confirmed' | 'tip_failed' | 'balance_report' | 'fee_comparison' | 'help' | 'unknown_intent';

/** Agent settings stored on the backend */
export interface AgentSettings {
  personality: PersonalityType;
  defaultChain: ChainId | '';
  defaultToken: TokenType;
  autoConfirmThreshold: string;
  autoConfirmEnabled: boolean;
  notifications: {
    tipSent: boolean;
    tipFailed: boolean;
    conditionTriggered: boolean;
    scheduledExecuted: boolean;
  };
}

/** ENS resolution result */
export interface ENSResolveResult {
  name: string;
  address: string | null;
  resolved: boolean;
}

/** ENS reverse lookup result */
export interface ENSReverseResult {
  address: string;
  name: string | null;
  resolved: boolean;
}

/** Address tag — custom label for a wallet address */
export interface AddressTag {
  address: string;
  label: string;
  color?: string;
  createdAt: string;
}

/** A gamified challenge with progress tracking */
export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  target: number;
  progress: number;
  reward: string;
  expiresAt: string;
  completed: boolean;
  icon: string;
}

/** Streak tracking data */
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastTipDate: string | null;
  streakMilestones: Array<{
    days: number;
    icon: string;
    label: string;
    reached: boolean;
  }>;
}

/** CSV import row parsed from tip import */
export interface CSVImportRow {
  recipient: string;
  amount: string;
  token: TokenType;
  chain: ChainId | '';
  memo: string;
}

/** CSV import result */
export interface CSVImportResult {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    row: number;
    recipient: string;
    amount: string;
    status: 'success' | 'failed';
    txHash?: string;
    error?: string;
    memo?: string;
  }>;
}

/** A fundraising/tipping goal */
export interface TipGoal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  token: string;
  recipient?: string;
  deadline?: string;
  createdAt: string;
  completed: boolean;
}

// ── HTLC Escrow Types ────────────────────────────────────────────────

/** HTLC status for hash-time-locked escrows */
export type HtlcStatus = 'locked' | 'claimed' | 'refunded' | 'expired';

/** HTLC escrow fields added to EscrowTip */
export interface HtlcEscrowFields {
  /** SHA-256 hash of the secret preimage (hex-encoded) */
  hashLock: string;
  /** Unix timestamp (ms) after which the escrow can be refunded */
  timelock: number;
  /** HTLC lifecycle status */
  htlcStatus: HtlcStatus;
}

// ── LLM Structured Response Types ────────────────────────────────────

/** LLM provider currently in use */
export type LLMProvider = 'groq' | 'gemini' | 'rule-based';

/** Structured tip decision from LLM */
export interface TipDecision {
  creator: string;
  amount: number;
  chain: string;
  token: string;
  reason: string;
  confidence: number;
}

/** Intent classification result from LLM */
export interface IntentResult {
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
}

/** Chain reasoning result from LLM */
export interface ChainReasoning {
  selectedChain: string;
  reason: string;
  factors: string[];
}

/** Risk explanation result from LLM */
export interface RiskExplanation {
  level: string;
  score: number;
  summary: string;
  factors: string[];
}

/** Tip refusal result from the agent's "say NO" logic */
export interface TipRefusal {
  refused: boolean;
  reason: string;
  suggestion: string;
}

/** Agent stats for dashboard */
export interface AgentStats {
  totalTips: number;
  totalAmount: string;
  totalFeesSaved: string;
  avgTipAmount: string;
  chainDistribution: Record<ChainId, number>;
  tipsByDay: Array<{ date: string; count: number; volume: string }>;
  tipsByChain: Array<{ chainId: ChainId; chainName: string; count: number; volume: string; percentage: number }>;
  tipsByToken: Array<{ token: TokenType; count: number; volume: string; percentage: number }>;
  averageConfirmationTime: number;
  totalFeePaid: string;
  totalFeeSaved: string;
  successRate: number;
}

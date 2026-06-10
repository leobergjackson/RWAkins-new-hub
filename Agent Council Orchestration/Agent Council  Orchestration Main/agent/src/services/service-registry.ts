// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Centralized service registry (singleton)
//
// Owns every service instance that was previously scattered across api.ts.
// Services are created eagerly on initialize() in correct dependency order;
// WDK-dependent wiring happens once the seed-derived wallet is ready.

import { WalletService } from './wallet.service.js';
import { AIService } from './ai.service.js';
import { ContactsService } from './contacts.service.js';
import { TemplatesService } from './templates.service.js';
import { WebhooksService } from './webhooks.service.js';
import { PersonalityService } from './personality.service.js';
import { ExportService } from './export.service.js';
import { ENSService } from './ens.service.js';
import { TagsService } from './tags.service.js';
import { ChallengesService } from './challenges.service.js';
import { LimitsService } from './limits.service.js';
import { GoalsService } from './goals.service.js';
import { RumbleService } from './rumble.service.js';
import { AutonomyService } from './autonomy.service.js';
import { TreasuryService } from './treasury.service.js';
import { IndexerService } from './indexer.service.js';
import { BridgeService } from './bridge.service.js';
import { LendingService } from './lending.service.js';
import { ReceiptService } from './receipt.service.js';
import { StreamingService } from './streaming.service.js';
import { ReputationService } from './reputation.service.js';
import { EscrowService } from './escrow.service.js';
import { OrchestratorService } from './orchestrator.service.js';
import { PredictorService } from './predictor.service.js';
import { FeeArbitrageService } from './fee-arbitrage.service.js';
import { MemoryService } from './memory.service.js';
import { DcaService } from './dca.service.js';
import { CreatorAnalyticsService } from './creator-analytics.service.js';
import { TipPolicyService } from './tip-policy.service.js';
import { X402Service } from './x402.service.js';
import { AgentIdentityService } from './agent-identity.service.js';
import { TipQueueService } from './tip-queue.service.js';
import { PlatformAdapterService } from './platform-adapter.service.js';
import { ProofOfEngagementService } from './proof-of-engagement.service.js';
import { RevenueSmoothingService } from './revenue-smoothing.service.js';
import { CreatorDiscoveryService } from './creator-discovery.service.js';
import { TipPropagationService } from './tip-propagation.service.js';
import { RiskEngineService } from './risk-engine.service.js';
import { SwapService } from './swap.service.js';
import { EventSimulatorService } from './event-simulator.service.js';
import { DecisionLogService } from './decision-log.service.js';
import { AutonomousLoopService } from './autonomous-loop.service.js';
import { WalletOpsService } from './wallet-ops.service.js';
import { SafetyService } from './safety.service.js';
import { RpcFailoverService } from './rpc-failover.service.js';
import { EconomicsService } from './economics.service.js';
import { MultiStrategyService } from './multi-strategy.service.js';
import { QRMerchantService } from './qr-merchant.service.js';
import { AutoPaymentsService } from './auto-payments.service.js';
import { MultiSigService } from './multisig.service.js';
import { TaxReportingService } from './tax-reporting.service.js';
import { WalletSwarmService } from './wallet-swarm.service.js';
import { SelfSustainingService } from './self-sustaining.service.js';
import { GovernanceService } from './governance.service.js';
import { OpenClawService } from './openclaw.service.js';
import { PriceAlertsService } from './price-alerts.service.js';
import { AgentMarketplaceService } from './agent-marketplace.service.js';
import { TradingSwarmService } from './trading-swarm.service.js';
import { ZKPrivacyService } from './zk-privacy.service.js';
import { DeFiStrategyService } from './defi-strategy.service.js';
import { AtomicSwapService } from './atomic-swap.service.js';
import { YouTubeRSSService } from './youtube-rss.service.js';
import { YouTubeAPIService } from './youtube-api.service.js';
import { ReputationPassportService } from './reputation-passport.service.js';
import { WebhookReceiverService } from './webhook-receiver.service.js';
import { RSSAggregatorService } from './rss-aggregator.service.js';
import { WebhookSimulatorService } from './webhook-simulator.service.js';
import { SmartEscrowService } from './smart-escrow.service.js';
import { PushNotificationService } from './push-notification.service.js';
import { PolicyEnforcementService } from './policy-enforcement.service.js';
import { logger } from '../utils/logger.js';
import { AdversarialDemoService } from './adversarial-demo.service.js';
import { AnomalyDetectionService } from './anomaly-detection.service.js';
import { CreditScoringService } from './credit-scoring.service.js';
import { BitfinexPricingService } from './bitfinex-pricing.service.js';
import { ZKProofService } from './zk-proof.service.js';
import { TipSplitterService } from './tip-splitter.service.js';
import { RumbleScraperService } from './rumble-scraper.service.js';
import { EngagementScorerService } from './engagement-scorer.service.js';
import { OpenClawRuntimeService } from './openclaw-runtime.service.js';
import { RealDataProviderService } from './real-data-provider.service.js';

/**
 * Singleton registry that holds every service instance in the application.
 *
 * Usage:
 * ```ts
 * const services = ServiceRegistry.getInstance();
 * await services.initialize(seed);
 * services.wallet.getBalance(...)
 * ```
 */
export class ServiceRegistry {
  // ── Singleton ───────────────────────────────────────────────────
  private static instance: ServiceRegistry | null = null;

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  private constructor() {
    // Create all zero-arg services eagerly
    this._wallet = new WalletService();
    this._ai = new AIService();
    this._contacts = new ContactsService();
    this._templates = new TemplatesService();
    this._webhooks = new WebhooksService();
    this._personality = new PersonalityService();
    this._export = new ExportService();
    this._ens = new ENSService();
    this._tags = new TagsService();
    this._challenges = new ChallengesService();
    this._limits = new LimitsService();
    this._goals = new GoalsService();
    this._rumble = new RumbleService();
    this._autonomy = new AutonomyService();
    this._treasury = new TreasuryService();
    this._indexer = new IndexerService();
    this._bridge = new BridgeService();
    this._lending = new LendingService();
    this._reputation = new ReputationService();
    this._escrow = new EscrowService();
    this._orchestrator = new OrchestratorService();
    this._predictor = new PredictorService();
    this._feeArbitrage = new FeeArbitrageService();
    this._memory = new MemoryService();
    this._dca = new DcaService();
    this._creatorAnalytics = new CreatorAnalyticsService();
    this._tipPolicy = new TipPolicyService();
    this._x402 = new X402Service();
    this._agentIdentity = new AgentIdentityService();
    this._tipQueue = new TipQueueService();
    this._platformAdapter = new PlatformAdapterService();
    this._proofOfEngagement = new ProofOfEngagementService();
    this._revenueSmoothing = new RevenueSmoothingService();
    this._creatorDiscovery = new CreatorDiscoveryService();
    this._tipPropagation = new TipPropagationService();
    this._riskEngine = new RiskEngineService();
    this._eventSimulator = new EventSimulatorService();
    this._decisionLog = new DecisionLogService();
    this._walletOps = new WalletOpsService();
    this._safety = new SafetyService();
    this._rpcFailover = new RpcFailoverService();
    this._economics = new EconomicsService();
    this._qrMerchant = new QRMerchantService();
    this._autoPayments = new AutoPaymentsService();
    this._multiSig = new MultiSigService();
    this._taxReporting = new TaxReportingService();
    this._walletSwarm = new WalletSwarmService();
    this._selfSustaining = new SelfSustainingService();
    this._governance = new GovernanceService();
    this._openClaw = new OpenClawService();
    this._priceAlerts = new PriceAlertsService();
    this._agentMarketplace = new AgentMarketplaceService();
    this._tradingSwarm = new TradingSwarmService();
    this._zkPrivacy = new ZKPrivacyService();
    this._zkProof = new ZKProofService();
    this._defiStrategy = new DeFiStrategyService();
    this._youtubeRSS = new YouTubeRSSService();
    this._youtubeAPI = new YouTubeAPIService();
    this._webhookReceiver = new WebhookReceiverService();
    this._rssAggregator = new RSSAggregatorService(this._youtubeRSS, this._youtubeAPI);
    this._reputationPassport = new ReputationPassportService();
    this._webhookSimulator = new WebhookSimulatorService();
    this._atomicSwap = new AtomicSwapService();
    this._smartEscrow = new SmartEscrowService();
    this._pushNotification = new PushNotificationService();
    this._policyEnforcement = new PolicyEnforcementService();
    this._anomalyDetection = new AnomalyDetectionService();
    this._creditScoring = new CreditScoringService();
    this._bitfinexPricing = new BitfinexPricingService();
    this._tipSplitter = new TipSplitterService();
    this._rumbleScraper = new RumbleScraperService();
    this._engagementScorer = new EngagementScorerService();
    this._openClawRuntime = new OpenClawRuntimeService();
    this._realDataProvider = new RealDataProviderService();
  }

  // ── Initialization flag ────────────────────────────────────────
  private _initialized = false;

  isInitialized(): boolean {
    return this._initialized;
  }

  // ── Private backing fields ──────────────────────────────────────
  private readonly _wallet: WalletService;
  private readonly _ai: AIService;
  private readonly _contacts: ContactsService;
  private readonly _templates: TemplatesService;
  private readonly _webhooks: WebhooksService;
  private readonly _personality: PersonalityService;
  private readonly _export: ExportService;
  private readonly _ens: ENSService;
  private readonly _tags: TagsService;
  private readonly _challenges: ChallengesService;
  private readonly _limits: LimitsService;
  private readonly _goals: GoalsService;
  private readonly _rumble: RumbleService;
  private readonly _autonomy: AutonomyService;
  private readonly _treasury: TreasuryService;
  private readonly _indexer: IndexerService;
  private readonly _bridge: BridgeService;
  private readonly _lending: LendingService;
  private readonly _reputation: ReputationService;
  private readonly _escrow: EscrowService;
  private readonly _orchestrator: OrchestratorService;
  private readonly _predictor: PredictorService;
  private readonly _feeArbitrage: FeeArbitrageService;
  private readonly _memory: MemoryService;
  private readonly _dca: DcaService;
  private readonly _creatorAnalytics: CreatorAnalyticsService;
  private readonly _tipPolicy: TipPolicyService;
  private readonly _x402: X402Service;
  private readonly _agentIdentity: AgentIdentityService;
  private readonly _tipQueue: TipQueueService;
  private readonly _platformAdapter: PlatformAdapterService;
  private readonly _proofOfEngagement: ProofOfEngagementService;
  private readonly _revenueSmoothing: RevenueSmoothingService;
  private readonly _creatorDiscovery: CreatorDiscoveryService;
  private readonly _tipPropagation: TipPropagationService;
  private readonly _riskEngine: RiskEngineService;
  private readonly _eventSimulator: EventSimulatorService;
  private readonly _decisionLog: DecisionLogService;
  private readonly _walletOps: WalletOpsService;
  private readonly _safety: SafetyService;
  private readonly _rpcFailover: RpcFailoverService;
  private readonly _economics: EconomicsService;
  private readonly _qrMerchant: QRMerchantService;
  private readonly _autoPayments: AutoPaymentsService;
  private readonly _multiSig: MultiSigService;
  private readonly _taxReporting: TaxReportingService;
  private readonly _walletSwarm: WalletSwarmService;
  private readonly _selfSustaining: SelfSustainingService;
  private readonly _governance: GovernanceService;
  private readonly _openClaw: OpenClawService;
  private readonly _priceAlerts: PriceAlertsService;
  private readonly _agentMarketplace: AgentMarketplaceService;
  private readonly _tradingSwarm: TradingSwarmService;
  private readonly _zkPrivacy: ZKPrivacyService;
  private readonly _zkProof: ZKProofService;
  private readonly _defiStrategy: DeFiStrategyService;
  private readonly _youtubeRSS: YouTubeRSSService;
  private readonly _youtubeAPI: YouTubeAPIService;
  private readonly _webhookReceiver: WebhookReceiverService;
  private readonly _rssAggregator: RSSAggregatorService;
  private readonly _reputationPassport: ReputationPassportService;
  private readonly _webhookSimulator: WebhookSimulatorService;
  private readonly _atomicSwap: AtomicSwapService;
  private readonly _smartEscrow: SmartEscrowService;
  private readonly _pushNotification: PushNotificationService;
  private readonly _policyEnforcement: PolicyEnforcementService;
  private readonly _anomalyDetection: AnomalyDetectionService;
  private readonly _creditScoring: CreditScoringService;
  private readonly _bitfinexPricing: BitfinexPricingService;
  private readonly _tipSplitter: TipSplitterService;
  private readonly _rumbleScraper: RumbleScraperService;
  private readonly _engagementScorer: EngagementScorerService;
  private readonly _openClawRuntime: OpenClawRuntimeService;
  private readonly _realDataProvider: RealDataProviderService;
  private _adversarialDemo: AdversarialDemoService | null = null;

  // Wallet-dependent services (created during initialize)
  private _receipt: ReceiptService | null = null;
  private _streaming: StreamingService | null = null;
  private _swap: SwapService | null = null;
  private _autonomousLoop: AutonomousLoopService | null = null;
  private _multiStrategy: MultiStrategyService | null = null;

  // ── Public getters ──────────────────────────────────────────────

  get wallet(): WalletService { return this._wallet; }
  get ai(): AIService { return this._ai; }
  get contacts(): ContactsService { return this._contacts; }
  get templates(): TemplatesService { return this._templates; }
  get webhooks(): WebhooksService { return this._webhooks; }
  get personality(): PersonalityService { return this._personality; }
  get exportService(): ExportService { return this._export; }
  get ens(): ENSService { return this._ens; }
  get tags(): TagsService { return this._tags; }
  get challenges(): ChallengesService { return this._challenges; }
  get limits(): LimitsService { return this._limits; }
  get goals(): GoalsService { return this._goals; }
  get rumble(): RumbleService { return this._rumble; }
  get autonomy(): AutonomyService { return this._autonomy; }
  get treasury(): TreasuryService { return this._treasury; }
  get indexer(): IndexerService { return this._indexer; }
  get bridge(): BridgeService { return this._bridge; }
  get lending(): LendingService { return this._lending; }
  get reputation(): ReputationService { return this._reputation; }
  get escrow(): EscrowService { return this._escrow; }
  get orchestrator(): OrchestratorService { return this._orchestrator; }
  get predictor(): PredictorService { return this._predictor; }
  get feeArbitrage(): FeeArbitrageService { return this._feeArbitrage; }
  get memory(): MemoryService { return this._memory; }
  get dca(): DcaService { return this._dca; }
  get creatorAnalytics(): CreatorAnalyticsService { return this._creatorAnalytics; }
  get tipPolicy(): TipPolicyService { return this._tipPolicy; }
  get x402(): X402Service { return this._x402; }
  get agentIdentity(): AgentIdentityService { return this._agentIdentity; }
  get tipQueue(): TipQueueService { return this._tipQueue; }
  get platformAdapter(): PlatformAdapterService { return this._platformAdapter; }
  get proofOfEngagement(): ProofOfEngagementService { return this._proofOfEngagement; }
  get revenueSmoothing(): RevenueSmoothingService { return this._revenueSmoothing; }
  get creatorDiscovery(): CreatorDiscoveryService { return this._creatorDiscovery; }
  get tipPropagation(): TipPropagationService { return this._tipPropagation; }
  get riskEngine(): RiskEngineService { return this._riskEngine; }
  get eventSimulator(): EventSimulatorService { return this._eventSimulator; }
  get decisionLog(): DecisionLogService { return this._decisionLog; }
  get walletOps(): WalletOpsService { return this._walletOps; }
  get safety(): SafetyService { return this._safety; }
  get rpcFailover(): RpcFailoverService { return this._rpcFailover; }
  get economics(): EconomicsService { return this._economics; }
  get qrMerchant(): QRMerchantService { return this._qrMerchant; }
  get autoPayments(): AutoPaymentsService { return this._autoPayments; }
  get multiSig(): MultiSigService { return this._multiSig; }
  get taxReporting(): TaxReportingService { return this._taxReporting; }
  get walletSwarm(): WalletSwarmService { return this._walletSwarm; }
  get selfSustaining(): SelfSustainingService { return this._selfSustaining; }
  get governance(): GovernanceService { return this._governance; }
  get openClaw(): OpenClawService { return this._openClaw; }
  get priceAlerts(): PriceAlertsService { return this._priceAlerts; }
  get agentMarketplace(): AgentMarketplaceService { return this._agentMarketplace; }
  get tradingSwarm(): TradingSwarmService { return this._tradingSwarm; }
  get zkPrivacy(): ZKPrivacyService { return this._zkPrivacy; }
  get zkProof(): ZKProofService { return this._zkProof; }
  get defiStrategy(): DeFiStrategyService { return this._defiStrategy; }
  get youtubeRSS(): YouTubeRSSService { return this._youtubeRSS; }
  get youtubeAPI(): YouTubeAPIService { return this._youtubeAPI; }
  get webhookReceiver(): WebhookReceiverService { return this._webhookReceiver; }
  get rssAggregator(): RSSAggregatorService { return this._rssAggregator; }
  get reputationPassport(): ReputationPassportService { return this._reputationPassport; }
  get webhookSimulator(): WebhookSimulatorService { return this._webhookSimulator; }
  get atomicSwap(): AtomicSwapService { return this._atomicSwap; }
  get smartEscrow(): SmartEscrowService { return this._smartEscrow; }
  get pushNotification(): PushNotificationService { return this._pushNotification; }
  get policyEnforcement(): PolicyEnforcementService { return this._policyEnforcement; }
  get anomalyDetection(): AnomalyDetectionService { return this._anomalyDetection; }
  get creditScoring(): CreditScoringService { return this._creditScoring; }
  get bitfinexPricing(): BitfinexPricingService { return this._bitfinexPricing; }
  get tipSplitter(): TipSplitterService { return this._tipSplitter; }
  get rumbleScraper(): RumbleScraperService { return this._rumbleScraper; }
  get engagementScorer(): EngagementScorerService { return this._engagementScorer; }
  get openClawRuntime(): OpenClawRuntimeService { return this._openClawRuntime; }
  get realDataProvider(): RealDataProviderService { return this._realDataProvider; }
  get adversarialDemo(): AdversarialDemoService | null { return this._adversarialDemo; }

  // Wallet-dependent (available after initialize)
  get receipt(): ReceiptService | null { return this._receipt ?? null; }
  get streaming(): StreamingService | null { return this._streaming ?? null; }
  get swap(): SwapService | null { return this._swap ?? null; }
  get autonomousLoop(): AutonomousLoopService | null { return this._autonomousLoop; }
  get multiStrategy(): MultiStrategyService | null { return this._multiStrategy; }

  // ── Initialization ──────────────────────────────────────────────

  /**
   * Wire all services together in dependency order.
   *
   * Must be called once at startup after the seed phrase is available.
   * Creates wallet-dependent services (Receipt, Streaming, Swap) and
   * wires cross-service dependencies.
   */
  async initialize(seed: string): Promise<void> {
    if (this._initialized) {
      logger.warn('ServiceRegistry.initialize() called more than once — skipping');
      return;
    }

    // 1. Initialize core services
    await this._wallet.initialize(seed);
    await this._ai.initialize();

    // 2. Create wallet-dependent services
    this._receipt = new ReceiptService(this._wallet);
    this._streaming = new StreamingService(this._wallet);
    this._swap = new SwapService(this._wallet);
    this._dca.setWalletService(this._wallet);
    this._escrow.setWalletService(this._wallet);
    this._atomicSwap.setEscrowService(this._escrow);
    this._atomicSwap.setWalletService(this._wallet);
    this._tipSplitter.setWalletService(this._wallet);

    // Initialize swap (async, non-blocking)
    this._swap.initialize().catch((err) => {
      logger.warn('SwapService initialization failed — swap features unavailable', { error: String(err) });
    });

    // 3. Wire cross-service dependencies
    const addresses = await this._wallet.getAllAddresses();

    // Smart escrow: set deployer address from HD wallet index 0
    this._smartEscrow.setDeployerAddress(addresses['ethereum-sepolia'] ?? '');

    this._bridge.setWalletService(this._wallet);
    this._lending.setWalletService(this._wallet);
    this._agentIdentity.setWalletService(this._wallet);
    this._x402.setWalletAddress(addresses['ethereum-sepolia'] ?? '');
    this._walletOps.setWalletService(this._wallet);
    this._walletOps.setFeeArbitrageService(this._feeArbitrage);
    this._autoPayments.setWalletOps(this._walletOps);
    this._economics.setLendingService(this._lending);
    this._economics.setTreasuryService(this._treasury);
    this._treasury.setWalletService(this._wallet);
    this._treasury.setLendingService(this._lending);
    this._proofOfEngagement.setWalletService(this._wallet);
    this._orchestrator.setAIService(this._ai);
    this._reputationPassport.setReputationService(this._reputation);
    this._reputationPassport.setZKProofService(this._zkProof);
    this._orchestrator.setReputationPassportService(this._reputationPassport);
    this._orchestrator.setCreditScoringService(this._creditScoring);
    this._safety.setAnomalyDetection(this._anomalyDetection);
    this._openClaw.setWalletService(this._wallet);
    this._openClaw.setAIService(this._ai);

    // Initialize OpenClaw Runtime — load SOUL.md and skill files
    this._openClawRuntime.setOpenClawService(this._openClaw);
    this._openClawRuntime.initialize();

    // Wire real data provider — replaces fake events with real blockchain + platform data
    this._realDataProvider.setRumbleScraper(this._rumbleScraper);
    this._realDataProvider.setWalletService(this._wallet);

    // 3b. Create adversarial demo service (depends on safety, risk, orchestrator)
    this._adversarialDemo = new AdversarialDemoService(
      this._safety,
      this._riskEngine,
      this._orchestrator,
      addresses['ethereum-sepolia'],
    );

    // 4. Create autonomous loop (depends on AI + several services)
    this._autonomousLoop = new AutonomousLoopService(
      this._ai,
      this._eventSimulator,
      this._decisionLog,
      this._memory,
      this._orchestrator,
    );
    this._autonomousLoop.setRumbleService(this._rumble);
    this._autonomousLoop.setOpenClawService(this._openClaw);
    this._autonomousLoop.setWalletService(this._wallet);
    this._autonomousLoop.setSafetyService(this._safety);
    this._autonomousLoop.setWebhookReceiver(this._webhookReceiver);
    this._autonomousLoop.setRSSAggregator(this._rssAggregator);
    this._autonomousLoop.setRealDataProvider(this._realDataProvider);

    // 5. Initialize agent identity
    const agentId = await this._agentIdentity.initialize();
    logger.info(`Agent identity: ${agentId.agentId} (${agentId.capabilities.length} capabilities)`);

    this._initialized = true;
    logger.info('ServiceRegistry initialized — all services wired');
  }

  /**
   * Create and wire the multi-strategy service.
   * Called after createApiRouter so the swap service is ready.
   */
  initMultiStrategy(): MultiStrategyService {
    this._multiStrategy = new MultiStrategyService({
      ai: this._ai,
      lending: this._lending,
      swap: this._swap!,
      bridge: this._bridge,
      treasury: this._treasury,
      wallet: this._wallet,
      walletOps: this._walletOps,
      feeArbitrage: this._feeArbitrage,
      dca: this._dca,
      safety: this._safety,
      economics: this._economics,
    });
    this._multiStrategy.setOpenClawService(this._openClaw);
    this._multiStrategy.setDeFiStrategyService(this._defiStrategy);
    return this._multiStrategy;
  }
}

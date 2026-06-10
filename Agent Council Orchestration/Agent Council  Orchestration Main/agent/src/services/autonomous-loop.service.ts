// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
// Autonomous Loop Service — ReAct pipeline running WITHOUT human input

import { logger } from '../utils/logger.js';
import { eventStore, metrics } from '../shared-singletons.js';
import type { AIService } from './ai.service.js';
import type { EventSimulatorService, SimulatedEvent } from './event-simulator.service.js';
import type { DecisionLogService } from './decision-log.service.js';
import type { MemoryService } from './memory.service.js';
import type { OrchestratorService } from './orchestrator.service.js';
import type { RumbleService } from './rumble.service.js';
import type { MultiStrategyService, StrategyDecision } from './multi-strategy.service.js';
import type { OpenClawService, ReActTrace } from './openclaw.service.js';
import type { WalletService } from './wallet.service.js';
import type { SafetyService } from './safety.service.js';
import type { RealDataProviderService } from './real-data-provider.service.js';
import { YouTubeRSSService } from './youtube-rss.service.js';
import {
  calculateFinancialPulse,
  getWalletMood as computeWalletMood,
  getMoodPreferredChain as computeMoodPreferredChain,
  getMoodBatchSize as computeMoodBatchSize,
  getMoodRiskTolerance as computeMoodRiskTolerance,
  getMoodModifiers,
} from './financial-pulse.js';
import type { MoodModifiers } from './financial-pulse.js';
import {
  restoreLearnedState as doRestoreLearnedState,
  getLearnedInsights as doGetLearnedInsights,
  learnFromCycle as doLearnFromCycle,
  persistLearnedState as doPersistedLearnedState,
} from './loop-learning.js';
import {
  DeduplicationService,
  buildObservation as doBuildObservation,
  ruleBasedDecision as doRuleBasedDecision,
} from './loop-helpers.js';
import {
  reasonPhase,
  actPhase,
  reflectPhase,
} from './loop-cycle.js';
import type { CycleDeps } from './loop-cycle.js';

// Re-export types from extracted modules for backward compatibility
export type { FinancialPulse, WalletMood, WalletMoodState } from './financial-pulse.js';
export type { LoopCycleResult, LLMLoopDecision, ExplorationStats } from './loop-learning.js';
export { DeduplicationService } from './loop-helpers.js';

// ── Types ──────────────────────────────────────────────────────

import type { FinancialPulse, WalletMoodState } from './financial-pulse.js';
import type { LoopCycleResult, LLMLoopDecision } from './loop-learning.js';

export interface LoopStatus {
  running: boolean;
  paused: boolean;
  currentCycle: number;
  totalCycles: number;
  lastCycleAt: string | null;
  nextCycleAt: string | null;
  intervalMs: number;
  tipsExecuted: number;
  tipsSkipped: number;
  tipsRefused: number;
  errors: number;
  startedAt: string | null;
  uptime: number;
  avgCycleDurationMs: number;
  financialPulse: FinancialPulse | null;
  walletMood: WalletMoodState | null;
  moodBatchSize: number;
  moodRiskTolerance: number;
  explorationStats: {
    explorationRate: number;
    exploreTips: number;
    exploitTips: number;
    exploreSuccessRate: number;
    exploitSuccessRate: number;
  };
  dataSource: 'live' | 'simulated' | 'none';
  moodModifiers: MoodModifiers;
  adaptiveDelay: { delayMs: number; urgency: 'high' | 'medium' | 'low'; reason: string } | null;
}

// ── Service ────────────────────────────────────────────────────

export class AutonomousLoopService {
  private running = false;
  private paused = false;
  private intervalMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private startedAt: string | null = null;
  private lastCycleAt: string | null = null;
  private totalCycles = 0;
  private tipsExecuted = 0;
  private tipsSkipped = 0;
  private tipsRefused = 0;
  private errors = 0;
  private cycleDurations: number[] = [];
  private lastEventTimestamp: string = new Date(0).toISOString();

  private ai: AIService;
  private eventSimulator: EventSimulatorService;
  private decisionLog: DecisionLogService;
  private memory: MemoryService;
  private orchestrator: OrchestratorService;
  private rumble: RumbleService | null = null;
  private multiStrategy: MultiStrategyService | null = null;
  private openClaw: OpenClawService | null = null;
  private lastOpenClawTrace: ReActTrace | null = null;
  private walletService: WalletService | null = null;
  private safetyService: SafetyService | null = null;
  private realDataProvider: RealDataProviderService | null = null;
  private youtubeRSS = new YouTubeRSSService();
  private dedup = new DeduplicationService();
  private lastStrategyDecisions: StrategyDecision[] = [];
  private lastFinancialPulse: FinancialPulse | null = null;
  private lastWalletMood: WalletMoodState | null = null;
  private recentTxTimestamps: number[] = [];
  private trustedCreators: Set<string> = new Set();
  private learnedGasThreshold: number | null = null;
  private learnedBestHours: number[] = [];
  private lastDataSource: 'live' | 'simulated' | 'none' = 'none';
  private explorationRate = parseFloat(process.env.EXPLORATION_RATE ?? '0.1');
  private explorationStats = { exploreTips: 0, exploitTips: 0, exploreSuccesses: 0, exploitSuccesses: 0 };
  private currentCycleExplored = false;
  private lastAdaptiveDelay: { delayMs: number; urgency: 'high' | 'medium' | 'low'; reason: string } | null = null;

  constructor(ai: AIService, eventSimulator: EventSimulatorService, decisionLog: DecisionLogService, memory: MemoryService, orchestrator: OrchestratorService, intervalMs?: number) {
    this.ai = ai;
    this.eventSimulator = eventSimulator;
    this.decisionLog = decisionLog;
    this.memory = memory;
    this.orchestrator = orchestrator;
    this.intervalMs = intervalMs ?? parseInt(process.env.LOOP_INTERVAL_MS ?? '60000', 10);
    this.restoreLearnedState();
  }

  private restoreLearnedState(): void {
    const state = doRestoreLearnedState(this.memory);
    this.trustedCreators = state.trustedCreators;
    this.learnedGasThreshold = state.learnedGasThreshold;
    this.learnedBestHours = state.learnedBestHours;
  }

  getLearnedInsights(): string {
    return doGetLearnedInsights(this.trustedCreators, this.learnedGasThreshold, this.learnedBestHours, this.memory);
  }

  setRumbleService(rumble: RumbleService): void { this.rumble = rumble; }
  setWebhookReceiver(_receiver: unknown): void { /* wired externally */ }
  setRSSAggregator(_aggregator: unknown): void { /* wired externally */ }
  setMultiStrategyService(ms: MultiStrategyService): void { this.multiStrategy = ms; }
  setOpenClawService(oc: OpenClawService): void { this.openClaw = oc; }
  setWalletService(ws: WalletService): void { this.walletService = ws; }
  setSafetyService(ss: SafetyService): void { this.safetyService = ss; }
  setRealDataProvider(rdp: RealDataProviderService): void { this.realDataProvider = rdp; }
  getLastOpenClawTrace(): ReActTrace | null { return this.lastOpenClawTrace; }
  getLastStrategyDecisions(): StrategyDecision[] { return this.lastStrategyDecisions; }

  start(): void {
    if (this.running) { logger.warn('Autonomous loop already running'); return; }
    this.running = true; this.paused = false; this.startedAt = new Date().toISOString();
    // Event simulator only runs in demo mode — real data is preferred
    if (process.env.DEMO_MODE === 'true') {
      this.eventSimulator.start();
      logger.info('[DEMO] Event simulator started for offline demonstration');
    } else {
      logger.info('Event simulator disabled — autonomous loop uses real data sources');
    }
    logger.info('=== AUTONOMOUS LOOP STARTED ===', { intervalMs: this.intervalMs });
    this.runCycle().catch(err => { logger.error('Initial cycle failed', { error: String(err) }); });
    this.scheduleNext();
  }

  stop(): void {
    this.running = false; this.paused = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.eventSimulator.stop();
    logger.info('=== AUTONOMOUS LOOP STOPPED ===', { totalCycles: this.totalCycles, tipsExecuted: this.tipsExecuted });
  }

  pause(): void { this.paused = true; if (this.timer) { clearTimeout(this.timer); this.timer = null; } }
  resume(): void { if (!this.running) { this.start(); return; } this.paused = false; this.scheduleNext(); }

  getStatus(): LoopStatus {
    const avgDuration = this.cycleDurations.length > 0 ? this.cycleDurations.reduce((s, d) => s + d, 0) / this.cycleDurations.length : 0;
    const uptime = this.startedAt ? Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000) : 0;
    return {
      running: this.running, paused: this.paused, currentCycle: this.decisionLog.getCycleNumber(),
      totalCycles: this.totalCycles, lastCycleAt: this.lastCycleAt,
      nextCycleAt: this.running && !this.paused ? new Date(Date.now() + this.intervalMs).toISOString() : null,
      intervalMs: this.intervalMs, tipsExecuted: this.tipsExecuted, tipsSkipped: this.tipsSkipped,
      tipsRefused: this.tipsRefused, errors: this.errors, startedAt: this.startedAt, uptime,
      avgCycleDurationMs: Math.round(avgDuration), financialPulse: this.lastFinancialPulse,
      walletMood: this.lastWalletMood, moodBatchSize: this.getMoodBatchSize(),
      moodRiskTolerance: this.getMoodRiskTolerance(),
      explorationStats: {
        explorationRate: this.explorationRate, exploreTips: this.explorationStats.exploreTips,
        exploitTips: this.explorationStats.exploitTips,
        exploreSuccessRate: this.explorationStats.exploreTips > 0 ? this.explorationStats.exploreSuccesses / this.explorationStats.exploreTips : 0,
        exploitSuccessRate: this.explorationStats.exploitTips > 0 ? this.explorationStats.exploitSuccesses / this.explorationStats.exploitTips : 0,
      },
      dataSource: this.lastDataSource, moodModifiers: this.getMoodModifiers(),
      adaptiveDelay: this.lastAdaptiveDelay,
    };
  }

  setInterval(ms: number): void { this.intervalMs = Math.max(10_000, ms); }
  getDedupStats() { return this.dedup.getStats(); }
  getLastFinancialPulse(): FinancialPulse | null { return this.lastFinancialPulse; }
  getLastWalletMood(): WalletMoodState | null { return this.lastWalletMood; }

  async getFinancialPulse(): Promise<FinancialPulse> {
    this.recentTxTimestamps.push(Date.now());
    this.recentTxTimestamps = this.recentTxTimestamps.filter(t => Date.now() - t < 30 * 60 * 1000);
    const pulse = await calculateFinancialPulse(this.walletService, this.memory, this.recentTxTimestamps);
    this.lastFinancialPulse = pulse;
    return pulse;
  }

  getWalletMood(pulse: FinancialPulse): WalletMoodState {
    const moodState = computeWalletMood(pulse);
    this.lastWalletMood = moodState;
    return moodState;
  }

  private shouldSkipCycle(n: number): boolean { return this.lastWalletMood?.mood === 'cautious' && n % 2 === 1; }
  getMoodPreferredChain(): string { return computeMoodPreferredChain(this.lastWalletMood?.mood); }
  getMoodAutoTipThreshold(): number { const m = this.lastWalletMood?.mood; return m === 'generous' ? 0.02 : m === 'cautious' ? 0.005 : 0.01; }
  getMoodBatchSize(): number { return computeMoodBatchSize(this.lastWalletMood?.mood); }
  getMoodRiskTolerance(): number { return computeMoodRiskTolerance(this.lastWalletMood?.mood); }
  getMoodModifiers(): MoodModifiers { return getMoodModifiers(this.lastWalletMood?.mood); }

  // ── Core Loop ────────────────────────────────────────────────

  private scheduleNext(): void {
    if (!this.running || this.paused) return;
    const interval = this.computeAdaptiveInterval();
    this.timer = setTimeout(async () => {
      try { await this.runCycle(); } catch (err) { logger.error('Autonomous cycle failed', { error: String(err) }); this.errors++; }
      this.scheduleNext();
    }, interval);
  }

  /**
   * Urgency-based adaptive loop timing.
   *
   * HIGH urgency   → 2 min  (risk detected, large price move, pending escrow expiring)
   * MEDIUM urgency → 5 min  (normal operation, tips pending)
   * LOW urgency    → 15 min (all quiet, good portfolio health)
   */
  private computeAdaptiveInterval(): number {
    // During initial warmup, use the configured interval
    if (this.totalCycles < 3) {
      this.lastAdaptiveDelay = { delayMs: this.intervalMs, urgency: 'medium', reason: 'Warmup phase — using default interval' };
      return this.intervalMs;
    }

    const result = this.calculateNextCycleDelay();
    this.lastAdaptiveDelay = result;

    logger.info('Adaptive loop timing', {
      urgency: result.urgency,
      delayMs: result.delayMs,
      delaySec: Math.round(result.delayMs / 1000),
      reason: result.reason,
    });

    return result.delayMs;
  }

  /**
   * Evaluate current agent state to determine urgency and next cycle delay.
   */
  calculateNextCycleDelay(): { delayMs: number; urgency: 'high' | 'medium' | 'low'; reason: string } {
    const HIGH_MS = 2 * 60 * 1000;    // 2 minutes
    const MEDIUM_MS = 5 * 60 * 1000;  // 5 minutes
    const LOW_MS = 15 * 60 * 1000;    // 15 minutes

    const pulse = this.lastFinancialPulse;
    const mood = this.lastWalletMood;
    const errorRate = this.totalCycles > 0 ? this.errors / this.totalCycles : 0;
    const tipRate = this.totalCycles > 0 ? this.tipsExecuted / this.totalCycles : 0;
    const recentErrors = this.cycleDurations.length > 0 && errorRate > 0.3;

    // ── HIGH urgency checks ────────────────────────────────────
    // Risk detected: health score critically low
    if (pulse && pulse.healthScore < 30) {
      return { delayMs: HIGH_MS, urgency: 'high', reason: `Critical health score (${pulse.healthScore}) — monitoring closely` };
    }

    // Wallet mood is cautious with low liquidity
    if (mood?.mood === 'cautious' && pulse && pulse.liquidityScore < 25) {
      return { delayMs: HIGH_MS, urgency: 'high', reason: 'Cautious mood + low liquidity — high vigilance' };
    }

    // High error rate (potential RPC issues or chain problems)
    if (recentErrors) {
      return { delayMs: HIGH_MS, urgency: 'high', reason: `High error rate (${(errorRate * 100).toFixed(0)}%) — frequent retries needed` };
    }

    // Many recent transactions (burst activity)
    const recentTxCount = this.recentTxTimestamps.filter(t => Date.now() - t < 5 * 60 * 1000).length;
    if (recentTxCount >= 3) {
      return { delayMs: HIGH_MS, urgency: 'high', reason: `${recentTxCount} transactions in last 5 min — high activity burst` };
    }

    // ── MEDIUM urgency checks ──────────────────────────────────
    // Tips being executed at a normal rate
    if (tipRate > 0.05) {
      return { delayMs: MEDIUM_MS, urgency: 'medium', reason: 'Active tipping rate — normal operation' };
    }

    // Moderate health, some activity happening
    if (pulse && pulse.healthScore < 60) {
      return { delayMs: MEDIUM_MS, urgency: 'medium', reason: `Moderate health score (${pulse.healthScore}) — keeping watch` };
    }

    // Wallet mood is strategic (normal operation)
    if (mood?.mood === 'strategic') {
      return { delayMs: MEDIUM_MS, urgency: 'medium', reason: 'Strategic mood — standard monitoring interval' };
    }

    // Some events processed recently
    if (this.lastDataSource !== 'none') {
      return { delayMs: MEDIUM_MS, urgency: 'medium', reason: `Data source active (${this.lastDataSource}) — staying responsive` };
    }

    // ── LOW urgency (all quiet) ────────────────────────────────
    // Good health, generous mood, no errors
    if (pulse && pulse.healthScore >= 80 && mood?.mood === 'generous') {
      return { delayMs: LOW_MS, urgency: 'low', reason: 'Excellent health + generous mood — relaxed monitoring' };
    }

    // No events, no errors, low tip rate
    if (this.lastDataSource === 'none' && errorRate === 0 && tipRate < 0.02) {
      return { delayMs: LOW_MS, urgency: 'low', reason: 'All quiet — no events, no errors, minimal activity' };
    }

    // Default: medium
    return { delayMs: MEDIUM_MS, urgency: 'medium', reason: 'Default medium urgency' };
  }

  private buildCycleDeps(): CycleDeps {
    return {
      ai: this.ai, memory: this.memory, orchestrator: this.orchestrator,
      decisionLog: this.decisionLog, rumble: this.rumble, openClaw: this.openClaw,
      walletService: this.walletService, safetyService: this.safetyService,
      multiStrategy: this.multiStrategy, dedup: this.dedup,
      tipsExecuted: this.tipsExecuted, tipsSkipped: this.tipsSkipped, tipsRefused: this.tipsRefused,
      lastFinancialPulse: this.lastFinancialPulse, lastWalletMood: this.lastWalletMood,
      trustedCreators: this.trustedCreators, explorationRate: this.explorationRate,
      getMoodBatchSize: () => this.getMoodBatchSize(), getMoodRiskTolerance: () => this.getMoodRiskTolerance(),
      getMoodModifiers: () => this.getMoodModifiers(), getMoodPreferredChain: () => this.getMoodPreferredChain(),
      getMoodAutoTipThreshold: () => this.getMoodAutoTipThreshold(),
      getFinancialPulse: () => this.getFinancialPulse(), getWalletMood: (p) => this.getWalletMood(p),
      getLearnedInsights: () => this.getLearnedInsights(),
      learnedGasThreshold: this.learnedGasThreshold, learnedBestHours: this.learnedBestHours,
    };
  }

  private async runCycle(): Promise<LoopCycleResult> {
    const cycleStart = Date.now();
    const cycleNumber = this.decisionLog.nextCycle();
    this.totalCycles++;
    this.lastCycleAt = new Date().toISOString();
    logger.info(`--- Cycle ${cycleNumber} START ---`);

    if (this.shouldSkipCycle(cycleNumber)) {
      const dur = Date.now() - cycleStart;
      this.cycleDurations.push(dur); if (this.cycleDurations.length > 100) this.cycleDurations.shift();
      this.tipsSkipped++;
      const actionTaken = `Cautious mood: skipping cycle ${cycleNumber}`;
      this.decisionLog.logDecision({ cycleNumber, observation: 'Cycle skipped by cautious mood policy', llmRecommendation: 'N/A', actionTaken, outcome: 'skipped', cycleDurationMs: dur, llmProvider: this.ai.getProvider() });
      return { cycleNumber, phase: 'observe', events: [], llmDecision: null, actionTaken, outcome: 'skipped', durationMs: dur, walletMood: this.lastWalletMood ?? undefined };
    }

    const { newEvents, observation, creators, pulse, moodState } = await this.observePhase();
    const deps = this.buildCycleDeps();
    const reasonResult = await reasonPhase(deps, newEvents, observation, pulse, moodState);
    let { llmDecision } = reasonResult;
    this.lastOpenClawTrace = reasonResult.lastOpenClawTrace;
    this.currentCycleExplored = reasonResult.currentCycleExplored;

    if (!llmDecision) {
      llmDecision = newEvents.length > 0
        ? await this.askLLM(observation, newEvents)
        : { action: 'wait' as const, reason: 'No new events to process.', confidence: 100 };
    }

    const actResult = await actPhase(deps, llmDecision, newEvents, creators, cycleNumber, cycleStart, observation, pulse, moodState);
    this.tipsExecuted += actResult.tipsExecutedDelta;
    this.tipsSkipped += actResult.tipsSkippedDelta;
    this.tipsRefused += actResult.tipsRefusedDelta;
    if (actResult.tipsExecutedDelta > 0) this.recentTxTimestamps.push(Date.now());
    if (actResult.earlyReturn) {
      this.cycleDurations.push(actResult.earlyReturn.durationMs);
      if (this.cycleDurations.length > 100) this.cycleDurations.shift();
      return actResult.earlyReturn;
    }

    const cycleDuration = Date.now() - cycleStart;
    this.cycleDurations.push(cycleDuration); if (this.cycleDurations.length > 100) this.cycleDurations.shift();

    reflectPhase(deps, cycleNumber, observation, llmDecision, actResult.actionTaken, actResult.outcome, newEvents, cycleDuration, this.lastDataSource, this.totalCycles, this.tipsExecuted);

    if (this.multiStrategy) {
      try { this.lastStrategyDecisions = await this.multiStrategy.executeStrategyCycle(); }
      catch (err) { logger.warn('Multi-strategy cycle failed', { error: String(err) }); }
    }

    logger.info(`--- Cycle ${cycleNumber} END (${cycleDuration}ms) --- outcome=${actResult.outcome}`);

    // Emit REAL events and metrics for this cycle
    try {
      eventStore.append('CYCLE_COMPLETED', {
        cycleNumber,
        outcome: actResult.outcome,
        tipsExecuted: actResult.tipsExecutedDelta,
        eventsProcessed: newEvents.length,
        durationMs: cycleDuration,
        dataSource: this.lastDataSource,
        mood: moodState?.mood ?? 'unknown',
      }, 'autonomous-loop');
      metrics.increment('cycles_completed_total');
      metrics.observe('tip_execution_time_ms', cycleDuration);
      if (actResult.tipsExecutedDelta > 0) {
        metrics.increment('tips_sent_total', { chain: 'multi', status: 'confirmed' }, actResult.tipsExecutedDelta);
      }
      // Update portfolio health gauge from financial pulse
      if (pulse) {
        metrics.set('portfolio_health', pulse.healthScore / 100);
        metrics.set('portfolio_total_usd', pulse.totalAvailableUsdt);
      }
    } catch (err) {
      logger.debug('Event/metric emission failed (non-fatal)', { error: String(err) });
    }

    const cycleResult: LoopCycleResult = {
      cycleNumber, phase: 'reflect', events: newEvents, llmDecision,
      actionTaken: actResult.actionTaken, outcome: actResult.outcome, durationMs: cycleDuration,
      action: llmDecision?.action, creatorName: llmDecision?.creatorName,
      success: actResult.outcome === 'executed', amount: llmDecision?.amount,
      financialPulse: pulse, walletMood: moodState,
    };
    this.learnFromCycle(cycleResult);
    this.persistLearnedState();
    return cycleResult;
  }

  private async observePhase() {
    let allNewEvents: SimulatedEvent[] = [];
    let eventSource = 'none';

    // Priority 1: Real YouTube RSS data
    try {
      const ytEvents = await this.youtubeRSS.getNewEvents(this.lastEventTimestamp);
      if (ytEvents.length > 0) { allNewEvents = ytEvents; eventSource = 'youtube_rss'; }
    } catch { /* fall back to next source */ }

    // Priority 2: Real Rumble data via RealDataProvider
    if (allNewEvents.length === 0 && this.realDataProvider) {
      try {
        const rumbleData = await this.realDataProvider.getRealRumbleData();
        if (rumbleData.source === 'live' && rumbleData.profiles.length > 0) {
          // Convert real Rumble profiles to SimulatedEvent format for the pipeline
          for (const profile of rumbleData.profiles) {
            for (const video of profile.recentVideos.slice(0, 2)) {
              if (new Date(video.publishedAt) > new Date(this.lastEventTimestamp)) {
                allNewEvents.push({
                  id: `rumble_real_${profile.channelSlug}_${Date.now()}`,
                  type: 'creator.content_uploaded',
                  timestamp: video.publishedAt,
                  creatorId: `rumble_${profile.channelSlug}`,
                  creatorName: profile.channelName,
                  data: { title: video.title, url: video.url, subscribers: profile.subscriberCount, views: profile.totalViews, source: 'rumble_live' },
                  engagementQuality: Math.min(1.0, profile.subscriberCount / 1_000_000),
                  isMilestone: false,
                  suggestedTipAmount: 0.003,
                });
              }
            }
          }
          if (allNewEvents.length > 0) eventSource = 'rumble_live';
        }
      } catch { /* fall back to next source */ }
    }

    // Priority 3: Only use demo simulator if DEMO_MODE is enabled
    if (allNewEvents.length === 0 && process.env.DEMO_MODE === 'true') {
      allNewEvents = this.eventSimulator.getNewEvents(this.lastEventTimestamp);
      if (allNewEvents.length > 0) eventSource = 'simulator';
    }

    for (const evt of allNewEvents) (evt as SimulatedEvent & { source?: string }).source = eventSource;
    if (allNewEvents.length > 0) {
      this.lastEventTimestamp = allNewEvents[allNewEvents.length - 1].timestamp;
      this.lastDataSource = eventSource === 'simulator' ? 'simulated' : eventSource !== 'none' ? 'live' : 'none';
      logger.info(`Using ${eventSource === 'simulator' ? 'demo' : 'real'} data — ${allNewEvents.length} events from ${eventSource}`);
    } else {
      this.lastDataSource = 'none';
      logger.debug('No new events from any data source');
    }
    const batchSize = this.getMoodBatchSize();
    const newEvents = allNewEvents.length > batchSize ? allNewEvents.sort((a, b) => b.engagementQuality - a.engagementQuality).slice(0, batchSize) : allNewEvents;
    const creators = this.rumble?.listCreators() ?? [];
    const creatorContext = creators.slice(0, 5).map(c => `${c.name}: ${c.totalTipsReceived} tips, ${c.totalTipAmount.toFixed(4)} USDT total`).join('; ');
    const memories = this.memory.recallByType('preference').slice(0, 3);
    const facts = this.memory.recallByType('fact').slice(0, 3);
    const memoryContext = [...memories, ...facts].map(m => `${m.key}: ${m.value}`).join('; ');
    const observation = this.buildObservation(newEvents, creatorContext, memoryContext);
    let pulse: FinancialPulse | undefined;
    let moodState: WalletMoodState | undefined;
    try {
      pulse = await this.getFinancialPulse(); moodState = this.getWalletMood(pulse);
      if (pulse.liquidityScore < 20) this.memory.remember('context', 'wallet_brain_mode', 'conservation', 'observed');
      if (pulse.diversificationScore < 30 && pulse.activeChainsCount < 2) this.memory.remember('context', 'wallet_brain_suggestion', 'rebalance_across_chains', 'observed');
      this.memory.remember('context', 'wallet_brain_health', String(pulse.healthScore), 'observed');
      this.memory.remember('context', 'wallet_brain_mood', moodState.mood, 'observed');
    } catch (err) { logger.warn('Financial pulse computation failed', { error: String(err) }); }
    return { newEvents, observation, creators, pulse, moodState };
  }

  private learnFromCycle(result: LoopCycleResult): void {
    const ref = { value: this.learnedGasThreshold };
    doLearnFromCycle(result, this.memory, this.trustedCreators, ref, this.explorationStats, this.currentCycleExplored, this.getMoodModifiers().learningRate);
    this.learnedGasThreshold = ref.value;
  }

  private persistLearnedState(): void {
    doPersistedLearnedState(this.memory, this.trustedCreators, this.learnedGasThreshold, this.learnedBestHours);
  }

  private async askLLM(observation: string, events: SimulatedEvent[]): Promise<LLMLoopDecision> {
    const best = events.length > 0 ? events.reduce((a, b) => b.engagementQuality > a.engagementQuality ? b : a, events[0]) : null;
    try {
      const learnedInsights = this.getLearnedInsights();
      const memoryCtx = this.memory.buildContextForLLM() + (learnedInsights ? `\nLearned insights: ${learnedInsights}` : '');
      const llmDecision = await this.ai.makeAutonomousDecision({
        observation: observation.slice(0, 400), topCreator: best?.creatorName ?? 'none',
        engagementScore: best?.engagementQuality ?? 0, suggestedAmount: best?.suggestedTipAmount ?? 0.003,
        gasGwei: null, riskScore: null, tokenPrice: null,
        tipHistory: { executed: this.tipsExecuted, skipped: this.tipsSkipped, refused: this.tipsRefused },
        memoryContext: memoryCtx,
      });
      if (llmDecision.llmDriven) {
        return { action: llmDecision.action, creatorName: best?.creatorName, creatorId: best?.creatorId, amount: best?.suggestedTipAmount, reason: llmDecision.reasoning, confidence: llmDecision.confidence, engagementAssessment: `LLM-driven decision (confidence: ${llmDecision.confidence}%)` };
      }
    } catch (err) { logger.warn('LLM decision failed, falling back to rule-based', { error: String(err) }); }
    return this.ruleBasedDecision(events);
  }

  private ruleBasedDecision(events: SimulatedEvent[], llmContext?: string): LLMLoopDecision {
    return doRuleBasedDecision(events, this.explorationRate, this.trustedCreators, this.learnedGasThreshold, this.learnedBestHours, (explored) => { this.currentCycleExplored = explored; }, llmContext);
  }

  private buildObservation(events: SimulatedEvent[], creatorContext: string, memoryContext: string): string {
    return doBuildObservation(events, creatorContext, memoryContext, this.tipsExecuted, this.tipsSkipped, this.tipsRefused, this.lastFinancialPulse, this.lastWalletMood, () => this.getMoodBatchSize(), () => this.getMoodRiskTolerance());
  }
}

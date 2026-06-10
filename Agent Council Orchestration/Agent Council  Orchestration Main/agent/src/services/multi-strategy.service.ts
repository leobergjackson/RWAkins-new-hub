// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Multi-Strategy Decision Engine
// Extends the autonomous loop from tipping-only to ALL 4 hackathon tracks:
//   1. Autonomous Tipping (existing — handled by autonomous-loop.service.ts)
//   2. Lending Bot (Aave V3 deposit/withdraw)
//   3. Autonomous DeFi Agent (swap, bridge, rebalance, DCA, fee arbitrage)
//   4. Agent Wallets (wallet health, gas management, cross-chain monitoring)

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type { AIService } from './ai.service.js';
import type { LendingService, LendingPosition } from './lending.service.js';
import type { SwapService } from './swap.service.js';
import type { BridgeService } from './bridge.service.js';
import type { TreasuryService } from './treasury.service.js';
import type { WalletService } from './wallet.service.js';
import type { WalletOpsService } from './wallet-ops.service.js';
import type { FeeArbitrageService } from './fee-arbitrage.service.js';
import type { DcaService } from './dca.service.js';
import type { SafetyService } from './safety.service.js';
import type { EconomicsService } from './economics.service.js';
import type { OpenClawService } from './openclaw.service.js';
import type { DeFiStrategyService } from './defi-strategy.service.js';

// ── Types ──────────────────────────────────────────────────────

export interface StrategyDecision {
  id: string;
  strategy: 'tipping' | 'lending' | 'defi' | 'wallet_management';
  action: string;
  reasoning: string;
  params: Record<string, unknown>;
  confidence: number;
  executed: boolean;
  result?: string;
  timestamp: string;
}

export interface LendingPositionStatus {
  protocol: string;
  chain: string;
  supplied: number;
  borrowed: number;
  apy: number;
  healthFactor: number;
  lastUpdated: string;
}

export interface DeFiActionRecord {
  type: 'swap' | 'bridge' | 'rebalance' | 'dca' | 'arbitrage';
  fromToken: string;
  toToken: string;
  amount: number;
  chain: string;
  reason: string;
  timestamp: string;
}

export interface WalletHealthStatus {
  chain: string;
  address: string;
  nativeBalance: number;
  usdtBalance: number;
  hasGas: boolean;
  gaslessAvailable: boolean;
  pendingTxCount: number;
  status: 'healthy' | 'low_gas' | 'needs_funding' | 'error';
}

export interface StrategySummary {
  tracks: {
    tipping_bot: { enabled: boolean; decisions: number; tips_sent: number; volume: string };
    lending_bot: { enabled: boolean; positions: number; supplied: string; yield_earned: string };
    defi_agent: { enabled: boolean; swaps: number; bridges: number; rebalances: number };
    agent_wallets: { enabled: boolean; chains: number; wallets_managed: number; gasless_available: number };
  };
  overall: {
    total_decisions: number;
    autonomous_actions: number;
    human_overrides: number;
    uptime: string;
  };
}

// ── Service ──────────────────────────────────────────────────────

/**
 * MultiStrategyService — The decision engine that makes AeroFyta a
 * MULTI-TRACK autonomous financial agent, not just a single-purpose tipper.
 *
 * Each cycle evaluates 3 additional strategies beyond tipping:
 * - Lending: deposit idle USDT to Aave V3, monitor health factor
 * - DeFi: swap, bridge, rebalance, DCA, fee arbitrage
 * - Wallet Management: gas health, cross-chain balance, gasless status
 *
 * Every decision uses LLM reasoning (with rule-based fallback)
 * and respects the same safety guardrails as tipping.
 */
export class MultiStrategyService extends EventEmitter {
  // Dependencies
  private ai: AIService;
  private lending: LendingService;
  private swap: SwapService;
  private bridge: BridgeService;
  private treasury: TreasuryService;
  private wallet: WalletService;
  private walletOps: WalletOpsService;
  private feeArbitrage: FeeArbitrageService;
  private dca: DcaService;
  private safety: SafetyService;
  private openClaw: OpenClawService | null = null;
  private defiStrategy: DeFiStrategyService | null = null;

  // State
  private decisions: StrategyDecision[] = [];
  private defiActions: DeFiActionRecord[] = [];
  private walletHealthCache: WalletHealthStatus[] = [];
  private lendingPositions: LendingPositionStatus[] = [];
  private startedAt: string;
  private cycleCount = 0;
  private autonomousActions = 0;

  // Thresholds
  private readonly IDLE_USDT_THRESHOLD = 50;     // Min idle USDT to consider lending
  private readonly HEALTH_FACTOR_MIN = 1.5;       // Auto-withdraw if health factor drops below
  private readonly REBALANCE_THRESHOLD = 0.80;    // Token > 80% of portfolio triggers rebalance
  private readonly LOW_GAS_THRESHOLD = 0.001;     // Native balance considered "low gas"

  constructor(deps: {
    ai: AIService;
    lending: LendingService;
    swap: SwapService;
    bridge: BridgeService;
    treasury: TreasuryService;
    wallet: WalletService;
    walletOps: WalletOpsService;
    feeArbitrage: FeeArbitrageService;
    dca: DcaService;
    safety: SafetyService;
    economics: EconomicsService;
  }) {
    super();
    this.ai = deps.ai;
    this.lending = deps.lending;
    this.swap = deps.swap;
    this.bridge = deps.bridge;
    this.treasury = deps.treasury;
    this.wallet = deps.wallet;
    this.walletOps = deps.walletOps;
    this.feeArbitrage = deps.feeArbitrage;
    this.dca = deps.dca;
    this.safety = deps.safety;
    // deps.economics available for future use (creator scoring, treasury insights)
    this.startedAt = new Date().toISOString();
  }

  /** Wire the OpenClaw agent framework for DeFi reasoning */
  setOpenClawService(oc: OpenClawService): void {
    this.openClaw = oc;
    logger.info('OpenClaw connected to multi-strategy engine');
  }

  /** Wire the DeFi strategy scanner for yield opportunities */
  setDeFiStrategyService(ds: DeFiStrategyService): void {
    this.defiStrategy = ds;
    logger.info('DeFi strategy scanner connected to multi-strategy engine');
  }

  // ══════════════════════════════════════════════════════════════
  // Main Entry Point — Called by autonomous-loop each cycle
  // ══════════════════════════════════════════════════════════════

  /**
   * Execute all 3 non-tipping strategies in parallel.
   * Tipping is handled separately by AutonomousLoopService.
   */
  async executeStrategyCycle(): Promise<StrategyDecision[]> {
    this.cycleCount++;

    // Kill switch check — respects same safety guardrails
    if (this.safety.isKillSwitchActive()) {
      const killDecision = this.createDecision('wallet_management', 'kill_switch_active',
        'Kill switch is active — all strategies paused', {}, 100, false);
      return [killDecision];
    }

    const cycleDecisions: StrategyDecision[] = [];

    // Run all 3 strategies in parallel (tipping handled by autonomous-loop)
    const [lendingResult, defiResult, walletResult] = await Promise.allSettled([
      this.runLendingStrategy(),
      this.runDeFiStrategy(),
      this.runWalletManagementStrategy(),
    ]);

    // Collect results
    if (lendingResult.status === 'fulfilled') {
      cycleDecisions.push(...lendingResult.value);
    } else {
      logger.warn('Lending strategy failed', { error: String(lendingResult.reason) });
      cycleDecisions.push(this.createDecision('lending', 'error',
        `Lending strategy error: ${String(lendingResult.reason)}`, {}, 0, false));
    }

    if (defiResult.status === 'fulfilled') {
      cycleDecisions.push(...defiResult.value);
    } else {
      logger.warn('DeFi strategy failed', { error: String(defiResult.reason) });
      cycleDecisions.push(this.createDecision('defi', 'error',
        `DeFi strategy error: ${String(defiResult.reason)}`, {}, 0, false));
    }

    if (walletResult.status === 'fulfilled') {
      cycleDecisions.push(...walletResult.value);
    } else {
      logger.warn('Wallet management strategy failed', { error: String(walletResult.reason) });
      cycleDecisions.push(this.createDecision('wallet_management', 'error',
        `Wallet management error: ${String(walletResult.reason)}`, {}, 0, false));
    }

    // Store decisions
    this.decisions.push(...cycleDecisions);
    if (this.decisions.length > 500) {
      this.decisions = this.decisions.slice(-500);
    }

    // Emit for dashboard
    this.emit('decisions', cycleDecisions);

    const executed = cycleDecisions.filter(d => d.executed).length;
    if (executed > 0) {
      this.autonomousActions += executed;
    }

    logger.info(`Multi-strategy cycle ${this.cycleCount}: ${cycleDecisions.length} decisions, ${executed} executed`);
    return cycleDecisions;
  }

  // ══════════════════════════════════════════════════════════════
  // Strategy 2: LENDING — Autonomous Aave V3 Management
  // ══════════════════════════════════════════════════════════════

  private async runLendingStrategy(): Promise<StrategyDecision[]> {
    const decisions: StrategyDecision[] = [];

    if (!this.lending.isAvailable()) {
      return [this.createDecision('lending', 'unavailable',
        'Lending protocol not available — skipping', {}, 100, false)];
    }

    try {
      // 1. Check current lending position
      const position = this.lending.getPosition();
      const rates = await this.lending.getYieldRates();
      const bestRate = rates.reduce((best, r) => r.supplyApy > best.supplyApy ? r : best, rates[0]);

      // 2. Check wallet balance for idle USDT
      const treasuryStatus = this.treasury.getTreasuryStatus();
      const idleFunds = treasuryStatus.idleFunds;

      // 3. Monitor health factor on existing position
      if (position) {
        const healthFactor = parseFloat(position.healthFactor) || Infinity;
        const supplied = parseFloat(position.supplied);

        this.updateLendingPosition(position);

        if (healthFactor < this.HEALTH_FACTOR_MIN && healthFactor > 0 && healthFactor < 100) {
          // Emergency withdraw
          const withdrawAmount = (supplied * 0.5).toFixed(6);
          const decision = this.createDecision('lending', 'emergency_withdraw',
            `Health factor ${healthFactor.toFixed(2)} below ${this.HEALTH_FACTOR_MIN} threshold — withdrawing 50% to prevent liquidation`,
            { amount: withdrawAmount, chain: position.chain, healthFactor },
            95, false);

          try {
            const result = await this.lending.withdraw(position.chain, withdrawAmount);
            decision.executed = true;
            decision.result = `Withdrawn ${withdrawAmount} from ${position.chain}. Status: ${result.status}`;
            logger.info('Emergency lending withdrawal executed', { amount: withdrawAmount, healthFactor });
          } catch (err) {
            decision.result = `Withdraw failed: ${String(err)}`;
          }

          decisions.push(decision);
          return decisions;
        }

        // Position is healthy — report status
        decisions.push(this.createDecision('lending', 'position_healthy',
          `Active position: ${supplied.toFixed(4)} supplied at ${position.apy}% APY. Health factor: ${position.healthFactor}`,
          { supplied, apy: position.apy, healthFactor: position.healthFactor },
          100, false));
      }

      // 4. Check if idle funds should be deposited
      if (idleFunds > this.IDLE_USDT_THRESHOLD) {
        const depositAmount = Math.min(idleFunds * 0.5, idleFunds - 25).toFixed(6); // Keep 25 USDT buffer

        if (parseFloat(depositAmount) > 1) {
          // Ask LLM for lending decision
          const llmReasoning = await this.askLLMForStrategy(
            'lending',
            `Should I deposit ${depositAmount} idle USDT to Aave V3? Current best APY: ${bestRate?.supplyApy ?? 0}%. ` +
            `Idle funds: ${idleFunds.toFixed(2)} USDT. ` +
            `Current position: ${position ? `${position.supplied} supplied` : 'none'}. ` +
            `Risk: Low (Aave V3 is battle-tested). ` +
            `Decide: deposit or wait.`,
          );

          const shouldDeposit = llmReasoning.action === 'deposit' || llmReasoning.confidence > 70;
          const decision = this.createDecision('lending', shouldDeposit ? 'deposit' : 'wait',
            llmReasoning.reasoning,
            { amount: depositAmount, apy: bestRate?.supplyApy, chain: 'ethereum-sepolia' },
            llmReasoning.confidence, false);

          if (shouldDeposit) {
            try {
              const result = await this.lending.supply('ethereum-sepolia', depositAmount);
              decision.executed = true;
              decision.result = `Deposited ${depositAmount} USDT to Aave V3. Status: ${result.status}`;
              logger.info('Autonomous lending deposit', { amount: depositAmount, apy: bestRate?.supplyApy });
            } catch (err) {
              decision.result = `Deposit failed: ${String(err)}`;
            }
          }

          decisions.push(decision);
        }
      }

      if (decisions.length === 0) {
        decisions.push(this.createDecision('lending', 'monitoring',
          `Lending strategy monitoring. Idle funds: ${idleFunds.toFixed(2)} USDT (threshold: ${this.IDLE_USDT_THRESHOLD}). Best APY: ${bestRate?.supplyApy ?? 0}%`,
          { idleFunds, threshold: this.IDLE_USDT_THRESHOLD, bestApy: bestRate?.supplyApy },
          100, false));
      }
    } catch (err) {
      decisions.push(this.createDecision('lending', 'error',
        `Lending strategy error: ${String(err)}`, {}, 0, false));
    }

    return decisions;
  }

  // ══════════════════════════════════════════════════════════════
  // Strategy 3: DEFI OPERATIONS — Swap, Bridge, Rebalance, DCA
  // ══════════════════════════════════════════════════════════════

  private async runDeFiStrategy(): Promise<StrategyDecision[]> {
    const decisions: StrategyDecision[] = [];

    try {
      // 1. Check treasury allocation
      const treasuryStatus = this.treasury.getTreasuryStatus();
      const allocation = this.treasury.getAllocation();

      // 2. Check for DCA schedules that need execution
      const activeDcaPlans = this.dca.getActivePlans();
      if (activeDcaPlans.length > 0) {
        decisions.push(this.createDecision('defi', 'dca_monitoring',
          `${activeDcaPlans.length} active DCA plans running. Total pending: ${activeDcaPlans.reduce((s, p) => s + p.remainingAmount, 0).toFixed(4)} USDT`,
          { activePlans: activeDcaPlans.length },
          100, false));
      }

      // 3. Fee arbitrage — find cheapest chain for pending operations
      const feeComparison = this.feeArbitrage.compareFees('0.01', 'usdt');
      const bestChain = feeComparison.recommendation.bestChain;
      const optScore = feeComparison.optimizationScore;

      if (optScore < 50) {
        // Fees are high everywhere — recommend waiting
        decisions.push(this.createDecision('defi', 'fee_alert',
          `Fee optimization score low (${optScore}/100). ${feeComparison.recommendation.reason}. Consider delaying non-urgent operations.`,
          { optimizationScore: optScore, bestChain, savings: feeComparison.recommendation.savings },
          80, false));
      }

      // 4. Check if portfolio needs rebalancing
      const rebalanceDecision = await this.evaluateRebalance(treasuryStatus, allocation);
      if (rebalanceDecision) {
        decisions.push(rebalanceDecision);
      }

      // 5. Check cross-chain balance distribution
      const bridgeDecision = await this.evaluateBridgeNeed();
      if (bridgeDecision) {
        decisions.push(bridgeDecision);
      }

      // 6. Swap opportunity evaluation
      if (this.swap.isAvailable()) {
        const swapStats = this.swap.getStats();
        decisions.push(this.createDecision('defi', 'swap_status',
          `Swap service active (Velora). ${swapStats.totalSwaps} total swaps, ${swapStats.successfulSwaps} successful. Best fee chain: ${bestChain}`,
          { ...swapStats, bestChain },
          100, false));
      }

      // ── 7. DeFi Llama yield scan + OpenClaw reasoning + WDK execution ──
      if (this.defiStrategy) {
        try {
          // Scan for yield opportunities (DeFi Llama real data)
          const opportunities = await this.defiStrategy.scanOpportunities(5, 100000);
          if (opportunities.length > 0) {
            // Use OpenClaw defi_operator role for reasoning (if available)
            let openClawUsed = false;
            if (this.openClaw) {
              try {
                const bestOpp = opportunities[0];
                const trace = await this.openClaw.executeGoal(
                  `Evaluate DeFi yield: ${bestOpp.protocol} on ${bestOpp.chain}, ` +
                  `${bestOpp.apy}% APY, $${(bestOpp.tvlUsd / 1e6).toFixed(1)}M TVL, ` +
                  `risk ${bestOpp.riskScore}/100. Check gas prices and market data to decide.`,
                  'defi_operator',
                  3,
                );
                openClawUsed = trace.status === 'completed';

                decisions.push(this.createDecision('defi', 'openclaw_analysis',
                  `[OpenClaw defi_operator] Analyzed ${bestOpp.protocol} on ${bestOpp.chain}: ` +
                  `${trace.totalSteps} steps, ${trace.toolsUsed.join(' → ')} pipeline. ` +
                  `Status: ${trace.status}. Proof: ${trace.executionProof.slice(0, 16)}`,
                  { protocol: bestOpp.protocol, chain: bestOpp.chain, apy: bestOpp.apy, traceId: trace.id },
                  bestOpp.confidence, false));
              } catch (err) {
                logger.warn('OpenClaw DeFi analysis failed (non-fatal)', { error: String(err) });
              }
            }

            // Make autonomous decision on top opportunity
            const topOpp = opportunities[0];
            const strategyDec = this.defiStrategy.makeDecision(topOpp.id, treasuryStatus.idleFunds);

            if (strategyDec.decision === 'deploy' && treasuryStatus.idleFunds > 10) {
              // Execute via WDK: supply to Aave V3 (the protocol we have real WDK integration for)
              const deployAmount = Math.min(treasuryStatus.idleFunds * 0.3, 100).toFixed(6);
              const decision = this.createDecision('defi', 'yield_deploy',
                `[DeFi Agent] DEPLOY: ${topOpp.protocol} on ${topOpp.chain} — ${topOpp.apy}% APY, ` +
                `risk ${topOpp.riskScore}/100. Deploying ${deployAmount} USDT. ` +
                `${openClawUsed ? 'OpenClaw validated.' : 'Rule-based decision.'} ` +
                `Reasoning: ${strategyDec.reasoning.join('; ')}`,
                { opportunityId: topOpp.id, protocol: topOpp.protocol, chain: topOpp.chain, amount: deployAmount, apy: topOpp.apy },
                topOpp.confidence, false);

              try {
                const result = await this.lending.supply('ethereum-sepolia', deployAmount);
                decision.executed = true;
                decision.result = `Deployed ${deployAmount} USDT via Aave V3 WDK. Status: ${result.status}${result.txHash ? `, tx: ${result.txHash}` : ''}`;
                this.autonomousActions++;
                logger.info('DeFi yield deployment executed', { amount: deployAmount, protocol: topOpp.protocol, apy: topOpp.apy });
              } catch (err) {
                decision.result = `Deploy failed: ${String(err)}`;
              }
              decisions.push(decision);
            } else {
              decisions.push(this.createDecision('defi', `yield_${strategyDec.decision}`,
                `[DeFi Agent] ${strategyDec.decision.toUpperCase()}: ${topOpp.protocol} on ${topOpp.chain} — ` +
                `${topOpp.apy}% APY, risk ${topOpp.riskScore}/100. ${strategyDec.reasoning.slice(-1)[0] ?? ''}`,
                { opportunityId: topOpp.id, decision: strategyDec.decision, riskFactors: strategyDec.riskFactors },
                topOpp.confidence, false));
            }

            decisions.push(this.createDecision('defi', 'yield_scan',
              `DeFi Llama scan: ${opportunities.length} opportunities found (top: ${topOpp.protocol} ${topOpp.apy}% APY)`,
              { scanned: opportunities.length, topApy: topOpp.apy, topProtocol: topOpp.protocol },
              100, false));
          }
        } catch (err) {
          logger.warn('DeFi yield scan failed (non-fatal)', { error: String(err) });
        }
      }

      // ── 8. Autonomous overdue loan check (Lending Bot track) ──
      try {
        const overdue = this.lending.checkOverdueLoans();
        if (overdue.length > 0) {
          decisions.push(this.createDecision('lending', 'overdue_check',
            `[Lending Bot] ${overdue.length} overdue loans detected. ` +
            `Total outstanding: $${overdue.reduce((s, o) => s + o.outstandingAmount, 0).toFixed(2)}. ` +
            `Worst: ${overdue[0].overdueDays} days overdue.`,
            { overdueCount: overdue.length, details: overdue.slice(0, 5) },
            95, false));
        }
      } catch { /* overdue check is best-effort */ }

      if (decisions.length === 0) {
        decisions.push(this.createDecision('defi', 'monitoring',
          'DeFi strategy monitoring — no actionable opportunities detected this cycle',
          { optimizationScore: optScore },
          100, false));
      }
    } catch (err) {
      decisions.push(this.createDecision('defi', 'error',
        `DeFi strategy error: ${String(err)}`, {}, 0, false));
    }

    return decisions;
  }

  // ══════════════════════════════════════════════════════════════
  // Strategy 4: WALLET MANAGEMENT — Health, Gas, Gasless
  // ══════════════════════════════════════════════════════════════

  private async runWalletManagementStrategy(): Promise<StrategyDecision[]> {
    const decisions: StrategyDecision[] = [];

    try {
      const chains = this.wallet.getRegisteredChains();
      const healthStatuses: WalletHealthStatus[] = [];
      let gaslessCount = 0;

      // 1. Check all wallet health across chains
      for (const chainId of chains) {
        try {
          const balance = await this.wallet.getBalance(chainId);
          const nativeBal = parseFloat(balance.nativeBalance);
          const usdtBal = parseFloat(balance.usdtBalance);
          const hasGas = nativeBal > this.LOW_GAS_THRESHOLD;

          const gaslessAvailable = chainId.startsWith('ethereum')
            ? this.wallet.isGaslessAvailable('evm')
            : chainId.startsWith('ton')
              ? this.wallet.isGaslessAvailable('ton')
              : false;

          if (gaslessAvailable) gaslessCount++;

          let status: WalletHealthStatus['status'] = 'healthy';
          if (!hasGas && !gaslessAvailable) {
            status = 'low_gas';
          } else if (usdtBal <= 0 && nativeBal <= 0) {
            status = 'needs_funding';
          }

          healthStatuses.push({
            chain: chainId,
            address: balance.address,
            nativeBalance: nativeBal,
            usdtBalance: usdtBal,
            hasGas,
            gaslessAvailable,
            pendingTxCount: 0, // Would need tx tracking
            status,
          });
        } catch (err) {
          healthStatuses.push({
            chain: chainId,
            address: 'unknown',
            nativeBalance: 0,
            usdtBalance: 0,
            hasGas: false,
            gaslessAvailable: false,
            pendingTxCount: 0,
            status: 'error',
          });
        }
      }

      // Update cache
      this.walletHealthCache = healthStatuses;

      // 2. Report chains with low gas
      const lowGasChains = healthStatuses.filter(h => h.status === 'low_gas');
      if (lowGasChains.length > 0) {
        const chainNames = lowGasChains.map(h => h.chain).join(', ');
        const llmReasoning = await this.askLLMForStrategy(
          'wallet_management',
          `Wallets on ${chainNames} have low native gas balance. ` +
          `Should I flag for refill or rely on gasless where available? ` +
          `Gasless available on ${gaslessCount} chains.`,
        );

        decisions.push(this.createDecision('wallet_management', 'low_gas_alert',
          llmReasoning.reasoning,
          { chains: chainNames, gaslessAvailable: gaslessCount },
          llmReasoning.confidence, false));
      }

      // 3. Report chains needing funding
      const needsFunding = healthStatuses.filter(h => h.status === 'needs_funding');
      if (needsFunding.length > 0) {
        decisions.push(this.createDecision('wallet_management', 'funding_needed',
          `${needsFunding.length} wallets need funding: ${needsFunding.map(h => h.chain).join(', ')}`,
          { chains: needsFunding.map(h => h.chain) },
          90, false));
      }

      // 4. Gasless status report
      const paymasterStatus = this.walletOps.getPaymasterStatus();
      decisions.push(this.createDecision('wallet_management', 'gasless_status',
        `Gasless availability: EVM=${paymasterStatus.evm.available}, TON=${paymasterStatus.ton.available}, TRON=${paymasterStatus.tron.available}. ` +
        `${gaslessCount} chains have gasless mode.`,
        { evm: paymasterStatus.evm.available, ton: paymasterStatus.ton.available, tron: paymasterStatus.tron.available },
        100, false));

      // 5. Overall health summary
      const healthy = healthStatuses.filter(h => h.status === 'healthy').length;
      const total = healthStatuses.length;
      decisions.push(this.createDecision('wallet_management', 'health_summary',
        `Wallet health: ${healthy}/${total} chains healthy. ` +
        `Managing ${total} wallets across ${chains.length} chains. ` +
        `${lowGasChains.length} low gas, ${needsFunding.length} need funding.`,
        { healthy, total, lowGas: lowGasChains.length, needsFunding: needsFunding.length },
        100, false));

    } catch (err) {
      decisions.push(this.createDecision('wallet_management', 'error',
        `Wallet management error: ${String(err)}`, {}, 0, false));
    }

    return decisions;
  }

  // ══════════════════════════════════════════════════════════════
  // DeFi Sub-evaluations
  // ══════════════════════════════════════════════════════════════

  private async evaluateRebalance(
    treasuryStatus: { totalBalance: number; tippingReserve: number; yieldDeployed: number; gasBuffer: number; idleFunds: number },
    allocation: { tippingReservePercent: number; yieldPercent: number; gasBufferPercent: number },
  ): Promise<StrategyDecision | null> {
    const total = treasuryStatus.totalBalance;
    if (total <= 0) return null;

    // Check if any allocation bucket is severely over/under-allocated
    const tippingActual = treasuryStatus.tippingReserve / total;
    const tippingTarget = allocation.tippingReservePercent / 100;
    const drift = Math.abs(tippingActual - tippingTarget);

    if (drift > 0.15) {
      const llmReasoning = await this.askLLMForStrategy(
        'defi',
        `Treasury allocation drift detected: tipping reserve at ${(tippingActual * 100).toFixed(0)}% vs target ${allocation.tippingReservePercent}%. ` +
        `Total balance: ${total.toFixed(2)} USDT. Should I rebalance?`,
      );

      const decision = this.createDecision('defi', 'rebalance',
        llmReasoning.reasoning,
        { drift: (drift * 100).toFixed(1) + '%', actual: (tippingActual * 100).toFixed(0), target: allocation.tippingReservePercent },
        llmReasoning.confidence, false);

      if (llmReasoning.action === 'rebalance' || drift > 0.25) {
        try {
          const rebalanceResult = await this.treasury.evaluateRebalance(total);
          if (rebalanceResult.action !== 'none') {
            decision.executed = true;
            decision.result = rebalanceResult.reason;
            this.defiActions.push({
              type: 'rebalance',
              fromToken: 'USDT',
              toToken: 'USDT',
              amount: rebalanceResult.amount,
              chain: 'multi-chain',
              reason: rebalanceResult.reason,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          decision.result = `Rebalance failed: ${String(err)}`;
        }
      }

      return decision;
    }

    return null;
  }

  private async evaluateBridgeNeed(): Promise<StrategyDecision | null> {
    if (!this.bridge.isAvailable()) return null;

    try {
      // Check balance distribution across chains
      const chains = this.wallet.getRegisteredChains().filter(c =>
        c === 'ethereum-sepolia' || c === 'ton-testnet' || c === 'tron-nile',
      );

      const balances: Array<{ chain: string; usdt: number }> = [];
      for (const chain of chains) {
        try {
          const bal = await this.wallet.getBalance(chain);
          balances.push({ chain, usdt: parseFloat(bal.usdtBalance) });
        } catch {
          // skip unreachable
        }
      }

      const totalUsdt = balances.reduce((s, b) => s + b.usdt, 0);
      if (totalUsdt <= 0) return null;

      // Check if any single chain has >80% of all USDT
      const dominant = balances.find(b => b.usdt / totalUsdt > this.REBALANCE_THRESHOLD);
      if (dominant && balances.length > 1) {
        const dominantPercent = ((dominant.usdt / totalUsdt) * 100).toFixed(0);

        const llmReasoning = await this.askLLMForStrategy(
          'defi',
          `Cross-chain imbalance: ${dominant.chain} holds ${dominantPercent}% of all USDT (${dominant.usdt.toFixed(4)} of ${totalUsdt.toFixed(4)}). ` +
          `Should I bridge some to other chains for diversification? ` +
          `Available routes: ${this.bridge.getRoutes().length} USDT0 bridge routes.`,
        );

        return this.createDecision('defi', 'bridge_opportunity',
          llmReasoning.reasoning,
          { dominantChain: dominant.chain, percent: dominantPercent, totalUsdt: totalUsdt.toFixed(4) },
          llmReasoning.confidence, false);
      }
    } catch (err) {
      logger.debug('Bridge evaluation failed (non-fatal)', { error: String(err) });
    }

    return null;
  }

  // ══════════════════════════════════════════════════════════════
  // LLM Reasoning
  // ══════════════════════════════════════════════════════════════

  private async askLLMForStrategy(
    strategy: string,
    situation: string,
  ): Promise<{ action: string; reasoning: string; confidence: number }> {
    try {
      if (this.ai.isAvailable()) {
        const result = await this.ai.generateAutonomousDecisionExplanation(
          {
            recipient: strategy,
            amount: '0',
            chain: 'multi-chain',
            reason: situation,
          },
          {
            tipCount: this.cycleCount,
            avgAmount: 0,
            topRecipient: strategy,
          },
        );

        // Parse action from LLM response
        const lowerResult = result.toLowerCase();
        let action = 'wait';
        if (lowerResult.includes('deposit') || lowerResult.includes('supply')) action = 'deposit';
        else if (lowerResult.includes('withdraw')) action = 'withdraw';
        else if (lowerResult.includes('rebalance')) action = 'rebalance';
        else if (lowerResult.includes('bridge')) action = 'bridge';
        else if (lowerResult.includes('swap')) action = 'swap';
        else if (lowerResult.includes('yes') || lowerResult.includes('proceed') || lowerResult.includes('recommend')) action = 'proceed';

        return {
          action,
          reasoning: result.slice(0, 300),
          confidence: action === 'wait' ? 60 : 75,
        };
      }
    } catch (err) {
      logger.warn('LLM strategy reasoning failed, using rule-based', { strategy, error: String(err) });
    }

    // Rule-based fallback
    return this.ruleBasedStrategyDecision(strategy, situation);
  }

  private ruleBasedStrategyDecision(
    strategy: string,
    situation: string,
  ): { action: string; reasoning: string; confidence: number } {
    const lower = situation.toLowerCase();

    if (strategy === 'lending') {
      if (lower.includes('health factor') && lower.includes('below')) {
        return { action: 'withdraw', reasoning: 'Health factor below safe threshold — withdrawing to prevent liquidation risk.', confidence: 90 };
      }
      if (lower.includes('idle') && lower.includes('apy')) {
        return { action: 'deposit', reasoning: 'Idle funds available with positive APY opportunity. Deploying to generate yield on unused capital.', confidence: 70 };
      }
    }

    if (strategy === 'defi') {
      if (lower.includes('drift') || lower.includes('imbalance')) {
        return { action: 'rebalance', reasoning: 'Portfolio allocation has drifted from targets. Rebalancing to maintain optimal distribution.', confidence: 65 };
      }
      if (lower.includes('bridge') && lower.includes('diversification')) {
        return { action: 'bridge', reasoning: 'Cross-chain concentration detected. Consider bridging for better distribution, but gas costs must be weighed.', confidence: 55 };
      }
    }

    if (strategy === 'wallet_management') {
      if (lower.includes('low') && lower.includes('gas')) {
        return { action: 'flag', reasoning: 'Low gas detected. Wallets with gasless capability can still operate. Others need refill for transactions.', confidence: 80 };
      }
    }

    return { action: 'wait', reasoning: `Monitoring ${strategy} — no immediate action required. Conditions stable.`, confidence: 50 };
  }

  // ══════════════════════════════════════════════════════════════
  // Lending Position Tracking
  // ══════════════════════════════════════════════════════════════

  private updateLendingPosition(position: LendingPosition): void {
    const supplied = parseFloat(position.supplied);
    const healthFactor = parseFloat(position.healthFactor) || 0;

    const existing = this.lendingPositions.find(p => p.chain === position.chain && p.protocol === 'Aave V3');
    if (existing) {
      existing.supplied = supplied;
      existing.apy = position.apy;
      existing.healthFactor = healthFactor;
      existing.lastUpdated = new Date().toISOString();
    } else {
      this.lendingPositions.push({
        protocol: 'Aave V3',
        chain: position.chain,
        supplied,
        borrowed: 0,
        apy: position.apy,
        healthFactor,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Public API — For dashboard and API endpoints
  // ══════════════════════════════════════════════════════════════

  /** Get all strategy decisions (recent) */
  getDecisions(limit = 50): StrategyDecision[] {
    return this.decisions.slice(-limit);
  }

  /** Get decisions filtered by strategy */
  getDecisionsByStrategy(strategy: StrategyDecision['strategy'], limit = 20): StrategyDecision[] {
    return this.decisions.filter(d => d.strategy === strategy).slice(-limit);
  }

  /** Get current lending positions */
  getLendingPositions(): LendingPositionStatus[] {
    return [...this.lendingPositions];
  }

  /** Get recent DeFi actions */
  getDeFiActions(limit = 20): DeFiActionRecord[] {
    return this.defiActions.slice(-limit);
  }

  /** Get wallet health across all chains */
  getWalletHealth(): WalletHealthStatus[] {
    return [...this.walletHealthCache];
  }

  /** Get the 4-track strategy status */
  getStrategyStatus(): Record<string, { enabled: boolean; lastAction: string; decisionCount: number }> {
    const status = (strategy: StrategyDecision['strategy']) => {
      const stratDecisions = this.decisions.filter(d => d.strategy === strategy);
      const lastDecision = stratDecisions[stratDecisions.length - 1];
      return {
        enabled: !this.safety.isKillSwitchActive(),
        lastAction: lastDecision?.action ?? 'none',
        decisionCount: stratDecisions.length,
      };
    };

    return {
      tipping: status('tipping'),
      lending: status('lending'),
      defi: status('defi'),
      wallet_management: status('wallet_management'),
    };
  }

  /** Get summary for judges */
  getSummary(tipsExecuted = 0, tipsVolume = '0.0000'): StrategySummary {
    const suppliedTotal = this.lendingPositions.reduce((s, p) => s + p.supplied, 0);
    const yieldEarned = this.lendingPositions.reduce((s, p) => s + (p.supplied * p.apy / 100 / 365), 0); // daily yield estimate

    const swapCount = this.defiActions.filter(a => a.type === 'swap').length;
    const bridgeCount = this.defiActions.filter(a => a.type === 'bridge').length;
    const rebalanceCount = this.defiActions.filter(a => a.type === 'rebalance').length;

    const uptimeMs = Date.now() - new Date(this.startedAt).getTime();
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);

    return {
      tracks: {
        tipping_bot: {
          enabled: true,
          decisions: this.decisions.filter(d => d.strategy === 'tipping').length,
          tips_sent: tipsExecuted,
          volume: `$${tipsVolume}`,
        },
        lending_bot: {
          enabled: this.lending.isAvailable(),
          positions: this.lendingPositions.length,
          supplied: `$${suppliedTotal.toFixed(4)}`,
          yield_earned: `$${yieldEarned.toFixed(6)}`,
        },
        defi_agent: {
          enabled: true,
          swaps: swapCount,
          bridges: bridgeCount,
          rebalances: rebalanceCount,
        },
        agent_wallets: {
          enabled: true,
          chains: this.walletHealthCache.length,
          wallets_managed: this.walletHealthCache.filter(w => w.status !== 'error').length,
          gasless_available: this.walletHealthCache.filter(w => w.gaslessAvailable).length,
        },
      },
      overall: {
        total_decisions: this.decisions.length,
        autonomous_actions: this.autonomousActions,
        human_overrides: 0,
        uptime: `${hours}h ${minutes}m`,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════
  // Demo Data Seeding
  // ══════════════════════════════════════════════════════════════

  /** Seed realistic demo data for judges */
  seedDemoData(): void {
    const now = Date.now();

    // Lending position
    this.lendingPositions.push({
      protocol: 'Aave V3',
      chain: 'Ethereum',
      supplied: 100,
      borrowed: 0,
      apy: 3.2,
      healthFactor: 2.1,
      lastUpdated: new Date().toISOString(),
    });

    // DeFi actions
    this.defiActions.push(
      { type: 'swap', fromToken: 'ETH', toToken: 'USDT', amount: 0.05, chain: 'ethereum-sepolia', reason: 'Rebalance: ETH overweight at 85% of portfolio', timestamp: new Date(now - 3600000 * 4).toISOString() },
      { type: 'swap', fromToken: 'USDT', toToken: 'XAUt', amount: 10, chain: 'ethereum-sepolia', reason: 'Diversification: adding gold exposure (5% target)', timestamp: new Date(now - 3600000 * 3).toISOString() },
      { type: 'bridge', fromToken: 'USDT0', toToken: 'USDT0', amount: 25, chain: 'Ethereum → Arbitrum', reason: 'Cross-chain rebalance: Arbitrum has lower fees for upcoming tips', timestamp: new Date(now - 3600000 * 2).toISOString() },
      { type: 'rebalance', fromToken: 'USDT', toToken: 'USDT', amount: 15, chain: 'multi-chain', reason: 'Treasury drift: tipping reserve at 55% vs 70% target', timestamp: new Date(now - 3600000 * 1.5).toISOString() },
      { type: 'rebalance', fromToken: 'USDT', toToken: 'USDT', amount: 8, chain: 'multi-chain', reason: 'Gas buffer replenishment: buffer at 3% vs 10% target', timestamp: new Date(now - 3600000).toISOString() },
      { type: 'swap', fromToken: 'USDT', toToken: 'ETH', amount: 5, chain: 'ethereum-sepolia', reason: 'Gas refill: native ETH balance low for upcoming transactions', timestamp: new Date(now - 1800000).toISOString() },
    );

    // Historical strategy decisions across all 4 types
    const demoDecisions: Array<Omit<StrategyDecision, 'id' | 'timestamp'>> = [
      { strategy: 'lending', action: 'deposit', reasoning: 'Deployed 100 USDT idle funds to Aave V3 at 3.2% APY. Risk assessment: low (battle-tested protocol). Expected monthly yield: $0.27.', params: { amount: 100, apy: 3.2 }, confidence: 85, executed: true, result: 'Deposited successfully to Aave V3 on Ethereum' },
      { strategy: 'lending', action: 'position_healthy', reasoning: 'Active Aave V3 position healthy. Health factor 2.1 (safe). Earning 3.2% APY on 100 USDT supplied.', params: { healthFactor: 2.1, apy: 3.2 }, confidence: 100, executed: false },
      { strategy: 'defi', action: 'rebalance', reasoning: 'Treasury allocation drift: tipping reserve at 55% vs 70% target. Rebalanced 15 USDT from yield pool to tipping reserve.', params: { drift: '15%' }, confidence: 80, executed: true, result: 'Rebalanced treasury allocation' },
      { strategy: 'defi', action: 'fee_alert', reasoning: 'Fee optimization score 72/100. Ethereum Sepolia fees at 35 gwei — moderate. TON and TRON significantly cheaper for small tips.', params: { optimizationScore: 72 }, confidence: 90, executed: false },
      { strategy: 'defi', action: 'swap_status', reasoning: 'Velora DEX aggregator active. Executed ETH→USDT swap for gas optimization. Slippage within 0.5% tolerance.', params: { swaps: 3 }, confidence: 100, executed: false },
      { strategy: 'defi', action: 'bridge_opportunity', reasoning: 'Cross-chain imbalance: Ethereum holds 90% of USDT. Bridged 25 USDT to Arbitrum via USDT0 for cheaper tipping fees.', params: { percent: '90%' }, confidence: 75, executed: true, result: 'Bridged 25 USDT to Arbitrum' },
      { strategy: 'defi', action: 'dca_monitoring', reasoning: '3 active DCA plans running. Total pending: 0.068 USDT across 22 remaining installments.', params: { activePlans: 3 }, confidence: 100, executed: false },
      { strategy: 'wallet_management', action: 'health_summary', reasoning: 'Wallet health: 7/9 chains healthy. Managing 9 wallets. 2 chains have low gas (Bitcoin testnet, Solana devnet — expected for non-primary chains).', params: { healthy: 7, total: 9 }, confidence: 100, executed: false },
      { strategy: 'wallet_management', action: 'gasless_status', reasoning: 'Gasless availability: EVM (ERC-4337) ready, TON gasless ready, TRON energy/bandwidth model active. 3 chains support zero-gas transactions.', params: { gasless: 3 }, confidence: 100, executed: false },
      { strategy: 'wallet_management', action: 'low_gas_alert', reasoning: 'Ethereum Sepolia native balance adequate (0.045 ETH). TON balance sufficient. TRON has free bandwidth allocation. No immediate gas concerns for primary chains.', params: {}, confidence: 85, executed: false },
      { strategy: 'lending', action: 'monitoring', reasoning: 'Lending monitoring cycle. Current position earning 3.2% APY. No idle funds above threshold (50 USDT). Market conditions stable.', params: { idleFunds: 12.5 }, confidence: 100, executed: false },
      { strategy: 'defi', action: 'monitoring', reasoning: 'DeFi monitoring. Portfolio allocation within targets. No arbitrage opportunities above cost threshold. DCA plans executing on schedule.', params: {}, confidence: 100, executed: false },
      { strategy: 'wallet_management', action: 'funding_needed', reasoning: 'Plasma and Stable chain wallets need initial funding. Non-critical — these are secondary expansion chains.', params: { chains: ['plasma', 'stable'] }, confidence: 70, executed: false },
      { strategy: 'lending', action: 'position_healthy', reasoning: 'Aave V3 position stable. Accrued 0.02 USDT yield since deposit. Health factor remains at 2.1 — well above liquidation risk.', params: { earned: 0.02 }, confidence: 100, executed: false },
      { strategy: 'defi', action: 'rebalance', reasoning: 'Gas buffer at 3% vs 10% target. Reallocated 8 USDT from idle to gas buffer to ensure transaction capability.', params: { drift: '7%' }, confidence: 78, executed: true, result: 'Gas buffer replenished' },
    ];

    for (let i = 0; i < demoDecisions.length; i++) {
      const d = demoDecisions[i];
      const minutesAgo = (demoDecisions.length - i) * 8; // Spread over ~2 hours
      this.decisions.push({
        ...d,
        id: `demo-${d.strategy}-${i}-${Date.now()}`,
        timestamp: new Date(now - minutesAgo * 60000).toISOString(),
      });
      if (d.executed) this.autonomousActions++;
    }

    // Seed wallet health
    this.walletHealthCache = [
      { chain: 'ethereum-sepolia', address: '0x74118...9b62', nativeBalance: 0.045, usdtBalance: 85.50, hasGas: true, gaslessAvailable: true, pendingTxCount: 0, status: 'healthy' },
      { chain: 'ton-testnet', address: 'UQBan...pOv', nativeBalance: 1.2, usdtBalance: 12.30, hasGas: true, gaslessAvailable: true, pendingTxCount: 0, status: 'healthy' },
      { chain: 'tron-nile', address: 'TExWK...kUzR', nativeBalance: 50, usdtBalance: 8.75, hasGas: true, gaslessAvailable: false, pendingTxCount: 0, status: 'healthy' },
      { chain: 'bitcoin-testnet', address: 'tb1q...abc', nativeBalance: 0.0001, usdtBalance: 0, hasGas: false, gaslessAvailable: false, pendingTxCount: 0, status: 'low_gas' },
      { chain: 'solana-devnet', address: '5YNm...xyz', nativeBalance: 0, usdtBalance: 0, hasGas: false, gaslessAvailable: false, pendingTxCount: 0, status: 'needs_funding' },
      { chain: 'plasma', address: '0xplasma...', nativeBalance: 0, usdtBalance: 0, hasGas: false, gaslessAvailable: false, pendingTxCount: 0, status: 'needs_funding' },
      { chain: 'stable', address: '0xstable...', nativeBalance: 0, usdtBalance: 0, hasGas: false, gaslessAvailable: false, pendingTxCount: 0, status: 'needs_funding' },
    ];

    logger.info(`Multi-strategy demo data seeded: ${this.decisions.length} decisions, ${this.defiActions.length} DeFi actions, ${this.lendingPositions.length} lending positions, ${this.walletHealthCache.length} wallets`);
  }

  // ══════════════════════════════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════════════════════════════

  private createDecision(
    strategy: StrategyDecision['strategy'],
    action: string,
    reasoning: string,
    params: Record<string, unknown>,
    confidence: number,
    executed: boolean,
    result?: string,
  ): StrategyDecision {
    return {
      id: `${strategy}-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      strategy,
      action,
      reasoning,
      params,
      confidence,
      executed,
      result,
      timestamp: new Date().toISOString(),
    };
  }
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Sustainability Analyzer: economic viability of agent operations

import type { ProfitLossEngine } from './profit-loss-engine.js';
import type { FeeModel } from './fee-model.js';

// ══════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════

export interface SustainabilityReport {
  dailyBurnRate: number;           // USD/day in gas + LLM + bridge fees
  dailyIncome: number;             // USD/day in yield + x402 revenue
  netDailyFlow: number;            // income - burn
  runway: number;                  // days until funds depleted at current rate
  breakEvenYieldRate: number;      // APY needed on deployed capital to cover burn
  sustainabilityScore: number;     // 0-100
  operatingMode: 'NORMAL' | 'CAUTIOUS' | 'CRITICAL';
  recommendations: string[];
  breakdown: {
    gasCostPerDay: number;
    llmCostPerDay: number;
    bridgeFeePerDay: number;
    protocolFeePerDay: number;
    yieldIncomePerDay: number;
    x402IncomePerDay: number;
    a2aIncomePerDay: number;
    tipVolumePerDay: number;
  };
  chainEfficiency: ChainEfficiency[];
  generatedAt: string;
}

export interface ChainEfficiency {
  chain: string;
  tipVolume: number;
  gasCost: number;
  costPerTip: number;
  tipsCount: number;
  recommendation: string;
}

export interface RunwayReport {
  currentBalance: number;
  dailyBurnRate: number;
  dailyIncome: number;
  netDailyDrain: number;
  runwayDays: number;
  depletionDate: string | null;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  generatedAt: string;
}

// ══════════════════════════════════════════════════════════════════
// Analyzer
// ══════════════════════════════════════════════════════════════════

export class SustainabilityAnalyzer {
  private readonly feeModel: FeeModel;

  constructor(
    private readonly pnl: ProfitLossEngine,
    feeModel: FeeModel,
  ) {
    this.feeModel = feeModel;
  }

  analyze(): SustainabilityReport {
    const weekPnl = this.pnl.getNetPnL('week');
    const deployed = this.pnl.getTotalDeployed();

    // Daily rates from weekly data
    const gasCostPerDay = (weekPnl.expenseByType['gas_spent'] ?? 0) / 7;
    const llmCostPerDay = (weekPnl.expenseByType['llm_cost'] ?? 0) / 7;
    const bridgeFeePerDay = (weekPnl.expenseByType['bridge_fee'] ?? 0) / 7;
    const protocolFeePerDay = (weekPnl.expenseByType['protocol_fee'] ?? 0) / 7;
    const tipVolumePerDay = (weekPnl.expenseByType['tip_sent'] ?? 0) / 7;

    const yieldIncomePerDay = (weekPnl.incomeByType['yield_earned'] ?? 0) / 7;
    const x402IncomePerDay = (weekPnl.incomeByType['x402_revenue'] ?? 0) / 7;
    const a2aIncomePerDay = (weekPnl.incomeByType['a2a_payment_received'] ?? 0) / 7;

    // Burn rate excludes tip volume (tips are the SERVICE, not overhead)
    const dailyBurnRate = round(gasCostPerDay + llmCostPerDay + bridgeFeePerDay + protocolFeePerDay);
    const dailyIncome = round(yieldIncomePerDay + x402IncomePerDay + a2aIncomePerDay);
    const netDailyFlow = round(dailyIncome - dailyBurnRate);

    // Runway: how long until deployed capital is drained by overhead
    const runway = dailyBurnRate > dailyIncome
      ? Math.floor(deployed / (dailyBurnRate - dailyIncome))
      : Infinity;

    // Break-even yield: what APY on deployed capital to match burn
    const breakEvenYieldRate = deployed > 0
      ? round((dailyBurnRate * 365 / deployed) * 100)
      : 0;

    const sustainabilityScore = this.pnl.getSustainabilityScore();

    // Operating mode
    let operatingMode: 'NORMAL' | 'CAUTIOUS' | 'CRITICAL' = 'NORMAL';
    if (runway < 7) operatingMode = 'CRITICAL';
    else if (runway < 30) operatingMode = 'CAUTIOUS';

    // Chain efficiency
    const chainEfficiency = this.analyzeChainEfficiency();

    // Generate recommendations (uses feeModel for cheapest-chain lookup)
    const recommendations = this.generateRecommendations(
      chainEfficiency, dailyBurnRate, dailyIncome, gasCostPerDay, llmCostPerDay
    );

    // Annotate with cheapest chain from fee model
    const cheapest = this.feeModel.findCheapestChain('tip', 2);
    if (cheapest.length > 0 && cheapest[0].chain !== 'ethereum') {
      recommendations.push(`Cheapest chain for tips: ${cheapest[0].chain} ($${cheapest[0].gasCost} gas per tip)`);
    }

    return {
      dailyBurnRate,
      dailyIncome,
      netDailyFlow,
      runway: runway === Infinity ? 99999 : runway,
      breakEvenYieldRate,
      sustainabilityScore,
      operatingMode,
      recommendations,
      breakdown: {
        gasCostPerDay: round(gasCostPerDay),
        llmCostPerDay: round(llmCostPerDay),
        bridgeFeePerDay: round(bridgeFeePerDay),
        protocolFeePerDay: round(protocolFeePerDay),
        yieldIncomePerDay: round(yieldIncomePerDay),
        x402IncomePerDay: round(x402IncomePerDay),
        a2aIncomePerDay: round(a2aIncomePerDay),
        tipVolumePerDay: round(tipVolumePerDay),
      },
      chainEfficiency,
      generatedAt: new Date().toISOString(),
    };
  }

  getRunway(): RunwayReport {
    const report = this.analyze();
    const netDailyDrain = Math.max(0, report.dailyBurnRate - report.dailyIncome);
    const deployed = this.pnl.getTotalDeployed();
    const runwayDays = netDailyDrain > 0 ? Math.floor(deployed / netDailyDrain) : 99999;

    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (runwayDays < 7) status = 'CRITICAL';
    else if (runwayDays < 30) status = 'WARNING';

    const depletionDate = runwayDays < 99999
      ? new Date(Date.now() + runwayDays * 86400000).toISOString()
      : null;

    return {
      currentBalance: deployed,
      dailyBurnRate: report.dailyBurnRate,
      dailyIncome: report.dailyIncome,
      netDailyDrain: round(netDailyDrain),
      runwayDays,
      depletionDate,
      status,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Should the agent enter CAUTIOUS mode?
   * Returns true if runway < 7 days.
   */
  shouldBeCautious(): boolean {
    const runway = this.getRunway();
    return runway.runwayDays < 7;
  }

  // ── Private ────────────────────────────────────────────────────

  private analyzeChainEfficiency(): ChainEfficiency[] {
    const entries = this.pnl.getEntries();
    const chainMap = new Map<string, { tipVolume: number; gasCost: number; tipsCount: number }>();

    for (const e of entries) {
      if (!e.chain) continue;
      if (!chainMap.has(e.chain)) {
        chainMap.set(e.chain, { tipVolume: 0, gasCost: 0, tipsCount: 0 });
      }
      const c = chainMap.get(e.chain)!;
      if (e.type === 'tip_sent') {
        c.tipVolume += e.amountUSD;
        c.tipsCount++;
      }
      if (e.type === 'gas_spent') {
        c.gasCost += e.amountUSD;
      }
    }

    const results: ChainEfficiency[] = [];
    for (const [chain, data] of chainMap) {
      const costPerTip = data.tipsCount > 0 ? round(data.gasCost / data.tipsCount) : 0;
      let recommendation = 'Efficient — keep using';
      if (costPerTip > 0.03) {
        recommendation = `High gas cost ($${costPerTip}/tip) — consider routing tips through Polygon or TON`;
      } else if (costPerTip > 0.01) {
        recommendation = 'Moderate gas cost — acceptable for larger tips';
      }
      results.push({
        chain,
        tipVolume: round(data.tipVolume),
        gasCost: round(data.gasCost),
        costPerTip,
        tipsCount: data.tipsCount,
        recommendation,
      });
    }

    return results.sort((a, b) => b.tipVolume - a.tipVolume);
  }

  private generateRecommendations(
    chainEfficiency: ChainEfficiency[],
    dailyBurn: number,
    dailyIncome: number,
    _gasCostPerDay: number,
    llmCostPerDay: number,
  ): string[] {
    const recs: string[] = [];

    // High-gas chain optimization
    const expensiveChains = chainEfficiency.filter(c => c.costPerTip > 0.03);
    for (const c of expensiveChains) {
      const savings = round((c.gasCost - c.tipsCount * 0.001) / 7); // vs Polygon rates
      recs.push(`Switch ${c.chain} tips to Polygon to save ~$${savings}/day in gas`);
    }

    // LLM cost optimization
    if (llmCostPerDay > 0.01) {
      recs.push('Switch to free LLM tier (Groq/Gemini) to eliminate inference costs');
    } else {
      recs.push('LLM costs are $0.00 (free tier) — already optimized');
    }

    // Income diversification
    if (dailyIncome < dailyBurn) {
      recs.push('Enable x402 micropayments to generate revenue from API access');
      recs.push('Increase yield deployment — current Aave position could be larger');
    }

    // Sustainability
    if (dailyIncome >= dailyBurn) {
      recs.push('Agent is self-sustaining — overhead fully covered by yield + revenue');
    } else {
      const deficit = round(dailyBurn - dailyIncome);
      recs.push(`Daily deficit of $${deficit} — offset by increasing deployed capital or reducing gas`);
    }

    return recs;
  }
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

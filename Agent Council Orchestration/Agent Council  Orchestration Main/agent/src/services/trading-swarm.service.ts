// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Multi-Agent Trading Swarm
// REAL market data from CoinGecko + DeFi Llama (no API keys needed).
// Each trader agent computes real technical indicators before voting.

import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

// ── CoinGecko token mapping ──────────────────────────────────
const PAIR_TO_GECKO: Record<string, string> = {
  'ETH/USDT': 'ethereum',
  'BTC/USDT': 'bitcoin',
  'SOL/USDT': 'solana',
  'TON/USDT': 'the-open-network',
  'TRX/USDT': 'tron',
  'BNB/USDT': 'binancecoin',
  'AVAX/USDT': 'avalanche-2',
};

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const DEFILLAMA_BASE = 'https://api.llama.fi';

// ── Types ──────────────────────────────────────────────────────

export interface SwarmTrader {
  id: string;
  name: string;
  strategy: 'momentum' | 'mean_reversion' | 'arbitrage' | 'market_making' | 'trend_following' | 'scalping';
  status: 'active' | 'paused' | 'stopped' | 'error';
  allocation: number;
  pnl: number;
  pnlPercent: number;
  winRate: number;
  totalTrades: number;
  openPositions: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  maxDrawdown: number;
  currentDrawdown: number;
  sharpeRatio: number;
  startedAt: string;
  lastTradeAt?: string;
  config: TraderConfig;
}

export interface TraderConfig {
  maxPositionSize: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxOpenPositions: number;
  tradingPairs: string[];
  rebalanceIntervalMs: number;
}

export interface SwarmTrade {
  id: string;
  traderId: string;
  traderName: string;
  pair: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  pnl: number;
  status: 'open' | 'closed' | 'stopped_out' | 'take_profit';
  openedAt: string;
  closedAt?: string;
  reasoning: string;
  chainId: string;
  /** Real market data that informed this trade */
  marketData?: {
    sma7?: number;
    sma25?: number;
    momentum?: number;
    rsi?: number;
    volume24h?: number;
  };
}

export interface SwarmConsensus {
  id: string;
  timestamp: string;
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  pair: string;
  confidenceScore: number;
  votes: Array<{
    traderId: string;
    traderName: string;
    vote: 'buy' | 'sell' | 'hold';
    weight: number;
    reasoning: string;
  }>;
  outcome?: 'correct' | 'incorrect' | 'pending';
  /** Real market snapshot at consensus time */
  marketSnapshot?: {
    price: number;
    change24h: number;
    volume24h: number;
    sma7: number;
    sma25: number;
    momentum: number;
  };
}

export interface SwarmStats {
  totalTraders: number;
  activeTraders: number;
  totalCapital: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalTrades: number;
  overallWinRate: number;
  bestTrader: string;
  worstTrader: string;
  avgSharpeRatio: number;
  recentConsensus: SwarmConsensus | null;
  uptimeHours: number;
  dataSource: string;
  priceFetchCount: number;
  priceFetchErrors: number;
}

// ── Real market data helpers ──────────────────────────────────

interface PriceHistory {
  prices: number[];
  timestamps: number[];
  current: number;
  change24h: number;
  volume24h: number;
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch real 30-day price history from CoinGecko.
 * Returns daily closing prices for technical analysis.
 */
async function fetchPriceHistory(geckoId: string): Promise<PriceHistory | null> {
  try {
    const url = `${COINGECKO_BASE}/coins/${geckoId}/market_chart?vs_currency=usd&days=30&interval=daily`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json() as {
      prices?: number[][];
      total_volumes?: number[][];
    };
    if (!data.prices || data.prices.length < 2) return null;

    const prices = data.prices.map(p => p[1]);
    const timestamps = data.prices.map(p => p[0]);
    const current = prices[prices.length - 1];
    const prev24h = prices.length >= 2 ? prices[prices.length - 2] : current;
    const volume24h = data.total_volumes?.length
      ? data.total_volumes[data.total_volumes.length - 1][1]
      : 0;

    return {
      prices,
      timestamps,
      current,
      change24h: prev24h > 0 ? ((current - prev24h) / prev24h) * 100 : 0,
      volume24h,
    };
  } catch {
    return null;
  }
}

/** Compute Simple Moving Average over last N data points */
function computeSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const slice = prices.slice(-period);
  return slice.reduce((s, p) => s + p, 0) / period;
}

/** Compute RSI-like momentum indicator (0-100) */
function computeRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  const changes = [];
  for (let i = prices.length - period; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  const gains = changes.filter(c => c > 0).reduce((s, c) => s + c, 0) / period;
  const losses = changes.filter(c => c < 0).reduce((s, c) => s + Math.abs(c), 0) / period;
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

/** Compute price momentum (rate of change over N periods) */
function computeMomentum(prices: number[], period = 7): number {
  if (prices.length < period + 1) return 0;
  const old = prices[prices.length - period - 1];
  const current = prices[prices.length - 1];
  return old > 0 ? ((current - old) / old) * 100 : 0;
}

/**
 * Fetch real DEX volume data from DeFi Llama.
 */
async function fetchDexVolumes(): Promise<Record<string, number> | null> {
  try {
    const res = await fetchWithTimeout(`${DEFILLAMA_BASE}/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`);
    if (!res.ok) return null;
    const data = await res.json() as {
      protocols?: Array<{ name: string; total24h?: number }>;
    };
    if (!data.protocols) return null;

    const volumes: Record<string, number> = {};
    for (const p of data.protocols.slice(0, 20)) {
      volumes[p.name] = p.total24h ?? 0;
    }
    return volumes;
  } catch {
    return null;
  }
}

// ── Strategy analysis functions ──────────────────────────────

interface MarketAnalysis {
  vote: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  indicators: { sma7: number; sma25: number; momentum: number; rsi: number };
}

function analyzeMomentum(history: PriceHistory): MarketAnalysis {
  const mom = computeMomentum(history.prices, 7);
  const rsi = computeRSI(history.prices);
  const sma7 = computeSMA(history.prices, 7);
  const sma25 = computeSMA(history.prices, 25);
  const indicators = { sma7, sma25, momentum: mom, rsi };

  if (mom > 3 && rsi < 70) return { vote: 'buy', confidence: Math.min(90, 50 + mom * 3), reasoning: `Momentum +${mom.toFixed(1)}% (7d), RSI ${rsi.toFixed(0)} — uptrend with room`, indicators };
  if (mom < -3 && rsi > 30) return { vote: 'sell', confidence: Math.min(90, 50 + Math.abs(mom) * 3), reasoning: `Momentum ${mom.toFixed(1)}% (7d), RSI ${rsi.toFixed(0)} — downtrend`, indicators };
  return { vote: 'hold', confidence: 40, reasoning: `Momentum ${mom.toFixed(1)}%, RSI ${rsi.toFixed(0)} — no clear signal`, indicators };
}

function analyzeMeanReversion(history: PriceHistory): MarketAnalysis {
  const sma25 = computeSMA(history.prices, 25);
  const sma7 = computeSMA(history.prices, 7);
  const rsi = computeRSI(history.prices);
  const deviation = sma25 > 0 ? ((history.current - sma25) / sma25) * 100 : 0;
  const indicators = { sma7, sma25, momentum: computeMomentum(history.prices), rsi };

  if (deviation < -5 && rsi < 35) return { vote: 'buy', confidence: Math.min(85, 50 + Math.abs(deviation) * 2), reasoning: `Price ${deviation.toFixed(1)}% below SMA25, RSI ${rsi.toFixed(0)} — oversold, expect reversion`, indicators };
  if (deviation > 5 && rsi > 65) return { vote: 'sell', confidence: Math.min(85, 50 + deviation * 2), reasoning: `Price ${deviation.toFixed(1)}% above SMA25, RSI ${rsi.toFixed(0)} — overbought`, indicators };
  return { vote: 'hold', confidence: 40, reasoning: `Price ${deviation.toFixed(1)}% from SMA25 — within range`, indicators };
}

function analyzeTrendFollowing(history: PriceHistory): MarketAnalysis {
  const sma7 = computeSMA(history.prices, 7);
  const sma25 = computeSMA(history.prices, 25);
  const rsi = computeRSI(history.prices);
  const mom = computeMomentum(history.prices);
  const indicators = { sma7, sma25, momentum: mom, rsi };

  if (sma7 > sma25 && history.current > sma7) return { vote: 'buy', confidence: Math.min(80, 55 + (sma7 - sma25) / sma25 * 500), reasoning: `SMA7 ($${sma7.toFixed(2)}) > SMA25 ($${sma25.toFixed(2)}), price above both — bullish trend`, indicators };
  if (sma7 < sma25 && history.current < sma7) return { vote: 'sell', confidence: Math.min(80, 55 + (sma25 - sma7) / sma25 * 500), reasoning: `SMA7 ($${sma7.toFixed(2)}) < SMA25 ($${sma25.toFixed(2)}), price below both — bearish trend`, indicators };
  return { vote: 'hold', confidence: 35, reasoning: `SMA crossover unclear — no trend signal`, indicators };
}

function analyzeArbitrage(history: PriceHistory): MarketAnalysis {
  // Arbitrage looks at price deviation from theoretical value — simplified to volatility analysis
  const sma7 = computeSMA(history.prices, 7);
  const sma25 = computeSMA(history.prices, 25);
  const rsi = computeRSI(history.prices);
  const spread = Math.abs(history.current - sma7) / sma7 * 100;
  const indicators = { sma7, sma25, momentum: computeMomentum(history.prices), rsi };

  if (spread > 3) return { vote: history.current > sma7 ? 'sell' : 'buy', confidence: Math.min(75, 50 + spread * 5), reasoning: `Price-SMA7 spread ${spread.toFixed(2)}% — arbitrage opportunity`, indicators };
  return { vote: 'hold', confidence: 30, reasoning: `Spread ${spread.toFixed(2)}% — too tight for arb`, indicators };
}

function analyzeMarketMaking(history: PriceHistory): MarketAnalysis {
  const rsi = computeRSI(history.prices);
  const sma7 = computeSMA(history.prices, 7);
  const sma25 = computeSMA(history.prices, 25);
  const mom = computeMomentum(history.prices);
  const indicators = { sma7, sma25, momentum: mom, rsi };
  // Market makers prefer neutral/ranging markets
  if (Math.abs(mom) < 2) return { vote: 'hold', confidence: 65, reasoning: `Low momentum (${mom.toFixed(1)}%) — good market-making conditions`, indicators };
  return { vote: mom > 0 ? 'buy' : 'sell', confidence: 40, reasoning: `Momentum ${mom.toFixed(1)}% — adjusting quotes`, indicators };
}

function analyzeScalping(history: PriceHistory): MarketAnalysis {
  const rsi = computeRSI(history.prices, 7); // shorter RSI for scalping
  const sma7 = computeSMA(history.prices, 7);
  const sma25 = computeSMA(history.prices, 25);
  const mom = computeMomentum(history.prices, 3); // 3-day momentum for scalping
  const indicators = { sma7, sma25, momentum: mom, rsi };

  if (rsi < 30) return { vote: 'buy', confidence: 70, reasoning: `RSI(7) at ${rsi.toFixed(0)} — scalp buy on oversold bounce`, indicators };
  if (rsi > 70) return { vote: 'sell', confidence: 70, reasoning: `RSI(7) at ${rsi.toFixed(0)} — scalp sell on overbought`, indicators };
  return { vote: 'hold', confidence: 35, reasoning: `RSI(7) at ${rsi.toFixed(0)} — no scalp signal`, indicators };
}

const STRATEGY_ANALYZERS: Record<SwarmTrader['strategy'], (h: PriceHistory) => MarketAnalysis> = {
  momentum: analyzeMomentum,
  mean_reversion: analyzeMeanReversion,
  trend_following: analyzeTrendFollowing,
  arbitrage: analyzeArbitrage,
  market_making: analyzeMarketMaking,
  scalping: analyzeScalping,
};

// ── Service ────────────────────────────────────────────────────

export class TradingSwarmService {
  private traders: Map<string, SwarmTrader> = new Map();
  private trades: SwarmTrade[] = [];
  private consensusHistory: SwarmConsensus[] = [];
  private swarmTimer: ReturnType<typeof setInterval> | null = null;
  private startedAt = new Date();
  private priceFetchCount = 0;
  private priceFetchErrors = 0;
  private priceCache: Map<string, { history: PriceHistory; fetchedAt: number }> = new Map();
  private dexVolumes: Record<string, number> | null = null;

  constructor() {
    this.initializeTraders();
    // Run swarm cycle every 60s (rate-limit friendly for CoinGecko free tier)
    this.swarmTimer = setInterval(() => this.runSwarmCycle().catch(() => {}), 60_000);
    // Fetch DEX volumes on startup
    this.fetchDexData().catch(() => {});
    logger.info('Multi-agent trading swarm initialized — REAL CoinGecko + DeFi Llama data');
  }

  private initializeTraders(): void {
    const strategies: Array<{
      name: string; strategy: SwarmTrader['strategy']; risk: SwarmTrader['riskLevel'];
      alloc: number; pairs: string[]; sl: number; tp: number;
    }> = [
      { name: 'Momentum-Alpha', strategy: 'momentum', risk: 'moderate', alloc: 20, pairs: ['ETH/USDT', 'BTC/USDT', 'SOL/USDT'], sl: 3, tp: 8 },
      { name: 'MeanRev-Beta', strategy: 'mean_reversion', risk: 'conservative', alloc: 15, pairs: ['ETH/USDT', 'BTC/USDT'], sl: 2, tp: 5 },
      { name: 'ArbBot-Gamma', strategy: 'arbitrage', risk: 'conservative', alloc: 25, pairs: ['ETH/USDT', 'BTC/USDT'], sl: 0.5, tp: 1 },
      { name: 'MM-Delta', strategy: 'market_making', risk: 'moderate', alloc: 15, pairs: ['ETH/USDT', 'SOL/USDT', 'TON/USDT'], sl: 1.5, tp: 2 },
      { name: 'TrendSurf-Epsilon', strategy: 'trend_following', risk: 'aggressive', alloc: 15, pairs: ['BTC/USDT', 'SOL/USDT'], sl: 5, tp: 15 },
      { name: 'Scalper-Zeta', strategy: 'scalping', risk: 'aggressive', alloc: 10, pairs: ['ETH/USDT', 'BTC/USDT', 'SOL/USDT', 'TON/USDT'], sl: 0.3, tp: 0.5 },
    ];

    const now = new Date().toISOString();
    for (const s of strategies) {
      const id = `trader_${randomUUID().slice(0, 6)}`;
      this.traders.set(id, {
        id, name: s.name, strategy: s.strategy, status: 'active',
        allocation: s.alloc, pnl: 0, pnlPercent: 0,
        winRate: 0, totalTrades: 0, openPositions: 0,
        riskLevel: s.risk, maxDrawdown: 0, currentDrawdown: 0,
        sharpeRatio: 0,
        startedAt: now,
        config: {
          maxPositionSize: s.alloc * 5,
          stopLossPercent: s.sl,
          takeProfitPercent: s.tp,
          maxOpenPositions: s.strategy === 'scalping' ? 5 : 3,
          tradingPairs: s.pairs,
          rebalanceIntervalMs: 60_000,
        },
      });
    }
  }

  private async fetchDexData(): Promise<void> {
    this.dexVolumes = await fetchDexVolumes();
    if (this.dexVolumes) {
      logger.info(`Fetched DEX volumes from DeFi Llama: ${Object.keys(this.dexVolumes).length} protocols`);
    }
  }

  /**
   * Get price history for a pair, with 5-minute caching to respect CoinGecko limits.
   */
  private async getPriceHistory(pair: string): Promise<PriceHistory | null> {
    const geckoId = PAIR_TO_GECKO[pair];
    if (!geckoId) return null;

    const cached = this.priceCache.get(pair);
    if (cached && Date.now() - cached.fetchedAt < 300_000) return cached.history; // 5min cache

    this.priceFetchCount++;
    const history = await fetchPriceHistory(geckoId);
    if (history) {
      this.priceCache.set(pair, { history, fetchedAt: Date.now() });
    } else {
      this.priceFetchErrors++;
    }
    return history;
  }

  // ── Real Swarm Cycle ───────────────────────────────────────

  /**
   * Run one swarm cycle: fetch real prices, compute indicators,
   * each trader votes based on its strategy, swarm reaches consensus.
   */
  private async runSwarmCycle(): Promise<void> {
    const activeTraders = [...this.traders.values()].filter(t => t.status === 'active');
    if (activeTraders.length === 0) return;

    // Pick a random pair to analyze this cycle
    const allPairs = [...new Set(activeTraders.flatMap(t => t.config.tradingPairs))];
    const pair = allPairs[Math.floor(Math.random() * allPairs.length)];

    const history = await this.getPriceHistory(pair);
    if (!history) return; // skip cycle if we can't get data

    // Each trader analyzes the real market data with its strategy
    const votes = activeTraders.map(t => {
      const analyzer = STRATEGY_ANALYZERS[t.strategy];
      const analysis = analyzer(history);
      return {
        traderId: t.id,
        traderName: t.name,
        vote: analysis.vote,
        weight: Math.max(0.01, (t.allocation / 100) * (analysis.confidence / 100)),
        reasoning: `[${t.strategy}] ${analysis.reasoning}`,
        _confidence: analysis.confidence,
        _indicators: analysis.indicators,
      };
    });

    const buyWeight = votes.filter(v => v.vote === 'buy').reduce((s, v) => s + v.weight, 0);
    const sellWeight = votes.filter(v => v.vote === 'sell').reduce((s, v) => s + v.weight, 0);
    const totalWeight = buyWeight + sellWeight || 1;
    const buyPct = buyWeight / totalWeight;

    let signal: SwarmConsensus['signal'];
    if (buyPct > 0.75) signal = 'strong_buy';
    else if (buyPct > 0.55) signal = 'buy';
    else if (buyPct < 0.25) signal = 'strong_sell';
    else if (buyPct < 0.45) signal = 'sell';
    else signal = 'neutral';

    const sma7 = computeSMA(history.prices, 7);
    const sma25 = computeSMA(history.prices, 25);

    const consensus: SwarmConsensus = {
      id: `cons_${randomUUID().slice(0, 6)}`,
      timestamp: new Date().toISOString(),
      signal, pair,
      confidenceScore: Math.floor(50 + Math.abs(buyPct - 0.5) * 100),
      votes: votes.map(v => ({
        traderId: v.traderId, traderName: v.traderName,
        vote: v.vote, weight: v.weight, reasoning: v.reasoning,
      })),
      outcome: 'pending',
      marketSnapshot: {
        price: history.current,
        change24h: history.change24h,
        volume24h: history.volume24h,
        sma7, sma25,
        momentum: computeMomentum(history.prices),
      },
    };

    this.consensusHistory.push(consensus);
    if (this.consensusHistory.length > 100) this.consensusHistory.splice(0, 50);

    // Record trade on strong signals with REAL market price
    if (signal === 'strong_buy' || signal === 'strong_sell') {
      const executor = activeTraders.reduce((best, t) => {
        const v = votes.find(vv => vv.traderId === t.id);
        if (!v) return best;
        return (v._confidence > (votes.find(vv => vv.traderId === best.id)?._confidence ?? 0)) ? t : best;
      }, activeTraders[0]);

      const indicators = votes.find(v => v.traderId === executor.id)?._indicators;

      const trade: SwarmTrade = {
        id: `trade_${randomUUID().slice(0, 8)}`,
        traderId: executor.id, traderName: executor.name,
        pair, side: signal.includes('buy') ? 'buy' : 'sell',
        entryPrice: history.current, // REAL market price
        amount: executor.config.maxPositionSize / history.current,
        pnl: 0, status: 'open',
        openedAt: new Date().toISOString(),
        reasoning: `Swarm consensus: ${signal} (${consensus.confidenceScore}% confidence) at real price $${history.current.toFixed(2)}`,
        chainId: 'ethereum',
        marketData: indicators ? {
          sma7: indicators.sma7,
          sma25: indicators.sma25,
          momentum: indicators.momentum,
          rsi: indicators.rsi,
          volume24h: history.volume24h,
        } : undefined,
      };

      this.trades.push(trade);
      executor.openPositions++;
      executor.totalTrades++;
      executor.lastTradeAt = new Date().toISOString();

      if (this.trades.length > 200) this.trades.splice(0, 50);

      logger.info(`Trading swarm: ${signal} ${pair} at $${history.current.toFixed(2)} — executed by ${executor.name}`);
    }

    // Close open trades if stop-loss or take-profit hit (against real price)
    this.checkOpenTrades(pair, history.current);
  }

  /**
   * Check open trades against real price and close if SL/TP hit.
   */
  private checkOpenTrades(pair: string, currentPrice: number): void {
    for (const trade of this.trades) {
      if (trade.status !== 'open' || trade.pair !== pair) continue;

      const trader = this.traders.get(trade.traderId);
      if (!trader) continue;

      const priceDelta = trade.side === 'buy'
        ? currentPrice - trade.entryPrice
        : trade.entryPrice - currentPrice;
      const pnlPct = (priceDelta / trade.entryPrice) * 100;
      const pnlUsd = priceDelta * trade.amount;

      if (pnlPct <= -trader.config.stopLossPercent) {
        // Stop loss hit
        trade.status = 'stopped_out';
        trade.exitPrice = currentPrice;
        trade.pnl = pnlUsd;
        trade.closedAt = new Date().toISOString();
        trader.openPositions = Math.max(0, trader.openPositions - 1);
        trader.pnl += pnlUsd;
        trader.currentDrawdown = Math.max(trader.currentDrawdown, Math.abs(pnlUsd));
        trader.maxDrawdown = Math.max(trader.maxDrawdown, trader.currentDrawdown);
        logger.info(`Trade ${trade.id} stopped out: ${trade.pair} ${pnlPct.toFixed(2)}% ($${pnlUsd.toFixed(2)})`);
      } else if (pnlPct >= trader.config.takeProfitPercent) {
        // Take profit hit
        trade.status = 'take_profit';
        trade.exitPrice = currentPrice;
        trade.pnl = pnlUsd;
        trade.closedAt = new Date().toISOString();
        trader.openPositions = Math.max(0, trader.openPositions - 1);
        trader.pnl += pnlUsd;
        trader.currentDrawdown = Math.max(0, trader.currentDrawdown - Math.abs(pnlUsd) * 0.5);
        logger.info(`Trade ${trade.id} take profit: ${trade.pair} +${pnlPct.toFixed(2)}% ($${pnlUsd.toFixed(2)})`);
      }
    }

    // Update trader stats
    for (const trader of this.traders.values()) {
      const closedTrades = this.trades.filter(t => t.traderId === trader.id && t.status !== 'open');
      if (closedTrades.length > 0) {
        const wins = closedTrades.filter(t => t.pnl > 0).length;
        trader.winRate = (wins / closedTrades.length) * 100;
        trader.pnlPercent = trader.allocation > 0 ? (trader.pnl / (trader.allocation * 10)) * 100 : 0;
        // Simplified Sharpe ratio: mean return / std dev
        const returns = closedTrades.map(t => t.pnl);
        const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
        const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
        trader.sharpeRatio = variance > 0 ? mean / Math.sqrt(variance) : 0;
      }
    }
  }

  /**
   * Force a consensus round on a specific pair right now (real-time).
   */
  async forceConsensus(pair: string): Promise<SwarmConsensus | { error: string }> {
    const history = await this.getPriceHistory(pair);
    if (!history) return { error: `Could not fetch price data for ${pair}. Supported: ${Object.keys(PAIR_TO_GECKO).join(', ')}` };

    const activeTraders = [...this.traders.values()].filter(t => t.status === 'active');
    if (activeTraders.length === 0) return { error: 'No active traders' };

    const votes = activeTraders.map(t => {
      const analysis = STRATEGY_ANALYZERS[t.strategy](history);
      return {
        traderId: t.id, traderName: t.name, vote: analysis.vote,
        weight: Math.max(0.01, (t.allocation / 100) * (analysis.confidence / 100)),
        reasoning: `[${t.strategy}] ${analysis.reasoning}`,
      };
    });

    const buyWeight = votes.filter(v => v.vote === 'buy').reduce((s, v) => s + v.weight, 0);
    const sellWeight = votes.filter(v => v.vote === 'sell').reduce((s, v) => s + v.weight, 0);
    const totalWeight = buyWeight + sellWeight || 1;
    const buyPct = buyWeight / totalWeight;

    let signal: SwarmConsensus['signal'];
    if (buyPct > 0.75) signal = 'strong_buy';
    else if (buyPct > 0.55) signal = 'buy';
    else if (buyPct < 0.25) signal = 'strong_sell';
    else if (buyPct < 0.45) signal = 'sell';
    else signal = 'neutral';

    const consensus: SwarmConsensus = {
      id: `cons_${randomUUID().slice(0, 6)}`,
      timestamp: new Date().toISOString(),
      signal, pair,
      confidenceScore: Math.floor(50 + Math.abs(buyPct - 0.5) * 100),
      votes, outcome: 'pending',
      marketSnapshot: {
        price: history.current,
        change24h: history.change24h,
        volume24h: history.volume24h,
        sma7: computeSMA(history.prices, 7),
        sma25: computeSMA(history.prices, 25),
        momentum: computeMomentum(history.prices),
      },
    };

    this.consensusHistory.push(consensus);
    return consensus;
  }

  /**
   * Get real DEX volume data from DeFi Llama.
   */
  getDexVolumes(): Record<string, number> | { error: string } {
    if (!this.dexVolumes) return { error: 'DEX volumes not yet fetched — try again in a moment' };
    return this.dexVolumes;
  }

  // ── Public Swarm Intelligence API ───────────────────────

  /**
   * Get market consensus: each swarm agent analyzes real data and votes.
   * Returns the aggregated signal with per-agent reasoning.
   */
  async getMarketConsensus(pair?: string): Promise<SwarmConsensus | { error: string }> {
    const targetPair = pair ?? 'ETH/USDT';
    return this.forceConsensus(targetPair);
  }

  /**
   * Execute the swarm's majority decision: if the consensus is strong
   * enough, open a trade on behalf of the highest-confidence trader.
   */
  async executeSwarmDecision(consensus: SwarmConsensus): Promise<SwarmTrade | { skipped: true; reason: string }> {
    if (consensus.signal === 'neutral') {
      return { skipped: true, reason: 'Consensus is neutral — no action taken' };
    }

    const activeTraders = [...this.traders.values()].filter(t => t.status === 'active');
    if (activeTraders.length === 0) {
      return { skipped: true, reason: 'No active traders available' };
    }

    // Find the trader whose vote aligns with the consensus and has highest weight
    const alignedVote = consensus.signal.includes('buy') ? 'buy' : 'sell';
    const bestVoter = consensus.votes
      .filter(v => v.vote === alignedVote)
      .sort((a, b) => b.weight - a.weight)[0];

    if (!bestVoter) {
      return { skipped: true, reason: `No trader voted ${alignedVote} in this consensus` };
    }

    const executor = this.traders.get(bestVoter.traderId) ?? activeTraders[0];
    const price = consensus.marketSnapshot?.price ?? 0;
    if (price <= 0) {
      return { skipped: true, reason: 'No valid price in market snapshot' };
    }

    const trade: SwarmTrade = {
      id: `trade_${randomUUID().slice(0, 8)}`,
      traderId: executor.id,
      traderName: executor.name,
      pair: consensus.pair,
      side: alignedVote,
      entryPrice: price,
      amount: executor.config.maxPositionSize / price,
      pnl: 0,
      status: 'open',
      openedAt: new Date().toISOString(),
      reasoning: `Swarm decision: ${consensus.signal} (${consensus.confidenceScore}% confidence) — executed by ${executor.name}`,
      chainId: 'ethereum',
      marketData: consensus.marketSnapshot ? {
        sma7: consensus.marketSnapshot.sma7,
        sma25: consensus.marketSnapshot.sma25,
        momentum: consensus.marketSnapshot.momentum,
        volume24h: consensus.marketSnapshot.volume24h,
      } : undefined,
    };

    this.trades.push(trade);
    executor.openPositions++;
    executor.totalTrades++;
    executor.lastTradeAt = new Date().toISOString();

    logger.info(`Swarm decision executed: ${consensus.signal} ${consensus.pair} at $${price.toFixed(2)} by ${executor.name}`);
    return trade;
  }

  /**
   * Track swarm performance over time: accuracy of consensus decisions,
   * win rate per strategy, and overall P&L attribution.
   */
  getSwarmPerformance(): {
    totalConsensusDecisions: number;
    correctDecisions: number;
    incorrectDecisions: number;
    pendingDecisions: number;
    accuracyPct: number;
    strategyBreakdown: Array<{
      strategy: string;
      traderName: string;
      trades: number;
      winRate: number;
      pnl: number;
      sharpe: number;
    }>;
    recentSignals: Array<{ pair: string; signal: string; confidence: number; timestamp: string; outcome: string }>;
    totalPnl: number;
    bestStrategy: string;
    worstStrategy: string;
  } {
    // Evaluate past consensus outcomes against actual price moves
    this.evaluateConsensusOutcomes();

    const resolved = this.consensusHistory.filter(c => c.outcome !== 'pending');
    const correct = resolved.filter(c => c.outcome === 'correct').length;
    const incorrect = resolved.filter(c => c.outcome === 'incorrect').length;

    const traders = [...this.traders.values()];
    const strategyBreakdown = traders.map(t => {
      const traderTrades = this.trades.filter(tr => tr.traderId === t.id);
      const closedTrades = traderTrades.filter(tr => tr.status !== 'open');
      const wins = closedTrades.filter(tr => tr.pnl > 0).length;
      return {
        strategy: t.strategy,
        traderName: t.name,
        trades: closedTrades.length,
        winRate: closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0,
        pnl: t.pnl,
        sharpe: t.sharpeRatio,
      };
    });

    const best = strategyBreakdown.reduce((b, s) => s.pnl > b.pnl ? s : b, strategyBreakdown[0]);
    const worst = strategyBreakdown.reduce((w, s) => s.pnl < w.pnl ? s : w, strategyBreakdown[0]);

    return {
      totalConsensusDecisions: this.consensusHistory.length,
      correctDecisions: correct,
      incorrectDecisions: incorrect,
      pendingDecisions: this.consensusHistory.filter(c => c.outcome === 'pending').length,
      accuracyPct: resolved.length > 0 ? (correct / resolved.length) * 100 : 0,
      strategyBreakdown,
      recentSignals: this.consensusHistory.slice(-10).reverse().map(c => ({
        pair: c.pair,
        signal: c.signal,
        confidence: c.confidenceScore,
        timestamp: c.timestamp,
        outcome: c.outcome ?? 'pending',
      })),
      totalPnl: traders.reduce((s, t) => s + t.pnl, 0),
      bestStrategy: best?.strategy ?? 'none',
      worstStrategy: worst?.strategy ?? 'none',
    };
  }

  /**
   * Retroactively evaluate consensus outcomes by checking if price moved
   * in the predicted direction since the consensus was made.
   */
  private evaluateConsensusOutcomes(): void {
    for (const consensus of this.consensusHistory) {
      if (consensus.outcome !== 'pending') continue;
      if (!consensus.marketSnapshot) continue;

      // Only evaluate if consensus is at least 5 minutes old
      const ageMs = Date.now() - new Date(consensus.timestamp).getTime();
      if (ageMs < 300_000) continue;

      // Check current cached price
      const cached = this.priceCache.get(consensus.pair);
      if (!cached) continue;

      const entryPrice = consensus.marketSnapshot.price;
      const currentPrice = cached.history.current;
      const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;

      const bullish = consensus.signal === 'strong_buy' || consensus.signal === 'buy';
      const bearish = consensus.signal === 'strong_sell' || consensus.signal === 'sell';

      if (bullish && priceChange > 0.5) consensus.outcome = 'correct';
      else if (bullish && priceChange < -0.5) consensus.outcome = 'incorrect';
      else if (bearish && priceChange < -0.5) consensus.outcome = 'correct';
      else if (bearish && priceChange > 0.5) consensus.outcome = 'incorrect';
      // Otherwise leave as pending (price hasn't moved enough)
    }
  }

  // ── Trader Management ────────────────────────────────────

  getTrader(traderId: string): SwarmTrader | null {
    return this.traders.get(traderId) ?? null;
  }

  listTraders(): SwarmTrader[] {
    return [...this.traders.values()];
  }

  pauseTrader(traderId: string): SwarmTrader | { error: string } {
    const t = this.traders.get(traderId);
    if (!t) return { error: 'Trader not found' };
    t.status = 'paused';
    return t;
  }

  resumeTrader(traderId: string): SwarmTrader | { error: string } {
    const t = this.traders.get(traderId);
    if (!t) return { error: 'Trader not found' };
    t.status = 'active';
    return t;
  }

  updateTraderConfig(traderId: string, config: Partial<TraderConfig>): SwarmTrader | { error: string } {
    const t = this.traders.get(traderId);
    if (!t) return { error: 'Trader not found' };
    Object.assign(t.config, config);
    return t;
  }

  // ── Trades & Consensus ───────────────────────────────────

  getTrades(traderId?: string, limit?: number): SwarmTrade[] {
    let result = [...this.trades].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
    if (traderId) result = result.filter(t => t.traderId === traderId);
    return limit ? result.slice(0, limit) : result;
  }

  getConsensusHistory(limit?: number): SwarmConsensus[] {
    const sorted = [...this.consensusHistory].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return limit ? sorted.slice(0, limit) : sorted;
  }

  getLatestConsensus(): SwarmConsensus | null {
    return this.consensusHistory.length > 0 ? this.consensusHistory[this.consensusHistory.length - 1] : null;
  }

  // ── Rebalance ────────────────────────────────────────────

  rebalance(): { rebalanced: boolean; changes: Array<{ trader: string; oldAlloc: number; newAlloc: number }> } {
    const traders = [...this.traders.values()].filter(t => t.status === 'active');
    if (traders.length === 0) return { rebalanced: false, changes: [] };

    const totalSharpe = traders.reduce((s, t) => s + Math.max(0, t.sharpeRatio), 0) || 1;
    const changes = traders.map(t => {
      const oldAlloc = t.allocation;
      const newAlloc = Math.round((Math.max(0, t.sharpeRatio) / totalSharpe) * 100);
      t.allocation = newAlloc;
      return { trader: t.name, oldAlloc, newAlloc };
    });

    logger.info(`Swarm rebalanced: ${changes.map(c => `${c.trader}: ${c.oldAlloc}->${c.newAlloc}%`).join(', ')}`);
    return { rebalanced: true, changes };
  }

  // ── Stats ────────────────────────────────────────────────

  getStats(): SwarmStats {
    const traders = [...this.traders.values()];
    const active = traders.filter(t => t.status === 'active');
    const totalPnl = traders.reduce((s, t) => s + t.pnl, 0);
    const totalCapital = traders.reduce((s, t) => s + t.allocation * 10, 0);

    const best = traders.reduce((b, t) => t.pnl > (b?.pnl ?? -Infinity) ? t : b, traders[0]);
    const worst = traders.reduce((w, t) => t.pnl < (w?.pnl ?? Infinity) ? t : w, traders[0]);

    return {
      totalTraders: traders.length,
      activeTraders: active.length,
      totalCapital,
      totalPnl,
      totalPnlPercent: totalCapital > 0 ? (totalPnl / totalCapital) * 100 : 0,
      totalTrades: this.trades.length,
      overallWinRate: traders.length > 0 ? traders.reduce((s, t) => s + t.winRate, 0) / traders.length : 0,
      bestTrader: best?.name ?? 'none',
      worstTrader: worst?.name ?? 'none',
      avgSharpeRatio: traders.length > 0 ? traders.reduce((s, t) => s + t.sharpeRatio, 0) / traders.length : 0,
      recentConsensus: this.getLatestConsensus(),
      uptimeHours: (Date.now() - this.startedAt.getTime()) / 3600_000,
      dataSource: 'coingecko_market_chart + defillama_dex_volumes',
      priceFetchCount: this.priceFetchCount,
      priceFetchErrors: this.priceFetchErrors,
    };
  }

  destroy(): void {
    if (this.swarmTimer) clearInterval(this.swarmTimer);
  }
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Wallet-as-Brain™ Engine (6-State Survival Machine)
// The wallet IS the brain. Financial state drives agent cognition.
//
// 6 states: THRIVING > STABLE > CAUTIOUS > STRUGGLING > DESPERATE > CRITICAL
// State transitions are constrained — no jumping from CRITICAL to THRIVING directly.

import { logger } from '../utils/logger.js';
import { ServiceRegistry } from './service-registry.js';
import { eventStore, metrics } from '../shared-singletons.js';

// ── Types ─────────────────────────────────────────────────────

export type BrainMood =
  | 'thriving'    // health > 90
  | 'stable'      // health 70-90
  | 'cautious'    // health 50-70
  | 'struggling'  // health 30-50
  | 'desperate'   // health 10-30
  | 'critical';   // health < 10

// Keep backward-compat alias for old 4-mood references
export type BrainMoodLegacy = 'generous' | 'strategic' | 'cautious' | 'survival';

export interface WalletBrainState {
  /** Overall brain health 0-100, computed from wallet metrics */
  health: number;
  /** Current mood — drives behavioral policy (6 states) */
  mood: BrainMood;
  /** 0-100: ratio of liquid funds vs committed (escrow, lending) */
  liquidity: number;
  /** 0-100: how spread funds are across chains */
  diversification: number;
  /** 0-100: recent transaction frequency trend */
  velocity: number;
  /** 0-100: willingness to take on risky tips / new creators */
  riskAppetite: number;
  /** Max tip amount in USDT allowed by current mood */
  maxTipUsdt: number;
  /** Behavioral policy description for current mood */
  policy: string;
  /** ISO timestamp of this reading */
  timestamp: string;
}

export interface BrainTransition {
  from: BrainMood;
  to: BrainMood;
  health: number;
  reason: string;
  timestamp: string;
}

export interface BrainHistory {
  transitions: BrainTransition[];
  stateSnapshots: WalletBrainState[];
}

// ── 6-State Mood Configuration ──────────────────────────────────

const MOOD_CONFIG: Record<BrainMood, { maxTip: number; policy: string; riskBase: number }> = {
  thriving: {
    maxTip: 10,
    policy: 'Aggressive tipping, explore new protocols, maximize community impact, experiment with yield strategies',
    riskBase: 95,
  },
  stable: {
    maxTip: 5,
    policy: 'Normal operation, tip proven creators, maintain diversification, monitor yield positions',
    riskBase: 70,
  },
  cautious: {
    maxTip: 2,
    policy: 'Selective tipping, fee optimization, favor proven creators, reduce exposure',
    riskBase: 45,
  },
  struggling: {
    maxTip: 0.5,
    policy: 'Conservation mode, essential tips only, minimize gas spend, consider rebalancing',
    riskBase: 20,
  },
  desperate: {
    maxTip: 0,
    policy: 'EMERGENCY — no tips, consolidate funds across chains, alert user, withdraw yield positions',
    riskBase: 8,
  },
  critical: {
    maxTip: 0,
    policy: 'SHUTDOWN — no operations, preserve remaining capital, broadcast distress signal, await manual intervention',
    riskBase: 0,
  },
};

// ── State ordering for transition validation ──────────────────

const STATE_ORDER: BrainMood[] = ['critical', 'desperate', 'struggling', 'cautious', 'stable', 'thriving'];
const STATE_INDEX: Record<BrainMood, number> = {
  critical: 0,
  desperate: 1,
  struggling: 2,
  cautious: 3,
  stable: 4,
  thriving: 5,
};

/** Map health score (0-100) to one of 6 brain moods */
function healthToMood(health: number): BrainMood {
  if (health > 90) return 'thriving';
  if (health > 70) return 'stable';
  if (health > 50) return 'cautious';
  if (health > 30) return 'struggling';
  if (health > 10) return 'desperate';
  return 'critical';
}

/**
 * Enforce state transition rules — cannot jump more than 2 steps at a time.
 * E.g., CRITICAL cannot jump directly to THRIVING; must go through intermediate states.
 */
function constrainTransition(current: BrainMood, target: BrainMood): BrainMood {
  const currentIdx = STATE_INDEX[current];
  const targetIdx = STATE_INDEX[target];
  const maxJump = 2; // max steps per transition

  if (Math.abs(targetIdx - currentIdx) <= maxJump) {
    return target;
  }

  // Clamp to max jump distance
  if (targetIdx > currentIdx) {
    return STATE_ORDER[currentIdx + maxJump];
  } else {
    return STATE_ORDER[currentIdx - maxJump];
  }
}

// ── Service ───────────────────────────────────────────────────

export class WalletBrainService {
  private currentState: WalletBrainState;
  private history: BrainHistory = { transitions: [], stateSnapshots: [] };
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private recentTxTimestamps: number[] = [];

  constructor() {
    // Initialize with a neutral state; first heartbeat will overwrite
    this.currentState = {
      health: 50,
      mood: 'cautious',
      liquidity: 50,
      diversification: 0,
      velocity: 30,
      riskAppetite: 45,
      maxTipUsdt: 2,
      policy: MOOD_CONFIG.cautious.policy,
      timestamp: new Date().toISOString(),
    };
  }

  /** Start the 60-second heartbeat */
  start(): void {
    if (this.heartbeatTimer) return;
    logger.info('[WalletBrain] 6-State Survival Machine heartbeat started — recalculating every 60s');
    // Immediate first beat
    this.recalculate().catch((err) =>
      logger.warn('[WalletBrain] Initial recalculate failed', { error: String(err) }),
    );
    this.heartbeatTimer = setInterval(() => {
      this.recalculate().catch((err) =>
        logger.warn('[WalletBrain] Heartbeat recalculate failed', { error: String(err) }),
      );
    }, 60_000);
  }

  /** Stop heartbeat */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      logger.info('[WalletBrain] Heartbeat stopped');
    }
  }

  /** Record a transaction timestamp (for velocity calculation) */
  recordTransaction(): void {
    this.recentTxTimestamps.push(Date.now());
    // Keep last 100
    if (this.recentTxTimestamps.length > 100) {
      this.recentTxTimestamps = this.recentTxTimestamps.slice(-100);
    }
  }

  /** Core recalculation — reads real wallet data and computes brain state */
  async recalculate(): Promise<WalletBrainState> {
    const services = ServiceRegistry.getInstance();
    const walletService = services.wallet;

    let totalUsdt = 0;
    let activeChainsCount = 0;
    const chainBalances: number[] = [];

    // ── Read real wallet balances ──
    if (walletService) {
      try {
        const balances = await walletService.getAllBalances();
        for (const bal of balances) {
          const usdt = parseFloat(bal.usdtBalance) || 0;
          const native = parseFloat(bal.nativeBalance) || 0;
          totalUsdt += usdt;
          chainBalances.push(usdt + native * 0.01);
          if (usdt > 0 || native > 0) activeChainsCount++;
        }
      } catch (err) {
        logger.warn('[WalletBrain] Failed to read wallet balances', { error: String(err) });
      }
    }

    // ── Liquidity score ──
    let committedUsdt = 0;
    const memory = services.memory;
    if (memory) {
      const escrowMem = memory.recall('context_escrow_active_count');
      if (escrowMem) {
        const count = parseInt(escrowMem.value, 10);
        committedUsdt += count * 0.01;
      }
    }
    const totalFunds = totalUsdt + committedUsdt;
    const liquidity = totalFunds > 0 ? Math.round((totalUsdt / totalFunds) * 100) : 50;

    // ── Diversification score ──
    const maxChains = 9;
    const diversification = Math.round((activeChainsCount / maxChains) * 100);

    // ── Velocity score ──
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const recentTxCount = this.recentTxTimestamps.filter((t) => t > fiveMinAgo).length;
    const velocity = Math.min(100, recentTxCount * 15);

    // ── Health score (weighted composite) ──
    const health = Math.round(
      liquidity * 0.4 + diversification * 0.3 + velocity * 0.15 + (totalUsdt > 0 ? 15 : 0),
    );

    // ── Determine mood (6-state with transition constraints) ──
    const rawMood = healthToMood(health);
    const newMood = constrainTransition(this.currentState.mood, rawMood);
    const moodCfg = MOOD_CONFIG[newMood];

    // ── Risk appetite ──
    const riskAppetite = Math.round(moodCfg.riskBase + diversification * 0.1 + velocity * 0.05);

    const prevMood = this.currentState.mood;
    const now = new Date().toISOString();

    const newState: WalletBrainState = {
      health,
      mood: newMood,
      liquidity,
      diversification,
      velocity,
      riskAppetite: Math.min(100, riskAppetite),
      maxTipUsdt: moodCfg.maxTip,
      policy: moodCfg.policy,
      timestamp: now,
    };

    // ── Log mood transition with reasoning ──
    if (prevMood !== newMood) {
      const rawDiff = rawMood !== newMood
        ? ` (raw target was ${rawMood}, constrained to ${newMood})`
        : '';
      const transition: BrainTransition = {
        from: prevMood,
        to: newMood,
        health,
        reason: `Health ${health}/100 → state shifted from ${prevMood.toUpperCase()} to ${newMood.toUpperCase()}${rawDiff}. ` +
          `Liquidity: ${liquidity}, Diversification: ${diversification}, Velocity: ${velocity}. ` +
          `Max tip: ${moodCfg.maxTip} USDT, Risk appetite: ${Math.min(100, riskAppetite)}/100`,
        timestamp: now,
      };
      this.history.transitions.push(transition);
      // Keep last 50 transitions
      if (this.history.transitions.length > 50) {
        this.history.transitions = this.history.transitions.slice(-50);
      }
      logger.info(`[WalletBrain] State transition: ${prevMood.toUpperCase()} → ${newMood.toUpperCase()}`, {
        health,
        reason: transition.reason,
      });

      // Emit REAL event on mood transition
      try {
        eventStore.append('MOOD_CHANGED', {
          from: prevMood,
          to: newMood,
          health,
          liquidity,
          diversification,
          velocity,
          maxTipUsdt: moodCfg.maxTip,
          riskAppetite: Math.min(100, riskAppetite),
        }, 'wallet-brain');
        metrics.set('portfolio_health', health / 100);
      } catch (err) {
        logger.debug('Event/metric emission failed (non-fatal)', { error: String(err) });
      }
    }

    // ── Store snapshot ──
    this.history.stateSnapshots.push(newState);
    if (this.history.stateSnapshots.length > 120) {
      this.history.stateSnapshots = this.history.stateSnapshots.slice(-120);
    }

    this.currentState = newState;
    return newState;
  }

  /** Get current brain state */
  getState(): WalletBrainState {
    return { ...this.currentState };
  }

  /** Get mood transition history */
  getHistory(): BrainHistory {
    return {
      transitions: [...this.history.transitions],
      stateSnapshots: this.history.stateSnapshots.slice(-30),
    };
  }

  /** Get current mood string */
  getMood(): BrainMood {
    return this.currentState.mood;
  }

  /** Get max tip allowed by current brain state */
  getMaxTip(): number {
    return this.currentState.maxTipUsdt;
  }

  /** Check if tipping is allowed at all */
  canTip(): boolean {
    return this.currentState.mood !== 'desperate' && this.currentState.mood !== 'critical';
  }

  /** Get the full 6-state configuration (for dashboard display) */
  getStateConfig(): Record<BrainMood, { maxTip: number; policy: string; riskBase: number; healthRange: string }> {
    return {
      thriving:   { ...MOOD_CONFIG.thriving,   healthRange: '91-100' },
      stable:     { ...MOOD_CONFIG.stable,     healthRange: '71-90'  },
      cautious:   { ...MOOD_CONFIG.cautious,   healthRange: '51-70'  },
      struggling: { ...MOOD_CONFIG.struggling,  healthRange: '31-50'  },
      desperate:  { ...MOOD_CONFIG.desperate,   healthRange: '11-30'  },
      critical:   { ...MOOD_CONFIG.critical,    healthRange: '0-10'   },
    };
  }

  /** Get ordered state list for dashboard visualization */
  getStates(): Array<{ name: BrainMood; healthRange: string; maxTip: number; isCurrent: boolean }> {
    const current = this.currentState.mood;
    return STATE_ORDER.slice().reverse().map(name => ({
      name,
      healthRange: this.getStateConfig()[name].healthRange,
      maxTip: MOOD_CONFIG[name].maxTip,
      isCurrent: name === current,
    }));
  }
}

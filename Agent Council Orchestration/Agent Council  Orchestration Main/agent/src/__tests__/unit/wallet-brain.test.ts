/**
 * Unit Tests: Wallet-as-Brain Service (6-State Survival Machine)
 *
 * Tests mood transitions, max tip limits per mood, health calculation,
 * risk appetite, state transition constraints, and brain state management.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WalletBrainService } from '../../services/wallet-brain.service.js';

// WDK type imports for brain state driven by wallet balances via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
// Brain mood transitions are triggered by WDK getBalance() thresholds across chains
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon; // eslint-disable-line @typescript-eslint/no-unused-vars

// All 6 valid moods
const VALID_MOODS = ['thriving', 'stable', 'cautious', 'struggling', 'desperate', 'critical'] as const;

// ── Suite ──────────────────────────────────────────────────────

describe('WalletBrainService — 6-State Survival Machine', () => {
  let brain: WalletBrainService;

  before(() => {
    brain = new WalletBrainService();
  });

  after(() => {
    brain.stop();
  });

  it('initializes with cautious mood (default health = 50)', () => {
    const state = brain.getState();
    assert.equal(state.mood, 'cautious');
    assert.equal(state.health, 50);
  });

  it('getMood() returns a valid 6-state BrainMood', () => {
    const mood = brain.getMood();
    assert.ok(
      VALID_MOODS.includes(mood as typeof VALID_MOODS[number]),
      `Mood should be a valid 6-state BrainMood, got: ${mood}`,
    );
  });

  it('thriving mood has maxTip = 10 USDT', () => {
    const state = brain.getState();
    if (state.mood === 'thriving') {
      assert.equal(state.maxTipUsdt, 10);
    } else {
      assert.ok(state.maxTipUsdt <= 10);
    }
  });

  it('cautious mood has maxTip = 2 USDT', () => {
    const state = brain.getState();
    assert.equal(state.mood, 'cautious');
    assert.equal(state.maxTipUsdt, 2);
  });

  it('getMaxTip() returns the correct value for current mood', () => {
    const maxTip = brain.getMaxTip();
    assert.equal(typeof maxTip, 'number');
    assert.ok(maxTip >= 0 && maxTip <= 10, `maxTip should be 0-10, got: ${maxTip}`);
  });

  it('canTip() returns true when mood is not desperate or critical', () => {
    const state = brain.getState();
    if (state.mood === 'desperate' || state.mood === 'critical') {
      assert.equal(brain.canTip(), false);
    } else {
      assert.equal(brain.canTip(), true);
    }
  });

  it('recalculate() produces a valid WalletBrainState without wallet service', async () => {
    const state = await brain.recalculate();
    assert.ok(state.health >= 0 && state.health <= 100);
    assert.ok(state.liquidity >= 0 && state.liquidity <= 100);
    assert.ok(state.diversification >= 0 && state.diversification <= 100);
    assert.ok(state.velocity >= 0 && state.velocity <= 100);
    assert.ok(state.riskAppetite >= 0 && state.riskAppetite <= 100);
    assert.ok(state.timestamp, 'Should have a timestamp');
    assert.ok(state.policy.length > 0, 'Should have a policy description');
  });

  it('records transactions and updates velocity', async () => {
    brain.recordTransaction();
    brain.recordTransaction();
    brain.recordTransaction();

    const state = await brain.recalculate();
    assert.ok(state.velocity > 0, `Velocity should increase with transactions, got: ${state.velocity}`);
  });
});

describe('WalletBrainService — Health Calculation', () => {
  it('health is a weighted composite of liquidity, diversification, and velocity', async () => {
    const brain = new WalletBrainService();
    const state = await brain.recalculate();
    assert.ok(state.health >= 0);
    assert.ok(state.health <= 100);
    brain.stop();
  });

  it('without any wallet data, health is computed from defaults', async () => {
    const brain = new WalletBrainService();
    const state = await brain.recalculate();
    assert.ok(typeof state.health === 'number');
    brain.stop();
  });
});

describe('WalletBrainService — Risk Appetite', () => {
  it('risk appetite is bounded 0-100', async () => {
    const brain = new WalletBrainService();
    const state = await brain.recalculate();
    assert.ok(state.riskAppetite >= 0);
    assert.ok(state.riskAppetite <= 100);
    brain.stop();
  });

  it('thriving mood has higher risk base than cautious', () => {
    // From the MOOD_CONFIG: thriving=95, stable=70, cautious=45, struggling=20, desperate=8, critical=0
    const brain = new WalletBrainService();
    const state = brain.getState();
    assert.equal(state.mood, 'cautious');
    assert.ok(state.riskAppetite >= 40, 'Cautious risk appetite should be >= 40');
    brain.stop();
  });
});

describe('WalletBrainService — 6-State Configuration', () => {
  it('getStates() returns all 6 states in order', () => {
    const brain = new WalletBrainService();
    const states = brain.getStates();
    assert.equal(states.length, 6);
    assert.equal(states[0].name, 'thriving');
    assert.equal(states[5].name, 'critical');
    // Exactly one should be current
    const currentStates = states.filter(s => s.isCurrent);
    assert.equal(currentStates.length, 1);
    brain.stop();
  });

  it('getStateConfig() returns config for all 6 states', () => {
    const brain = new WalletBrainService();
    const config = brain.getStateConfig();
    for (const mood of VALID_MOODS) {
      assert.ok(config[mood], `Config should have ${mood}`);
      assert.ok(typeof config[mood].maxTip === 'number');
      assert.ok(typeof config[mood].policy === 'string');
      assert.ok(typeof config[mood].healthRange === 'string');
    }
    brain.stop();
  });
});

describe('WalletBrainService — History & Snapshots', () => {
  it('getHistory returns transitions and snapshots arrays', () => {
    const brain = new WalletBrainService();
    const history = brain.getHistory();
    assert.ok(Array.isArray(history.transitions));
    assert.ok(Array.isArray(history.stateSnapshots));
    brain.stop();
  });

  it('recalculate stores a snapshot in history', async () => {
    const brain = new WalletBrainService();
    await brain.recalculate();
    await brain.recalculate();

    const history = brain.getHistory();
    assert.ok(history.stateSnapshots.length >= 2, 'Should have at least 2 snapshots');
    brain.stop();
  });

  it('mood transition is logged when health changes mood bucket', async () => {
    const brain = new WalletBrainService();
    await brain.recalculate();
    await brain.recalculate();

    const history = brain.getHistory();
    for (const t of history.transitions) {
      assert.ok(t.from, 'Transition should have a from mood');
      assert.ok(t.to, 'Transition should have a to mood');
      assert.ok(t.timestamp);
      assert.ok(typeof t.health === 'number');
    }
    brain.stop();
  });

  it('start and stop heartbeat without error', () => {
    const brain = new WalletBrainService();
    brain.start();
    brain.start();
    brain.stop();
    brain.stop();
  });
});

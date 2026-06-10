// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Wallet-as-Brain™ 6-State Survival Machine API routes

import { Router } from 'express';
import type { WalletBrainService } from '../services/wallet-brain.service.js';
import { logger } from '../utils/logger.js';

// WDK type imports for balance-driven brain state via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
// Brain state transitions are driven by WDK getBalance() across all managed wallets
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon; // eslint-disable-line @typescript-eslint/no-unused-vars

export function registerBrainRoutes(router: Router, brain: WalletBrainService): void {
  /**
   * GET /api/brain/state — Current brain state (mood, health, dimensions)
   */
  router.get('/brain/state', (_req, res) => {
    try {
      const state = brain.getState();
      res.json({
        ok: true,
        ...state,
        stateModel: '6-state-survival-machine',
        allStates: brain.getStates(),
      });
    } catch (err) {
      logger.error('Brain state error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to read brain state' });
    }
  });

  /**
   * GET /api/brain/mood — Just the current mood (lightweight)
   */
  router.get('/brain/mood', (_req, res) => {
    try {
      const state = brain.getState();
      res.json({
        ok: true,
        mood: state.mood,
        health: state.health,
        maxTipUsdt: state.maxTipUsdt,
        policy: state.policy,
        canTip: brain.canTip(),
        stateModel: '6-state-survival-machine',
      });
    } catch (err) {
      logger.error('Brain mood error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to read brain mood' });
    }
  });

  /**
   * GET /api/brain/history — Mood transitions and recent state snapshots
   */
  router.get('/brain/history', (_req, res) => {
    try {
      const history = brain.getHistory();
      res.json({ ok: true, ...history });
    } catch (err) {
      logger.error('Brain history error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to read brain history' });
    }
  });

  /**
   * POST /api/brain/recalculate — Force a brain recalculation
   */
  router.post('/brain/recalculate', async (_req, res) => {
    try {
      const state = await brain.recalculate();
      res.json({
        ok: true,
        ...state,
        stateModel: '6-state-survival-machine',
        allStates: brain.getStates(),
      });
    } catch (err) {
      logger.error('Brain recalculate error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to recalculate brain state' });
    }
  });

  /**
   * GET /api/brain/states — Get all 6 state definitions and which is current
   */
  router.get('/brain/states', (_req, res) => {
    try {
      res.json({
        ok: true,
        stateModel: '6-state-survival-machine',
        currentMood: brain.getMood(),
        currentHealth: brain.getState().health,
        states: brain.getStates(),
        config: brain.getStateConfig(),
        transitionRules: 'Cannot jump more than 2 states at a time (e.g., CRITICAL cannot go directly to THRIVING)',
      });
    } catch (err) {
      logger.error('Brain states error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to read brain states' });
    }
  });

  logger.info('Wallet-as-Brain 6-State Survival Machine routes mounted at /api/brain/*');
}

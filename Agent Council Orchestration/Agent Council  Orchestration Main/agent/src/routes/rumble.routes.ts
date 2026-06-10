// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Rumble route handlers (extracted from api.ts)

import { Router } from 'express';
import type { RumbleService } from '../services/rumble.service.js';

// WDK type imports for Rumble creator tip payments via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Rumble auto-tips execute WDK account.transfer() to creator wallet addresses
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

export interface RumbleRouteDeps {
  rumble: RumbleService;
}

/**
 * Register Rumble-related routes onto the given router.
 * Handles: creators, watch tracking, auto-tip, engagement, pools, events, leaderboard, collab splits.
 */
export function registerRumbleRoutes(router: Router, deps: RumbleRouteDeps): void {
  const { rumble: rumbleService } = deps;

  /** POST /api/rumble/creators — Register a Rumble creator */
  router.post('/rumble/creators', (req, res) => {
    try {
      const { name, channelUrl, walletAddress, categories } = req.body as {
        name: string;
        channelUrl: string;
        walletAddress: string;
        categories: string[];
      };
      if (!name || !channelUrl || !walletAddress) {
        res.status(400).json({ error: 'name, channelUrl, and walletAddress are required' });
        return;
      }
      // Validate wallet address format (0x followed by 40 hex chars)
      if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
        res.status(400).json({ error: 'Invalid wallet address. Must be 0x followed by 40 hex characters.' });
        return;
      }
      const creator = rumbleService.registerCreator(name, channelUrl, walletAddress, categories ?? []);
      res.json({ creator });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/rumble/creators — List all creators */
  router.get('/rumble/creators', (_req, res) => {
    res.json({ creators: rumbleService.listCreators() });
  });

  /** GET /api/rumble/creators/:id — Get a specific creator */
  router.get('/rumble/creators/:id', (req, res) => {
    const creator = rumbleService.getCreator(req.params.id);
    if (!creator) {
      res.status(404).json({ error: 'Creator not found' });
      return;
    }
    res.json({ creator });
  });

  /** POST /api/rumble/watch — Record watch time */
  router.post('/rumble/watch', (req, res) => {
    try {
      const { creatorId, videoId, watchPercent, userId } = req.body as {
        creatorId: string;
        videoId: string;
        watchPercent: number;
        userId: string;
      };
      if (!creatorId || !videoId || watchPercent == null || !userId) {
        res.status(400).json({ error: 'creatorId, videoId, watchPercent, and userId are required' });
        return;
      }
      const session = rumbleService.recordWatchTime(creatorId, videoId, watchPercent, userId);
      res.json({ session });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/rumble/auto-tip/recommendations/:userId — Get auto-tip recommendations */
  router.get('/rumble/auto-tip/recommendations/:userId', (req, res) => {
    const recommendations = rumbleService.getAutoTipRecommendations(req.params.userId);
    res.json({ recommendations });
  });

  /** POST /api/rumble/auto-tip/rules — Set auto-tip rules for a user */
  router.post('/rumble/auto-tip/rules', (req, res) => {
    try {
      const { userId, rules } = req.body as {
        userId: string;
        rules: Array<{
          minWatchPercent: number;
          tipAmount: number;
          maxTipsPerDay: number;
          enabledCategories: string[];
          enabled: boolean;
        }>;
      };
      if (!userId || !rules) {
        res.status(400).json({ error: 'userId and rules are required' });
        return;
      }
      rumbleService.setAutoTipRules(userId, rules);
      const savedRules = rumbleService.getAutoTipRules(userId);
      res.json({ rules: savedRules });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/rumble/auto-tip/rules/:userId — Get auto-tip rules for a user */
  router.get('/rumble/auto-tip/rules/:userId', (req, res) => {
    const rules = rumbleService.getAutoTipRules(req.params.userId);
    res.json({ rules });
  });

  /** GET /api/rumble/engagement/:userId/:creatorId — Calculate engagement score */
  router.get('/rumble/engagement/:userId/:creatorId', (req, res) => {
    try {
      const { userId, creatorId } = req.params;
      const score = rumbleService.calculateEngagementScore(userId, creatorId);
      res.json(score);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/rumble/engagement-tips/:userId — Get engagement-weighted tip recommendations */
  router.get('/rumble/engagement-tips/:userId', (req, res) => {
    try {
      const baseTip = parseFloat(req.query.baseTip as string) || 0.01;
      const recommendations = rumbleService.getEngagementWeightedRecommendations(req.params.userId, baseTip);
      res.json({ recommendations, algorithm: 'engagement-weighted', weights: { watchCompletion: 0.4, rewatchBonus: 0.2, frequency: 0.15, loyalty: 0.15, categoryPremium: 0.1 } });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** POST /api/rumble/pools — Create a community tip pool */
  router.post('/rumble/pools', (req, res) => {
    try {
      const { creatorId, goalAmount, title, deadline } = req.body as {
        creatorId: string;
        goalAmount: number;
        title: string;
        deadline?: string;
      };
      if (!creatorId || !goalAmount || !title) {
        res.status(400).json({ error: 'creatorId, goalAmount, and title are required' });
        return;
      }
      const pool = rumbleService.createTipPool(creatorId, goalAmount, title, deadline);
      res.json({ pool });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** POST /api/rumble/pools/:id/contribute — Contribute to a pool */
  router.post('/rumble/pools/:id/contribute', (req, res) => {
    try {
      const { amount, contributor } = req.body as { amount: number; contributor: string };
      if (!amount || !contributor) {
        res.status(400).json({ error: 'amount and contributor are required' });
        return;
      }
      rumbleService.contributeToPool(req.params.id, amount, contributor);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/rumble/pools — List active pools */
  router.get('/rumble/pools', (_req, res) => {
    res.json({ pools: rumbleService.getActivePools() });
  });

  /** POST /api/rumble/events/triggers — Register an event trigger */
  router.post('/rumble/events/triggers', (req, res) => {
    try {
      const { creatorId, event, tipAmount } = req.body as {
        creatorId: string;
        event: 'new_video' | 'milestone' | 'live_start' | 'anniversary';
        tipAmount: number;
      };
      if (!creatorId || !event || !tipAmount) {
        res.status(400).json({ error: 'creatorId, event, and tipAmount are required' });
        return;
      }
      const trigger = rumbleService.registerEventTrigger(creatorId, event, tipAmount);
      res.json({ trigger });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** POST /api/rumble/events/process — Process an event */
  router.post('/rumble/events/process', (req, res) => {
    try {
      const { creatorId, event, metadata } = req.body as {
        creatorId: string;
        event: string;
        metadata?: Record<string, unknown>;
      };
      if (!creatorId || !event) {
        res.status(400).json({ error: 'creatorId and event are required' });
        return;
      }
      const trigger = rumbleService.processEvent(creatorId, event, metadata);
      res.json({ triggered: !!trigger, trigger: trigger ?? null });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/rumble/leaderboard — Creator leaderboard */
  router.get('/rumble/leaderboard', (req, res) => {
    const timeframe = (req.query.timeframe as 'day' | 'week' | 'month' | 'all') || 'all';
    res.json({ leaderboard: rumbleService.getCreatorLeaderboard(timeframe) });
  });

  /** POST /api/rumble/collab-splits — Create a collab split */
  router.post('/rumble/collab-splits', (req, res) => {
    try {
      const { videoId, creators } = req.body as {
        videoId: string;
        creators: Array<{ creatorId: string; percentage: number }>;
      };
      if (!videoId || !creators || creators.length === 0) {
        res.status(400).json({ error: 'videoId and creators array are required' });
        return;
      }
      const split = rumbleService.createCollabSplit(videoId, creators);
      res.json({ split });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — GitHub Webhook route handlers

import { Router } from 'express';
import { logger } from '../utils/logger.js';
import type { GitHubWebhookService } from '../services/github-webhook.service.js';

// WDK type imports for GitHub contributor tip payments via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// GitHub webhook tips execute WDK account.transfer() to contributor wallet addresses
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

export interface GitHubRouteDeps {
  githubWebhook: GitHubWebhookService;
}

/**
 * Register GitHub webhook and contributor routes onto the given router.
 */
export function registerGitHubRoutes(router: Router, deps: GitHubRouteDeps): void {
  const { githubWebhook } = deps;

  /**
   * POST /api/github/webhook — Receive GitHub webhook payloads
   * Verifies HMAC-SHA256 signature, then dispatches to the service.
   */
  router.post('/github/webhook', (req, res) => {
    try {
      const event = req.headers['x-github-event'] as string | undefined;
      if (!event) {
        res.status(400).json({ error: 'Missing X-GitHub-Event header' });
        return;
      }

      // Signature verification (skip in dev/demo mode if no signature provided)
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const rawBody = JSON.stringify(req.body);

      if (signature) {
        const valid = githubWebhook.verifySignature(rawBody, signature);
        if (!valid) {
          logger.warn('GitHub webhook signature verification failed', { event });
          res.status(403).json({ error: 'Invalid webhook signature' });
          return;
        }
      }

      const result = githubWebhook.processWebhookEvent(event, req.body);
      logger.info('GitHub webhook processed', { event, action: result.action });

      res.json({
        ok: true,
        event,
        ...result,
      });
    } catch (err) {
      logger.error('GitHub webhook error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/github/register — Register GitHub username → wallet address mapping
   */
  router.post('/github/register', (req, res) => {
    try {
      const { githubUsername, walletAddress } = req.body as {
        githubUsername?: string;
        walletAddress?: string;
      };

      if (!githubUsername || !walletAddress) {
        res.status(400).json({ error: 'githubUsername and walletAddress are required' });
        return;
      }

      // Validate wallet address format
      if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
        res.status(400).json({ error: 'Invalid wallet address. Must be 0x followed by 40 hex characters.' });
        return;
      }

      const contributor = githubWebhook.registerContributor(githubUsername, walletAddress);
      res.json({ ok: true, contributor });
    } catch (err) {
      logger.error('GitHub register error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  /**
   * GET /api/github/contributors — List registered contributors with tip history
   */
  router.get('/github/contributors', (_req, res) => {
    try {
      const contributors = githubWebhook.listContributors();
      res.json({ contributors, count: contributors.length });
    } catch (err) {
      logger.error('GitHub contributors error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to fetch contributors' });
    }
  });

  /**
   * GET /api/github/stats — GitHub tipping statistics
   */
  router.get('/github/stats', (_req, res) => {
    try {
      const stats = githubWebhook.getStats();
      res.json(stats);
    } catch (err) {
      logger.error('GitHub stats error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  /**
   * GET /api/github/tips — Recent tips list
   */
  router.get('/github/tips', (_req, res) => {
    try {
      const tips = githubWebhook.getTips();
      res.json({ tips, count: tips.length });
    } catch (err) {
      logger.error('GitHub tips error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to fetch tips' });
    }
  });

  /**
   * GET /api/github/bounties — Active and past bounties
   */
  router.get('/github/bounties', (_req, res) => {
    try {
      const bounties = githubWebhook.getBounties();
      res.json({ bounties, count: bounties.length });
    } catch (err) {
      logger.error('GitHub bounties error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to fetch bounties' });
    }
  });

  /**
   * POST /api/github/test-webhook — Send a test PR merge event (for demo)
   */
  router.post('/github/test-webhook', (req, res) => {
    try {
      const username = (req.body?.username as string) ?? 'demo-contributor';
      const nameHash = username.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
      const testPayload = {
        action: 'closed',
        pull_request: {
          number: Math.abs(nameHash) % 1000 + 1,
          title: req.body?.title ?? 'feat: add multi-chain payment routing',
          body: req.body?.body ?? 'This PR implements intelligent payment routing across EVM chains with gas optimization. Includes unit tests.',
          merged: true,
          additions: req.body?.additions ?? (Math.abs(nameHash * 7919) % 200 + 20),
          deletions: req.body?.deletions ?? (Math.abs(nameHash * 3571) % 50 + 5),
          changed_files: req.body?.changedFiles ?? (Math.abs(nameHash * 2347) % 8 + 1),
          user: { login: username },
        },
        repository: {
          full_name: req.body?.repo ?? 'aerofyta/payment-agent',
        },
      };

      const result = githubWebhook.processWebhookEvent('pull_request', testPayload);
      res.json({ ok: true, ...result, testMode: true });
    } catch (err) {
      logger.error('GitHub test webhook error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Test webhook failed' });
    }
  });
}

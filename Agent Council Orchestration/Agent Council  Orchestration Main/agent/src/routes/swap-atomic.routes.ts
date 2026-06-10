// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Cross-Chain Atomic Swap route handlers

import { Router } from 'express';
import type { AtomicSwapService } from '../services/atomic-swap.service.js';

// WDK type imports for cross-chain atomic swaps via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
// Atomic swaps use WDK HTLC pattern across multiple chains for trustless exchange
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register cross-chain atomic swap routes onto the given router.
 *
 * Routes:
 *   POST /api/swap/atomic              — initiate a cross-chain swap
 *   POST /api/swap/atomic/:id/respond  — counterparty responds with their HTLC
 *   POST /api/swap/atomic/:id/claim    — claim with secret
 *   POST /api/swap/atomic/:id/refund   — refund after timelock
 *   GET  /api/swap/atomic              — list all swaps
 *   GET  /api/swap/atomic/stats        — swap statistics
 *   GET  /api/swap/atomic/:id          — get swap details
 */
export function registerAtomicSwapRoutes(
  router: Router,
  atomicSwapService: AtomicSwapService,
): void {

  /** POST /api/swap/atomic — Initiate a cross-chain atomic swap */
  router.post('/swap/atomic', async (req, res) => {
    try {
      const { swap, secret } = await atomicSwapService.initiateSwap(req.body);
      res.status(201).json({
        swap,
        secret,
        warning: 'Store the secret securely. Share the hashLock (NOT the secret) with the counterparty. The secret is revealed only when you claim the counterparty\'s funds.',
        instructions: {
          step1: 'Share swap.hashLock with the counterparty',
          step2: 'Counterparty creates matching HTLC on their chain with SAME hashLock',
          step3: 'Counterparty calls POST /api/swap/atomic/:id/respond',
          step4: 'You claim counterparty funds with POST /api/swap/atomic/:id/claim (reveals secret)',
          step5: 'Counterparty reads revealed secret and claims your funds',
        },
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to initiate swap' });
    }
  });

  /** POST /api/swap/atomic/:id/respond — Counterparty links their HTLC */
  router.post('/swap/atomic/:id/respond', async (req, res) => {
    try {
      const { counterpartyEscrowId } = req.body;
      if (!counterpartyEscrowId) {
        res.status(400).json({ error: 'counterpartyEscrowId is required' });
        return;
      }
      const swap = await atomicSwapService.respondToSwap(req.params.id, counterpartyEscrowId);
      res.json(swap);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to respond to swap' });
    }
  });

  /** POST /api/swap/atomic/:id/claim — Claim with secret */
  router.post('/swap/atomic/:id/claim', async (req, res) => {
    try {
      const { secret, side } = req.body;
      if (!secret || typeof secret !== 'string') {
        res.status(400).json({ error: 'secret is required' });
        return;
      }
      if (!side || !['initiator', 'counterparty'].includes(side)) {
        res.status(400).json({ error: 'side must be "initiator" or "counterparty"' });
        return;
      }
      const swap = await atomicSwapService.claimSwap(req.params.id, secret, side);
      res.json(swap);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to claim swap' });
    }
  });

  /** POST /api/swap/atomic/:id/refund — Refund after timelock */
  router.post('/swap/atomic/:id/refund', async (req, res) => {
    try {
      const { side } = req.body;
      if (!side || !['initiator', 'counterparty'].includes(side)) {
        res.status(400).json({ error: 'side must be "initiator" or "counterparty"' });
        return;
      }
      const swap = await atomicSwapService.refundSwap(req.params.id, side);
      res.json(swap);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to refund swap' });
    }
  });

  /** GET /api/swap/atomic/stats — Swap statistics */
  router.get('/swap/atomic/stats', (_req, res) => {
    res.json(atomicSwapService.getSwapStats());
  });

  /** GET /api/swap/atomic — List all swaps */
  router.get('/swap/atomic', (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(atomicSwapService.listSwaps(status));
  });

  /** GET /api/swap/atomic/:id — Get swap details */
  router.get('/swap/atomic/:id', (req, res) => {
    const swap = atomicSwapService.getSwap(req.params.id);
    if (!swap) {
      res.status(404).json({ error: 'Swap not found' });
      return;
    }
    res.json(swap);
  });
}

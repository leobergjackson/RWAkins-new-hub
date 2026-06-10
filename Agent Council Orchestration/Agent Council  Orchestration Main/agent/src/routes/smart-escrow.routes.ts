// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Smart Escrow (CREATE2) route handlers

import { Router } from 'express';
import type { SmartEscrowService } from '../services/smart-escrow.service.js';

// WDK type imports for CREATE2 smart escrow via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Smart escrow uses deterministic CREATE2 addresses; funds via WDK account.transfer()
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register smart escrow routes with CREATE2-style deterministic addresses.
 *
 * Routes:
 *   POST /api/escrow/smart              — create smart escrow
 *   POST /api/escrow/smart/:id/fund     — mark as funded
 *   POST /api/escrow/smart/:id/claim    — claim with secret
 *   POST /api/escrow/smart/:id/refund   — refund after timelock
 *   GET  /api/escrow/smart/:id/verify   — verify address computation
 *   GET  /api/escrow/smart/:id/proof    — get verification proof
 *   GET  /api/escrow/smart              — list all smart escrows
 *   GET  /api/escrow/smart/stats        — statistics
 *   GET  /api/escrow/smart/:id          — get by id
 */
export function registerSmartEscrowRoutes(
  router: Router,
  smartEscrowService: SmartEscrowService,
): void {

  /** POST /api/escrow/smart — Create a new smart escrow with deterministic address */
  router.post('/escrow/smart', (req, res) => {
    try {
      const { sender, recipient, amount, hashLock, timelock, chainId } = req.body;
      if (!sender || !recipient || !amount || !chainId) {
        res.status(400).json({ error: 'Missing required fields: sender, recipient, amount, chainId' });
        return;
      }
      const { escrow, secret } = smartEscrowService.createSmartEscrow({
        sender, recipient, amount, hashLock: hashLock || '', timelock: timelock || 0, chainId,
      });
      res.status(201).json({
        escrow,
        secret: secret || undefined,
        vaultAddress: escrow.vaultAddress,
        verification: 'Anyone can recompute the vault address from the escrow params using CREATE2 formula',
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  /** POST /api/escrow/smart/:id/fund — Mark escrow as funded */
  router.post('/escrow/smart/:id/fund', (req, res) => {
    try {
      const txHash = req.body.txHash as string;
      if (!txHash) {
        res.status(400).json({ error: 'txHash is required' });
        return;
      }
      const escrow = smartEscrowService.fundEscrow(req.params.id, txHash);
      res.json({ escrow });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  /** POST /api/escrow/smart/:id/claim — Claim with secret preimage */
  router.post('/escrow/smart/:id/claim', (req, res) => {
    try {
      const secret = req.body.secret as string;
      if (!secret) {
        res.status(400).json({ error: 'secret preimage is required' });
        return;
      }
      const escrow = smartEscrowService.claimSmartEscrow(req.params.id, secret);
      res.json({ escrow, message: 'Escrow claimed successfully' });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  /** POST /api/escrow/smart/:id/refund — Refund after timelock */
  router.post('/escrow/smart/:id/refund', (req, res) => {
    try {
      const escrow = smartEscrowService.refundSmartEscrow(req.params.id);
      res.json({ escrow, message: 'Escrow refunded to sender' });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  /** GET /api/escrow/smart/stats — Smart escrow statistics */
  router.get('/escrow/smart/stats', (_req, res) => {
    res.json(smartEscrowService.getStats());
  });

  /** GET /api/escrow/smart/:id/verify — Verify vault address computation */
  router.get('/escrow/smart/:id/verify', (req, res) => {
    try {
      const escrow = smartEscrowService.getEscrow(req.params.id);
      if (!escrow) {
        res.status(404).json({ error: 'Smart escrow not found' });
        return;
      }
      const verification = smartEscrowService.verifyEscrowAddress(escrow.params);
      res.json({
        escrowId: escrow.id,
        storedAddress: escrow.vaultAddress,
        computedAddress: verification.computedAddress,
        valid: verification.computedAddress === escrow.vaultAddress,
        message: verification.computedAddress === escrow.vaultAddress
          ? 'Address verified: deterministic computation matches stored vault address'
          : 'WARNING: Address mismatch — possible tampering',
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  /** GET /api/escrow/smart/:id/proof — Get full verification proof */
  router.get('/escrow/smart/:id/proof', (req, res) => {
    try {
      const proof = smartEscrowService.getEscrowProof(req.params.id);
      res.json(proof);
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  /** GET /api/escrow/smart — List all smart escrows */
  router.get('/escrow/smart', (_req, res) => {
    res.json(smartEscrowService.getAllEscrows());
  });

  /** GET /api/escrow/smart/:id — Get a specific smart escrow */
  router.get('/escrow/smart/:id', (req, res) => {
    const escrow = smartEscrowService.getEscrow(req.params.id);
    if (!escrow) {
      res.status(404).json({ error: 'Smart escrow not found' });
      return;
    }
    res.json(escrow);
  });
}

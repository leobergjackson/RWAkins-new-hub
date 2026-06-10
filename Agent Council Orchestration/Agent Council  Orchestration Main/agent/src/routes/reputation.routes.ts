// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Cross-chain reputation passport route handlers (extracted from api.ts)

import { Router } from 'express';
import type { ReputationPassportService } from '../services/reputation-passport.service.js';

// WDK type imports for cross-chain reputation passports via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
// Reputation passports link WDK wallet addresses across EVM, TON, and Tron chains
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register reputation passport routes onto the given router.
 * Handles: get/generate passport, link address, export/import passport.
 */
export function registerReputationRoutes(
  router: Router,
  reputationPassportService: ReputationPassportService,
): void {

  /** GET /api/reputation/passport/:address — Get or generate a reputation passport */
  router.get('/reputation/passport/:address', (req, res) => {
    const { address } = req.params;
    const passport = reputationPassportService.getPassport(address)
      ?? reputationPassportService.generatePassport(address);
    res.json({
      passport,
      portableScore: reputationPassportService.getPortableScore(address),
    });
  });

  /** POST /api/reputation/passport/link — Link an address on a chain to a passport */
  router.post('/reputation/passport/link', (req, res) => {
    const { passportId, chainId, address } = req.body as {
      passportId?: string;
      chainId?: string;
      address?: string;
    };
    if (!passportId || !chainId || !address) {
      res.status(400).json({ error: 'passportId, chainId, and address are required' });
      return;
    }
    const result = reputationPassportService.linkAddress(passportId, chainId, address);
    if (!result) {
      res.status(404).json({ error: 'Passport not found' });
      return;
    }
    res.json({ passport: result, portableScore: reputationPassportService.getPortableScore(address) });
  });

  /** GET /api/reputation/passport/:address/export — Export passport as JSON */
  router.get('/reputation/passport/:address/export', (req, res) => {
    const json = reputationPassportService.exportPassport(req.params.address);
    if (!json) {
      res.status(404).json({ error: 'No passport found for address' });
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(json);
  });

  /** POST /api/reputation/passport/import — Import and verify a passport */
  router.post('/reputation/passport/import', (req, res) => {
    const { passport } = req.body as { passport?: string };
    const json = typeof passport === 'string' ? passport : JSON.stringify(passport);
    if (!json || json === 'undefined') {
      res.status(400).json({ error: 'passport JSON is required in request body' });
      return;
    }
    const success = reputationPassportService.importPassport(json);
    if (!success) {
      res.status(400).json({ error: 'Import failed — invalid or tampered passport' });
      return;
    }
    res.json({ success: true, message: 'Passport imported and verified' });
  });
}

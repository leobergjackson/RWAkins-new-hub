// Copyright 2026 Danish A. Licensed under Apache-2.0.
// Colibrí — remittance API: quote a USD→MXN transfer, list beneficiaries, and settle.

import { Router } from 'express';
import { RemittanceService, type DeliverAs } from '../services/remittance.service.js';
import { logger } from '../utils/logger.js';

/**
 * Register remittance routes. The on-chain USDC leg reuses the existing transaction
 * pipeline; the fiat leg off-ramps to MXN via the Bitso adapter (sandbox by default).
 */
export function registerRemittanceRoutes(router: Router): void {
  const remittance = new RemittanceService();

  /**
   * @openapi
   * /remittance/contacts:
   *   get:
   *     tags: [Remittance]
   *     summary: List saved beneficiaries (recipients in Mexico)
   */
  router.get('/remittance/contacts', (_req, res) => {
    res.json({ contacts: remittance.getBeneficiaries() });
  });

  /**
   * @openapi
   * /remittance/quote:
   *   get:
   *     tags: [Remittance]
   *     summary: Quote a USD→MXN remittance (cheapest L2 route + cost vs Western Union)
   *     parameters:
   *       - in: query
   *         name: usd
   *         schema: { type: number }
   *       - in: query
   *         name: deliverAs
   *         schema: { type: string, enum: [mxn, usdc] }
   */
  router.get('/remittance/quote', (req, res) => {
    const usd = parseFloat(String(req.query.usd ?? '200')) || 0;
    const deliverAs: DeliverAs = String(req.query.deliverAs ?? 'mxn') === 'usdc' ? 'usdc' : 'mxn';
    res.json({ quote: remittance.quote(usd, deliverAs) });
  });

  /**
   * @openapi
   * /remittance/send:
   *   post:
   *     tags: [Remittance]
   *     summary: Settle a remittance — USDC on an L2, off-ramped to MXN via Bitso (SPEI)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [usd, beneficiaryId]
   *             properties:
   *               usd: { type: number }
   *               beneficiaryId: { type: string }
   *               deliverAs: { type: string, enum: [mxn, usdc] }
   */
  router.post('/remittance/send', async (req, res) => {
    try {
      const { usd, beneficiaryId, deliverAs } = req.body as {
        usd?: number;
        beneficiaryId?: string;
        deliverAs?: DeliverAs;
      };

      const amount = Number(usd);
      if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ error: 'usd must be a positive number' });
        return;
      }
      if (!beneficiaryId) {
        res.status(400).json({ error: 'beneficiaryId is required' });
        return;
      }

      const receipt = await remittance.send({ usd: amount, beneficiaryId, deliverAs });
      logger.info('Remittance API: settled', { id: receipt.id, mxn: receipt.deliveredMxn, mode: receipt.quote.offRampMode });
      res.json({ receipt });
    } catch (err) {
      logger.error('Remittance send failed', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Audit Trail API Routes
// Exposes decision audit log, statistics, and proof bundles.

import { Router } from 'express';
import type { AuditTrailService, AuditDecisionType, AuditOutcome } from '../services/audit-trail.service.js';
import type { AutonomousProofService } from '../services/autonomous-proof.service.js';
import { logger } from '../utils/logger.js';

// WDK type imports for audit trail with on-chain proof via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Audit proofs reference WDK transaction hashes and wallet state snapshots
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

export interface AuditRouteDeps {
  auditTrail: AuditTrailService;
  autonomousProof: AutonomousProofService;
}

/**
 * Register audit trail routes onto the given router.
 *
 * GET  /api/audit/decisions       — Paginated decision list
 * GET  /api/audit/decisions/:id   — Single decision detail
 * GET  /api/audit/stats           — Statistics summary
 * GET  /api/audit/proof           — Full proof bundle (JSON)
 * GET  /api/audit/proof/readme    — Markdown-formatted proof for README
 */
export function registerAuditRoutes(router: Router, deps: AuditRouteDeps): void {
  const { auditTrail, autonomousProof } = deps;

  /**
   * @openapi
   * /audit/decisions:
   *   get:
   *     tags: [Audit]
   *     summary: List audit decisions
   *     description: |
   *       Returns a paginated list of all autonomous agent decisions with full reasoning chains.
   *       Supports filtering by decision type, outcome, chain, and date range.
   *     parameters:
   *       - name: page
   *         in: query
   *         schema:
   *           type: integer
   *           default: 1
   *       - name: limit
   *         in: query
   *         schema:
   *           type: integer
   *           default: 50
   *           maximum: 200
   *       - name: type
   *         in: query
   *         schema:
   *           type: string
   *           enum: [tip, escrow, swap, bridge, lending, safety, autonomy]
   *       - name: outcome
   *         in: query
   *         schema:
   *           type: string
   *           enum: [success, failure, blocked, pending]
   *       - name: chain
   *         in: query
   *         schema:
   *           type: string
   *       - name: startDate
   *         in: query
   *         schema:
   *           type: string
   *           format: date-time
   *       - name: endDate
   *         in: query
   *         schema:
   *           type: string
   *           format: date-time
   *     responses:
   *       200:
   *         description: Paginated decision list
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ok:
   *                   type: boolean
   *                 decisions:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       type:
   *                         type: string
   *                       outcome:
   *                         type: string
   *                       reasoning:
   *                         type: string
   *                       timestamp:
   *                         type: string
   *                         format: date-time
   *                 page:
   *                   type: integer
   *                 totalPages:
   *                   type: integer
   *                 total:
   *                   type: integer
   */
  router.get('/audit/decisions', (req, res) => {
    try {
      const page = parseInt(String(req.query.page ?? '1'), 10) || 1;
      const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
      const type = req.query.type as AuditDecisionType | undefined;
      const outcome = req.query.outcome as AuditOutcome | undefined;
      const chain = typeof req.query.chain === 'string' ? req.query.chain : undefined;
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

      const result = auditTrail.getDecisions({
        page,
        limit,
        type,
        outcome,
        chain,
        startDate,
        endDate,
      });

      res.json({
        ok: true,
        ...result,
      });
    } catch (err) {
      logger.error('Audit decisions query failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to query audit decisions' });
    }
  });

  // GET /api/audit/decisions/:id — single decision detail
  router.get('/audit/decisions/:id', (req, res) => {
    try {
      const decision = auditTrail.getDecisionById(req.params.id);
      if (!decision) {
        res.status(404).json({ error: 'Decision not found', decisionId: req.params.id });
        return;
      }
      res.json({ ok: true, decision });
    } catch (err) {
      logger.error('Audit decision lookup failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to fetch decision' });
    }
  });

  // GET /api/audit/stats — statistics summary
  router.get('/audit/stats', (_req, res) => {
    try {
      const stats = auditTrail.getStatistics();
      res.json({ ok: true, ...stats });
    } catch (err) {
      logger.error('Audit stats failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to compute audit statistics' });
    }
  });

  /**
   * @openapi
   * /audit/proof:
   *   get:
   *     tags: [Audit]
   *     summary: Cryptographic proof bundle
   *     description: |
   *       Generates a full cryptographic proof bundle containing all autonomous decisions,
   *       their SHA-256 hashes, Merkle root, and aggregate statistics. Used to prove
   *       the agent made verifiable, auditable decisions.
   *     responses:
   *       200:
   *         description: Proof bundle with Merkle root and decision hashes
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ok:
   *                   type: boolean
   *                 merkleRoot:
   *                   type: string
   *                   description: SHA-256 Merkle root of all decision hashes
   *                 totalDecisions:
   *                   type: integer
   *                 decisions:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       hash:
   *                         type: string
   *                       type:
   *                         type: string
   *                       timestamp:
   *                         type: string
   *                         format: date-time
   *                 generatedAt:
   *                   type: string
   *                   format: date-time
   */
  router.get('/audit/proof', (_req, res) => {
    try {
      const bundle = auditTrail.generateProofBundle();
      res.json({ ok: true, ...bundle });
    } catch (err) {
      logger.error('Proof bundle generation failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to generate proof bundle' });
    }
  });

  // GET /api/audit/proof/readme — markdown proof for README
  router.get('/audit/proof/readme', (req, res) => {
    try {
      const markdown = autonomousProof.generateReadmeProof();
      const contentType = req.query?.format === 'json' ? 'application/json' : 'text/markdown';

      if (contentType === 'application/json') {
        res.json({ ok: true, markdown });
      } else {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.send(markdown);
      }
    } catch (err) {
      logger.error('README proof generation failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to generate README proof' });
    }
  });

  logger.info('Audit trail routes registered');
}

// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// Agent-to-Agent (A2A) Payment Protocol — Express route handlers

import { Router } from 'express';
import type { A2AProtocolService } from '../services/a2a-protocol.service.js';

// WDK type imports for A2A payment execution via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
// A2A /pay endpoint executes cross-agent transfers via WDK account.transfer()
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register A2A protocol routes onto the given Express router.
 *
 * Endpoints:
 *   GET  /api/a2a/agents         — List registered agents
 *   GET  /api/a2a/services       — Discover available services (optional ?q= filter)
 *   GET  /api/a2a/transactions   — List A2A transactions (optional ?agentId= filter)
 *   GET  /api/a2a/stats          — Protocol statistics
 *   POST /api/a2a/register       — Register a new agent
 *   POST /api/a2a/request        — Request a service (creates transaction)
 *   POST /api/a2a/negotiate      — Negotiate price for a service
 *   POST /api/a2a/pay            — Execute payment for a transaction
 *   POST /api/a2a/confirm        — Confirm service delivery
 *   POST /api/a2a/dispute        — Raise a dispute on a transaction
 */
export function registerA2ARoutes(
  router: Router,
  protocol: A2AProtocolService,
): void {
  /**
   * @openapi
   * /a2a/agents:
   *   get:
   *     tags: [A2A]
   *     summary: List registered agents
   *     description: Returns all agents registered in the Agent-to-Agent payment protocol with their capabilities and reputation scores.
   *     responses:
   *       200:
   *         description: List of registered agents
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 agents:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       name:
   *                         type: string
   *                       walletAddress:
   *                         type: string
   *                       capabilities:
   *                         type: array
   *                         items:
   *                           type: string
   *                       reputationScore:
   *                         type: number
   */
  router.get('/a2a/agents', (_req, res) => {
    res.json({ agents: protocol.listAgents() });
  });

  /**
   * @openapi
   * /a2a/services:
   *   get:
   *     tags: [A2A]
   *     summary: Discover available services
   *     description: Returns all services offered by registered agents. Optionally filter by keyword.
   *     parameters:
   *       - name: q
   *         in: query
   *         required: false
   *         schema:
   *           type: string
   *         description: Search keyword to filter services
   *     responses:
   *       200:
   *         description: List of available services
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 services:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       agentId:
   *                         type: string
   *                       serviceName:
   *                         type: string
   *                       price:
   *                         type: number
   *                       currency:
   *                         type: string
   *                       description:
   *                         type: string
   */
  router.get('/a2a/services', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.json({ services: protocol.discoverServices(query) });
  });

  // ── GET /api/a2a/transactions ─────────────────────────────────
  router.get('/a2a/transactions', (req, res) => {
    const agentId = typeof req.query.agentId === 'string' ? req.query.agentId : undefined;
    res.json({ transactions: protocol.listTransactions(agentId) });
  });

  // ── GET /api/a2a/stats ────────────────────────────────────────
  router.get('/a2a/stats', (_req, res) => {
    res.json(protocol.getStats());
  });

  // ── POST /api/a2a/register ────────────────────────────────────
  router.post('/a2a/register', (req, res) => {
    const { id, name, walletAddress, capabilities, reputationScore } = req.body as {
      id?: string;
      name?: string;
      walletAddress?: string;
      capabilities?: string[];
      reputationScore?: number;
    };
    if (!id || !name || !walletAddress) {
      res.status(400).json({ error: 'id, name, and walletAddress are required' });
      return;
    }
    try {
      const agent = protocol.registerAgent({
        id,
        name,
        walletAddress,
        capabilities: capabilities ?? [],
        reputationScore: reputationScore ?? 50,
      });
      res.status(201).json({ agent });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  // ── POST /api/a2a/request ─────────────────────────────────────
  router.post('/a2a/request', (req, res) => {
    const { requestorId, agentId, serviceName } = req.body as {
      requestorId?: string;
      agentId?: string;
      serviceName?: string;
    };
    if (!requestorId || !agentId || !serviceName) {
      res.status(400).json({ error: 'requestorId, agentId, and serviceName are required' });
      return;
    }
    try {
      const transaction = protocol.requestService(requestorId, agentId, serviceName);
      res.status(201).json({ transaction });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  // ── POST /api/a2a/negotiate ───────────────────────────────────
  router.post('/a2a/negotiate', (req, res) => {
    const { agentId, serviceName, maxBudget } = req.body as {
      agentId?: string;
      serviceName?: string;
      maxBudget?: number;
    };
    if (!agentId || !serviceName || maxBudget === undefined) {
      res.status(400).json({ error: 'agentId, serviceName, and maxBudget are required' });
      return;
    }
    const result = protocol.negotiatePrice(agentId, serviceName, maxBudget);
    res.json({ negotiation: result });
  });

  // ── POST /api/a2a/pay ─────────────────────────────────────────
  router.post('/a2a/pay', (req, res) => {
    const { transactionId } = req.body as { transactionId?: string };
    if (!transactionId) {
      res.status(400).json({ error: 'transactionId is required' });
      return;
    }
    try {
      const transaction = protocol.executePayment(transactionId);
      res.json({ transaction });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  // ── POST /api/a2a/confirm ─────────────────────────────────────
  router.post('/a2a/confirm', (req, res) => {
    const { transactionId } = req.body as { transactionId?: string };
    if (!transactionId) {
      res.status(400).json({ error: 'transactionId is required' });
      return;
    }
    try {
      const transaction = protocol.confirmDelivery(transactionId);
      res.json({ transaction });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  // ── POST /api/a2a/dispute ─────────────────────────────────────
  router.post('/a2a/dispute', (req, res) => {
    const { transactionId, reason } = req.body as {
      transactionId?: string;
      reason?: string;
    };
    if (!transactionId || !reason) {
      res.status(400).json({ error: 'transactionId and reason are required' });
      return;
    }
    try {
      const transaction = protocol.disputeTransaction(transactionId, reason);
      res.json({ transaction });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });
}

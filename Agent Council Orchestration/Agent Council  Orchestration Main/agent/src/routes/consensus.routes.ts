// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Consensus Protocol API Routes — cryptographic voting, quorum, supermajority, guardian veto.

import { Router } from 'express';
import type { ConsensusProtocol, VoteDecision } from '../consensus/consensus-protocol.js';
import { logger } from '../utils/logger.js';

export function registerConsensusRoutes(
  router: Router,
  consensus: ConsensusProtocol,
): void {
  // GET /api/consensus/stats — protocol statistics
  router.get('/consensus/stats', (_req, res) => {
    res.json({ ok: true, ...consensus.getStats() });
  });

  // GET /api/consensus/agents — registered agents
  router.get('/consensus/agents', (_req, res) => {
    res.json({ ok: true, agents: consensus.getRegisteredAgents() });
  });

  // POST /api/consensus/agents — register an agent
  router.post('/consensus/agents', (req, res) => {
    const { agentId } = req.body ?? {};
    if (!agentId) { res.status(400).json({ error: 'Missing agentId' }); return; }
    consensus.registerAgent(agentId);
    res.json({ ok: true, agentId, registered: true });
  });

  // GET /api/consensus/rounds — list active rounds
  router.get('/consensus/rounds', (_req, res) => {
    res.json({ ok: true, rounds: consensus.getActiveRounds() });
  });

  // GET /api/consensus/history — resolved round history
  router.get('/consensus/history', (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
    res.json({ ok: true, history: consensus.getHistory(limit) });
  });

  // GET /api/consensus/rounds/:id — get a specific round
  router.get('/consensus/rounds/:id', (req, res) => {
    const round = consensus.getRound(req.params.id);
    if (!round) { res.status(404).json({ error: 'Round not found' }); return; }
    res.json({ ok: true, round });
  });

  // POST /api/consensus/rounds — create a new consensus round
  router.post('/consensus/rounds', (req, res) => {
    try {
      const { proposal, proposalType, proposedBy, proposalData, riskScore } = req.body ?? {};
      if (!proposal || !proposalType || !proposedBy) {
        res.status(400).json({ error: 'Missing required fields: proposal, proposalType, proposedBy' });
        return;
      }
      const round = consensus.createRound(
        proposal,
        proposalType,
        proposedBy,
        proposalData ?? {},
        riskScore ?? 0,
      );
      res.status(201).json({ ok: true, round });
    } catch (err) {
      logger.error('Create round error', { error: err instanceof Error ? err.message : String(err) });
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/consensus/rounds/:id/vote — cast a vote
  router.post('/consensus/rounds/:id/vote', (req, res) => {
    try {
      const { agentId, decision, confidence, reasoning } = req.body ?? {};
      if (!agentId || !decision) {
        res.status(400).json({ error: 'Missing required fields: agentId, decision' });
        return;
      }
      const vote = consensus.castVote(
        req.params.id,
        agentId,
        decision as VoteDecision,
        confidence ?? 0.5,
        reasoning ?? '',
      );
      res.json({ ok: true, vote });
    } catch (err) {
      logger.error('Cast vote error', { error: err instanceof Error ? err.message : String(err) });
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/consensus/rounds/:id/resolve — resolve a round
  router.post('/consensus/rounds/:id/resolve', (req, res) => {
    try {
      const result = consensus.resolveRound(req.params.id);
      res.json({ ok: true, result });
    } catch (err) {
      logger.error('Resolve round error', { error: err instanceof Error ? err.message : String(err) });
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // GET /api/consensus/rounds/:id/verify — verify round integrity
  router.get('/consensus/rounds/:id/verify', (req, res) => {
    try {
      const integrity = consensus.verifyConsensusIntegrity(req.params.id);
      res.json({ ok: true, ...integrity });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/consensus/demo — seed a full demo round
  router.post('/consensus/demo', (_req, res) => {
    const round = consensus.seedDemoRound();
    res.json({ ok: true, round, message: 'Demo consensus round created and resolved' });
  });

  logger.info('Consensus protocol routes mounted at /api/consensus/*');
}

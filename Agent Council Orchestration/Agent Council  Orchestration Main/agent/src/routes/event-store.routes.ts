// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Event Store API Routes — tamper-proof event sourcing with hash chain verification.

import { Router } from 'express';
import type { EventStore, EventType } from '../events/event-store.js';
import { logger } from '../utils/logger.js';

export function registerEventStoreRoutes(
  router: Router,
  eventStore: EventStore,
): void {
  // GET /api/events — query events with filters
  router.get('/events', (req, res) => {
    const filter: Record<string, unknown> = {};
    if (req.query.type) {
      const types = String(req.query.type).split(',') as EventType[];
      filter.type = types.length === 1 ? types[0] : types;
    }
    if (req.query.agentId) filter.agentId = String(req.query.agentId);
    if (req.query.correlationId) filter.correlationId = String(req.query.correlationId);
    if (req.query.fromSequence) filter.fromSequence = parseInt(String(req.query.fromSequence), 10);
    if (req.query.toSequence) filter.toSequence = parseInt(String(req.query.toSequence), 10);
    if (req.query.fromTimestamp) filter.fromTimestamp = String(req.query.fromTimestamp);
    if (req.query.toTimestamp) filter.toTimestamp = String(req.query.toTimestamp);
    filter.limit = Math.min(parseInt(String(req.query.limit ?? '100'), 10) || 100, 500);

    const events = eventStore.getEvents(filter);
    res.json({ ok: true, events, count: events.length });
  });

  // GET /api/events/recent — last N events
  router.get('/events/recent', (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 200);
    res.json({ ok: true, events: eventStore.getRecent(limit) });
  });

  // GET /api/events/snapshot — store snapshot with integrity status
  router.get('/events/snapshot', (_req, res) => {
    res.json({ ok: true, snapshot: eventStore.getSnapshot() });
  });

  // GET /api/events/counts — event counts grouped by type
  router.get('/events/counts', (_req, res) => {
    res.json({ ok: true, counts: eventStore.getEventCounts() });
  });

  // GET /api/events/correlation/:id — all events for a correlation ID
  router.get('/events/correlation/:id', (req, res) => {
    const events = eventStore.getCorrelatedEvents(req.params.id);
    if (events.length === 0) {
      res.status(404).json({ error: `No events found for correlation: ${req.params.id}` });
      return;
    }
    res.json({ ok: true, correlationId: req.params.id, events, count: events.length });
  });

  // GET /api/events/replay — replay events from a sequence
  router.get('/events/replay', (req, res) => {
    const fromSequence = parseInt(String(req.query.from ?? '0'), 10);
    const events = eventStore.replay(fromSequence);
    res.json({ ok: true, fromSequence, events, count: events.length });
  });

  // GET /api/events/verify — verify hash chain integrity
  router.get('/events/verify', (_req, res) => {
    const integrity = eventStore.verifyChainIntegrity();
    const statusCode = integrity.valid ? 200 : 409;
    res.status(statusCode).json({ ok: integrity.valid, ...integrity });
  });

  // POST /api/events — append a new event
  router.post('/events', (req, res) => {
    try {
      const { type, payload, agentId, correlationId } = req.body ?? {};
      if (!type || !agentId) {
        res.status(400).json({ error: 'Missing required fields: type, agentId' });
        return;
      }
      const event = eventStore.append(
        type as EventType,
        payload ?? {},
        agentId,
        correlationId,
      );
      res.status(201).json({ ok: true, event });
    } catch (err) {
      logger.error('Event append error', { error: err instanceof Error ? err.message : String(err) });
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/events/demo — seed demo events
  router.post('/events/demo', (_req, res) => {
    eventStore.seedDemoEvents();
    res.json({ ok: true, message: 'Demo events seeded', snapshot: eventStore.getSnapshot() });
  });

  logger.info('Event store routes mounted at /api/events/*');
}

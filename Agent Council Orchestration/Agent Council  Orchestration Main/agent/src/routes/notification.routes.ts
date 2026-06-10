// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Push Notification route handlers (SSE + REST)

import { Router } from 'express';
import type { PushNotificationService, NotificationType, NotificationSeverity } from '../services/push-notification.service.js';

// WDK type imports for wallet-event-driven notifications via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
// Notifications triggered by WDK balance changes, incoming transfers, and tx confirmations
export type _WdkRefs = WDK; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register push notification routes for SSE streaming and history.
 *
 * Routes:
 *   GET  /api/notifications/stream       — SSE endpoint for real-time push
 *   GET  /api/notifications              — notification history
 *   GET  /api/notifications/unread-count  — unread count
 *   POST /api/notifications/:id/read     — mark one as read
 *   POST /api/notifications/read-all     — mark all as read
 */
export function registerNotificationRoutes(
  router: Router,
  pushService: PushNotificationService,
): void {

  /** GET /api/notifications/stream — SSE endpoint for real-time push notifications */
  router.get('/notifications/stream', (req, res) => {
    // Disable Express timeout for SSE
    req.setTimeout(0);
    pushService.subscribe(res);
  });

  /** GET /api/notifications/unread-count — Get unread notification count */
  router.get('/notifications/unread-count', (_req, res) => {
    res.json({
      unread: pushService.getUnreadCount(),
      subscribers: pushService.getSubscriberCount(),
    });
  });

  /** GET /api/notifications — Get notification history with optional filters */
  router.get('/notifications', (req, res) => {
    const types = typeof req.query.types === 'string'
      ? req.query.types.split(',') as NotificationType[]
      : undefined;
    const severity = typeof req.query.severity === 'string'
      ? req.query.severity.split(',') as NotificationSeverity[]
      : undefined;
    const since = typeof req.query.since === 'string' ? req.query.since : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;

    const notifications = pushService.getHistory({ types, severity, since, limit });
    res.json({
      notifications,
      total: notifications.length,
      unread: pushService.getUnreadCount(),
    });
  });

  /** POST /api/notifications/:id/read — Mark a notification as read */
  router.post('/notifications/:id/read', (req, res) => {
    const ok = pushService.markRead(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json({ ok: true, unread: pushService.getUnreadCount() });
  });

  /** POST /api/notifications/read-all — Mark all notifications as read */
  router.post('/notifications/read-all', (_req, res) => {
    const count = pushService.markAllRead();
    res.json({ ok: true, marked: count, unread: 0 });
  });
}

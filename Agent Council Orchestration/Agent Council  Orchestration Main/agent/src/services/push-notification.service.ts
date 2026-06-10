// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Push Notification Service via Server-Sent Events (SSE)
//
// Provides real-time push notifications to connected dashboard clients
// without requiring verified domains or platform webhooks. Clients subscribe
// via the GET /api/notifications/stream SSE endpoint and receive events
// as they happen across all agent services.

import { randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export type NotificationType =
  | 'tip_executed'
  | 'tip_failed'
  | 'escrow_created'
  | 'escrow_claimed'
  | 'swap_completed'
  | 'yield_earned'
  | 'creator_discovered'
  | 'safety_alert'
  | 'mood_changed'
  | 'milestone_reached'
  | 'webhook_received'
  | 'cycle_completed';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface PushNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  data?: Record<string, unknown>;
  timestamp: string;
  read: boolean;
}

export interface NotificationFilter {
  types?: NotificationType[];
  severity?: NotificationSeverity[];
  since?: string;
  limit?: number;
}

// ── SSE Client ─────────────────────────────────────────────────

interface SSEClient {
  id: string;
  res: Response;
  connectedAt: string;
}

// ── Service ────────────────────────────────────────────────────

/**
 * Push notification hub using Server-Sent Events.
 *
 * Services publish notifications via publish(), and connected dashboard
 * clients receive them in real-time via SSE. Notification history is
 * kept in memory for retrieval via the REST API.
 */
export class PushNotificationService {
  private clients: Map<string, SSEClient> = new Map();
  private history: PushNotification[] = [];
  private readonly maxHistory: number = 500;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Send heartbeat every 30s to keep SSE connections alive
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30_000);

    // Prevent the interval from keeping the process alive
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  // ── SSE Connection Management ────────────────────────────────

  /**
   * Subscribe a client to receive SSE push notifications.
   * Sets up the SSE connection with proper headers and cleanup.
   */
  subscribe(res: Response): string {
    const clientId = randomBytes(8).toString('hex');

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

    // Send any unread notifications as a catch-up
    const unread = this.history.filter(n => !n.read).slice(-20);
    if (unread.length > 0) {
      res.write(`event: catchup\ndata: ${JSON.stringify({ notifications: unread })}\n\n`);
    }

    const client: SSEClient = {
      id: clientId,
      res,
      connectedAt: new Date().toISOString(),
    };

    this.clients.set(clientId, client);

    // Cleanup on disconnect
    res.on('close', () => {
      this.clients.delete(clientId);
      logger.info('SSE client disconnected', { clientId });
    });

    logger.info('SSE client connected', { clientId, totalClients: this.clients.size });
    return clientId;
  }

  /**
   * Get the number of connected SSE clients.
   */
  getSubscriberCount(): number {
    return this.clients.size;
  }

  // ── Publishing ───────────────────────────────────────────────

  /**
   * Publish a notification to all connected SSE clients and store in history.
   */
  publish(notification: Omit<PushNotification, 'id' | 'timestamp' | 'read'>): PushNotification {
    const full: PushNotification = {
      ...notification,
      id: `notif_${randomBytes(8).toString('hex')}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Store in history
    this.history.push(full);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Broadcast to all connected SSE clients
    const payload = `event: notification\ndata: ${JSON.stringify(full)}\n\n`;
    for (const [clientId, client] of this.clients) {
      try {
        client.res.write(payload);
      } catch {
        // Client disconnected — remove
        this.clients.delete(clientId);
      }
    }

    if (full.severity === 'error' || full.severity === 'warning') {
      logger.warn(`Push notification [${full.type}]: ${full.title}`, { severity: full.severity });
    }

    return full;
  }

  /**
   * Convenience method: publish a typed notification with minimal params.
   */
  notify(
    type: NotificationType,
    title: string,
    message: string,
    severity: NotificationSeverity = 'info',
    data?: Record<string, unknown>,
  ): PushNotification {
    return this.publish({ type, title, message, severity, data });
  }

  // ── History & Read State ─────────────────────────────────────

  /**
   * Get notification history with optional filtering.
   */
  getHistory(filter?: NotificationFilter): PushNotification[] {
    let result = [...this.history];

    if (filter?.types && filter.types.length > 0) {
      result = result.filter(n => filter.types!.includes(n.type));
    }
    if (filter?.severity && filter.severity.length > 0) {
      result = result.filter(n => filter.severity!.includes(n.severity));
    }
    if (filter?.since) {
      const sinceDate = new Date(filter.since);
      result = result.filter(n => new Date(n.timestamp) >= sinceDate);
    }

    // Most recent first
    result.reverse();

    if (filter?.limit && filter.limit > 0) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  /**
   * Mark a notification as read.
   */
  markRead(id: string): boolean {
    const notification = this.history.find(n => n.id === id);
    if (!notification) return false;
    notification.read = true;
    return true;
  }

  /**
   * Mark all notifications as read.
   */
  markAllRead(): number {
    let count = 0;
    for (const n of this.history) {
      if (!n.read) {
        n.read = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Get the count of unread notifications.
   */
  getUnreadCount(): number {
    return this.history.filter(n => !n.read).length;
  }

  // ── Heartbeat ────────────────────────────────────────────────

  private sendHeartbeat(): void {
    const payload = `:heartbeat ${new Date().toISOString()}\n\n`;
    for (const [clientId, client] of this.clients) {
      try {
        client.res.write(payload);
      } catch {
        this.clients.delete(clientId);
      }
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────

  dispose(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    // Close all SSE connections
    for (const [, client] of this.clients) {
      try { client.res.end(); } catch { /* ignore */ }
    }
    this.clients.clear();
  }
}

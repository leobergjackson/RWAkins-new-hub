// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
// Webhook Receiver Service — production-ready ingest endpoint for real-time social media events

import { createHmac } from 'crypto';
import { logger } from '../utils/logger.js';
import type { SimulatedEvent, SimulatedEventType } from './event-simulator.service.js';

// ── Types ─────────────────────────────────────────────────────────

export interface WebhookEvent {
  platform: string;          // 'rumble' | 'youtube' | 'custom'
  eventType: string;         // 'new_video' | 'live_stream' | 'milestone' | 'engagement'
  creatorId: string;
  creatorName: string;
  data: {
    title?: string;
    views?: number;
    likes?: number;
    comments?: number;
    subscriberCount?: number;
    url?: string;
    [key: string]: unknown;
  };
  timestamp: string;
  signature?: string;        // HMAC-SHA256 for verification
}

export interface WebhookRegistration {
  id: string;
  platform: string;
  callbackUrl: string;
  secret: string;
  createdAt: string;
  eventsReceived: number;
}

export interface WebhookStats {
  totalReceived: number;
  totalProcessed: number;
  totalRejected: number;
  byPlatform: Record<string, { received: number; processed: number }>;
  registeredWebhooks: number;
  queueSize: number;
  oldestEventAge: number | null; // ms
}

// ── Service ──────────────────────────────────────────────────────

const MAX_QUEUE_SIZE = 1000;

/**
 * WebhookReceiverService — accepts real-time POSTs from social platforms.
 *
 * Features:
 * - HMAC-SHA256 signature verification per registered webhook
 * - Converts incoming events to SimulatedEvent format for the autonomous loop
 * - FIFO queue with max 1000 events
 * - Stats tracking by platform
 */
export class WebhookReceiverService {
  private registrations = new Map<string, WebhookRegistration>();
  private eventQueue: SimulatedEvent[] = [];
  private eventCounter = 0;
  private totalReceived = 0;
  private totalProcessed = 0;
  private totalRejected = 0;
  private platformStats = new Map<string, { received: number; processed: number }>();

  constructor() {
    logger.info('Webhook receiver service initialized');
  }

  // ── Registration ─────────────────────────────────────────────

  /**
   * Register a webhook with HMAC secret for signature verification.
   */
  registerWebhook(platform: string, callbackUrl: string, secret: string): WebhookRegistration {
    const id = `wh_${platform}_${Date.now()}`;
    const registration: WebhookRegistration = {
      id,
      platform,
      callbackUrl,
      secret,
      createdAt: new Date().toISOString(),
      eventsReceived: 0,
    };
    this.registrations.set(id, registration);
    logger.info('Webhook registered', { id, platform, callbackUrl });
    return registration;
  }

  /**
   * List all registered webhooks (secrets redacted).
   */
  getRegistrations(): Array<Omit<WebhookRegistration, 'secret'> & { secret: string }> {
    return [...this.registrations.values()].map(r => ({
      ...r,
      secret: r.secret.slice(0, 4) + '****',
    }));
  }

  // ── Signature Verification ──────────────────────────────────

  /**
   * Verify HMAC-SHA256 signature for an incoming event payload.
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    // Constant-time comparison
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  }

  // ── Event Ingestion ─────────────────────────────────────────

  /**
   * Ingest a webhook event. Verifies signature if a matching registration exists.
   * Converts to SimulatedEvent and adds to the queue.
   *
   * @returns The converted SimulatedEvent, or null if rejected
   */
  ingestEvent(event: WebhookEvent, rawBody?: string): SimulatedEvent | null {
    this.totalReceived++;
    this.incrementPlatformStat(event.platform, 'received');

    // Signature verification: check if any registration matches this platform
    if (event.signature && rawBody) {
      const platformRegs = [...this.registrations.values()].filter(
        r => r.platform === event.platform,
      );
      if (platformRegs.length > 0) {
        const verified = platformRegs.some(r =>
          this.verifySignature(rawBody, event.signature!, r.secret),
        );
        if (!verified) {
          this.totalRejected++;
          logger.warn('Webhook signature verification failed', {
            platform: event.platform,
            creatorId: event.creatorId,
          });
          return null;
        }
      }
    }

    // Convert to SimulatedEvent
    const simEvent = this.convertToSimulatedEvent(event);

    // Add to queue (FIFO, max 1000)
    this.eventQueue.push(simEvent);
    if (this.eventQueue.length > MAX_QUEUE_SIZE) {
      this.eventQueue.shift(); // drop oldest
    }

    this.totalProcessed++;
    this.incrementPlatformStat(event.platform, 'processed');

    // Update registration stats
    for (const reg of this.registrations.values()) {
      if (reg.platform === event.platform) {
        reg.eventsReceived++;
      }
    }

    logger.info('Webhook event ingested', {
      platform: event.platform,
      eventType: event.eventType,
      creator: event.creatorName,
      queueSize: this.eventQueue.length,
    });

    return simEvent;
  }

  // ── Queue Access ────────────────────────────────────────────

  /**
   * Get events from the queue since a given timestamp.
   * These events are consumed (removed from queue) by the autonomous loop.
   */
  consumeEvents(sinceTimestamp?: string): SimulatedEvent[] {
    if (!sinceTimestamp) {
      const events = [...this.eventQueue];
      this.eventQueue = [];
      return events;
    }

    const cutoff = new Date(sinceTimestamp).getTime();
    const matching: SimulatedEvent[] = [];
    const remaining: SimulatedEvent[] = [];

    for (const evt of this.eventQueue) {
      if (new Date(evt.timestamp).getTime() > cutoff) {
        matching.push(evt);
      } else {
        remaining.push(evt);
      }
    }

    this.eventQueue = remaining;
    return matching;
  }

  /**
   * Get recent events (non-destructive read) since a timestamp.
   */
  getRecentEvents(since?: string): SimulatedEvent[] {
    if (!since) return [...this.eventQueue];
    const cutoff = new Date(since).getTime();
    return this.eventQueue.filter(
      evt => new Date(evt.timestamp).getTime() > cutoff,
    );
  }

  /**
   * Get queue size.
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  // ── Stats ───────────────────────────────────────────────────

  getStats(): WebhookStats {
    const byPlatform: Record<string, { received: number; processed: number }> = {};
    for (const [platform, stats] of this.platformStats) {
      byPlatform[platform] = { ...stats };
    }

    let oldestEventAge: number | null = null;
    if (this.eventQueue.length > 0) {
      oldestEventAge = Date.now() - new Date(this.eventQueue[0].timestamp).getTime();
    }

    return {
      totalReceived: this.totalReceived,
      totalProcessed: this.totalProcessed,
      totalRejected: this.totalRejected,
      byPlatform,
      registeredWebhooks: this.registrations.size,
      queueSize: this.eventQueue.length,
      oldestEventAge,
    };
  }

  // ── Conversion ──────────────────────────────────────────────

  private convertToSimulatedEvent(event: WebhookEvent): SimulatedEvent {
    const eventType = this.mapEventType(event.eventType);
    const engagementQuality = this.computeEngagement(event);
    const suggestedTipAmount = this.computeTipAmount(engagementQuality);

    const simEvent: SimulatedEvent = {
      id: `wh_${++this.eventCounter}_${Date.now()}`,
      type: eventType,
      timestamp: event.timestamp || new Date().toISOString(),
      creatorId: `${event.platform}_${event.creatorId}`,
      creatorName: event.creatorName,
      data: {
        source: 'webhook',
        platform: event.platform,
        webhookEventType: event.eventType,
        title: event.data.title,
        url: event.data.url,
        views: event.data.views,
        likes: event.data.likes,
        comments: event.data.comments,
        subscriberCount: event.data.subscriberCount,
      },
      engagementQuality,
      isMilestone: event.eventType === 'milestone',
      suggestedTipAmount,
    };

    return simEvent;
  }

  private mapEventType(webhookType: string): SimulatedEventType {
    const map: Record<string, SimulatedEventType> = {
      'new_video': 'creator.content_uploaded',
      'live_stream': 'creator.stream_started',
      'milestone': 'creator.milestone_reached',
      'engagement': 'creator.high_engagement',
      'donation': 'creator.donation_received',
      'upload': 'creator.content_uploaded',
    };
    return map[webhookType] ?? 'creator.content_uploaded';
  }

  private computeEngagement(event: WebhookEvent): number {
    let score = 0.5;

    // Recency
    if (event.timestamp) {
      const ageMs = Date.now() - new Date(event.timestamp).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours < 1) score += 0.25;
      else if (ageHours < 6) score += 0.20;
      else if (ageHours < 12) score += 0.15;
      else if (ageHours < 24) score += 0.10;
    }

    // View/engagement signals
    const views = event.data.views ?? 0;
    const likes = event.data.likes ?? 0;
    if (views > 100000) score += 0.15;
    else if (views > 10000) score += 0.10;
    else if (views > 1000) score += 0.05;

    if (likes > 10000) score += 0.05;
    else if (likes > 1000) score += 0.03;

    // Milestone events always high
    if (event.eventType === 'milestone') score += 0.15;
    if (event.eventType === 'live_stream') score += 0.10;

    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  }

  private computeTipAmount(engagementQuality: number): number {
    if (engagementQuality >= 0.8) return 0.01;
    if (engagementQuality >= 0.7) return 0.008;
    if (engagementQuality >= 0.6) return 0.005;
    return 0.003;
  }

  private incrementPlatformStat(platform: string, field: 'received' | 'processed'): void {
    if (!this.platformStats.has(platform)) {
      this.platformStats.set(platform, { received: 0, processed: 0 });
    }
    this.platformStats.get(platform)![field]++;
  }
}

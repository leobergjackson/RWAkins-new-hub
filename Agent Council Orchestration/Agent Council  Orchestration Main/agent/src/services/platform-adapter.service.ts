// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
//
// PLATFORM ADAPTER SERVICE — Plugin architecture for multi-platform scaling
//
// AeroFyta is not locked to Rumble. The platform adapter system enables
// integration with ANY video/content platform through a standard interface.
// Each platform adapter translates platform-specific events into AeroFyta's
// universal tipping format.
//
// Architecture:
//   Platform → Adapter → Normalized Event → AeroFyta Engine → WDK
//
// Supported adapters:
//   - Rumble (primary, built-in)
//   - YouTube (planned)
//   - Twitch (planned)
//   - Custom (webhook-based)
//
// Any developer can create a new adapter by implementing PlatformAdapter.

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

// ── Types ────────────────────────────────────────────────────────

/** Standard creator profile across all platforms */
export interface UniversalCreator {
  id: string;
  platformId: string;
  platform: string;
  name: string;
  channelUrl: string;
  walletAddress: string;
  categories: string[];
  subscriberCount: number;
  /** Platform-specific metadata */
  metadata: Record<string, unknown>;
}

/** Standard content item across all platforms */
export interface UniversalContent {
  id: string;
  platformContentId: string;
  platform: string;
  creatorId: string;
  title: string;
  type: 'video' | 'livestream' | 'article' | 'podcast' | 'short';
  duration?: number; // seconds
  publishedAt: string;
  metadata: Record<string, unknown>;
}

/** Standard watch/engagement event across all platforms */
export interface UniversalEngagement {
  id: string;
  platform: string;
  userId: string;
  creatorId: string;
  contentId: string;
  type: 'watch' | 'like' | 'comment' | 'share' | 'subscribe' | 'donation';
  watchPercent?: number;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/** Standard tipping event across all platforms */
export interface UniversalTipEvent {
  id: string;
  platform: string;
  creatorId: string;
  creatorAddress: string;
  amount: string;
  token: string;
  trigger: string; // What caused this tip
  reasoning: string;
  timestamp: string;
}

/**
 * Platform Adapter Interface — implement this for each platform.
 * Translates platform-specific APIs into AeroFyta's universal format.
 */
export interface PlatformAdapter {
  /** Platform identifier (e.g., 'rumble', 'youtube', 'twitch') */
  platform: string;
  /** Human-readable platform name */
  displayName: string;
  /** Whether this adapter is currently connected/active */
  isConnected: boolean;
  /** Version of the adapter */
  version: string;

  /** Get creators from this platform */
  getCreators(): UniversalCreator[];
  /** Get content items from a creator */
  getContent(creatorId: string): UniversalContent[];
  /** Record an engagement event */
  recordEngagement(event: Omit<UniversalEngagement, 'id' | 'platform' | 'timestamp'>): UniversalEngagement;
  /** Get engagement history for a user-creator pair */
  getEngagement(userId: string, creatorId: string): UniversalEngagement[];
  /** Normalize a platform-specific event into universal format */
  normalizeEvent(rawEvent: unknown): UniversalEngagement | null;
}

// ── Built-in Rumble Adapter ──────────────────────────────────────

/**
 * Rumble Platform Adapter — translates Rumble's creator ecosystem
 * into AeroFyta's universal format.
 */
class RumbleAdapter implements PlatformAdapter {
  platform = 'rumble';
  displayName = 'Rumble';
  isConnected = true;
  version = '1.0.0';

  private creators: UniversalCreator[] = [];
  private engagements: UniversalEngagement[] = [];

  /** Register a Rumble creator */
  addCreator(creator: {
    name: string;
    channelUrl: string;
    walletAddress: string;
    categories: string[];
    subscriberCount?: number;
  }): UniversalCreator {
    const existing = this.creators.find((c) => c.channelUrl === creator.channelUrl);
    if (existing) {
      Object.assign(existing, {
        name: creator.name,
        walletAddress: creator.walletAddress,
        categories: creator.categories,
        subscriberCount: creator.subscriberCount ?? existing.subscriberCount,
      });
      return existing;
    }

    const universal: UniversalCreator = {
      id: uuidv4(),
      platformId: creator.channelUrl.split('/').pop() ?? '',
      platform: 'rumble',
      name: creator.name,
      channelUrl: creator.channelUrl,
      walletAddress: creator.walletAddress,
      categories: creator.categories,
      subscriberCount: creator.subscriberCount ?? 0,
      metadata: { source: 'rumble-wdk' },
    };

    this.creators.push(universal);
    return universal;
  }

  getCreators(): UniversalCreator[] {
    return [...this.creators];
  }

  getContent(_creatorId: string): UniversalContent[] {
    // In production: fetch from Rumble API
    return [];
  }

  recordEngagement(event: Omit<UniversalEngagement, 'id' | 'platform' | 'timestamp'>): UniversalEngagement {
    const engagement: UniversalEngagement = {
      ...event,
      id: uuidv4(),
      platform: 'rumble',
      timestamp: new Date().toISOString(),
    };
    this.engagements.push(engagement);

    // Keep bounded
    if (this.engagements.length > 10000) {
      this.engagements = this.engagements.slice(-5000);
    }

    return engagement;
  }

  getEngagement(userId: string, creatorId: string): UniversalEngagement[] {
    return this.engagements.filter(
      (e) => e.userId === userId && e.creatorId === creatorId,
    );
  }

  normalizeEvent(rawEvent: unknown): UniversalEngagement | null {
    // Translate Rumble webhook events into universal format
    const event = rawEvent as Record<string, unknown>;
    if (!event.type || !event.userId) return null;

    return {
      id: uuidv4(),
      platform: 'rumble',
      userId: String(event.userId),
      creatorId: String(event.creatorId ?? ''),
      contentId: String(event.videoId ?? event.contentId ?? ''),
      type: String(event.type) as UniversalEngagement['type'],
      watchPercent: typeof event.watchPercent === 'number' ? event.watchPercent : undefined,
      timestamp: new Date().toISOString(),
      metadata: { raw: event },
    };
  }
}

// ── Webhook Adapter (Custom Platform) ────────────────────────────

/**
 * Webhook Platform Adapter — enables any platform to integrate
 * with AeroFyta by sending standard webhook events.
 */
class WebhookAdapter implements PlatformAdapter {
  platform = 'webhook';
  displayName = 'Custom (Webhook)';
  isConnected = true;
  version = '1.0.0';

  private creators: UniversalCreator[] = [];
  private engagements: UniversalEngagement[] = [];

  getCreators(): UniversalCreator[] { return [...this.creators]; }
  getContent(): UniversalContent[] { return []; }

  recordEngagement(event: Omit<UniversalEngagement, 'id' | 'platform' | 'timestamp'>): UniversalEngagement {
    const engagement: UniversalEngagement = {
      ...event,
      id: uuidv4(),
      platform: 'webhook',
      timestamp: new Date().toISOString(),
    };
    this.engagements.push(engagement);
    return engagement;
  }

  getEngagement(userId: string, creatorId: string): UniversalEngagement[] {
    return this.engagements.filter(
      (e) => e.userId === userId && e.creatorId === creatorId,
    );
  }

  normalizeEvent(rawEvent: unknown): UniversalEngagement | null {
    const event = rawEvent as Record<string, unknown>;
    if (!event.userId || !event.creatorId) return null;

    return {
      id: uuidv4(),
      platform: 'webhook',
      userId: String(event.userId),
      creatorId: String(event.creatorId),
      contentId: String(event.contentId ?? ''),
      type: (event.type as UniversalEngagement['type']) ?? 'watch',
      watchPercent: typeof event.watchPercent === 'number' ? event.watchPercent : undefined,
      timestamp: new Date().toISOString(),
      metadata: event,
    };
  }
}

// ── Platform Adapter Service ─────────────────────────────────────

/**
 * PlatformAdapterService — Plugin registry for multi-platform scaling.
 *
 * Manages platform adapters and provides a unified interface for
 * cross-platform creator discovery, engagement tracking, and tipping.
 *
 * Scalability:
 *   - Add new platforms by implementing PlatformAdapter interface
 *   - No code changes to AeroFyta core required
 *   - Events from all platforms flow through the same tipping pipeline
 *   - Engagement scores are platform-agnostic
 */
export class PlatformAdapterService {
  private adapters: Map<string, PlatformAdapter> = new Map();
  private tipEvents: UniversalTipEvent[] = [];

  constructor() {
    // Register built-in adapters
    this.registerAdapter(new RumbleAdapter());
    this.registerAdapter(new WebhookAdapter());

    logger.info('Platform adapter service initialized', {
      adapters: Array.from(this.adapters.keys()),
    });
  }

  /** Register a new platform adapter */
  registerAdapter(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.platform, adapter);
    logger.info(`Platform adapter registered: ${adapter.displayName} v${adapter.version}`);
  }

  /** Get a specific adapter */
  getAdapter(platform: string): PlatformAdapter | undefined {
    return this.adapters.get(platform);
  }

  /** List all registered adapters */
  listAdapters(): Array<{
    platform: string;
    displayName: string;
    isConnected: boolean;
    version: string;
    creatorCount: number;
  }> {
    return Array.from(this.adapters.values()).map((a) => ({
      platform: a.platform,
      displayName: a.displayName,
      isConnected: a.isConnected,
      version: a.version,
      creatorCount: a.getCreators().length,
    }));
  }

  /** Get all creators across all platforms */
  getAllCreators(): UniversalCreator[] {
    const all: UniversalCreator[] = [];
    for (const adapter of this.adapters.values()) {
      all.push(...adapter.getCreators());
    }
    return all;
  }

  /** Record an engagement event on any platform */
  recordEngagement(
    platform: string,
    event: Omit<UniversalEngagement, 'id' | 'platform' | 'timestamp'>,
  ): UniversalEngagement | null {
    const adapter = this.adapters.get(platform);
    if (!adapter) return null;
    return adapter.recordEngagement(event);
  }

  /** Process a raw webhook event from any platform */
  processRawEvent(platform: string, rawEvent: unknown): UniversalEngagement | null {
    const adapter = this.adapters.get(platform);
    if (!adapter) return null;
    return adapter.normalizeEvent(rawEvent);
  }

  /** Record a tip event */
  recordTipEvent(event: Omit<UniversalTipEvent, 'id' | 'timestamp'>): UniversalTipEvent {
    const tipEvent: UniversalTipEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    this.tipEvents.push(tipEvent);

    // Keep bounded
    if (this.tipEvents.length > 10000) {
      this.tipEvents = this.tipEvents.slice(-5000);
    }

    return tipEvent;
  }

  /** Get tip events, optionally filtered by platform */
  getTipEvents(platform?: string): UniversalTipEvent[] {
    if (platform) {
      return this.tipEvents.filter((e) => e.platform === platform);
    }
    return [...this.tipEvents];
  }

  /** Get cross-platform analytics */
  getCrossPlatformStats(): {
    platforms: number;
    totalCreators: number;
    totalTipEvents: number;
    byPlatform: Array<{
      platform: string;
      creators: number;
      tips: number;
      totalAmount: number;
    }>;
  } {
    const adapters = Array.from(this.adapters.values());
    const byPlatform = adapters.map((a) => {
      const platformTips = this.tipEvents.filter((t) => t.platform === a.platform);
      return {
        platform: a.platform,
        creators: a.getCreators().length,
        tips: platformTips.length,
        totalAmount: platformTips.reduce((sum, t) => sum + parseFloat(t.amount), 0),
      };
    });

    return {
      platforms: adapters.length,
      totalCreators: this.getAllCreators().length,
      totalTipEvents: this.tipEvents.length,
      byPlatform,
    };
  }
}

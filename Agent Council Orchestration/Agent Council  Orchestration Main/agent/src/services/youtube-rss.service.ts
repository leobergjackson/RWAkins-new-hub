// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
// YouTube RSS Service — fetches real creator data from YouTube RSS feeds (no API key needed)

import { logger } from '../utils/logger.js';
import type { SimulatedEvent, SimulatedEventType } from './event-simulator.service.js';

// ── YouTube Channel Registry ────────────────────────────────────
// Popular tech/crypto creators with public RSS feeds.
// YouTube RSS URL pattern: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID

interface YouTubeChannel {
  channelId: string;
  name: string;
  categories: string[];
}

const YOUTUBE_CHANNELS: YouTubeChannel[] = [
  { channelId: 'UCBJycsmduvYEL83R_U4JriQ', name: 'MKBHD', categories: ['tech', 'reviews'] },
  { channelId: 'UCXuqSBlHAE6Xw-yeJA0Tunw', name: 'Linus Tech Tips', categories: ['tech', 'entertainment'] },
  { channelId: 'UCqK_GSMbpiV8spgD3ZGloSw', name: 'Coin Bureau', categories: ['crypto', 'finance'] },
  { channelId: 'UCnUYZLuoy1rq1aVMwx4piYg', name: 'Jeff Geerling', categories: ['tech', 'education'] },
  { channelId: 'UC0vBXGSyV14uvJ4hECDOl0Q', name: 'Techquickie', categories: ['tech', 'education'] },
  { channelId: 'UCvjgXvBlbQiAffPfJHNfBCA', name: 'Finematics', categories: ['crypto', 'education'] },
  { channelId: 'UCRvqjQPSeaWn-uEx-w0XOIg', name: 'CryptosRUs', categories: ['crypto', 'finance'] },
  { channelId: 'UCJ5v_MCY6GNUBTO8-D3XoAg', name: 'WIRED', categories: ['tech', 'science'] },
];

// ── Parsed Video Item ───────────────────────────────────────────

interface YouTubeVideoItem {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  published: string;   // ISO date string
  link: string;
  categories: string[];
}

// ── Cache Entry ─────────────────────────────────────────────────

interface CacheEntry {
  items: YouTubeVideoItem[];
  fetchedAt: number;
}

// ── Engagement Signal ───────────────────────────────────────────

const ENGAGEMENT_KEYWORDS = [
  'breaking', 'exclusive', 'urgent', 'live', 'update',
  'launch', 'new', 'review', 'announcement', 'released',
  'bitcoin', 'ethereum', 'defi', 'airdrop', 'token',
  'tutorial', 'guide', 'explained', 'deep dive',
];

// ── Service ─────────────────────────────────────────────────────

/**
 * YouTubeRSSService — fetches real creator activity from YouTube RSS feeds.
 *
 * No API key required. Uses the public Atom feed endpoint:
 *   https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
 *
 * Computes engagement signals from recency, posting frequency, and title keywords.
 * Exposes `getNewEvents()` matching the same interface as EventSimulatorService
 * so it can be a drop-in data source for the autonomous loop.
 *
 * Implements 5-minute TTL caching to avoid excessive requests.
 */
export class YouTubeRSSService {
  private cache = new Map<string, CacheEntry>();
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes
  private seenVideoIds = new Set<string>();
  private lastFetchTimestamp: string = new Date(0).toISOString();
  private eventCounter = 0;
  private channels: YouTubeChannel[];

  constructor(channels?: YouTubeChannel[]) {
    this.channels = channels ?? YOUTUBE_CHANNELS;
    logger.info(`YouTube RSS service initialized — tracking ${this.channels.length} channels`);
  }

  // ── Public API ──────────────────────────────────────────────

  /**
   * Fetch latest videos from all tracked YouTube channels.
   * Uses cache (5-min TTL) to avoid spamming YouTube.
   */
  async fetchAllChannels(): Promise<YouTubeVideoItem[]> {
    const allItems: YouTubeVideoItem[] = [];

    // Fetch a random subset (max 3) per cycle to spread load
    const shuffled = [...this.channels].sort(() => Math.random() - 0.5).slice(0, 3);

    for (const channel of shuffled) {
      try {
        const items = await this.fetchChannel(channel);
        allItems.push(...items);
      } catch (err) {
        logger.warn(`YouTube RSS fetch failed for ${channel.name}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return allItems;
  }

  /**
   * Get new events in SimulatedEvent format, matching EventSimulatorService interface.
   * @param sinceTimestamp ISO timestamp — only return events newer than this
   */
  async getNewEvents(sinceTimestamp: string): Promise<SimulatedEvent[]> {
    try {
      const items = await this.fetchAllChannels();
      const cutoff = new Date(sinceTimestamp);
      const events: SimulatedEvent[] = [];

      for (const item of items) {
        // Skip already-seen videos
        if (this.seenVideoIds.has(item.videoId)) continue;

        // Only include videos published after the cutoff (or within last 48h for first run)
        const publishedDate = new Date(item.published);
        if (isNaN(publishedDate.getTime())) continue;

        const maxAge = 48 * 60 * 60 * 1000; // 48 hours
        const isRecent = Date.now() - publishedDate.getTime() < maxAge;
        const isNew = publishedDate > cutoff;

        if (!isRecent && !isNew) continue;

        this.seenVideoIds.add(item.videoId);

        // Trim seen set to prevent unbounded growth
        if (this.seenVideoIds.size > 2000) {
          const arr = [...this.seenVideoIds];
          this.seenVideoIds = new Set(arr.slice(-1000));
        }

        const engagementQuality = this.computeEngagement(item);
        const suggestedTipAmount = this.computeTipAmount(engagementQuality);

        const event: SimulatedEvent = {
          id: `yt_${++this.eventCounter}_${Date.now()}`,
          type: 'creator.content_uploaded' as SimulatedEventType,
          timestamp: new Date().toISOString(),
          creatorId: `yt_${item.channelId}`,
          creatorName: item.channelName,
          data: {
            source: 'youtube_rss',
            videoId: item.videoId,
            title: item.title,
            url: item.link,
            publishedAt: item.published,
            category: item.categories[0] ?? 'tech',
            contentType: 'video',
          },
          engagementQuality,
          isMilestone: false,
          suggestedTipAmount,
        };

        events.push(event);
        logger.info('YouTube RSS event generated', {
          creator: item.channelName,
          title: item.title,
          engagement: engagementQuality,
        });
      }

      if (events.length > 0) {
        this.lastFetchTimestamp = new Date().toISOString();
      }

      return events;
    } catch (err) {
      logger.warn('YouTube RSS getNewEvents failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  /**
   * Get the latest cached data for the /api/creators/live endpoint.
   */
  getLiveCreatorData(): {
    channels: Array<{
      name: string;
      channelId: string;
      categories: string[];
      recentVideos: Array<{
        videoId: string;
        title: string;
        published: string;
        link: string;
        engagementScore: number;
      }>;
      lastFetchedAt: string | null;
    }>;
    lastFetchTimestamp: string;
    cacheHits: number;
    totalEventsSent: number;
  } {
    const channels = this.channels.map(ch => {
      const cached = this.cache.get(ch.channelId);
      return {
        name: ch.name,
        channelId: ch.channelId,
        categories: ch.categories,
        recentVideos: (cached?.items ?? []).slice(0, 5).map(item => ({
          videoId: item.videoId,
          title: item.title,
          published: item.published,
          link: item.link,
          engagementScore: this.computeEngagement(item),
        })),
        lastFetchedAt: cached ? new Date(cached.fetchedAt).toISOString() : null,
      };
    });

    return {
      channels,
      lastFetchTimestamp: this.lastFetchTimestamp,
      cacheHits: this.cache.size,
      totalEventsSent: this.eventCounter,
    };
  }

  // ── Private: Fetching ──────────────────────────────────────

  private async fetchChannel(channel: YouTubeChannel): Promise<YouTubeVideoItem[]> {
    // Check cache first
    const cached = this.cache.get(channel.channelId);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.items;
    }

    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'AeroFyta-TipBot/1.0' },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn(`YouTube RSS HTTP ${response.status} for ${channel.name}`);
        // Return stale cache if available
        return cached?.items ?? [];
      }

      const xml = await response.text();
      const items = this.parseAtomFeed(xml, channel);

      // Update cache
      this.cache.set(channel.channelId, {
        items,
        fetchedAt: Date.now(),
      });

      return items;
    } catch (err) {
      clearTimeout(timeout);
      logger.warn(`YouTube RSS fetch error for ${channel.name}`, {
        error: err instanceof Error ? err.message : String(err),
      });
      // Return stale cache on failure
      return cached?.items ?? [];
    }
  }

  // ── Private: XML Parsing ──────────────────────────────────

  /**
   * Parse YouTube Atom XML feed.
   * YouTube RSS uses Atom format with <entry> elements and yt:videoId.
   * Uses simple regex parsing to avoid adding an XML dependency.
   */
  private parseAtomFeed(xml: string, channel: YouTubeChannel): YouTubeVideoItem[] {
    const items: YouTubeVideoItem[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match: RegExpExecArray | null;

    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];

      const videoId = this.extractTag(block, 'yt:videoId');
      const title = this.extractTag(block, 'title');
      const published = this.extractTag(block, 'published');
      const authorName = this.extractTag(block, 'name'); // inside <author>

      // Extract link href from <link rel="alternate" href="..."/>
      const linkMatch = /href="(https:\/\/www\.youtube\.com\/watch\?v=[^"]+)"/.exec(block);
      const link = linkMatch?.[1] ?? (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');

      if (videoId && title && published) {
        items.push({
          videoId,
          title,
          channelName: authorName ?? channel.name,
          channelId: channel.channelId,
          published,
          link,
          categories: channel.categories,
        });
      }
    }

    return items;
  }

  private extractTag(xml: string, tag: string): string | null {
    // Handle <tag>value</tag> and <tag><![CDATA[value]]></tag>
    const regex = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
    const m = regex.exec(xml);
    return m?.[1]?.trim() ?? null;
  }

  // ── Private: Engagement Scoring ───────────────────────────

  /**
   * Compute engagement quality score (0.0-1.0) from:
   * - Recency: newer videos score higher
   * - Title keywords: engagement-boosting keywords add score
   * - Posting frequency: inferred from cache (more items = active creator)
   */
  private computeEngagement(item: YouTubeVideoItem): number {
    let score = 0.5; // baseline

    // Recency bonus: videos published recently score higher
    const ageMs = Date.now() - new Date(item.published).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours < 1) score += 0.25;        // < 1 hour old
    else if (ageHours < 6) score += 0.20;    // < 6 hours
    else if (ageHours < 12) score += 0.15;   // < 12 hours
    else if (ageHours < 24) score += 0.10;   // < 24 hours
    else if (ageHours < 48) score += 0.05;   // < 48 hours

    // Keyword bonus: certain title words indicate higher engagement potential
    const titleLower = item.title.toLowerCase();
    let keywordHits = 0;
    for (const kw of ENGAGEMENT_KEYWORDS) {
      if (titleLower.includes(kw)) keywordHits++;
    }
    score += Math.min(keywordHits * 0.05, 0.15); // max 0.15 from keywords

    // Posting frequency: if cache has many items, creator is active
    const cached = this.cache.get(item.channelId);
    if (cached && cached.items.length > 0) {
      const recentCount = cached.items.filter(i => {
        const age = Date.now() - new Date(i.published).getTime();
        return age < 7 * 24 * 60 * 60 * 1000; // last 7 days
      }).length;
      if (recentCount >= 5) score += 0.10;
      else if (recentCount >= 3) score += 0.05;
    }

    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  }

  /**
   * Compute suggested tip amount based on engagement quality.
   */
  private computeTipAmount(engagementQuality: number): number {
    if (engagementQuality >= 0.8) return 0.01;
    if (engagementQuality >= 0.7) return 0.008;
    if (engagementQuality >= 0.6) return 0.005;
    return 0.003;
  }
}

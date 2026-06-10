// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
// RSS Aggregator Service — pulls from multiple free RSS/Atom feeds beyond YouTube

import { logger } from '../utils/logger.js';
import { YouTubeRSSService } from './youtube-rss.service.js';
import { YouTubeAPIService } from './youtube-api.service.js';
import type { SimulatedEvent, SimulatedEventType } from './event-simulator.service.js';

// ── RSS Source Configuration ──────────────────────────────────────

interface RSSSourceConfig {
  name: string;
  platform: 'reddit' | 'medium' | 'devto' | 'rumble';
  feedUrl: string;
  categories: string[];
  weight: number; // platform weight for engagement scoring (0-1)
}

const RSS_SOURCES: RSSSourceConfig[] = [
  // Reddit RSS — free, no API key
  { name: 'r/CryptoCurrency', platform: 'reddit', feedUrl: 'https://www.reddit.com/r/CryptoCurrency/.rss', categories: ['crypto', 'finance'], weight: 0.8 },
  { name: 'r/ethereum', platform: 'reddit', feedUrl: 'https://www.reddit.com/r/ethereum/.rss', categories: ['crypto', 'ethereum'], weight: 0.8 },
  { name: 'r/Bitcoin', platform: 'reddit', feedUrl: 'https://www.reddit.com/r/Bitcoin/.rss', categories: ['crypto', 'bitcoin'], weight: 0.7 },
  { name: 'r/defi', platform: 'reddit', feedUrl: 'https://www.reddit.com/r/defi/.rss', categories: ['crypto', 'defi'], weight: 0.9 },
  { name: 'r/web3', platform: 'reddit', feedUrl: 'https://www.reddit.com/r/web3/.rss', categories: ['crypto', 'web3'], weight: 0.7 },

  // Medium RSS — free
  { name: 'Medium/cryptocurrency', platform: 'medium', feedUrl: 'https://medium.com/feed/tag/cryptocurrency', categories: ['crypto', 'finance'], weight: 0.6 },
  { name: 'Medium/blockchain', platform: 'medium', feedUrl: 'https://medium.com/feed/tag/blockchain', categories: ['crypto', 'tech'], weight: 0.6 },
  { name: 'Medium/web3', platform: 'medium', feedUrl: 'https://medium.com/feed/tag/web3', categories: ['crypto', 'web3'], weight: 0.6 },
  { name: 'Medium/defi', platform: 'medium', feedUrl: 'https://medium.com/feed/tag/defi', categories: ['crypto', 'defi'], weight: 0.7 },

  // Dev.to RSS — free
  { name: 'Dev.to/blockchain', platform: 'devto', feedUrl: 'https://dev.to/feed/tag/blockchain', categories: ['tech', 'blockchain'], weight: 0.5 },
  { name: 'Dev.to/web3', platform: 'devto', feedUrl: 'https://dev.to/feed/tag/web3', categories: ['tech', 'web3'], weight: 0.5 },
  { name: 'Dev.to/cryptocurrency', platform: 'devto', feedUrl: 'https://dev.to/feed/tag/cryptocurrency', categories: ['crypto', 'tech'], weight: 0.5 },

  // Rumble RSS — channel feeds (may be blocked; fallback to Reddit r/rumble)
  // Rumble exposes RSS at https://rumble.com/c/{channel}/feed for public channels
  { name: 'Rumble/Bongino', platform: 'rumble', feedUrl: 'https://rumble.com/c/Bongino/feed', categories: ['news', 'politics'], weight: 0.7 },
  { name: 'Rumble/RussellBrand', platform: 'rumble', feedUrl: 'https://rumble.com/c/russellbrand/feed', categories: ['entertainment', 'news'], weight: 0.7 },
  { name: 'Rumble/Dinesh', platform: 'rumble', feedUrl: 'https://rumble.com/c/dineshdsouza/feed', categories: ['news', 'education'], weight: 0.6 },
  { name: 'Rumble/TimPool', platform: 'rumble', feedUrl: 'https://rumble.com/c/timcast/feed', categories: ['news', 'tech'], weight: 0.7 },
  { name: 'Rumble/GlennBeck', platform: 'rumble', feedUrl: 'https://rumble.com/c/GlennBeck/feed', categories: ['news', 'finance'], weight: 0.6 },

  // Rumble fallback — Reddit r/rumble RSS (always works even if Rumble RSS is blocked)
  { name: 'r/rumble', platform: 'reddit', feedUrl: 'https://www.reddit.com/r/rumble/.rss', categories: ['rumble', 'video'], weight: 0.6 },
];

// ── Parsed Feed Item ─────────────────────────────────────────────

interface FeedItem {
  id: string;
  title: string;
  author: string;
  link: string;
  published: string;
  platform: string;
  sourceName: string;
  categories: string[];
  description?: string;
}

// ── Cache Entry ──────────────────────────────────────────────────

interface SourceCache {
  items: FeedItem[];
  fetchedAt: number;
}

// ── Engagement Keywords ──────────────────────────────────────────

const ENGAGEMENT_KEYWORDS = [
  'breaking', 'exclusive', 'urgent', 'live', 'update',
  'launch', 'new', 'announcement', 'released', 'airdrop',
  'bitcoin', 'ethereum', 'defi', 'token', 'nft',
  'tutorial', 'guide', 'explained', 'deep dive',
  'tether', 'usdt', 'stablecoin', 'wdk', 'rumble',
];

// ── Service ──────────────────────────────────────────────────────

/**
 * RSSAggregatorService — aggregates events from multiple free RSS/Atom feeds.
 *
 * Sources:
 * 1. YouTube RSS (delegates to existing YouTubeRSSService)
 * 2. Reddit RSS (r/CryptoCurrency, r/ethereum, r/Bitcoin, r/defi, r/web3, r/rumble)
 * 3. Medium RSS (cryptocurrency, blockchain, web3, defi tags)
 * 4. Dev.to RSS (blockchain, web3, cryptocurrency tags)
 * 5. Rumble RSS (Bongino, RussellBrand, Dinesh, TimPool, GlennBeck channels)
 *
 * Rotates between sources each cycle to avoid hitting all at once.
 * Caches per-source for 5 minutes. Falls back to next source on failure.
 */
export class RSSAggregatorService {
  private youtubeRSS: YouTubeRSSService;
  private youtubeAPI: YouTubeAPIService;
  private cache = new Map<string, SourceCache>();
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes
  private seenIds = new Set<string>();
  private eventCounter = 0;
  private rotationIndex = 0;
  private sourcesPerCycle = 3; // fetch 3 non-YouTube sources per cycle (rotates through 18 sources)

  // Stats
  private fetchCount = 0;
  private fetchErrors = 0;
  private eventsByPlatform: Record<string, number> = {};

  constructor(youtubeRSS?: YouTubeRSSService, youtubeAPI?: YouTubeAPIService) {
    this.youtubeRSS = youtubeRSS ?? new YouTubeRSSService();
    this.youtubeAPI = youtubeAPI ?? new YouTubeAPIService();
    logger.info('RSS aggregator initialized', {
      youtubeAPI: this.youtubeAPI.isAvailable() ? 'enabled (real stats)' : 'disabled',
      youtubeRSS: 'fallback',
      additionalSources: RSS_SOURCES.length,
    });
  }

  /** Get the YouTube API service instance (for routes/status). */
  getYouTubeAPI(): YouTubeAPIService {
    return this.youtubeAPI;
  }

  // ── Public API ────────────────────────────────────────────────

  /**
   * Get new events from all sources in SimulatedEvent format.
   * Rotates through non-YouTube sources each call.
   * YouTube is always checked first (it's the primary source).
   */
  async getNewEvents(sinceTimestamp: string): Promise<SimulatedEvent[]> {
    const allEvents: SimulatedEvent[] = [];
    let youtubeHandled = false;

    // 1. HIGHEST PRIORITY: YouTube Data API (real stats: views, likes, comments)
    if (this.youtubeAPI.isAvailable()) {
      try {
        const sinceMs = new Date(sinceTimestamp).getTime();
        const ytApiEvents = await this.youtubeAPI.getCreatorEvents(sinceMs);
        if (ytApiEvents.length > 0) {
          allEvents.push(...ytApiEvents);
          youtubeHandled = true;
          logger.debug('RSS aggregator: used YouTube Data API (real stats)', { count: ytApiEvents.length });
        }
      } catch (err) {
        logger.warn('RSS aggregator: YouTube Data API failed, falling back to RSS', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 2. Fallback: YouTube RSS (no stats, just titles/dates)
    if (!youtubeHandled) {
      try {
        const ytEvents = await this.youtubeRSS.getNewEvents(sinceTimestamp);
        if (ytEvents.length > 0) {
          for (const evt of ytEvents) {
            (evt.data as Record<string, unknown>).aggregatorSource = 'youtube';
          }
          allEvents.push(...ytEvents);
        }
      } catch (err) {
        logger.warn('RSS aggregator: YouTube RSS failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 2. Rotate through other sources (pick `sourcesPerCycle` each time)
    const sources = this.getRotatedSources();
    for (const source of sources) {
      try {
        const items = await this.fetchSource(source);
        const events = this.convertToEvents(items, sinceTimestamp);
        allEvents.push(...events);
      } catch (err) {
        this.fetchErrors++;
        logger.warn(`RSS aggregator: ${source.name} failed`, {
          error: err instanceof Error ? err.message : String(err),
        });
        // Fall through to next source
      }
    }

    // Sort by engagement quality descending
    allEvents.sort((a, b) => b.engagementQuality - a.engagementQuality);

    if (allEvents.length > 0) {
      logger.info('RSS aggregator produced events', {
        total: allEvents.length,
        sources: [...new Set(allEvents.map(e => (e.data as Record<string, unknown>).aggregatorSource))],
      });
    }

    return allEvents;
  }

  /**
   * Get the latest cached data from all RSS sources for the /api/creators/feeds endpoint.
   */
  getFeedsSummary(): {
    sources: Array<{
      name: string;
      platform: string;
      categories: string[];
      itemCount: number;
      lastFetchedAt: string | null;
      recentItems: Array<{ title: string; author: string; link: string; published: string }>;
    }>;
    youtube: ReturnType<YouTubeRSSService['getLiveCreatorData']>;
    stats: {
      totalFetches: number;
      totalErrors: number;
      eventsByPlatform: Record<string, number>;
      cacheEntries: number;
    };
  } {
    const sources = RSS_SOURCES.map(source => {
      const cached = this.cache.get(source.feedUrl);
      return {
        name: source.name,
        platform: source.platform,
        categories: source.categories,
        itemCount: cached?.items.length ?? 0,
        lastFetchedAt: cached ? new Date(cached.fetchedAt).toISOString() : null,
        recentItems: (cached?.items ?? []).slice(0, 5).map(item => ({
          title: item.title,
          author: item.author,
          link: item.link,
          published: item.published,
        })),
      };
    });

    return {
      sources,
      youtube: this.youtubeRSS.getLiveCreatorData(),
      stats: {
        totalFetches: this.fetchCount,
        totalErrors: this.fetchErrors,
        eventsByPlatform: { ...this.eventsByPlatform },
        cacheEntries: this.cache.size,
      },
    };
  }

  // ── Private: Source Rotation ────────────────────────────────

  private getRotatedSources(): RSSSourceConfig[] {
    const count = Math.min(this.sourcesPerCycle, RSS_SOURCES.length);
    const selected: RSSSourceConfig[] = [];

    for (let i = 0; i < count; i++) {
      const idx = (this.rotationIndex + i) % RSS_SOURCES.length;
      selected.push(RSS_SOURCES[idx]);
    }

    this.rotationIndex = (this.rotationIndex + count) % RSS_SOURCES.length;
    return selected;
  }

  // ── Private: Fetching ──────────────────────────────────────

  private async fetchSource(source: RSSSourceConfig): Promise<FeedItem[]> {
    // Check cache
    const cached = this.cache.get(source.feedUrl);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.items;
    }

    this.fetchCount++;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(source.feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AeroFyta-TipBot/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn(`RSS fetch HTTP ${response.status} for ${source.name}`);
        return cached?.items ?? [];
      }

      const xml = await response.text();
      const items = this.parseRSSFeed(xml, source);

      this.cache.set(source.feedUrl, { items, fetchedAt: Date.now() });
      return items;
    } catch (err) {
      clearTimeout(timeout);
      logger.warn(`RSS fetch error for ${source.name}`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return cached?.items ?? [];
    }
  }

  // ── Private: XML Parsing ───────────────────────────────────

  /**
   * Parse RSS 2.0 or Atom feed XML using regex (no XML dependency).
   * Reddit uses Atom, Medium uses RSS 2.0, Dev.to uses RSS 2.0.
   */
  private parseRSSFeed(xml: string, source: RSSSourceConfig): FeedItem[] {
    // Try Atom format first (<entry> elements) — used by Reddit
    const atomEntries = this.parseAtomEntries(xml, source);
    if (atomEntries.length > 0) return atomEntries;

    // Fall back to RSS 2.0 format (<item> elements) — used by Medium, Dev.to
    return this.parseRSSItems(xml, source);
  }

  private parseAtomEntries(xml: string, source: RSSSourceConfig): FeedItem[] {
    const items: FeedItem[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match: RegExpExecArray | null;

    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];

      const id = this.extractTag(block, 'id') ?? `${source.platform}_${Date.now()}_${items.length}`;
      const title = this.extractTag(block, 'title') ?? '';
      const published = this.extractTag(block, 'published') ?? this.extractTag(block, 'updated') ?? '';
      const author = this.extractTag(block, 'name') ?? source.name;

      // Extract link href
      const linkMatch = /href="([^"]+)"/.exec(block);
      const link = linkMatch?.[1] ?? '';

      // Extract content/summary for description
      const description = this.extractTag(block, 'content') ?? this.extractTag(block, 'summary') ?? '';

      if (title) {
        items.push({
          id: `${source.platform}_${this.hashString(id)}`,
          title: this.decodeHtmlEntities(title),
          author: this.decodeHtmlEntities(author),
          link,
          published,
          platform: source.platform,
          sourceName: source.name,
          categories: source.categories,
          description: description.slice(0, 200),
        });
      }
    }

    return items;
  }

  private parseRSSItems(xml: string, source: RSSSourceConfig): FeedItem[] {
    const items: FeedItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];

      const title = this.extractTag(block, 'title') ?? '';
      const link = this.extractTag(block, 'link') ?? '';
      const pubDate = this.extractTag(block, 'pubDate') ?? '';
      const author = this.extractTag(block, 'dc:creator') ?? this.extractTag(block, 'author') ?? source.name;
      const guid = this.extractTag(block, 'guid') ?? link;
      const description = this.extractTag(block, 'description') ?? '';

      if (title) {
        items.push({
          id: `${source.platform}_${this.hashString(guid || link || title)}`,
          title: this.decodeHtmlEntities(title),
          author: this.decodeHtmlEntities(author),
          link,
          published: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          platform: source.platform,
          sourceName: source.name,
          categories: source.categories,
          description: description.replace(/<[^>]*>/g, '').slice(0, 200),
        });
      }
    }

    return items;
  }

  private extractTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
    const m = regex.exec(xml);
    return m?.[1]?.trim() ?? null;
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  // ── Private: Event Conversion ──────────────────────────────

  private convertToEvents(items: FeedItem[], sinceTimestamp: string): SimulatedEvent[] {
    const cutoff = new Date(sinceTimestamp).getTime();
    const maxAge = 48 * 60 * 60 * 1000; // 48 hours
    const events: SimulatedEvent[] = [];

    for (const item of items) {
      // Skip already-seen
      if (this.seenIds.has(item.id)) continue;

      const publishedTime = new Date(item.published).getTime();
      if (isNaN(publishedTime)) continue;

      const isRecent = Date.now() - publishedTime < maxAge;
      const isNew = publishedTime > cutoff;

      if (!isRecent && !isNew) continue;

      this.seenIds.add(item.id);

      // Trim seen set
      if (this.seenIds.size > 3000) {
        const arr = [...this.seenIds];
        this.seenIds = new Set(arr.slice(-1500));
      }

      const engagementQuality = this.computeEngagement(item);
      const suggestedTipAmount = this.computeTipAmount(engagementQuality);

      const event: SimulatedEvent = {
        id: `rss_${++this.eventCounter}_${Date.now()}`,
        type: 'creator.content_uploaded' as SimulatedEventType,
        timestamp: new Date().toISOString(),
        creatorId: `${item.platform}_${this.hashString(item.author)}`,
        creatorName: item.author,
        data: {
          source: `rss_${item.platform}`,
          aggregatorSource: item.platform,
          platform: item.platform,
          sourceFeed: item.sourceName,
          title: item.title,
          url: item.link,
          publishedAt: item.published,
          category: item.categories[0] ?? 'crypto',
          contentType: 'article',
        },
        engagementQuality,
        isMilestone: false,
        suggestedTipAmount,
      };

      events.push(event);

      // Track platform stats
      this.eventsByPlatform[item.platform] = (this.eventsByPlatform[item.platform] ?? 0) + 1;
    }

    return events;
  }

  // ── Private: Engagement Scoring ────────────────────────────

  private computeEngagement(item: FeedItem): number {
    let score = 0.4; // baseline slightly lower than YouTube

    // Recency bonus
    const ageMs = Date.now() - new Date(item.published).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < 1) score += 0.25;
    else if (ageHours < 6) score += 0.20;
    else if (ageHours < 12) score += 0.15;
    else if (ageHours < 24) score += 0.10;
    else if (ageHours < 48) score += 0.05;

    // Keyword relevance
    const titleLower = item.title.toLowerCase();
    let keywordHits = 0;
    for (const kw of ENGAGEMENT_KEYWORDS) {
      if (titleLower.includes(kw)) keywordHits++;
    }
    score += Math.min(keywordHits * 0.05, 0.15);

    // Platform weight (Reddit > Medium > Dev.to for crypto content)
    const sourceConfig = RSS_SOURCES.find(s => s.feedUrl === item.link) ??
      RSS_SOURCES.find(s => s.name === item.sourceName);
    if (sourceConfig) {
      score += sourceConfig.weight * 0.1;
    }

    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  }

  private computeTipAmount(engagementQuality: number): number {
    if (engagementQuality >= 0.8) return 0.01;
    if (engagementQuality >= 0.7) return 0.008;
    if (engagementQuality >= 0.6) return 0.005;
    return 0.003;
  }
}

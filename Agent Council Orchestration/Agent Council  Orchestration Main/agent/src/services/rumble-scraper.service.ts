// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Real Rumble Platform Integration
// Fetches live creator data from Rumble.com public pages and RSS feeds.

import { logger } from '../utils/logger.js';

// ── Types ───────────────────────────────────────────────────────

export interface RumbleCreatorProfile {
  channelName: string;
  channelSlug: string;
  subscriberCount: number;
  videoCount: number;
  totalViews: number;
  recentVideos: RumbleVideo[];
  fetchedAt: string;
  source: 'rss' | 'html' | 'demo';
}

export interface RumbleVideo {
  title: string;
  url: string;
  publishedAt: string;
  description: string;
  duration?: string;
}

interface CacheEntry {
  profile: RumbleCreatorProfile;
  expiresAt: number;
}

// ── Default Creators ────────────────────────────────────────────

const DEFAULT_CREATORS = ['Bongino', 'TimPool', 'RussellBrand', 'GlennBeck'];

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Demo fallback data ──────────────────────────────────────────

function getDemoProfile(slug: string): RumbleCreatorProfile {
  const demos: Record<string, Partial<RumbleCreatorProfile>> = {
    bongino: {
      channelName: 'Dan Bongino',
      subscriberCount: 2_340_000,
      videoCount: 1_850,
      totalViews: 412_000_000,
      recentVideos: [
        { title: 'The Dan Bongino Show — LIVE', url: `https://rumble.com/c/Bongino`, publishedAt: new Date().toISOString(), description: 'Daily political commentary' },
        { title: 'Biden Admin Caught Lying Again', url: `https://rumble.com/c/Bongino`, publishedAt: new Date(Date.now() - 86400000).toISOString(), description: 'Breaking news analysis' },
        { title: 'The Real Story Behind the Headlines', url: `https://rumble.com/c/Bongino`, publishedAt: new Date(Date.now() - 172800000).toISOString(), description: 'Deep dive investigative report' },
      ],
    },
    timpool: {
      channelName: 'Tim Pool',
      subscriberCount: 1_650_000,
      videoCount: 3_200,
      totalViews: 890_000_000,
      recentVideos: [
        { title: 'Timcast IRL — Tonight\'s Show', url: `https://rumble.com/c/TimPool`, publishedAt: new Date().toISOString(), description: 'Live discussion panel' },
        { title: 'Media PANICS Over New Poll Numbers', url: `https://rumble.com/c/TimPool`, publishedAt: new Date(Date.now() - 86400000).toISOString(), description: 'Political analysis' },
        { title: 'Culture War Update — What They Don\'t Want You To Know', url: `https://rumble.com/c/TimPool`, publishedAt: new Date(Date.now() - 172800000).toISOString(), description: 'Cultural commentary' },
      ],
    },
    russellbrand: {
      channelName: 'Russell Brand',
      subscriberCount: 1_430_000,
      videoCount: 1_100,
      totalViews: 320_000_000,
      recentVideos: [
        { title: 'Stay Free — Russell Brand', url: `https://rumble.com/c/RussellBrand`, publishedAt: new Date().toISOString(), description: 'Daily freedom talk' },
        { title: 'The System Is Rigged — Here\'s How', url: `https://rumble.com/c/RussellBrand`, publishedAt: new Date(Date.now() - 86400000).toISOString(), description: 'Systemic analysis' },
      ],
    },
    glennbeck: {
      channelName: 'Glenn Beck',
      subscriberCount: 980_000,
      videoCount: 2_600,
      totalViews: 560_000_000,
      recentVideos: [
        { title: 'The Glenn Beck Program', url: `https://rumble.com/c/GlennBeck`, publishedAt: new Date().toISOString(), description: 'Daily radio show' },
        { title: 'Exposing the Deep State', url: `https://rumble.com/c/GlennBeck`, publishedAt: new Date(Date.now() - 86400000).toISOString(), description: 'Investigation series' },
      ],
    },
  };

  const key = slug.toLowerCase();
  const demo = demos[key];
  return {
    channelName: demo?.channelName ?? slug,
    channelSlug: slug,
    subscriberCount: demo?.subscriberCount ?? 50_000,
    videoCount: demo?.videoCount ?? 200,
    totalViews: demo?.totalViews ?? 10_000_000,
    recentVideos: demo?.recentVideos ?? [
      { title: `Latest from ${slug}`, url: `https://rumble.com/c/${slug}`, publishedAt: new Date().toISOString(), description: 'Recent upload' },
    ],
    fetchedAt: new Date().toISOString(),
    source: 'demo',
  };
}

// ── RSS XML helpers (lightweight, no dependency) ────────────────

function extractTag(xml: string, tag: string): string {
  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;
  // Also handle CDATA
  const cdataOpen = `<${tag}><![CDATA[`;
  const cdataClose = `]]></${tag}>`;

  const cdataIdx = xml.indexOf(cdataOpen);
  if (cdataIdx !== -1) {
    const start = cdataIdx + cdataOpen.length;
    const end = xml.indexOf(cdataClose, start);
    if (end !== -1) return xml.slice(start, end).trim();
  }

  const idx = xml.indexOf(openTag);
  if (idx === -1) return '';
  const start = idx + openTag.length;
  const end = xml.indexOf(closeTag, start);
  if (end === -1) return '';
  return xml.slice(start, end).trim();
}

function extractAllItems(xml: string): string[] {
  const items: string[] = [];
  let searchFrom = 0;
  while (true) {
    const start = xml.indexOf('<item>', searchFrom);
    if (start === -1) break;
    const end = xml.indexOf('</item>', start);
    if (end === -1) break;
    items.push(xml.slice(start, end + '</item>'.length));
    searchFrom = end + '</item>'.length;
  }
  return items;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

// ── HTML extraction helpers ─────────────────────────────────────

function extractSubscriberCountFromHtml(html: string): number {
  // Look for patterns like "1.23M subscribers" or "456K subscribers"
  const patterns = [
    /(\d+(?:\.\d+)?)\s*M\s*(?:followers|subscribers|Followers|Subscribers)/i,
    /(\d+(?:\.\d+)?)\s*K\s*(?:followers|subscribers|Followers|Subscribers)/i,
    /(\d[\d,]+)\s*(?:followers|subscribers|Followers|Subscribers)/i,
    /"subscribers"\s*:\s*(\d+)/,
    /"followers"\s*:\s*(\d+)/,
  ];

  for (const pat of patterns) {
    const match = html.match(pat);
    if (match) {
      const raw = match[1].replace(/,/g, '');
      const num = parseFloat(raw);
      if (html.match(new RegExp(raw + '\\s*M', 'i'))) return Math.round(num * 1_000_000);
      if (html.match(new RegExp(raw + '\\s*K', 'i'))) return Math.round(num * 1_000);
      return Math.round(num);
    }
  }
  return 0;
}

function extractVideoCountFromHtml(html: string): number {
  const patterns = [
    /(\d[\d,]+)\s*(?:videos|Videos)/i,
    /"videoCount"\s*:\s*(\d+)/,
    /"video_count"\s*:\s*(\d+)/,
  ];

  for (const pat of patterns) {
    const match = html.match(pat);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
  }
  return 0;
}

function extractTotalViewsFromHtml(html: string): number {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*B\s*(?:views|Views)/i,
    /(\d+(?:\.\d+)?)\s*M\s*(?:views|Views)/i,
    /(\d+(?:\.\d+)?)\s*K\s*(?:views|Views)/i,
    /(\d[\d,]+)\s*(?:views|Views)/i,
  ];

  for (const pat of patterns) {
    const match = html.match(pat);
    if (match) {
      const raw = match[1].replace(/,/g, '');
      const num = parseFloat(raw);
      if (/B\s*(?:views|Views)/i.test(match[0])) return Math.round(num * 1_000_000_000);
      if (/M\s*(?:views|Views)/i.test(match[0])) return Math.round(num * 1_000_000);
      if (/K\s*(?:views|Views)/i.test(match[0])) return Math.round(num * 1_000);
      return Math.round(num);
    }
  }
  return 0;
}

function extractChannelNameFromHtml(html: string): string {
  // Try og:title meta tag
  const ogMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/);
  if (ogMatch) return stripHtml(ogMatch[1]);

  // Try <title> tag
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    const title = titleMatch[1].replace(/\s*[-|].*Rumble.*$/i, '').trim();
    if (title.length > 0) return title;
  }

  return '';
}

// ── Service Class ───────────────────────────────────────────────

/**
 * RumbleScraperService — Fetches REAL creator data from Rumble.com.
 *
 * Data sources (in priority order):
 * 1. RSS feed at https://rumble.com/c/{channel}/feed
 * 2. Public HTML page at https://rumble.com/c/{channel}
 * 3. Demo fallback data (never crashes)
 *
 * Results are cached for 5 minutes to avoid rate limiting.
 */
export class RumbleScraperService {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultCreators: string[];
  private _initialized = false;
  private _startupProfiles: Map<string, RumbleCreatorProfile> = new Map();

  constructor(creators: string[] = DEFAULT_CREATORS) {
    this.defaultCreators = creators;
  }

  // ── Public API ──────────────────────────────────────────────────

  /** Initialize by fetching all default creators (non-blocking) */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;

    logger.info(`RumbleScraperService: initializing with ${this.defaultCreators.length} default creators`);

    // Fetch all default creators in parallel, never throw
    const results = await Promise.allSettled(
      this.defaultCreators.map((slug) => this.fetchCreatorProfile(slug)),
    );

    let liveCount = 0;
    let demoCount = 0;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        this._startupProfiles.set(this.defaultCreators[i], result.value);
        if (result.value.source !== 'demo') liveCount++;
        else demoCount++;
      } else {
        demoCount++;
        this._startupProfiles.set(this.defaultCreators[i], getDemoProfile(this.defaultCreators[i]));
      }
    }

    logger.info(`RumbleScraperService: initialized — ${liveCount} live, ${demoCount} demo fallback`);
  }

  /** Fetch a single creator profile (cached, with fallback) */
  async fetchCreatorProfile(channelSlug: string): Promise<RumbleCreatorProfile> {
    // Check cache
    const cached = this.cache.get(channelSlug.toLowerCase());
    if (cached && cached.expiresAt > Date.now()) {
      return cached.profile;
    }

    try {
      // Strategy 1: Try RSS feed first (most reliable, structured data)
      const rssProfile = await this.fetchFromRSS(channelSlug);
      if (rssProfile) {
        // Strategy 2: Augment with HTML page for subscriber count & view totals
        const htmlData = await this.fetchFromHTML(channelSlug);
        if (htmlData) {
          if (htmlData.subscriberCount > 0) rssProfile.subscriberCount = htmlData.subscriberCount;
          if (htmlData.videoCount > 0) rssProfile.videoCount = htmlData.videoCount;
          if (htmlData.totalViews > 0) rssProfile.totalViews = htmlData.totalViews;
          if (htmlData.channelName) rssProfile.channelName = htmlData.channelName;
        }
        this.cacheProfile(channelSlug, rssProfile);
        return rssProfile;
      }

      // Strategy 3: HTML-only fallback
      const htmlProfile = await this.fetchFromHTML(channelSlug);
      if (htmlProfile) {
        const profile: RumbleCreatorProfile = {
          channelName: htmlProfile.channelName || channelSlug,
          channelSlug,
          subscriberCount: htmlProfile.subscriberCount,
          videoCount: htmlProfile.videoCount,
          totalViews: htmlProfile.totalViews,
          recentVideos: [],
          fetchedAt: new Date().toISOString(),
          source: 'html',
        };
        this.cacheProfile(channelSlug, profile);
        return profile;
      }
    } catch (err) {
      logger.warn(`RumbleScraperService: all fetch strategies failed for ${channelSlug}`, { error: String(err) });
    }

    // Final fallback: demo data
    const demo = getDemoProfile(channelSlug);
    this.cacheProfile(channelSlug, demo);
    return demo;
  }

  /** Get all startup profiles (available after initialize) */
  getStartupProfiles(): Map<string, RumbleCreatorProfile> {
    return this._startupProfiles;
  }

  /** Get cached profile for a creator (or null) */
  getCachedProfile(channelSlug: string): RumbleCreatorProfile | null {
    const cached = this.cache.get(channelSlug.toLowerCase());
    if (cached && cached.expiresAt > Date.now()) return cached.profile;
    return this._startupProfiles.get(channelSlug) ?? null;
  }

  /** Get all default creator slugs */
  getDefaultCreators(): string[] {
    return [...this.defaultCreators];
  }

  /** Check if the service has been initialized */
  isInitialized(): boolean {
    return this._initialized;
  }

  /** Get stats for logging */
  getStats(): { cached: number; defaults: number; initialized: boolean } {
    return {
      cached: this.cache.size,
      defaults: this.defaultCreators.length,
      initialized: this._initialized,
    };
  }

  // ── Private fetch methods ─────────────────────────────────────

  /** Fetch creator data from Rumble RSS feed */
  private async fetchFromRSS(channelSlug: string): Promise<RumbleCreatorProfile | null> {
    const url = `https://rumble.com/c/${channelSlug}/feed`;
    logger.info(`RumbleScraperService: fetching RSS from ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AeroFyta/1.0 (RSS Reader; +https://github.com/aerofyta)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        logger.warn(`RumbleScraperService: RSS returned ${response.status} for ${channelSlug}`);
        return null;
      }

      const xml = await response.text();

      // Validate it's actually XML/RSS
      if (!xml.includes('<rss') && !xml.includes('<channel') && !xml.includes('<feed')) {
        logger.warn(`RumbleScraperService: response is not valid RSS for ${channelSlug}`);
        return null;
      }

      // Parse channel info
      const channelName = extractTag(xml, 'title') || channelSlug;

      // Parse items
      const items = extractAllItems(xml);
      const recentVideos: RumbleVideo[] = items.slice(0, 10).map((item) => ({
        title: stripHtml(extractTag(item, 'title')) || 'Untitled',
        url: extractTag(item, 'link') || `https://rumble.com/c/${channelSlug}`,
        publishedAt: extractTag(item, 'pubDate') || new Date().toISOString(),
        description: stripHtml(extractTag(item, 'description')).slice(0, 200) || '',
        duration: extractTag(item, 'itunes:duration') || undefined,
      }));

      const profile: RumbleCreatorProfile = {
        channelName: stripHtml(channelName),
        channelSlug,
        subscriberCount: 0, // RSS doesn't have subscriber count — HTML augments this
        videoCount: items.length, // RSS gives us at least the feed item count
        totalViews: 0, // Not in RSS
        recentVideos,
        fetchedAt: new Date().toISOString(),
        source: 'rss',
      };

      logger.info(`RumbleScraperService: RSS success for ${channelSlug} — ${recentVideos.length} videos found`);
      return profile;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Don't warn on timeout — expected for some channels
      if (errMsg.includes('abort') || errMsg.includes('timeout')) {
        logger.info(`RumbleScraperService: RSS timeout for ${channelSlug}`);
      } else {
        logger.warn(`RumbleScraperService: RSS fetch failed for ${channelSlug}`, { error: errMsg });
      }
      return null;
    }
  }

  /** Fetch creator data from Rumble HTML page */
  private async fetchFromHTML(channelSlug: string): Promise<{
    channelName: string;
    subscriberCount: number;
    videoCount: number;
    totalViews: number;
  } | null> {
    const url = `https://rumble.com/c/${channelSlug}`;
    logger.info(`RumbleScraperService: fetching HTML from ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        logger.warn(`RumbleScraperService: HTML returned ${response.status} for ${channelSlug}`);
        return null;
      }

      const html = await response.text();

      const channelName = extractChannelNameFromHtml(html);
      const subscriberCount = extractSubscriberCountFromHtml(html);
      const videoCount = extractVideoCountFromHtml(html);
      const totalViews = extractTotalViewsFromHtml(html);

      logger.info(`RumbleScraperService: HTML success for ${channelSlug}`, {
        channelName: channelName || '(not found)',
        subscriberCount,
        videoCount,
        totalViews,
      });

      return { channelName, subscriberCount, videoCount, totalViews };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('abort') || errMsg.includes('timeout')) {
        logger.info(`RumbleScraperService: HTML timeout for ${channelSlug}`);
      } else {
        logger.warn(`RumbleScraperService: HTML fetch failed for ${channelSlug}`, { error: errMsg });
      }
      return null;
    }
  }

  /** Store a profile in cache */
  private cacheProfile(channelSlug: string, profile: RumbleCreatorProfile): void {
    this.cache.set(channelSlug.toLowerCase(), {
      profile,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }
}

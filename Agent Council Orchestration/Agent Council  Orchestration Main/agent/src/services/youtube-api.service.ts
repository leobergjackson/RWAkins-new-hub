// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
// YouTube Data API v3 Service — fetches REAL video data (views, likes, comments)

import { logger } from '../utils/logger.js';
import type { SimulatedEvent, SimulatedEventType } from './event-simulator.service.js';

// ── Interfaces ─────────────────────────────────────────────────────

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string;
}

export interface YouTubeChannelInfo {
  channelId: string;
  title: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

export interface VideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
}

// ── Channel Registry (same as youtube-rss.service.ts) ──────────────

const CHANNEL_IDS = [
  { channelId: 'UCBJycsmduvYEL83R_U4JriQ', name: 'MKBHD', categories: ['tech', 'reviews'] },
  { channelId: 'UCXuqSBlHAE6Xw-yeJA0Tunw', name: 'Linus Tech Tips', categories: ['tech', 'entertainment'] },
  { channelId: 'UCqK_GSMbpiV8spgD3ZGloSw', name: 'Coin Bureau', categories: ['crypto', 'finance'] },
  { channelId: 'UCnUYZLuoy1rq1aVMwx4piYg', name: 'Jeff Geerling', categories: ['tech', 'education'] },
  { channelId: 'UC0vBXGSyV14uvJ4hECDOl0Q', name: 'Techquickie', categories: ['tech', 'education'] },
  { channelId: 'UCvjgXvBlbQiAffPfJHNfBCA', name: 'Finematics', categories: ['crypto', 'education'] },
  { channelId: 'UCRvqjQPSeaWn-uEx-w0XOIg', name: 'CryptosRUs', categories: ['crypto', 'finance'] },
  { channelId: 'UCJ5v_MCY6GNUBTO8-D3XoAg', name: 'WIRED', categories: ['tech', 'science'] },
];

// ── Service ────────────────────────────────────────────────────────

/**
 * YouTubeAPIService — YouTube Data API v3 integration.
 *
 * Fetches real video statistics (views, likes, comments) and channel data.
 * Requires YOUTUBE_API_KEY env var. Falls back gracefully when unavailable.
 * Caches results for 5 minutes to conserve the 10,000 quota-unit daily limit.
 */
export class YouTubeAPIService {
  private apiKey: string | null;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  private cache = new Map<string, { data: unknown; expiry: number }>();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Quota tracking (approximate — YouTube API costs vary by endpoint)
  private quotaUsed = 0;
  private quotaResetAt: number;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || null;
    // YouTube quota resets daily at midnight Pacific Time
    this.quotaResetAt = this.getNextMidnightPT();
    if (this.apiKey) {
      logger.info('YouTube Data API v3 initialized (API key present)');
    } else {
      logger.info('YouTube Data API v3 not available (no YOUTUBE_API_KEY)');
    }
  }

  /** Whether the API key is configured and the service is usable. */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /** Get approximate quota used this period. */
  getQuotaUsed(): number {
    this.maybeResetQuota();
    return this.quotaUsed;
  }

  // ── Search Videos ─────────────────────────────────────────────

  /**
   * Search for videos by query. Costs ~100 quota units per call.
   */
  async searchVideos(query: string, maxResults: number = 5): Promise<YouTubeVideo[]> {
    if (!this.apiKey) return [];

    const cacheKey = `search:${query}:${maxResults}`;
    const cached = this.getCache<YouTubeVideo[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: String(Math.min(maxResults, 25)),
        key: this.apiKey,
      });

      const data = await this.fetchAPI(`/search?${params}`);
      this.quotaUsed += 100;

      if (!data?.items?.length) return [];

      // Get video IDs to fetch statistics
      const videoIds = data.items.map((item: any) => item.id?.videoId).filter(Boolean);
      const stats = videoIds.length > 0 ? await this.getMultipleVideoStats(videoIds) : {};

      const videos: YouTubeVideo[] = data.items
        .filter((item: any) => item.id?.videoId)
        .map((item: any) => {
          const videoId = item.id.videoId;
          const s = stats[videoId];
          return {
            videoId,
            title: item.snippet?.title ?? '',
            channelId: item.snippet?.channelId ?? '',
            channelTitle: item.snippet?.channelTitle ?? '',
            publishedAt: item.snippet?.publishedAt ?? '',
            description: (item.snippet?.description ?? '').slice(0, 300),
            viewCount: s?.viewCount ?? 0,
            likeCount: s?.likeCount ?? 0,
            commentCount: s?.commentCount ?? 0,
            thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
          };
        });

      this.setCache(cacheKey, videos);
      return videos;
    } catch (err) {
      logger.warn('YouTube API searchVideos failed', { error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  }

  // ── Channel Details ───────────────────────────────────────────

  /**
   * Get channel details by ID. Costs ~1 quota unit.
   */
  async getChannelDetails(channelId: string): Promise<YouTubeChannelInfo | null> {
    if (!this.apiKey) return null;

    const cacheKey = `channel:${channelId}`;
    const cached = this.getCache<YouTubeChannelInfo>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        part: 'statistics,snippet',
        id: channelId,
        key: this.apiKey,
      });

      const data = await this.fetchAPI(`/channels?${params}`);
      this.quotaUsed += 1;

      const item = data?.items?.[0];
      if (!item) return null;

      const channel: YouTubeChannelInfo = {
        channelId: item.id,
        title: item.snippet?.title ?? '',
        subscriberCount: parseInt(item.statistics?.subscriberCount ?? '0', 10),
        videoCount: parseInt(item.statistics?.videoCount ?? '0', 10),
        viewCount: parseInt(item.statistics?.viewCount ?? '0', 10),
      };

      this.setCache(cacheKey, channel);
      return channel;
    } catch (err) {
      logger.warn('YouTube API getChannelDetails failed', { error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }

  // ── Video Statistics ──────────────────────────────────────────

  /**
   * Get statistics for a single video. Costs ~1 quota unit.
   */
  async getVideoStats(videoId: string): Promise<VideoStats | null> {
    if (!this.apiKey) return null;

    const cacheKey = `video:${videoId}`;
    const cached = this.getCache<VideoStats>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        part: 'statistics',
        id: videoId,
        key: this.apiKey,
      });

      const data = await this.fetchAPI(`/videos?${params}`);
      this.quotaUsed += 1;

      const item = data?.items?.[0];
      if (!item) return null;

      const stats: VideoStats = {
        viewCount: parseInt(item.statistics?.viewCount ?? '0', 10),
        likeCount: parseInt(item.statistics?.likeCount ?? '0', 10),
        commentCount: parseInt(item.statistics?.commentCount ?? '0', 10),
        favoriteCount: parseInt(item.statistics?.favoriteCount ?? '0', 10),
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (err) {
      logger.warn('YouTube API getVideoStats failed', { error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }

  // ── Channel Videos ────────────────────────────────────────────

  /**
   * Get latest videos from a channel. Costs ~100 quota units (search endpoint).
   */
  async getChannelVideos(channelId: string, maxResults: number = 5): Promise<YouTubeVideo[]> {
    if (!this.apiKey) return [];

    const cacheKey = `channelVideos:${channelId}:${maxResults}`;
    const cached = this.getCache<YouTubeVideo[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        part: 'snippet',
        channelId,
        type: 'video',
        order: 'date',
        maxResults: String(Math.min(maxResults, 25)),
        key: this.apiKey,
      });

      const data = await this.fetchAPI(`/search?${params}`);
      this.quotaUsed += 100;

      if (!data?.items?.length) return [];

      const videoIds = data.items.map((item: any) => item.id?.videoId).filter(Boolean);
      const stats = videoIds.length > 0 ? await this.getMultipleVideoStats(videoIds) : {};

      const videos: YouTubeVideo[] = data.items
        .filter((item: any) => item.id?.videoId)
        .map((item: any) => {
          const videoId = item.id.videoId;
          const s = stats[videoId];
          return {
            videoId,
            title: item.snippet?.title ?? '',
            channelId: item.snippet?.channelId ?? channelId,
            channelTitle: item.snippet?.channelTitle ?? '',
            publishedAt: item.snippet?.publishedAt ?? '',
            description: (item.snippet?.description ?? '').slice(0, 300),
            viewCount: s?.viewCount ?? 0,
            likeCount: s?.likeCount ?? 0,
            commentCount: s?.commentCount ?? 0,
            thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
          };
        });

      this.setCache(cacheKey, videos);
      return videos;
    } catch (err) {
      logger.warn('YouTube API getChannelVideos failed', { error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  }

  // ── Trending Creator Content ──────────────────────────────────

  /**
   * Get trending crypto/tech videos from registered channels.
   * Fetches latest video from each channel and sorts by engagement.
   */
  async getTrendingCreatorContent(): Promise<YouTubeVideo[]> {
    if (!this.apiKey) return [];

    const cacheKey = 'trending:creators';
    const cached = this.getCache<YouTubeVideo[]>(cacheKey);
    if (cached) return cached;

    const allVideos: YouTubeVideo[] = [];

    // Fetch 2 latest videos from each channel (limits quota usage)
    for (const ch of CHANNEL_IDS) {
      try {
        const videos = await this.getChannelVideos(ch.channelId, 2);
        allVideos.push(...videos);
      } catch {
        // Skip failed channels
      }
    }

    // Sort by engagement (likes + comments weighted)
    allVideos.sort((a, b) => {
      const scoreA = a.likeCount * 2 + a.commentCount * 3 + a.viewCount * 0.001;
      const scoreB = b.likeCount * 2 + b.commentCount * 3 + b.viewCount * 0.001;
      return scoreB - scoreA;
    });

    const trending = allVideos.slice(0, 10);
    this.setCache(cacheKey, trending);
    return trending;
  }

  // ── Convert to SimulatedEvent format ──────────────────────────

  /**
   * Convert YouTube API data to SimulatedEvent format for the autonomous loop.
   * This replaces the RSS-based events with real statistics.
   */
  async getCreatorEvents(sinceTimestamp?: number): Promise<SimulatedEvent[]> {
    if (!this.apiKey) return [];

    const cacheKey = `creatorEvents:${sinceTimestamp ?? 0}`;
    const cached = this.getCache<SimulatedEvent[]>(cacheKey);
    if (cached) return cached;

    const events: SimulatedEvent[] = [];
    const cutoff = sinceTimestamp ?? (Date.now() - 48 * 60 * 60 * 1000);
    let eventCounter = 0;

    for (const ch of CHANNEL_IDS) {
      try {
        const videos = await this.getChannelVideos(ch.channelId, 3);
        const channelInfo = await this.getChannelDetails(ch.channelId);
        const subscriberCount = channelInfo?.subscriberCount ?? 1;

        for (const video of videos) {
          const publishedTime = new Date(video.publishedAt).getTime();
          if (publishedTime < cutoff) continue;

          // Compute real engagement score
          const rawEngagement = (video.likeCount * 2 + video.commentCount * 3 + video.viewCount * 0.001) / subscriberCount;
          const engagementQuality = Math.max(0, Math.min(1, rawEngagement));

          const isMilestone = video.viewCount >= 100000 || video.likeCount >= 5000;

          const suggestedTipAmount = engagementQuality >= 0.8 ? 0.015
            : engagementQuality >= 0.6 ? 0.01
            : engagementQuality >= 0.4 ? 0.007
            : 0.004;

          const event: SimulatedEvent = {
            id: `ytapi_${++eventCounter}_${Date.now()}`,
            type: 'creator.content_uploaded' as SimulatedEventType,
            timestamp: new Date().toISOString(),
            creatorId: `yt_${video.channelId}`,
            creatorName: video.channelTitle || ch.name,
            data: {
              source: 'youtube_api',
              aggregatorSource: 'youtube_api',
              platform: 'youtube',
              title: video.title,
              url: `https://www.youtube.com/watch?v=${video.videoId}`,
              videoId: video.videoId,
              publishedAt: video.publishedAt,
              category: ch.categories[0] ?? 'tech',
              contentType: 'video',
              viewCount: video.viewCount,
              likeCount: video.likeCount,
              commentCount: video.commentCount,
              subscriberCount,
              thumbnailUrl: video.thumbnailUrl,
              realStats: true,
            },
            engagementQuality,
            isMilestone,
            suggestedTipAmount,
          };

          events.push(event);
        }
      } catch (err) {
        logger.warn(`YouTube API: failed to fetch events for ${ch.name}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Sort by engagement quality descending
    events.sort((a, b) => b.engagementQuality - a.engagementQuality);

    if (events.length > 0) {
      this.setCache(cacheKey, events);
      logger.info(`YouTube API produced ${events.length} creator events with real stats`);
    }

    return events;
  }

  // ── Status ────────────────────────────────────────────────────

  getStatus(): { available: boolean; quotaUsed: number; quotaResetsAt: string; cachedEntries: number } {
    this.maybeResetQuota();
    return {
      available: this.isAvailable(),
      quotaUsed: this.quotaUsed,
      quotaResetsAt: new Date(this.quotaResetAt).toISOString(),
      cachedEntries: this.cache.size,
    };
  }

  // ── Private Helpers ───────────────────────────────────────────

  /**
   * Fetch multiple video statistics in a single API call (batch by comma-separated IDs).
   * Costs 1 quota unit regardless of how many video IDs.
   */
  private async getMultipleVideoStats(videoIds: string[]): Promise<Record<string, VideoStats>> {
    const result: Record<string, VideoStats> = {};
    if (!this.apiKey || videoIds.length === 0) return result;

    try {
      const params = new URLSearchParams({
        part: 'statistics',
        id: videoIds.join(','),
        key: this.apiKey,
      });

      const data = await this.fetchAPI(`/videos?${params}`);
      this.quotaUsed += 1;

      for (const item of data?.items ?? []) {
        result[item.id] = {
          viewCount: parseInt(item.statistics?.viewCount ?? '0', 10),
          likeCount: parseInt(item.statistics?.likeCount ?? '0', 10),
          commentCount: parseInt(item.statistics?.commentCount ?? '0', 10),
          favoriteCount: parseInt(item.statistics?.favoriteCount ?? '0', 10),
        };
      }
    } catch (err) {
      logger.warn('YouTube API getMultipleVideoStats failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return result;
  }

  private async fetchAPI(path: string): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`YouTube API HTTP ${response.status}: ${text.slice(0, 200)}`);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  // ── Cache Helpers ──────────────────────────────────────────────

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, expiry: Date.now() + this.CACHE_TTL });

    // Trim cache if it grows too large
    if (this.cache.size > 200) {
      const entries = [...this.cache.entries()];
      entries.sort((a, b) => a[1].expiry - b[1].expiry);
      for (let i = 0; i < 50; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  private maybeResetQuota(): void {
    if (Date.now() > this.quotaResetAt) {
      this.quotaUsed = 0;
      this.quotaResetAt = this.getNextMidnightPT();
    }
  }

  private getNextMidnightPT(): number {
    // YouTube quota resets at midnight Pacific Time
    const now = new Date();
    const utcMidnight = new Date(now);
    utcMidnight.setUTCHours(8, 0, 0, 0); // midnight PT = 08:00 UTC
    if (utcMidnight.getTime() <= now.getTime()) {
      utcMidnight.setUTCDate(utcMidnight.getUTCDate() + 1);
    }
    return utcMidnight.getTime();
  }
}

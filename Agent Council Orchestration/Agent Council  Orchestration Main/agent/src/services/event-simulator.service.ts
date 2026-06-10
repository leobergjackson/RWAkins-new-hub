// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
// Event Simulator Service — generates realistic Rumble-like events for autonomous loop
// Supports real Rumble RSS feeds (USE_REAL_EVENTS=true) with simulation fallback

import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

const __esdir = dirname(fileURLToPath(import.meta.url));
const RUMBLE_CREATORS_FILE = join(__esdir, '..', '..', '.rumble-creators.json');

// ── Types ──────────────────────────────────────────────────────

export type SimulatedEventType =
  | 'creator.stream_started'
  | 'creator.milestone_reached'
  | 'creator.high_engagement'
  | 'viewer.watch_time'
  | 'creator.donation_received'
  | 'creator.content_uploaded';

export interface SimulatedEvent {
  id: string;
  type: SimulatedEventType;
  timestamp: string;
  creatorId: string;
  creatorName: string;
  data: Record<string, unknown>;
  /** Engagement quality score 0.0-1.0 (Feature 50) */
  engagementQuality: number;
  /** Whether this event represents a milestone (Feature 26) */
  isMilestone: boolean;
  /** Suggested tip amount based on event significance */
  suggestedTipAmount: number;
}

export type EventListener = (event: SimulatedEvent) => void;

// ── Sample creators for simulation ─────────────────────────────

const SIMULATED_CREATORS = [
  { id: 'creator_01', name: 'CryptoDaily', categories: ['crypto', 'finance'] },
  { id: 'creator_02', name: 'TechReviewer', categories: ['tech', 'reviews'] },
  { id: 'creator_03', name: 'GameStreamPro', categories: ['gaming', 'entertainment'] },
  { id: 'creator_04', name: 'NewsAnalyst', categories: ['news', 'politics'] },
  { id: 'creator_05', name: 'CodingMaster', categories: ['tech', 'education'] },
  { id: 'creator_06', name: 'FitnessGuru', categories: ['health', 'lifestyle'] },
  { id: 'creator_07', name: 'MusicMixer', categories: ['music', 'entertainment'] },
  { id: 'creator_08', name: 'ScienceExplained', categories: ['education', 'science'] },
];

// ── RSS Feed Types ───────────────────────────────────────────

interface RSSVideoItem {
  title: string;
  link: string;
  pubDate: string;
  channelName: string;
  description: string;
}

// ── RumbleRSSFetcher — fetches real Rumble channel RSS feeds ──

export class RumbleRSSFetcher {
  private lastFetchedAt = new Map<string, string>(); // channelName -> ISO timestamp of last seen video

  /**
   * Fetch RSS feed for a Rumble channel and extract video items.
   * Rumble publishes RSS at https://rumble.com/c/{channelName}/feed
   */
  async fetchChannelRSS(channelName: string): Promise<RSSVideoItem[]> {
    const feedUrl = `https://rumble.com/c/${encodeURIComponent(channelName)}/feed`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'AeroFyta-TipBot/1.0' },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn(`RSS fetch failed for ${channelName}: HTTP ${response.status}`);
        return [];
      }

      const xml = await response.text();
      return this.parseRSSXml(xml, channelName);
    } catch (err) {
      logger.warn(`RSS fetch error for ${channelName}: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  /**
   * Parse RSS XML and extract video items.
   * Uses simple regex parsing to avoid adding an XML dependency.
   */
  private parseRSSXml(xml: string, channelName: string): RSSVideoItem[] {
    const items: RSSVideoItem[] = [];
    // Match each <item>...</item> block
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];

      const title = this.extractTag(block, 'title');
      const link = this.extractTag(block, 'link');
      const pubDate = this.extractTag(block, 'pubDate');
      const description = this.extractTag(block, 'description');

      if (title && pubDate) {
        items.push({
          title,
          link: link ?? '',
          pubDate,
          channelName,
          description: description ?? '',
        });
      }
    }

    return items;
  }

  private extractTag(xml: string, tag: string): string | null {
    // Handle both <tag>value</tag> and <tag><![CDATA[value]]></tag>
    const regex = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
    const m = regex.exec(xml);
    return m?.[1]?.trim() ?? null;
  }

  /**
   * Get new videos from a channel published within the last `windowHours` hours.
   * Tracks last-seen per channel to avoid duplicate events.
   */
  getNewVideos(items: RSSVideoItem[], channelName: string, windowHours = 24): RSSVideoItem[] {
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const lastSeen = this.lastFetchedAt.get(channelName);

    const newItems = items.filter(item => {
      const pubDate = new Date(item.pubDate);
      if (isNaN(pubDate.getTime())) return false;
      if (pubDate < cutoff) return false;
      if (lastSeen && pubDate.toISOString() <= lastSeen) return false;
      return true;
    });

    // Update last-seen timestamp
    if (newItems.length > 0) {
      const latest = newItems.reduce((a, b) =>
        new Date(a.pubDate) > new Date(b.pubDate) ? a : b
      );
      this.lastFetchedAt.set(channelName, new Date(latest.pubDate).toISOString());
    }

    return newItems;
  }
}

// ── Load creator channels from registry ─────────────────────

function loadRumbleChannels(): Array<{ name: string; channelName: string; walletAddress: string; categories: string[] }> {
  try {
    if (!existsSync(RUMBLE_CREATORS_FILE)) return [];
    const raw = readFileSync(RUMBLE_CREATORS_FILE, 'utf-8');
    const data = JSON.parse(raw) as { creators?: Array<{ name: string; channelUrl: string; walletAddress: string; categories: string[] }> };
    return (data.creators ?? []).map(c => {
      // Extract channel name from URL like https://rumble.com/c/ChannelName
      const urlMatch = /\/c\/([^/]+)/.exec(c.channelUrl);
      return {
        name: c.name,
        channelName: urlMatch?.[1] ?? c.name,
        walletAddress: c.walletAddress,
        categories: c.categories ?? [],
      };
    });
  } catch {
    return [];
  }
}

// ── Service ────────────────────────────────────────────────────

/**
 * EventSimulatorService — generates realistic Rumble-like events.
 *
 * Since we cannot access real Rumble API, this simulates the event
 * stream that a real webhook integration would provide. Events are
 * generated at configurable intervals (default 15-30s) and feed
 * directly into the autonomous tipping loop.
 *
 * Event types:
 * - creator.stream_started — creator goes live
 * - creator.milestone_reached — hit subscriber/viewer milestones
 * - creator.high_engagement — chat activity spike
 * - viewer.watch_time — accumulated watch time
 * - creator.donation_received — social proof tipping
 * - creator.content_uploaded — new video/stream
 *
 * Features covered: 9 (Webhook Simulator), 26 (Milestones), 50 (Engagement Quality)
 */
export class EventSimulatorService {
  private events: SimulatedEvent[] = [];
  private maxEvents = 500;
  private interval: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private listeners: EventListener[] = [];
  private sseClients: Array<{ id: string; send: (data: string) => void; close: () => void }> = [];
  private eventCounter = 0;
  private rssFetcher = new RumbleRSSFetcher();
  private useRealEvents = process.env.USE_REAL_EVENTS === 'true';
  /** Track which RSS videos we already converted to events */
  private seenVideoLinks = new Set<string>();

  /** Start generating events at random intervals (15-30s) */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
    logger.info(`Event simulator started — ${this.useRealEvents ? 'real RSS + fallback simulation' : 'simulation only'}, events every 15-30s`);
  }

  /** Stop event generation */
  stop(): void {
    this.running = false;
    if (this.interval) {
      clearTimeout(this.interval);
      this.interval = null;
    }
    logger.info('Event simulator stopped');
  }

  /** Whether the simulator is running */
  isRunning(): boolean {
    return this.running;
  }

  /** Register a listener for new events */
  onEvent(listener: EventListener): void {
    this.listeners.push(listener);
  }

  /** Remove a listener */
  removeListener(listener: EventListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /** Register an SSE client for real-time event streaming */
  addSSEClient(client: { id: string; send: (data: string) => void; close: () => void }): void {
    this.sseClients.push(client);
  }

  /** Remove an SSE client */
  removeSSEClient(clientId: string): void {
    this.sseClients = this.sseClients.filter(c => c.id !== clientId);
  }

  /** Get recent events (last N) */
  getRecentEvents(limit = 50): SimulatedEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /** Get all events */
  getAllEvents(): SimulatedEvent[] {
    return [...this.events];
  }

  /** Get pending events that haven't been processed (new since last check) */
  getNewEvents(sinceTimestamp: string): SimulatedEvent[] {
    return this.events.filter(e => e.timestamp > sinceTimestamp);
  }

  /** Inject an external webhook event into the pipeline (Feature 38) */
  injectWebhookEvent(payload: { event: string; data: Record<string, unknown>; timestamp?: number }): SimulatedEvent {
    const creatorId = String(payload.data.creatorId ?? payload.data.creator_id ?? 'unknown');
    const creatorName = String(payload.data.creatorName ?? payload.data.creator_name ?? 'Unknown Creator');

    const event: SimulatedEvent = {
      id: `webhook_${uuidv4().slice(0, 8)}`,
      type: this.mapWebhookEventType(payload.event),
      timestamp: payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString(),
      creatorId,
      creatorName,
      data: payload.data,
      engagementQuality: this.calculateEngagementQuality(payload.data),
      isMilestone: payload.event.includes('milestone'),
      suggestedTipAmount: this.calculateSuggestedTip(payload.event, payload.data),
    };

    this.addEvent(event);
    logger.info('Webhook event injected', { type: event.type, creator: event.creatorName });
    return event;
  }

  /** Get stats about the event simulator */
  getStats() {
    const typeCounts = new Map<string, number>();
    for (const event of this.events) {
      typeCounts.set(event.type, (typeCounts.get(event.type) ?? 0) + 1);
    }

    const milestoneEvents = this.events.filter(e => e.isMilestone).length;
    const highEngagement = this.events.filter(e => e.engagementQuality > 0.7).length;
    const avgEngagement = this.events.length > 0
      ? this.events.reduce((s, e) => s + e.engagementQuality, 0) / this.events.length
      : 0;

    const realEventCount = this.events.filter(e => e.id.startsWith('rss_')).length;

    return {
      running: this.running,
      useRealEvents: this.useRealEvents,
      totalEvents: this.events.length,
      realEvents: realEventCount,
      simulatedEvents: this.events.length - realEventCount,
      milestoneEvents,
      highEngagementEvents: highEngagement,
      avgEngagementQuality: Math.round(avgEngagement * 100) / 100,
      sseClients: this.sseClients.length,
      listeners: this.listeners.length,
      eventsByType: Object.fromEntries(typeCounts),
    };
  }

  // ── Private: Event Generation ──────────────────────────────────

  private scheduleNext(): void {
    if (!this.running) return;
    // Random interval between 15-30 seconds
    const delayMs = 15_000 + Math.random() * 15_000;
    this.interval = setTimeout(async () => {
      await this.generateEvent();
      this.scheduleNext();
    }, delayMs);
  }

  /** Generate event — tries real RSS first when USE_REAL_EVENTS=true, falls back to simulation */
  private async generateEvent(): Promise<void> {
    if (this.useRealEvents) {
      try {
        const realEvents = await this.fetchRealEvents();
        if (realEvents.length > 0) {
          for (const evt of realEvents) {
            this.addEvent(evt);
          }
          return; // Real events generated successfully
        }
        // No new real events — fall through to simulation
      } catch (err) {
        logger.warn(`Real event fetch failed, falling back to simulation: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Simulation fallback
    this.generateSimulatedEvent();
  }

  /** Generate a single simulated event (original behavior) */
  private generateSimulatedEvent(): void {
    const creator = SIMULATED_CREATORS[Math.floor(Math.random() * SIMULATED_CREATORS.length)];
    const eventType = this.pickRandomEventType();
    const data = this.generateEventData(eventType, creator);

    const event: SimulatedEvent = {
      id: `sim_${++this.eventCounter}_${Date.now()}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      creatorId: creator.id,
      creatorName: creator.name,
      data,
      engagementQuality: this.calculateEngagementQuality(data),
      isMilestone: eventType === 'creator.milestone_reached',
      suggestedTipAmount: this.calculateSuggestedTip(eventType, data),
    };

    this.addEvent(event);
  }

  /**
   * Fetch real events from Rumble RSS feeds of registered creators.
   * Reads creator list from .rumble-creators.json, fetches each channel's RSS,
   * and converts new videos (last 24h) into engagement events.
   */
  async fetchRealEvents(): Promise<SimulatedEvent[]> {
    const channels = loadRumbleChannels();
    if (channels.length === 0) {
      logger.debug('No Rumble channels in registry for real event fetching');
      return [];
    }

    const events: SimulatedEvent[] = [];

    // Fetch a random subset (max 3) to avoid hammering RSS on every tick
    const shuffled = channels.sort(() => Math.random() - 0.5).slice(0, 3);

    for (const channel of shuffled) {
      try {
        const items = await this.rssFetcher.fetchChannelRSS(channel.channelName);
        const newVideos = this.rssFetcher.getNewVideos(items, channel.channelName, 24);

        for (const video of newVideos) {
          // Deduplicate by video link
          if (video.link && this.seenVideoLinks.has(video.link)) continue;
          if (video.link) this.seenVideoLinks.add(video.link);

          // Trim seen set to prevent unbounded growth
          if (this.seenVideoLinks.size > 1000) {
            const arr = [...this.seenVideoLinks];
            this.seenVideoLinks = new Set(arr.slice(-500));
          }

          const data: Record<string, unknown> = {
            contentType: 'video',
            title: video.title,
            url: video.link,
            publishedAt: video.pubDate,
            category: channel.categories[0] ?? 'general',
            source: 'rumble_rss',
            description: video.description.slice(0, 200),
          };

          const event: SimulatedEvent = {
            id: `rss_${++this.eventCounter}_${Date.now()}`,
            type: 'creator.content_uploaded',
            timestamp: new Date().toISOString(),
            creatorId: channel.name.toLowerCase().replace(/\s+/g, '_'),
            creatorName: channel.name,
            data,
            engagementQuality: 0.7, // New video = high engagement baseline
            isMilestone: false,
            suggestedTipAmount: this.calculateSuggestedTip('creator.content_uploaded', data),
          };

          events.push(event);
          logger.info('Real RSS event generated', { creator: channel.name, title: video.title });
        }
      } catch (err) {
        logger.warn(`RSS fetch for ${channel.channelName} failed: ${err instanceof Error ? err.message : String(err)}`);
        // Continue with other channels
      }
    }

    return events;
  }

  private addEvent(event: SimulatedEvent): void {
    this.events.push(event);
    // Trim to max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* ignore listener errors */ }
    }

    // Notify SSE clients
    const sseData = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.sseClients) {
      try { client.send(sseData); } catch {
        this.removeSSEClient(client.id);
      }
    }

    logger.debug('Event generated', {
      type: event.type,
      creator: event.creatorName,
      engagement: event.engagementQuality,
      milestone: event.isMilestone,
    });
  }

  private pickRandomEventType(): SimulatedEventType {
    const types: Array<{ type: SimulatedEventType; weight: number }> = [
      { type: 'creator.stream_started', weight: 10 },
      { type: 'creator.milestone_reached', weight: 8 },
      { type: 'creator.high_engagement', weight: 20 },
      { type: 'viewer.watch_time', weight: 30 },
      { type: 'creator.donation_received', weight: 15 },
      { type: 'creator.content_uploaded', weight: 17 },
    ];

    const totalWeight = types.reduce((s, t) => s + t.weight, 0);
    let random = Math.random() * totalWeight;
    for (const t of types) {
      random -= t.weight;
      if (random <= 0) return t.type;
    }
    return 'viewer.watch_time';
  }

  private generateEventData(type: SimulatedEventType, creator: { id: string; name: string; categories: string[] }): Record<string, unknown> {
    const hour = new Date().getHours();
    const isPrimeTime = hour >= 18 && hour <= 23;

    switch (type) {
      case 'creator.stream_started':
        return {
          streamTitle: `${creator.name} Live: ${this.randomStreamTitle(creator.categories)}`,
          viewerCount: Math.floor(50 + Math.random() * (isPrimeTime ? 5000 : 1500)),
          category: creator.categories[0],
          isLive: true,
          startedAt: new Date().toISOString(),
        };

      case 'creator.milestone_reached': {
        const milestoneType = this.randomMilestoneType();
        return {
          milestoneType: milestoneType.type,
          milestoneValue: milestoneType.value,
          previousValue: milestoneType.previousValue,
          percentGrowth: milestoneType.growth,
          category: creator.categories[0],
        };
      }

      case 'creator.high_engagement': {
        const chatRate = Math.floor(5 + Math.random() * 80);
        const uniqueChatters = Math.floor(10 + Math.random() * 500);
        const avgWatchDuration = Math.floor(120 + Math.random() * 1800);
        const repeatViewerPercent = Math.floor(20 + Math.random() * 60);
        return {
          chatMessagesPerMinute: chatRate,
          uniqueChatters,
          avgWatchDurationSec: avgWatchDuration,
          repeatViewerPercent,
          viewerCount: Math.floor(100 + Math.random() * 3000),
          peakViewers: Math.floor(200 + Math.random() * 5000),
          engagementSpike: chatRate > 40,
          category: creator.categories[0],
        };
      }

      case 'viewer.watch_time':
        return {
          totalMinutesWatched: Math.floor(30 + Math.random() * 960),
          videosWatched: Math.floor(1 + Math.random() * 15),
          avgCompletionPercent: Math.floor(40 + Math.random() * 55),
          favoriteCategory: creator.categories[0],
          isSubscriber: Math.random() > 0.3,
        };

      case 'creator.donation_received':
        return {
          donorName: `Fan_${Math.floor(Math.random() * 9999)}`,
          donationAmount: (0.001 + Math.random() * 0.05).toFixed(4),
          donationCurrency: 'USDT',
          message: this.randomDonationMessage(),
          totalDonationsToday: Math.floor(1 + Math.random() * 25),
        };

      case 'creator.content_uploaded':
        return {
          contentType: Math.random() > 0.4 ? 'video' : 'stream_vod',
          title: this.randomContentTitle(creator.categories),
          durationMinutes: Math.floor(5 + Math.random() * 120),
          category: creator.categories[0],
          expectedViews: Math.floor(100 + Math.random() * 10000),
        };

      default:
        return {};
    }
  }

  // ── Engagement Quality Scoring (Feature 50) ─────────────────

  /**
   * Calculate engagement quality score (0.0-1.0).
   * Scores based on:
   * - Chat messages per minute (quantity AND quality)
   * - Unique chatters (real humans vs bots)
   * - Watch duration (invested attention)
   * - Repeat viewers (loyal audience)
   * Bot-like patterns get lower scores.
   */
  private calculateEngagementQuality(data: Record<string, unknown>): number {
    let score = 0.5; // baseline

    const chatRate = Number(data.chatMessagesPerMinute ?? 0);
    const uniqueChatters = Number(data.uniqueChatters ?? 0);
    const watchDuration = Number(data.avgWatchDurationSec ?? 0);
    const repeatViewers = Number(data.repeatViewerPercent ?? 0);
    const viewerCount = Number(data.viewerCount ?? 0);

    // Chat quality (not just quantity — too much chat with few chatters = bot)
    if (chatRate > 0 && uniqueChatters > 0) {
      const chatPerChatter = chatRate / Math.max(uniqueChatters, 1);
      if (chatPerChatter > 5) {
        // Bot-like: too many messages from too few chatters
        score -= 0.2;
      } else if (chatPerChatter > 0.5 && chatPerChatter <= 3) {
        // Healthy engagement
        score += 0.15;
      }
    }

    // Unique chatters relative to viewers
    if (viewerCount > 0 && uniqueChatters > 0) {
      const chatParticipation = uniqueChatters / viewerCount;
      if (chatParticipation > 0.1) score += 0.1;
      if (chatParticipation > 0.3) score += 0.1;
    }

    // Watch duration (higher = more engaged audience)
    if (watchDuration > 600) score += 0.1;   // > 10 min
    if (watchDuration > 1200) score += 0.1;  // > 20 min

    // Repeat viewers (loyal audience)
    if (repeatViewers > 30) score += 0.1;
    if (repeatViewers > 50) score += 0.1;

    // Milestone events are inherently high quality
    const milestoneValue = Number(data.milestoneValue ?? 0);
    if (milestoneValue > 0) {
      score += 0.15;
    }

    // Completion percent for watch time
    const completion = Number(data.avgCompletionPercent ?? 0);
    if (completion > 70) score += 0.1;
    if (completion > 90) score += 0.1;

    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  }

  // ── Milestone Tip Calculation (Feature 26) ─────────────────

  /**
   * Calculate suggested tip amount based on event type and significance.
   * Milestones get higher tips, with scaling based on milestone size.
   */
  private calculateSuggestedTip(eventType: string, data: Record<string, unknown>): number {
    const milestoneValue = Number(data.milestoneValue ?? 0);
    const milestoneType = String(data.milestoneType ?? '');

    switch (eventType) {
      case 'creator.milestone_reached': {
        // Scale based on milestone type and value
        if (milestoneType === 'subscribers') {
          if (milestoneValue >= 100000) return 0.05;
          if (milestoneValue >= 10000) return 0.02;
          if (milestoneValue >= 1000) return 0.01;
          return 0.005;
        }
        if (milestoneType === 'viewers') {
          if (milestoneValue >= 100000) return 0.04;
          if (milestoneValue >= 10000) return 0.015;
          if (milestoneValue >= 1000) return 0.008;
          return 0.003;
        }
        if (milestoneType === 'stream_hours') {
          if (milestoneValue >= 1000) return 0.03;
          if (milestoneValue >= 100) return 0.01;
          return 0.005;
        }
        return 0.005;
      }

      case 'creator.high_engagement': {
        const chatRate = Number(data.chatMessagesPerMinute ?? 0);
        if (chatRate > 60) return 0.01;
        if (chatRate > 30) return 0.005;
        return 0.003;
      }

      case 'creator.stream_started':
        return 0.003;

      case 'viewer.watch_time': {
        const minutes = Number(data.totalMinutesWatched ?? 0);
        if (minutes > 500) return 0.008;
        if (minutes > 200) return 0.005;
        return 0.002;
      }

      case 'creator.donation_received':
        return 0.002; // Match others' generosity

      case 'creator.content_uploaded':
        return 0.003;

      default:
        return 0.002;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  private mapWebhookEventType(rawType: string): SimulatedEventType {
    const map: Record<string, SimulatedEventType> = {
      'stream_started': 'creator.stream_started',
      'stream.started': 'creator.stream_started',
      'milestone': 'creator.milestone_reached',
      'milestone_reached': 'creator.milestone_reached',
      'high_engagement': 'creator.high_engagement',
      'engagement': 'creator.high_engagement',
      'watch_time': 'viewer.watch_time',
      'donation': 'creator.donation_received',
      'donation_received': 'creator.donation_received',
      'content_uploaded': 'creator.content_uploaded',
      'upload': 'creator.content_uploaded',
    };
    return map[rawType] ?? map[rawType.replace(/^creator\.|^viewer\./, '')] ?? 'creator.high_engagement';
  }

  private randomMilestoneType(): { type: string; value: number; previousValue: number; growth: number } {
    const milestones = [
      { type: 'subscribers', values: [1000, 5000, 10000, 50000, 100000] },
      { type: 'viewers', values: [1000, 5000, 10000, 50000, 100000] },
      { type: 'stream_hours', values: [100, 500, 1000, 5000] },
      { type: 'total_donations', values: [10, 50, 100, 500, 1000] },
    ];
    const milestone = milestones[Math.floor(Math.random() * milestones.length)];
    const value = milestone.values[Math.floor(Math.random() * milestone.values.length)];
    const previousValue = Math.floor(value * (0.7 + Math.random() * 0.25));
    const growth = Math.round(((value - previousValue) / previousValue) * 100);
    return { type: milestone.type, value, previousValue, growth };
  }

  private randomStreamTitle(categories: string[]): string {
    const titles: Record<string, string[]> = {
      crypto: ['Market Analysis Live', 'DeFi Deep Dive', 'New Token Reviews', 'Blockchain Explained'],
      tech: ['Gadget Unboxing', 'Code Review Session', 'Tech News Roundup', 'Build with Me'],
      gaming: ['Ranked Grind', 'New Game First Look', 'Challenge Accepted', 'Community Games'],
      finance: ['Portfolio Review', 'Stock Market Watch', 'Investment Strategies', 'Economic Analysis'],
      education: ['Learn with Me', 'Tutorial Session', 'Q&A Stream', 'Deep Dive Learning'],
      entertainment: ['Just Chatting', 'Community Hangout', 'Late Night Show', 'Variety Stream'],
      news: ['Breaking News Analysis', 'Daily Digest', 'World Events', 'Policy Discussion'],
      health: ['Workout Live', 'Meal Prep Stream', 'Fitness Q&A', 'Wellness Talk'],
      music: ['Live Performance', 'Beat Making Session', 'Music Review', 'DJ Set'],
      science: ['Experiment Live', 'Research Explained', 'Science News', 'Lab Stream'],
    };
    const cat = categories[0] ?? 'entertainment';
    const catTitles = titles[cat] ?? titles.entertainment;
    return catTitles[Math.floor(Math.random() * catTitles.length)];
  }

  private randomContentTitle(categories: string[]): string {
    const cat = categories[0] ?? 'general';
    const prefixes = ['Ultimate Guide to', 'Understanding', 'Top 10', 'How I', 'The Truth About', 'Why'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix} ${cat.charAt(0).toUpperCase() + cat.slice(1)} in 2026`;
  }

  private randomDonationMessage(): string {
    const messages = [
      'Great content, keep it up!',
      'Love your streams!',
      'Thanks for the education',
      'You deserve this!',
      'Supporting great creators',
      'Been watching for months, finally tipping!',
      'Your analysis is spot on',
      'Best content on the platform',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

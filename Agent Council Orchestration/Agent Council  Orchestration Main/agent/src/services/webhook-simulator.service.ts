// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Webhook Simulator Service
// Simulator only runs in demo mode for offline demonstrations.
// In production mode (DEMO_MODE unset or not 'true'), the simulator
// does NOT start — the agent runs on real data only.

import { createHmac, randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────

interface WebhookPayload {
  platform: string;
  eventType: string;
  creatorId: string;
  creatorName: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// ── Realistic Event Templates ─────────────────────────────────────

const RUMBLE_CREATORS = [
  { id: 'rumble_crypto_wolf', name: 'CryptoWolf', channel: 'https://rumble.com/c/CryptoWolf' },
  { id: 'rumble_chain_sage', name: 'ChainSage', channel: 'https://rumble.com/c/ChainSage' },
  { id: 'rumble_defi_dan', name: 'DeFi_Dan', channel: 'https://rumble.com/c/DeFi_Dan' },
  { id: 'rumble_block_beats', name: 'BlockBeats', channel: 'https://rumble.com/c/BlockBeats' },
  { id: 'rumble_token_talk', name: 'TokenTalk', channel: 'https://rumble.com/c/TokenTalk' },
];

const YOUTUBE_CREATORS = [
  { id: 'yt_tech_reviewer', name: 'TechReviewer', channel: 'https://youtube.com/@TechReviewer' },
  { id: 'yt_crypto_daily', name: 'CryptoDaily', channel: 'https://youtube.com/@CryptoDaily' },
  { id: 'yt_nft_alpha', name: 'NFT_Alpha', channel: 'https://youtube.com/@NFT_Alpha' },
];

const VIDEO_TITLES = [
  'Breaking: USDT0 Cross-Chain Bridge Goes Live',
  'WDK Tutorial — Build Your First Payment Agent',
  'Top 5 DeFi Strategies for 2026',
  'Live Trading Session — Altcoin Season?',
  'Tether Hackathon: What Judges Look For',
  'Layer 2 Fee Comparison — Cheapest Chain Today',
  'Smart Contract Security: Avoid These Mistakes',
  'Multi-Chain Wallets Explained in 5 Minutes',
  'Passive Income with Stablecoin Yields',
  'How Autonomous Agents Will Change Payments',
  'Rumble vs YouTube — Creator Revenue Deep Dive',
  'Building Trustless Escrow with Hash Locks',
];

const MILESTONES = [
  { type: 'subscriber', counts: [1000, 5000, 10000, 25000, 50000, 100000] },
  { type: 'views', counts: [10000, 50000, 100000, 500000, 1000000] },
  { type: 'tips_received', counts: [10, 50, 100, 500] },
];

// ── Service ──────────────────────────────────────────────────────

export class WebhookSimulatorService {
  private interval: ReturnType<typeof setInterval> | null = null;
  private port: number;
  private secret: string;
  private eventIndex = 0;
  private totalSent = 0;
  private totalErrors = 0;

  constructor(port: number = 3001) {
    this.port = port;
    this.secret = process.env.WEBHOOK_SECRET ?? randomUUID();
  }

  /**
   * Start the simulator — sends a realistic event every `intervalMs` milliseconds.
   * Only runs when DEMO_MODE=true is explicitly set.
   * In production mode the agent runs on real data only.
   */
  start(intervalMs: number = 45000): void {
    // Simulator only runs in demo mode for offline demonstrations
    if (process.env.DEMO_MODE !== 'true') {
      logger.info('Webhook simulator disabled (production mode)');
      return;
    }

    if (this.interval) return; // already running

    this.interval = setInterval(() => {
      this.sendEvent().catch(() => { /* swallow — next tick will retry */ });
    }, intervalMs);

    // Send the first event after 10 seconds (agent boot time)
    setTimeout(() => {
      this.sendEvent().catch(() => { /* agent not ready yet */ });
    }, 10_000);

    logger.info('[DEMO] Webhook simulator active — sending realistic events every ' +
      (intervalMs / 1000) + 's to http://localhost:' + this.port + '/api/webhooks/ingest');
  }

  /** Stop the simulator */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /** Get simulator stats */
  getStats(): { totalSent: number; totalErrors: number; running: boolean } {
    return {
      totalSent: this.totalSent,
      totalErrors: this.totalErrors,
      running: this.interval !== null,
    };
  }

  // ── Event Generation ──────────────────────────────────────────

  private async sendEvent(): Promise<void> {
    const event = this.generateRealisticEvent();
    const body = JSON.stringify(event);
    const signature = this.computeHMAC(body, this.secret);

    try {
      const resp = await fetch(`http://localhost:${this.port}/api/webhooks/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body,
      });

      if (resp.ok) {
        this.totalSent++;
        logger.info('Webhook simulator: event sent', {
          platform: event.platform,
          eventType: event.eventType,
          creator: event.creatorName,
          total: this.totalSent,
        });
      } else {
        this.totalErrors++;
        logger.debug('Webhook simulator: non-OK response', { status: resp.status });
      }
    } catch {
      // Agent not ready yet or network issue — will retry on next interval
      this.totalErrors++;
    }
  }

  private generateRealisticEvent(): WebhookPayload {
    // Rotate through event types in a realistic pattern
    const eventTypes: Array<() => WebhookPayload> = [
      () => this.newVideoEvent('rumble'),
      () => this.newVideoEvent('youtube'),
      () => this.liveStreamEvent(),
      () => this.milestoneEvent(),
      () => this.engagementSpikeEvent(),
      () => this.newVideoEvent('rumble'),
      () => this.engagementSpikeEvent(),
      () => this.newVideoEvent('youtube'),
      () => this.milestoneEvent(),
      () => this.liveStreamEvent(),
    ];

    const generator = eventTypes[this.eventIndex % eventTypes.length];
    this.eventIndex++;
    return generator();
  }

  private newVideoEvent(platform: 'rumble' | 'youtube'): WebhookPayload {
    const creators = platform === 'rumble' ? RUMBLE_CREATORS : YOUTUBE_CREATORS;
    const creator = creators[Math.floor(Math.random() * creators.length)];
    const title = VIDEO_TITLES[Math.floor(Math.random() * VIDEO_TITLES.length)];
    const views = 500 + Math.floor(Math.random() * 15000);

    return {
      platform,
      eventType: 'new_video',
      creatorId: creator.id,
      creatorName: creator.name,
      data: {
        title,
        url: `${creator.channel}/v${Date.now().toString(36)}`,
        views,
        likes: Math.floor(views * (0.05 + Math.random() * 0.15)),
        comments: Math.floor(views * (0.01 + Math.random() * 0.05)),
        duration: 300 + Math.floor(Math.random() * 2700), // 5-50 min
      },
      timestamp: new Date().toISOString(),
    };
  }

  private liveStreamEvent(): WebhookPayload {
    const allCreators = [...RUMBLE_CREATORS, ...YOUTUBE_CREATORS];
    const creator = allCreators[Math.floor(Math.random() * allCreators.length)];
    const platform = creator.id.startsWith('rumble') ? 'rumble' : 'youtube';
    const viewers = 50 + Math.floor(Math.random() * 5000);

    return {
      platform,
      eventType: 'live_stream',
      creatorId: creator.id,
      creatorName: creator.name,
      data: {
        title: `LIVE: ${VIDEO_TITLES[Math.floor(Math.random() * VIDEO_TITLES.length)]}`,
        url: `${creator.channel}/live`,
        views: viewers,
        likes: Math.floor(viewers * 0.2),
        comments: Math.floor(viewers * 0.1),
        liveViewerCount: viewers,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private milestoneEvent(): WebhookPayload {
    const allCreators = [...RUMBLE_CREATORS, ...YOUTUBE_CREATORS];
    const creator = allCreators[Math.floor(Math.random() * allCreators.length)];
    const platform = creator.id.startsWith('rumble') ? 'rumble' : 'youtube';
    const milestone = MILESTONES[Math.floor(Math.random() * MILESTONES.length)];
    const count = milestone.counts[Math.floor(Math.random() * milestone.counts.length)];

    return {
      platform,
      eventType: 'milestone',
      creatorId: creator.id,
      creatorName: creator.name,
      data: {
        milestoneType: milestone.type,
        milestoneValue: count,
        title: `${creator.name} reached ${count.toLocaleString()} ${milestone.type}!`,
        subscriberCount: milestone.type === 'subscriber' ? count : 5000 + Math.floor(Math.random() * 45000),
      },
      timestamp: new Date().toISOString(),
    };
  }

  private engagementSpikeEvent(): WebhookPayload {
    const allCreators = [...RUMBLE_CREATORS, ...YOUTUBE_CREATORS];
    const creator = allCreators[Math.floor(Math.random() * allCreators.length)];
    const platform = creator.id.startsWith('rumble') ? 'rumble' : 'youtube';
    const views = 5000 + Math.floor(Math.random() * 95000);

    return {
      platform,
      eventType: 'engagement',
      creatorId: creator.id,
      creatorName: creator.name,
      data: {
        title: VIDEO_TITLES[Math.floor(Math.random() * VIDEO_TITLES.length)],
        views,
        likes: Math.floor(views * (0.1 + Math.random() * 0.2)),
        comments: Math.floor(views * (0.03 + Math.random() * 0.07)),
        engagementRate: (5 + Math.random() * 20).toFixed(1) + '%',
        spikeMultiplier: (2 + Math.random() * 8).toFixed(1) + 'x',
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ── HMAC ──────────────────────────────────────────────────────

  private computeHMAC(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }
}

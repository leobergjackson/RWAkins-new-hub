// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Discovery Agent — Creator discovery, scoring, and watchlist management
// HD Wallet Index: 3

import { logger } from '../utils/logger.js';
import {
  BaseAgent,
  type AgentContext,
  type AgentAnalysis,
  type Proposal,
  type Vote,
  type Action,
  type ExecutionResult,
} from './base-agent.js';
import type { RumbleScraperService } from '../services/rumble-scraper.service.js';
import type { EngagementScorerService } from '../services/engagement-scorer.service.js';

// ── Types ──────────────────────────────────────────────────────

interface WatchlistEntry {
  slug: string;
  name: string;
  addedAt: string;
  lastChecked: string;
  currentScore: number;
  previousScore: number;
  tier: string;
  spikeDetected: boolean;
}

interface DiscoveryEvent {
  type: 'NEW_CREATOR' | 'ENGAGEMENT_SPIKE' | 'TIER_UPGRADE' | 'TIER_DOWNGRADE';
  slug: string;
  details: string;
  timestamp: string;
}

// ── Discovery Agent ────────────────────────────────────────────

export class DiscoveryAgent extends BaseAgent {
  private rumbleScraper: RumbleScraperService | null = null;
  private engagementScorer: EngagementScorerService | null = null;

  // State
  private watchlist: Map<string, WatchlistEntry> = new Map();
  private discoveryEvents: DiscoveryEvent[] = [];
  private lastScrapeAt: string | null = null;
  private proposalsGenerated = 0;

  // Configuration
  private readonly minScoreForWatchlist = 30;
  private readonly spikeThreshold = 15; // Score increase of 15+ = spike
  private readonly maxWatchlistSize = 50;
  private readonly scrapeIntervalMs = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super('Discovery', 'Creator discovery — scrapes platforms, scores engagement, manages watchlist', 3);
  }

  /** Wire external services */
  setServices(opts: {
    rumbleScraper?: RumbleScraperService;
    engagementScorer?: EngagementScorerService;
  }): void {
    if (opts.rumbleScraper) this.rumbleScraper = opts.rumbleScraper;
    if (opts.engagementScorer) this.engagementScorer = opts.engagementScorer;
  }

  // ── Core Analysis ──

  async analyze(_context: AgentContext): Promise<AgentAnalysis> {
    this.setStatus('analyzing');
    const recommendations: string[] = [];
    const data: Record<string, unknown> = {};

    try {
      // 1. Run scraper if enough time has passed
      const shouldScrape = !this.lastScrapeAt ||
        (Date.now() - new Date(this.lastScrapeAt).getTime()) > this.scrapeIntervalMs;

      if (shouldScrape && this.rumbleScraper) {
        await this.runScrape();
      }

      // 2. Score all known creators
      const scored = this.scoreAllCreators();
      data['creatorsScored'] = scored.length;
      data['avgScore'] = scored.length > 0
        ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length)
        : 0;

      // 3. Update watchlist and detect spikes
      const events = this.updateWatchlist(scored);
      data['discoveryEvents'] = events;
      data['watchlistSize'] = this.watchlist.size;

      // 4. Generate tip proposals for spiking creators
      const spikingCreators = [...this.watchlist.values()].filter((w) => w.spikeDetected);
      data['spikingCreators'] = spikingCreators.map((w) => ({ slug: w.slug, score: w.currentScore, tier: w.tier }));

      for (const spiking of spikingCreators) {
        recommendations.push(
          `SPIKE: ${spiking.name} (${spiking.slug}) jumped from ${spiking.previousScore} to ${spiking.currentScore} — propose tip`,
        );
        this.proposalsGenerated++;
      }

      // 5. New high-engagement creators
      const newHighEngagement = events.filter((e) => e.type === 'NEW_CREATOR');
      for (const newCreator of newHighEngagement) {
        recommendations.push(`NEW: ${newCreator.details}`);
      }

      // 6. Tier changes
      const upgrades = events.filter((e) => e.type === 'TIER_UPGRADE');
      for (const upgrade of upgrades) {
        recommendations.push(`UPGRADE: ${upgrade.details}`);
      }

      if (recommendations.length === 0) {
        recommendations.push('No new discoveries or engagement spikes this cycle');
      }

      data['totalEvents'] = this.discoveryEvents.length;
      data['proposalsGenerated'] = this.proposalsGenerated;
      data['lastScrapeAt'] = this.lastScrapeAt;

      this.setStatus('idle');
      this.incrementCycles();

      return {
        agentId: this.id,
        agentName: this.name,
        summary: `Discovery: ${scored.length} creators scored, ${this.watchlist.size} on watchlist, ${spikingCreators.length} spike(s) detected, ${events.length} event(s).`,
        confidence: scored.length > 0 ? 0.75 : 0.3,
        recommendations,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.setError(`Discovery analysis failed: ${String(err)}`);
      return {
        agentId: this.id,
        agentName: this.name,
        summary: `Discovery failed: ${String(err)}`,
        confidence: 0,
        recommendations: ['Discovery error — no new creators to propose'],
        data: { error: String(err) },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Voting ──

  async vote(proposal: Proposal): Promise<Vote> {
    this.setStatus('voting');

    try {
      let decision: Vote['decision'] = 'abstain';
      let confidence = 0.5;
      let reasoning = '';

      if (proposal.type === 'TIP') {
        const recipient = (proposal.data['recipient'] as string) ?? '';
        const engagementScore = (proposal.data['engagementScore'] as number) ?? 0;

        // Discovery knows about creator quality
        const watchEntry = this.watchlist.get(recipient.toLowerCase());

        if (watchEntry) {
          if (watchEntry.spikeDetected) {
            decision = 'approve';
            confidence = 0.9;
            reasoning = `Creator ${recipient} has engagement spike (${watchEntry.previousScore}->${watchEntry.currentScore}) — strong tip candidate`;
          } else if (watchEntry.currentScore >= 50) {
            decision = 'approve';
            confidence = 0.7;
            reasoning = `Creator ${recipient} on watchlist with good engagement (${watchEntry.currentScore}/100)`;
          } else {
            decision = 'abstain';
            confidence = 0.4;
            reasoning = `Creator ${recipient} on watchlist but low engagement (${watchEntry.currentScore}/100)`;
          }
        } else if (engagementScore >= 60) {
          decision = 'approve';
          confidence = 0.6;
          reasoning = `Creator ${recipient} not on watchlist but has good engagement (${engagementScore}/100)`;
        } else {
          decision = 'reject';
          confidence = 0.5;
          reasoning = `Creator ${recipient} not on watchlist and low engagement — needs more data`;
        }
      } else if (proposal.type === 'WATCHLIST_ADD') {
        const slug = (proposal.data['slug'] as string) ?? '';
        const score = (proposal.data['score'] as number) ?? 0;

        if (score >= this.minScoreForWatchlist && this.watchlist.size < this.maxWatchlistSize) {
          decision = 'approve';
          confidence = 0.8;
          reasoning = `Creator ${slug} meets watchlist threshold (${score}>=${this.minScoreForWatchlist})`;
        } else if (this.watchlist.size >= this.maxWatchlistSize) {
          decision = 'reject';
          confidence = 0.7;
          reasoning = `Watchlist full (${this.watchlist.size}/${this.maxWatchlistSize})`;
        } else {
          decision = 'reject';
          confidence = 0.6;
          reasoning = `Score ${score} below watchlist threshold of ${this.minScoreForWatchlist}`;
        }
      } else {
        decision = 'abstain';
        confidence = 0.3;
        reasoning = `Proposal type ${proposal.type} outside Discovery domain`;
      }

      this.setStatus('idle');

      return {
        agentId: this.id,
        agentName: this.name,
        decision,
        confidence,
        reasoning,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.setStatus('idle');
      return {
        agentId: this.id,
        agentName: this.name,
        decision: 'abstain',
        confidence: 0,
        reasoning: `Discovery vote failed: ${String(err)}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Execution ──

  async execute(action: Action): Promise<ExecutionResult> {
    this.setStatus('executing');

    try {
      if (action.type === 'ADD_WATCHLIST') {
        const slug = (action.params['slug'] as string) ?? '';
        const name = (action.params['name'] as string) ?? slug;
        const score = (action.params['score'] as number) ?? 0;

        this.watchlist.set(slug.toLowerCase(), {
          slug,
          name,
          addedAt: new Date().toISOString(),
          lastChecked: new Date().toISOString(),
          currentScore: score,
          previousScore: 0,
          tier: score >= 85 ? 'Diamond' : score >= 70 ? 'Platinum' : score >= 50 ? 'Gold' : score >= 30 ? 'Silver' : 'Bronze',
          spikeDetected: false,
        });

        logger.info(`Discovery: Added ${slug} to watchlist (score: ${score})`);

        this.sendMessage('*', 'ALERT', {
          type: 'WATCHLIST_ADDED',
          slug,
          score,
        });

        this.setStatus('idle');

        return {
          actionId: action.id,
          agentId: this.id,
          success: true,
          details: { slug, name, score, message: `Added to watchlist` },
          timestamp: new Date().toISOString(),
        };
      }

      this.setStatus('idle');
      return {
        actionId: action.id,
        agentId: this.id,
        success: false,
        error: `Discovery does not handle action type: ${action.type}`,
        details: {},
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.setError(`Execution failed: ${String(err)}`);
      return {
        actionId: action.id,
        agentId: this.id,
        success: false,
        error: String(err),
        details: {},
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Internal Helpers ──

  private async runScrape(): Promise<void> {
    if (!this.rumbleScraper) return;

    try {
      // Trigger a re-scrape of known creators
      const profiles = this.rumbleScraper.getStartupProfiles();
      logger.info(`Discovery: Scraped ${profiles.size} creator profiles`);
      this.lastScrapeAt = new Date().toISOString();
    } catch (err) {
      logger.warn(`Discovery: Scrape failed`, { error: String(err) });
    }
  }

  private scoreAllCreators(): Array<{ slug: string; name: string; score: number; tier: string }> {
    if (!this.rumbleScraper || !this.engagementScorer) return [];

    const results: Array<{ slug: string; name: string; score: number; tier: string }> = [];
    const profiles = this.rumbleScraper.getStartupProfiles();

    for (const [slug, profile] of profiles) {
      const scored = this.engagementScorer.scoreCreator(profile);
      results.push({
        slug,
        name: profile.channelName,
        score: scored.score,
        tier: scored.tier,
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private updateWatchlist(scored: Array<{ slug: string; name: string; score: number; tier: string }>): DiscoveryEvent[] {
    const events: DiscoveryEvent[] = [];

    for (const creator of scored) {
      const key = creator.slug.toLowerCase();
      const existing = this.watchlist.get(key);

      if (existing) {
        // Update existing entry
        const previousScore = existing.currentScore;
        const previousTier = existing.tier;
        existing.previousScore = previousScore;
        existing.currentScore = creator.score;
        existing.tier = creator.tier;
        existing.lastChecked = new Date().toISOString();

        // Detect spike
        if (creator.score - previousScore >= this.spikeThreshold) {
          existing.spikeDetected = true;
          const event: DiscoveryEvent = {
            type: 'ENGAGEMENT_SPIKE',
            slug: creator.slug,
            details: `${creator.name} engagement spiked from ${previousScore} to ${creator.score}`,
            timestamp: new Date().toISOString(),
          };
          events.push(event);
          this.discoveryEvents.push(event);
        } else {
          existing.spikeDetected = false;
        }

        // Detect tier change
        if (creator.tier !== previousTier) {
          const isUpgrade = creator.score > previousScore;
          const event: DiscoveryEvent = {
            type: isUpgrade ? 'TIER_UPGRADE' : 'TIER_DOWNGRADE',
            slug: creator.slug,
            details: `${creator.name} ${isUpgrade ? 'upgraded' : 'downgraded'} from ${previousTier} to ${creator.tier}`,
            timestamp: new Date().toISOString(),
          };
          events.push(event);
          this.discoveryEvents.push(event);
        }
      } else if (creator.score >= this.minScoreForWatchlist && this.watchlist.size < this.maxWatchlistSize) {
        // New creator above threshold
        this.watchlist.set(key, {
          slug: creator.slug,
          name: creator.name,
          addedAt: new Date().toISOString(),
          lastChecked: new Date().toISOString(),
          currentScore: creator.score,
          previousScore: 0,
          tier: creator.tier,
          spikeDetected: false,
        });

        const event: DiscoveryEvent = {
          type: 'NEW_CREATOR',
          slug: creator.slug,
          details: `New creator discovered: ${creator.name} (${creator.tier}, ${creator.score}/100)`,
          timestamp: new Date().toISOString(),
        };
        events.push(event);
        this.discoveryEvents.push(event);
      }
    }

    return events;
  }

  /** Get current watchlist */
  getWatchlist(): WatchlistEntry[] {
    return [...this.watchlist.values()];
  }

  /** Get discovery events */
  getDiscoveryEvents(): DiscoveryEvent[] {
    return [...this.discoveryEvents];
  }
}

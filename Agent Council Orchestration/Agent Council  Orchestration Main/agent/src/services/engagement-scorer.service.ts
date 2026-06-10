// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Engagement Scoring Service
// Computes engagement scores from real Rumble creator data.

import { logger } from '../utils/logger.js';
import type { RumbleCreatorProfile } from './rumble-scraper.service.js';

// ── Types ───────────────────────────────────────────────────────

export type EngagementTier = 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';

export interface EngagementScore {
  channelSlug: string;
  channelName: string;
  score: number;         // 0-100
  tier: EngagementTier;
  breakdown: {
    subscriberScore: number;     // 0-25 — raw subscriber reach
    videoFrequency: number;      // 0-25 — how actively they publish
    viewToSubRatio: number;      // 0-25 — audience engagement quality
    contentRecency: number;      // 0-25 — how recent their content is
  };
  computedAt: string;
}

// ── Tier thresholds ─────────────────────────────────────────────

function getTier(score: number): EngagementTier {
  if (score >= 85) return 'Diamond';
  if (score >= 70) return 'Platinum';
  if (score >= 50) return 'Gold';
  if (score >= 30) return 'Silver';
  return 'Bronze';
}

// ── Scoring helpers ─────────────────────────────────────────────

/** Score subscribers on a log scale: 0-25 points */
function scoreSubscribers(count: number): number {
  if (count <= 0) return 0;
  // log10(1000) = 3, log10(1M) = 6, log10(10M) = 7
  // Map log10 range [2, 7] to [0, 25]
  const logVal = Math.log10(Math.max(count, 1));
  const normalized = Math.min(Math.max((logVal - 2) / 5, 0), 1);
  return Math.round(normalized * 25);
}

/** Score video publishing frequency: 0-25 points */
function scoreVideoFrequency(profile: RumbleCreatorProfile): number {
  const { recentVideos, videoCount } = profile;

  if (recentVideos.length === 0 && videoCount === 0) return 0;

  // Check how many videos in the last 7 days from RSS data
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentCount = recentVideos.filter((v) => {
    const pubTime = new Date(v.publishedAt).getTime();
    return pubTime > sevenDaysAgo && pubTime <= now;
  }).length;

  // Ideal: 5+ videos per week = max score
  // 1 per week = ~10 points
  // 0 = minimum based on total video count
  let frequencyScore = Math.min(recentCount / 5, 1) * 20;

  // Bonus for total catalog size (up to 5 extra points)
  const catalogBonus = Math.min(videoCount / 500, 1) * 5;
  frequencyScore += catalogBonus;

  return Math.round(Math.min(frequencyScore, 25));
}

/** Score view-to-subscriber ratio: 0-25 points */
function scoreViewToSubRatio(profile: RumbleCreatorProfile): number {
  const { subscriberCount, totalViews, videoCount } = profile;

  if (subscriberCount <= 0 || totalViews <= 0 || videoCount <= 0) {
    // If we have no data, give a neutral score
    return subscriberCount > 0 ? 8 : 0;
  }

  // Average views per video
  const avgViewsPerVideo = totalViews / videoCount;

  // Ratio of avg views to subscribers — >1.0 means viral reach, <0.1 means low engagement
  const ratio = avgViewsPerVideo / subscriberCount;

  // Map ratio: 0.05 -> 5pts, 0.3 -> 15pts, 1.0+ -> 25pts
  const normalized = Math.min(Math.max(ratio / 1.0, 0), 1);
  return Math.round(normalized * 25);
}

/** Score content recency: 0-25 points */
function scoreContentRecency(profile: RumbleCreatorProfile): number {
  const { recentVideos } = profile;

  if (recentVideos.length === 0) return 5; // Unknown recency, give minimal score

  // Find the most recent video
  const now = Date.now();
  let mostRecentMs = 0;
  for (const video of recentVideos) {
    const pubTime = new Date(video.publishedAt).getTime();
    if (pubTime > mostRecentMs && pubTime <= now) {
      mostRecentMs = pubTime;
    }
  }

  if (mostRecentMs === 0) return 5;

  const hoursSinceLast = (now - mostRecentMs) / (1000 * 60 * 60);

  // Published today: 25pts, yesterday: 20pts, this week: 15pts, this month: 8pts, older: 3pts
  if (hoursSinceLast <= 24) return 25;
  if (hoursSinceLast <= 48) return 20;
  if (hoursSinceLast <= 168) return 15; // 7 days
  if (hoursSinceLast <= 720) return 8;  // 30 days
  return 3;
}

// ── Service Class ───────────────────────────────────────────────

/**
 * EngagementScorerService — Computes engagement scores from Rumble creator data.
 *
 * Takes real RumbleCreatorProfile data and produces a 0-100 engagement score
 * with a tier classification (Diamond/Platinum/Gold/Silver/Bronze).
 *
 * Scoring dimensions (each 0-25 points, total 0-100):
 * 1. Subscriber reach (log-scaled)
 * 2. Video publishing frequency
 * 3. View-to-subscriber ratio (engagement quality)
 * 4. Content recency
 */
export class EngagementScorerService {
  private scores: Map<string, EngagementScore> = new Map();

  /** Compute engagement score for a creator profile */
  scoreCreator(profile: RumbleCreatorProfile): EngagementScore {
    const subscriberScore = scoreSubscribers(profile.subscriberCount);
    const videoFrequency = scoreVideoFrequency(profile);
    const viewToSubRatio = scoreViewToSubRatio(profile);
    const contentRecency = scoreContentRecency(profile);

    const totalScore = subscriberScore + videoFrequency + viewToSubRatio + contentRecency;
    const tier = getTier(totalScore);

    const result: EngagementScore = {
      channelSlug: profile.channelSlug,
      channelName: profile.channelName,
      score: totalScore,
      tier,
      breakdown: {
        subscriberScore,
        videoFrequency,
        viewToSubRatio,
        contentRecency,
      },
      computedAt: new Date().toISOString(),
    };

    this.scores.set(profile.channelSlug.toLowerCase(), result);

    logger.info(`EngagementScorer: ${profile.channelName} — ${totalScore}/100 (${tier})`, {
      subscribers: subscriberScore,
      frequency: videoFrequency,
      viewRatio: viewToSubRatio,
      recency: contentRecency,
    });

    return result;
  }

  /** Score multiple creators at once */
  scoreAll(profiles: RumbleCreatorProfile[]): EngagementScore[] {
    return profiles.map((p) => this.scoreCreator(p));
  }

  /** Get a previously computed score */
  getScore(channelSlug: string): EngagementScore | null {
    return this.scores.get(channelSlug.toLowerCase()) ?? null;
  }

  /** Get all computed scores, sorted by score descending */
  getAllScores(): EngagementScore[] {
    return Array.from(this.scores.values()).sort((a, b) => b.score - a.score);
  }

  /** Get stats */
  getStats(): { totalScored: number; tiers: Record<EngagementTier, number> } {
    const tiers: Record<EngagementTier, number> = {
      Diamond: 0,
      Platinum: 0,
      Gold: 0,
      Silver: 0,
      Bronze: 0,
    };

    for (const score of this.scores.values()) {
      tiers[score.tier]++;
    }

    return { totalScored: this.scores.size, tiers };
  }
}

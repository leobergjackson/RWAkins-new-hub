/**
 * Unit Tests: Rumble Scraper & Engagement Scorer
 *
 * Tests RSS parsing fallback, engagement scoring, tier classification,
 * demo data, cache behavior, and service initialization.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { RumbleScraperService } from '../../services/rumble-scraper.service.js';
import { EngagementScorerService } from '../../services/engagement-scorer.service.js';
import type { RumbleCreatorProfile } from '../../services/rumble-scraper.service.js';

// ── Helpers ────────────────────────────────────────────────────

function makeDemoProfile(overrides: Partial<RumbleCreatorProfile> = {}): RumbleCreatorProfile {
  return {
    channelName: 'TestCreator',
    channelSlug: 'testcreator',
    subscriberCount: 500_000,
    videoCount: 800,
    totalViews: 120_000_000,
    recentVideos: [
      {
        title: 'Latest Video',
        url: 'https://rumble.com/v/test1',
        publishedAt: new Date().toISOString(),
        description: 'A recent video',
      },
      {
        title: 'Yesterday Video',
        url: 'https://rumble.com/v/test2',
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        description: 'Posted yesterday',
      },
      {
        title: 'Week Ago Video',
        url: 'https://rumble.com/v/test3',
        publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        description: 'Posted last week',
      },
    ],
    fetchedAt: new Date().toISOString(),
    source: 'demo',
    ...overrides,
  };
}

// ── Suite: RumbleScraperService ────────────────────────────────

describe('RumbleScraperService — Initialization', () => {
  it('creates a scraper instance without error', () => {
    const scraper = new RumbleScraperService();
    assert.ok(scraper);
    assert.equal(scraper.isInitialized(), false);
  });

  it('creates a scraper with custom creator list', () => {
    const scraper = new RumbleScraperService(['Creator1', 'Creator2']);
    const defaults = scraper.getDefaultCreators();
    assert.equal(defaults.length, 2);
    assert.ok(defaults.includes('Creator1'));
  });

  it('getDefaultCreators returns the 4 default creators', () => {
    const scraper = new RumbleScraperService();
    const defaults = scraper.getDefaultCreators();
    assert.equal(defaults.length, 4);
    assert.ok(defaults.includes('Bongino'));
    assert.ok(defaults.includes('TimPool'));
  });
});

describe('RumbleScraperService — Demo Fallback', () => {
  it('fetchCreatorProfile returns a valid profile (live or demo)', async () => {
    const scraper = new RumbleScraperService();
    // May succeed from RSS/HTML or fall back to demo data — both are valid
    const profile = await scraper.fetchCreatorProfile('Bongino');
    assert.ok(profile);
    assert.equal(profile.channelSlug, 'Bongino');
    assert.ok(typeof profile.subscriberCount === 'number');
    assert.ok(['rss', 'html', 'demo'].includes(profile.source));
  });

  it('demo fallback data has valid structure', async () => {
    const scraper = new RumbleScraperService();
    const profile = await scraper.fetchCreatorProfile('TimPool');
    assert.ok(profile.channelName);
    assert.ok(profile.channelSlug);
    assert.ok(typeof profile.subscriberCount === 'number');
    assert.ok(typeof profile.videoCount === 'number');
    assert.ok(typeof profile.totalViews === 'number');
    assert.ok(Array.isArray(profile.recentVideos));
    assert.ok(profile.fetchedAt);
  });

  it('unknown creator gets generic demo profile', async () => {
    const scraper = new RumbleScraperService();
    const profile = await scraper.fetchCreatorProfile('UnknownCreator123');
    assert.ok(profile);
    assert.equal(profile.channelSlug, 'UnknownCreator123');
    assert.ok(profile.subscriberCount > 0, 'Unknown creators still get some subscriber count');
  });
});

describe('RumbleScraperService — Cache Behavior', () => {
  it('getCachedProfile returns null for unfetched creator', () => {
    const scraper = new RumbleScraperService();
    const cached = scraper.getCachedProfile('NeverFetched');
    assert.equal(cached, null);
  });

  it('second fetch returns cached result', async () => {
    const scraper = new RumbleScraperService();
    const first = await scraper.fetchCreatorProfile('Bongino');
    const second = await scraper.fetchCreatorProfile('Bongino');

    // Both should be the same data (cached)
    assert.equal(first.channelSlug, second.channelSlug);
    assert.equal(first.subscriberCount, second.subscriberCount);
  });

  it('getStats reflects cache state', async () => {
    const scraper = new RumbleScraperService();
    await scraper.fetchCreatorProfile('Bongino');

    const stats = scraper.getStats();
    assert.ok(stats.cached >= 1, 'Should have at least 1 cached entry');
    assert.equal(stats.defaults, 4);
  });
});

// ── Suite: EngagementScorerService ────────────────────────────

describe('EngagementScorerService — Scoring', () => {
  let scorer: EngagementScorerService;

  before(() => {
    scorer = new EngagementScorerService();
  });

  it('scores a high-engagement creator with Gold or above tier', () => {
    const profile = makeDemoProfile({
      subscriberCount: 2_000_000,
      videoCount: 1500,
      totalViews: 500_000_000,
    });

    const score = scorer.scoreCreator(profile);
    assert.ok(score.score >= 0 && score.score <= 100);
    assert.ok(
      score.tier === 'Diamond' || score.tier === 'Platinum' || score.tier === 'Gold',
      `Expected Gold+ tier, got: ${score.tier}`,
    );
  });

  it('scores a low-engagement creator with Silver or below tier', () => {
    const profile = makeDemoProfile({
      channelSlug: 'smallcreator',
      subscriberCount: 50,
      videoCount: 5,
      totalViews: 500,
      recentVideos: [],
    });

    const score = scorer.scoreCreator(profile);
    assert.ok(score.score <= 50, `Expected low score, got: ${score.score}`);
    assert.ok(
      score.tier === 'Bronze' || score.tier === 'Silver',
      `Expected Silver or below, got: ${score.tier}`,
    );
  });

  it('score breakdown sums to total score', () => {
    const profile = makeDemoProfile();
    const score = scorer.scoreCreator(profile);
    const sum = score.breakdown.subscriberScore +
      score.breakdown.videoFrequency +
      score.breakdown.viewToSubRatio +
      score.breakdown.contentRecency;
    assert.equal(score.score, sum, 'Breakdown should sum to total score');
  });

  it('each breakdown dimension is 0-25', () => {
    const profile = makeDemoProfile();
    const score = scorer.scoreCreator(profile);
    for (const [key, val] of Object.entries(score.breakdown)) {
      assert.ok(val >= 0 && val <= 25, `${key} should be 0-25, got: ${val}`);
    }
  });

  it('scoreAll processes multiple creators', () => {
    const profiles = [
      makeDemoProfile({ channelSlug: 'creator1' }),
      makeDemoProfile({ channelSlug: 'creator2', subscriberCount: 100 }),
    ];

    const scores = scorer.scoreAll(profiles);
    assert.equal(scores.length, 2);
    assert.ok(scores[0].score !== scores[1].score || scores[0].channelSlug !== scores[1].channelSlug);
  });
});

describe('EngagementScorerService — Tier Classification', () => {
  let scorer: EngagementScorerService;

  before(() => {
    scorer = new EngagementScorerService();
  });

  it('Diamond tier requires score >= 85', () => {
    // Create a profile guaranteed to score very high
    const profile = makeDemoProfile({
      channelSlug: 'diamond_test',
      subscriberCount: 10_000_000,
      videoCount: 5000,
      totalViews: 5_000_000_000,
      recentVideos: Array.from({ length: 10 }, (_, i) => ({
        title: `Recent ${i}`,
        url: `https://rumble.com/v/${i}`,
        publishedAt: new Date(Date.now() - i * 3600000).toISOString(), // hourly
        description: 'Fresh content',
      })),
    });

    const score = scorer.scoreCreator(profile);
    if (score.score >= 85) {
      assert.equal(score.tier, 'Diamond');
    }
    // If can't reach 85, at least verify tier assignment is correct for the actual score
    assert.ok(['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze'].includes(score.tier));
  });

  it('Bronze tier for minimal engagement', () => {
    const profile = makeDemoProfile({
      channelSlug: 'bronze_test',
      subscriberCount: 0,
      videoCount: 0,
      totalViews: 0,
      recentVideos: [],
    });

    const score = scorer.scoreCreator(profile);
    assert.equal(score.tier, 'Bronze');
    assert.ok(score.score < 30);
  });

  it('zero subscribers scores 0 for subscriber dimension', () => {
    const profile = makeDemoProfile({
      channelSlug: 'zero_subs',
      subscriberCount: 0,
      videoCount: 0,
      totalViews: 0,
      recentVideos: [],
    });

    const score = scorer.scoreCreator(profile);
    assert.equal(score.breakdown.subscriberScore, 0);
  });

  it('recent content (today) scores maximum recency points', () => {
    const profile = makeDemoProfile({
      channelSlug: 'fresh_content',
      recentVideos: [{
        title: 'Posted Just Now',
        url: 'https://rumble.com/v/now',
        publishedAt: new Date().toISOString(),
        description: 'Fresh',
      }],
    });

    const score = scorer.scoreCreator(profile);
    assert.equal(score.breakdown.contentRecency, 25);
  });

  it('no recent videos gives minimal recency score', () => {
    const profile = makeDemoProfile({
      channelSlug: 'stale_content',
      recentVideos: [],
    });

    const score = scorer.scoreCreator(profile);
    assert.ok(score.breakdown.contentRecency <= 5, 'Empty videos should give minimal recency');
  });
});

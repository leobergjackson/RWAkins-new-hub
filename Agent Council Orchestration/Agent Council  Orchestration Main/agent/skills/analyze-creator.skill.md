---
name: analyze-creator
version: 1.0.0
description: Analyze content creator engagement quality and assign tipping tier
author: Danish A
license: Apache-2.0
protocol: openclaw-v1
agent: aerofyta
tags: [analytics, creators, engagement, scoring, rumble]
requires:
  tools:
    - aerofyta_creator_score
    - aerofyta_creator_stats
    - aerofyta_get_creator_analytics
    - aerofyta_get_top_creators
    - aerofyta_search_youtube
    - aerofyta_rss_feeds
---

# Analyze Creator

Evaluate content creator engagement quality across platforms. Produces a composite engagement score, assigns a tipping tier, and generates a recommendation for autonomous tip eligibility.

## Trigger

Activate this skill when:
- User asks about a creator's stats, score, or tip eligibility
- `tip-creator` skill calls this as a prerequisite step
- Autonomous loop needs to evaluate a creator before auto-tipping
- User requests a ranked list of top creators
- Periodic re-scoring cycle runs (every 6 hours by default)

Do NOT activate when:
- User only wants to send a tip without analysis (direct `tip-creator` with known creator)
- Creator data is cached and less than 1 hour old (return cached result)

## Input

| Field | Type | Required | Description |
|---|---|---|---|
| `creator` | string | yes | Creator name, handle, channel URL, or ID |
| `platform` | string | no | Platform to analyze: `rumble`, `youtube`, `rss` (default: `rumble`) |
| `depth` | string | no | Analysis depth: `quick` (cached/basic), `standard`, `deep` (default: `standard`) |
| `lookback_days` | number | no | Days of historical data to analyze (default: 30) |

## Process

### Step 1: Creator Discovery
Resolve the creator identifier and fetch raw data.
- If platform is `rumble`: query Rumble API/scrape for channel data
- If platform is `youtube`: call `aerofyta_search_youtube` to find channel
- If platform is `rss`: call `aerofyta_rss_feeds` for content feed data
- Extract: subscriber count, total videos, join date, recent upload frequency
- If creator not found on specified platform, search alternatives and report

### Step 2: Content Activity Metrics
Analyze recent content output patterns.
- Count videos/posts in the lookback period
- Calculate upload frequency (posts per week)
- Measure consistency: standard deviation of inter-post intervals
- Identify trends: increasing, stable, or declining output
- Flag anomalies: sudden bursts (possible spam) or long gaps (inactive)

### Step 3: Engagement Quality Scoring
Calculate the composite engagement score (0.0 to 1.0).

Score components and weights:
- **View-to-subscriber ratio** (20%): Views per video / subscriber count. Higher = more reach.
- **Engagement rate** (25%): (likes + comments) / views. Measures audience interaction depth.
- **Consistency score** (20%): Regularity of uploads. Penalizes sporadic activity.
- **Growth trajectory** (15%): Month-over-month subscriber and view growth rate.
- **Content recency** (10%): Time since last upload. Decays if stale.
- **Community signals** (10%): Comment sentiment, reply rate, community tab activity.

Formula:
```
engagement_score = (view_ratio * 0.20) + (engagement_rate * 0.25) +
                   (consistency * 0.20) + (growth * 0.15) +
                   (recency * 0.10) + (community * 0.10)
```

Normalize each component to 0.0-1.0 range using percentile ranks against known creator population.

### Step 4: Tier Assignment
Map the engagement score to a tipping tier.

| Score Range | Tier | Auto-Tip Eligible | Max Auto-Tip |
|---|---|---|---|
| 0.90 - 1.00 | Diamond | Yes | 100 USDT |
| 0.75 - 0.89 | Gold | Yes | 50 USDT |
| 0.50 - 0.74 | Silver | Yes | 25 USDT |
| 0.30 - 0.49 | Bronze | Yes (with caution) | 10 USDT |
| 0.00 - 0.29 | Unranked | No | 0 USDT |

### Step 5: Recommendation Generation
Produce an actionable recommendation.
- If eligible: suggest tip amount based on tier and recent engagement trend
- If borderline (0.25-0.35): flag for manual review with reasoning
- If ineligible: explain what the creator needs to improve
- Include confidence level: high (50+ data points), medium (10-49), low (< 10)
- Call `aerofyta_get_creator_analytics` for trend visualization data

### Step 6: Cache & Store
Persist results for reuse.
- Cache the full analysis with TTL based on depth (quick: 6h, standard: 1h, deep: 30min)
- Update the creator registry with latest score and tier
- If score changed significantly (>0.1 delta), emit alert for dashboard

## Output

| Field | Type | Description |
|---|---|---|
| `creator` | string | Resolved creator name/handle |
| `platform` | string | Platform analyzed |
| `engagement_score` | number | Composite score (0.0 to 1.0) |
| `tier` | string | Assigned tier: Diamond, Gold, Silver, Bronze, Unranked |
| `auto_tip_eligible` | boolean | Whether creator qualifies for autonomous tips |
| `max_auto_tip` | number | Maximum autonomous tip amount in USDT |
| `recommended_tip` | number | Suggested tip amount based on engagement |
| `confidence` | string | Score confidence: high, medium, low |
| `metrics` | object | Breakdown of individual scoring components |
| `trend` | string | Engagement trend: rising, stable, declining |
| `data_points` | number | Number of content items analyzed |
| `reasoning` | string | Human-readable explanation of the assessment |
| `cached_until` | string | ISO timestamp when this analysis expires |

## Examples

### Example 1: High-engagement Rumble creator
```
Input:
  creator: "CryptoTeacher"
  platform: "rumble"
  depth: "standard"

Process:
  1. Resolve "CryptoTeacher" on Rumble -> channel ID r_ct_12345
  2. Activity: 12 videos in 30 days, avg 2.8/week, consistency score 0.85
  3. Scoring:
     - View ratio: 0.82 (8.2K avg views, 10K subs)
     - Engagement: 0.79 (6.1% like+comment rate)
     - Consistency: 0.85 (regular uploads, low variance)
     - Growth: 0.71 (+12% subs this month)
     - Recency: 0.95 (posted 2 days ago)
     - Community: 0.68 (replies to 40% of comments)
  4. Composite: 0.80 -> Gold tier
  5. Recommendation: Tip 5-15 USDT, trending upward

Output:
  creator: "CryptoTeacher"
  platform: "rumble"
  engagement_score: 0.80
  tier: "Gold"
  auto_tip_eligible: true
  max_auto_tip: 50.0
  recommended_tip: 10.0
  confidence: "high"
  metrics:
    view_ratio: 0.82
    engagement_rate: 0.79
    consistency: 0.85
    growth: 0.71
    recency: 0.95
    community: 0.68
  trend: "rising"
  data_points: 12
  reasoning: "CryptoTeacher is a Gold tier creator with strong engagement (0.80). Upload consistency is excellent at 2.8/week. Growth trajectory is positive at +12% MoM. Recommended for autonomous tipping at 10 USDT."
```

### Example 2: New creator with insufficient data
```
Input:
  creator: "NewBlockchainFan"
  platform: "rumble"
  depth: "quick"

Process:
  1. Resolve "NewBlockchainFan" on Rumble -> channel found, 3 videos total
  2. Activity: 3 videos in 30 days, insufficient data for consistency scoring
  3. Scoring (partial):
     - View ratio: 0.45 (limited sample)
     - Engagement: 0.62 (decent for small channel)
     - Consistency: N/A (insufficient data, default 0.3)
     - Growth: N/A (no month-over-month comparison)
     - Recency: 0.80 (posted 5 days ago)
     - Community: 0.40 (limited comment activity)
  4. Composite: 0.42 -> Bronze tier (low confidence)
  5. Recommendation: Eligible with caution, manual review suggested

Output:
  creator: "NewBlockchainFan"
  engagement_score: 0.42
  tier: "Bronze"
  auto_tip_eligible: true
  max_auto_tip: 10.0
  recommended_tip: 2.0
  confidence: "low"
  trend: "insufficient_data"
  data_points: 3
  reasoning: "NewBlockchainFan has only 3 data points, resulting in low confidence scoring. Early engagement signals are moderate (0.42, Bronze). Recommend manual review or waiting for 5+ videos before autonomous tipping above 2 USDT."
```

### Example 3: Inactive creator
```
Input:
  creator: "OldCryptoChannel"
  platform: "rumble"

Process:
  1. Resolve on Rumble -> found, 50 videos, but last upload 45 days ago
  2. Activity: 0 videos in 30-day lookback
  3. Recency penalty: score 0.10 (stale content)
  4. Historical engagement was Gold-level but recency drags composite down
  5. Composite: 0.28 -> Unranked

Output:
  creator: "OldCryptoChannel"
  engagement_score: 0.28
  tier: "Unranked"
  auto_tip_eligible: false
  max_auto_tip: 0
  recommended_tip: 0
  confidence: "high"
  trend: "declining"
  data_points: 0
  reasoning: "OldCryptoChannel has not uploaded in 45 days. While historical engagement was strong, the recency penalty reduces the score to 0.28 (Unranked). Creator is not eligible for autonomous tips until they resume activity."
```

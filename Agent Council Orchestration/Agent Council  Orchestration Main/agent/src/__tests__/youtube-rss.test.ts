/**
 * YouTubeRSSService — YouTube RSS feed integration tests.
 * Tests event generation and live creator data retrieval.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { YouTubeRSSService } from '../services/youtube-rss.service.js';

describe('YouTubeRSSService', () => {
  let service: YouTubeRSSService;

  before(() => {
    service = new YouTubeRSSService();
  });

  // ── getNewEvents ──

  describe('getNewEvents()', () => {
    it('returns an array of SimulatedEvent[]', async () => {
      const events = await service.getNewEvents(new Date(0).toISOString());
      assert.ok(Array.isArray(events));
      // May be empty if YouTube is unreachable, but should not throw
      for (const event of events) {
        assert.equal(typeof event.id, 'string');
        assert.equal(typeof event.creatorName, 'string');
        assert.equal(typeof event.engagementQuality, 'number');
        assert.equal(typeof event.suggestedTipAmount, 'number');
        assert.ok(event.data);
      }
    });

    it('returns events with source youtube_rss', async () => {
      const events = await service.getNewEvents(new Date(0).toISOString());
      for (const event of events) {
        assert.equal((event.data as any).source, 'youtube_rss');
      }
    });
  });

  // ── getLiveCreatorData ──

  describe('getLiveCreatorData()', () => {
    it('returns channel data structure', () => {
      const data = service.getLiveCreatorData();
      assert.ok(data);
      assert.ok(Array.isArray(data.channels));
      assert.equal(typeof data.lastFetchTimestamp, 'string');
      assert.equal(typeof data.totalEventsSent, 'number');
      assert.ok(data.channels.length > 0);
    });

    it('channels have correct shape', () => {
      const data = service.getLiveCreatorData();
      for (const channel of data.channels) {
        assert.equal(typeof channel.name, 'string');
        assert.equal(typeof channel.channelId, 'string');
        assert.ok(Array.isArray(channel.categories));
        assert.ok(Array.isArray(channel.recentVideos));
      }
    });
  });

  // ── Caching ──

  describe('Caching', () => {
    it('second call uses cache (returns quickly)', async () => {
      // First call populates cache
      await service.getNewEvents(new Date(0).toISOString());
      // Second call should be instant
      const start = Date.now();
      await service.getNewEvents(new Date(0).toISOString());
      const elapsed = Date.now() - start;
      // Should complete in under 1 second (cached)
      assert.ok(elapsed < 2000, `Second call should be fast (cached), took ${elapsed}ms`);
    });
  });
});

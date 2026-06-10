/**
 * YouTubeAPIService — YouTube Data API v3 integration.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { YouTubeAPIService } from '../services/youtube-api.service.js';

describe('YouTubeAPIService', () => {
  let service: YouTubeAPIService;
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.YOUTUBE_API_KEY;

  before(() => {
    // Clear API key so service initializes as unavailable
    delete process.env.YOUTUBE_API_KEY;
    service = new YouTubeAPIService();
  });

  after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey) process.env.YOUTUBE_API_KEY = originalKey;
  });

  it('isAvailable returns false when no API key', () => {
    assert.equal(service.isAvailable(), false);
  });

  it('searchVideos returns empty array when no API key', async () => {
    const results = await service.searchVideos('test');
    assert.deepEqual(results, []);
  });

  it('getQuotaUsed returns a number', () => {
    const quota = service.getQuotaUsed();
    assert.equal(typeof quota, 'number');
    assert.equal(quota, 0);
  });

  it('with API key, isAvailable returns true', () => {
    process.env.YOUTUBE_API_KEY = 'fake-key-for-test';
    const withKey = new YouTubeAPIService();
    assert.equal(withKey.isAvailable(), true);
    delete process.env.YOUTUBE_API_KEY;
  });

  it('searchVideos with mock API returns results', async () => {
    process.env.YOUTUBE_API_KEY = 'fake-key';
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({
        items: [{
          id: { videoId: 'abc123' },
          snippet: {
            title: 'Test Video',
            channelId: 'ch1',
            channelTitle: 'Test Channel',
            publishedAt: '2026-01-01T00:00:00Z',
            description: 'A test video',
            thumbnails: { high: { url: 'https://img.example.com/thumb.jpg' } },
          },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as any;

    const svc = new YouTubeAPIService();
    const results = await svc.searchVideos('test', 1);
    assert.ok(Array.isArray(results));
    delete process.env.YOUTUBE_API_KEY;
    globalThis.fetch = originalFetch;
  });
});

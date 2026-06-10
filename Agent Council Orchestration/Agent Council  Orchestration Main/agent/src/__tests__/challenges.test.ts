/**
 * ChallengesService — gamified daily/weekly challenges and streaks.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ChallengesService } from '../services/challenges.service.js';

describe('ChallengesService', () => {
  let service: ChallengesService;

  before(() => {
    service = new ChallengesService();
  });

  it('getChallenges returns daily and weekly arrays', () => {
    const { daily, weekly } = service.getChallenges();
    assert.ok(Array.isArray(daily));
    assert.ok(Array.isArray(weekly));
    assert.ok(daily.length >= 3);
    assert.ok(weekly.length >= 3);
  });

  it('challenges have required fields', () => {
    const { daily } = service.getChallenges();
    for (const c of daily) {
      assert.ok(c.id);
      assert.ok(c.title);
      assert.equal(typeof c.target, 'number');
      assert.equal(typeof c.progress, 'number');
      assert.equal(typeof c.completed, 'boolean');
    }
  });

  it('updateProgress increments tip_sent challenge', () => {
    const before_ = service.getChallenges().daily.find(c => c.id.includes('tip_sent'));
    const progressBefore = before_?.progress ?? 0;
    service.updateProgress('tip_sent', { recipient: '0xTest' });
    const after = service.getChallenges().daily.find(c => c.id.includes('daily-tip_sent'));
    assert.ok(after);
    assert.ok(after!.progress > progressBefore);
  });

  it('getStreakData returns streak info', () => {
    const streak = service.getStreakData();
    assert.equal(typeof streak.currentStreak, 'number');
    assert.equal(typeof streak.longestStreak, 'number');
    assert.ok(Array.isArray(streak.streakMilestones));
  });

  it('resetDailyChallenges resets progress', () => {
    service.resetDailyChallenges();
    const { daily } = service.getChallenges();
    for (const c of daily) {
      assert.equal(c.progress, 0);
      assert.equal(c.completed, false);
    }
  });
});

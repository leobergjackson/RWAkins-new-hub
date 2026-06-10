/**
 * Deep RumbleService tests — engagement score, pools, leaderboard, collab splits.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RumbleService } from '../services/rumble.service.js';

const __testDir = dirname(fileURLToPath(import.meta.url));
const RUMBLE_FILE = join(__testDir, '..', '..', '.rumble-creators.json');

before(() => {
  if (existsSync(RUMBLE_FILE)) unlinkSync(RUMBLE_FILE);
});

describe('RumbleService — Creator Management', () => {
  it('registerCreator returns a creator with correct fields', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('TestCreator', 'https://rumble.com/test', '0xabc', ['tech']);
    assert.ok(c.id);
    assert.equal(c.name, 'TestCreator');
    assert.equal(c.channelUrl, 'https://rumble.com/test');
    assert.equal(c.walletAddress, '0xabc');
    assert.deepEqual(c.categories, ['tech']);
    assert.equal(c.totalTipsReceived, 0);
    assert.equal(c.totalTipAmount, 0);
  });

  it('registerCreator updates existing creator on same channelUrl', () => {
    const svc = new RumbleService();
    const c1 = svc.registerCreator('OldName', 'https://rumble.com/dup', '0x111', ['gaming']);
    const c2 = svc.registerCreator('NewName', 'https://rumble.com/dup', '0x222', ['tech']);
    assert.equal(c1.id, c2.id);
    assert.equal(c2.name, 'NewName');
    assert.equal(c2.walletAddress, '0x222');
  });

  it('getCreator returns undefined for unknown id', () => {
    const svc = new RumbleService();
    assert.equal(svc.getCreator('nonexistent'), undefined);
  });

  it('listCreators sorts by totalTipAmount descending', () => {
    const svc = new RumbleService();
    svc.registerCreator('Low', 'https://rumble.com/low', '0x1', ['tech']);
    const c2 = svc.registerCreator('High', 'https://rumble.com/high', '0x2', ['tech']);
    // Simulate tips via pool contributions
    const pool = svc.createTipPool(c2.id, 1, 'fund');
    svc.contributeToPool(pool.id, 0.5, 'user1');
    const list = svc.listCreators();
    assert.equal(list[0].name, 'High');
  });
});

describe('RumbleService — Watch-Time & Auto-Tip', () => {
  it('recordWatchTime records a session', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('WatchMe', 'https://rumble.com/watch', '0xw', ['edu']);
    const session = svc.recordWatchTime(c.id, 'vid1', 85, 'user1');
    assert.ok(session.id);
    assert.equal(session.watchPercent, 85);
    assert.equal(session.creatorId, c.id);
    assert.equal(session.autoTipTriggered, false);
  });

  it('recordWatchTime throws for unknown creator', () => {
    const svc = new RumbleService();
    assert.throws(() => svc.recordWatchTime('bad-id', 'vid', 50, 'u'), /Creator not found/);
  });

  it('auto-tip triggers when rules match', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('AutoCreator', 'https://rumble.com/auto', '0xa', ['tech']);
    svc.setAutoTipRules('user2', [
      { minWatchPercent: 70, tipAmount: 0.01, maxTipsPerDay: 5, enabledCategories: ['tech'], enabled: true },
    ]);
    const session = svc.recordWatchTime(c.id, 'vid2', 90, 'user2');
    assert.equal(session.autoTipTriggered, true);
  });

  it('auto-tip does NOT trigger when watchPercent too low', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('LowWatch', 'https://rumble.com/loww', '0xl', ['tech']);
    svc.setAutoTipRules('user3', [
      { minWatchPercent: 80, tipAmount: 0.01, maxTipsPerDay: 5, enabledCategories: ['tech'], enabled: true },
    ]);
    const session = svc.recordWatchTime(c.id, 'vid3', 50, 'user3');
    assert.equal(session.autoTipTriggered, false);
  });

  it('getAutoTipRules returns empty for unknown user', () => {
    const svc = new RumbleService();
    assert.deepEqual(svc.getAutoTipRules('nobody'), []);
  });
});

describe('RumbleService — Community Pools', () => {
  it('createTipPool creates pool with correct fields', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('PoolCreator', 'https://rumble.com/pool', '0xp', ['crypto']);
    const pool = svc.createTipPool(c.id, 1.0, 'Equipment Fund');
    assert.ok(pool.id);
    assert.equal(pool.goalAmount, 1.0);
    assert.equal(pool.currentAmount, 0);
    assert.equal(pool.completed, false);
  });

  it('contributeToPool increases currentAmount and marks completed at goal', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('GoalCreator', 'https://rumble.com/goal', '0xg', ['finance']);
    const pool = svc.createTipPool(c.id, 0.1, 'Goal Test');
    svc.contributeToPool(pool.id, 0.06, 'u1');
    assert.equal(pool.completed, false);
    svc.contributeToPool(pool.id, 0.05, 'u2');
    assert.equal(pool.completed, true);
  });

  it('contributeToPool throws for nonexistent pool', () => {
    const svc = new RumbleService();
    assert.throws(() => svc.contributeToPool('bad', 1, 'u'), /Pool not found/);
  });

  it('contributeToPool throws for completed pool', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('DoneCreator', 'https://rumble.com/done', '0xd', ['tech']);
    const pool = svc.createTipPool(c.id, 0.01, 'Done Pool');
    svc.contributeToPool(pool.id, 0.01, 'u1');
    assert.throws(() => svc.contributeToPool(pool.id, 0.01, 'u2'), /already reached its goal/);
  });

  it('getActivePools returns only incomplete pools', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('ActivePool', 'https://rumble.com/active', '0xap', ['gaming']);
    svc.createTipPool(c.id, 10, 'Active');
    const p2 = svc.createTipPool(c.id, 0.01, 'Complete');
    svc.contributeToPool(p2.id, 0.01, 'u');
    const active = svc.getActivePools();
    assert.ok(active.every(p => !p.completed));
  });
});

describe('RumbleService — Engagement Score', () => {
  it('returns zero score for no watch history', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('NoHistory', 'https://rumble.com/nh', '0xnh', ['tech']);
    const result = svc.calculateEngagementScore('nouser', c.id);
    assert.equal(result.score, 0);
    assert.equal(result.suggestedMultiplier, 0);
    assert.ok(result.reasoning.includes('No watch history'));
  });

  it('calculates engagement score with watch data', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('EngCreator', 'https://rumble.com/eng', '0xeng', ['education']);
    // Record some sessions
    svc.recordWatchTime(c.id, 'v1', 90, 'engUser');
    svc.recordWatchTime(c.id, 'v2', 85, 'engUser');
    svc.recordWatchTime(c.id, 'v1', 95, 'engUser'); // rewatch
    const result = svc.calculateEngagementScore('engUser', c.id);
    assert.ok(result.score > 0);
    assert.ok(result.suggestedMultiplier > 0.5);
    assert.ok(result.breakdown.watchCompletion > 0);
  });

  it('premium category boosts categoryPremium to 1.0', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('EduCreator', 'https://rumble.com/edu', '0xedu', ['education']);
    svc.recordWatchTime(c.id, 'v1', 90, 'eduUser');
    const result = svc.calculateEngagementScore('eduUser', c.id);
    assert.equal(result.breakdown.categoryPremium, 1.0);
  });

  it('non-premium category has categoryPremium of 0.5', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('GamCreator', 'https://rumble.com/gam', '0xgam', ['gaming']);
    svc.recordWatchTime(c.id, 'v1', 90, 'gamUser');
    const result = svc.calculateEngagementScore('gamUser', c.id);
    assert.equal(result.breakdown.categoryPremium, 0.5);
  });
});

describe('RumbleService — Event Triggers', () => {
  it('registerEventTrigger creates trigger', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('TrigCreator', 'https://rumble.com/trig', '0xt', ['tech']);
    const trigger = svc.registerEventTrigger(c.id, 'new_video', 0.01);
    assert.ok(trigger.id);
    assert.equal(trigger.event, 'new_video');
    assert.equal(trigger.triggerCount, 0);
  });

  it('processEvent fires matching trigger and increments count', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('EventCreator', 'https://rumble.com/event', '0xe', ['tech']);
    svc.registerEventTrigger(c.id, 'milestone', 0.05);
    const fired = svc.processEvent(c.id, 'milestone');
    assert.ok(fired);
    assert.equal(fired!.triggerCount, 1);
  });

  it('processEvent returns undefined for unmatched event', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('NoEvent', 'https://rumble.com/noe', '0xne', ['tech']);
    const fired = svc.processEvent(c.id, 'live_start');
    assert.equal(fired, undefined);
  });
});

describe('RumbleService — Leaderboard', () => {
  it('getCreatorLeaderboard returns ranked list', () => {
    const svc = new RumbleService();
    svc.registerCreator('LB1', 'https://rumble.com/lb1', '0xlb1', ['tech']);
    svc.registerCreator('LB2', 'https://rumble.com/lb2', '0xlb2', ['tech']);
    const lb = svc.getCreatorLeaderboard();
    assert.ok(lb.length >= 2);
    assert.equal(lb[0].rank, 1);
    assert.equal(lb[1].rank, 2);
  });
});

describe('RumbleService — Collab Splits', () => {
  it('createCollabSplit validates percentages sum to 100', () => {
    const svc = new RumbleService();
    const c1 = svc.registerCreator('Collab1', 'https://rumble.com/c1', '0xc1', ['tech']);
    const c2 = svc.registerCreator('Collab2', 'https://rumble.com/c2', '0xc2', ['tech']);
    const split = svc.createCollabSplit('video1', [
      { creatorId: c1.id, percentage: 60 },
      { creatorId: c2.id, percentage: 40 },
    ]);
    assert.ok(split.id);
    assert.equal(split.creators.length, 2);
  });

  it('createCollabSplit throws on invalid percentages', () => {
    const svc = new RumbleService();
    const c = svc.registerCreator('BadSplit', 'https://rumble.com/bs', '0xbs', ['tech']);
    assert.throws(
      () => svc.createCollabSplit('v', [{ creatorId: c.id, percentage: 50 }]),
      /must sum to 100/,
    );
  });

  it('createCollabSplit throws for unknown creator', () => {
    const svc = new RumbleService();
    assert.throws(
      () => svc.createCollabSplit('v', [{ creatorId: 'bad', percentage: 100 }]),
      /Creator not found/,
    );
  });
});

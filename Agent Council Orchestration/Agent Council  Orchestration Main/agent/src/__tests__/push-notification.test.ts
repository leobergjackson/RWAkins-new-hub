/**
 * Push Notification Service tests — SSE-based real-time notification hub.
 * Tests publish, history, read state, and filtering.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PushNotificationService } from '../services/push-notification.service.js';

// ── Publishing ────────────────────────────────────────────────

describe('PushNotificationService — publishing', () => {
  it('publishes a notification with auto-generated id and timestamp', () => {
    const svc = new PushNotificationService();
    const notif = svc.publish({
      type: 'tip_executed',
      title: 'Tip Sent',
      message: 'Sent 0.01 USDT to CryptoDaily',
      severity: 'success',
    });

    assert.ok(notif.id.startsWith('notif_'));
    assert.equal(notif.type, 'tip_executed');
    assert.equal(notif.read, false);
    assert.ok(notif.timestamp);
    svc.dispose();
  });

  it('notify convenience method works with defaults', () => {
    const svc = new PushNotificationService();
    const notif = svc.notify('escrow_created', 'Escrow Created', 'New escrow for 0.05 USDT');

    assert.equal(notif.type, 'escrow_created');
    assert.equal(notif.severity, 'info'); // default
    assert.equal(notif.title, 'Escrow Created');
    svc.dispose();
  });

  it('stores notifications with data payload', () => {
    const svc = new PushNotificationService();
    const notif = svc.publish({
      type: 'safety_alert',
      title: 'Rate Limit',
      message: 'Hourly spend limit approaching',
      severity: 'warning',
      data: { currentSpend: 0.04, limit: 0.05 },
    });

    assert.deepEqual(notif.data, { currentSpend: 0.04, limit: 0.05 });
    svc.dispose();
  });
});

// ── History & Filtering ───────────────────────────────────────

describe('PushNotificationService — history', () => {
  it('returns history in reverse chronological order', () => {
    const svc = new PushNotificationService();
    svc.notify('tip_executed', 'First', 'first message');
    svc.notify('escrow_created', 'Second', 'second message');

    const history = svc.getHistory();
    assert.equal(history.length, 2);
    assert.equal(history[0].title, 'Second'); // Most recent first
    assert.equal(history[1].title, 'First');
    svc.dispose();
  });

  it('filters by type', () => {
    const svc = new PushNotificationService();
    svc.notify('tip_executed', 'Tip', 'tip msg');
    svc.notify('safety_alert', 'Alert', 'alert msg');
    svc.notify('tip_executed', 'Tip 2', 'tip msg 2');

    const tips = svc.getHistory({ types: ['tip_executed'] });
    assert.equal(tips.length, 2);
    assert.ok(tips.every(n => n.type === 'tip_executed'));
    svc.dispose();
  });

  it('filters by severity', () => {
    const svc = new PushNotificationService();
    svc.notify('tip_executed', 'OK', 'msg', 'success');
    svc.notify('safety_alert', 'Warn', 'msg', 'warning');
    svc.notify('tip_failed', 'Err', 'msg', 'error');

    const warnings = svc.getHistory({ severity: ['warning', 'error'] });
    assert.equal(warnings.length, 2);
    svc.dispose();
  });

  it('respects limit parameter', () => {
    const svc = new PushNotificationService();
    for (let i = 0; i < 10; i++) {
      svc.notify('cycle_completed', `Cycle ${i}`, `msg ${i}`);
    }
    const limited = svc.getHistory({ limit: 3 });
    assert.equal(limited.length, 3);
    svc.dispose();
  });
});

// ── Read State ────────────────────────────────────────────────

describe('PushNotificationService — read state', () => {
  it('marks individual notification as read', () => {
    const svc = new PushNotificationService();
    const n = svc.notify('tip_executed', 'Tip', 'msg');
    assert.equal(svc.getUnreadCount(), 1);

    const ok = svc.markRead(n.id);
    assert.equal(ok, true);
    assert.equal(svc.getUnreadCount(), 0);
    svc.dispose();
  });

  it('markAllRead clears all unread', () => {
    const svc = new PushNotificationService();
    svc.notify('tip_executed', 'T1', 'm1');
    svc.notify('tip_executed', 'T2', 'm2');
    svc.notify('tip_executed', 'T3', 'm3');
    assert.equal(svc.getUnreadCount(), 3);

    const count = svc.markAllRead();
    assert.equal(count, 3);
    assert.equal(svc.getUnreadCount(), 0);
    svc.dispose();
  });

  it('returns false for non-existent notification id', () => {
    const svc = new PushNotificationService();
    const ok = svc.markRead('notif_nonexistent');
    assert.equal(ok, false);
    svc.dispose();
  });
});

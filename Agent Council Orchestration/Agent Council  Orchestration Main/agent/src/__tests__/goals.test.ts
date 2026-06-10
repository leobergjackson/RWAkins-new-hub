/**
 * GoalsService — fundraising/tipping goals management.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { GoalsService } from '../services/goals.service.js';

describe('GoalsService', () => {
  let service: GoalsService;

  before(() => {
    service = new GoalsService();
  });

  it('createGoal returns a new goal with id and defaults', () => {
    const goal = service.createGoal({
      title: 'Test Goal',
      targetAmount: 1.0,
      token: 'USDT',
    });
    assert.ok(goal.id);
    assert.equal(goal.title, 'Test Goal');
    assert.equal(goal.targetAmount, 1.0);
    assert.equal(goal.currentAmount, 0);
    assert.equal(goal.completed, false);
  });

  it('getGoals returns all goals', () => {
    const goals = service.getGoals();
    assert.ok(Array.isArray(goals));
    assert.ok(goals.length >= 1);
  });

  it('getGoal returns a specific goal by id', () => {
    const created = service.createGoal({ title: 'Lookup', targetAmount: 5, token: 'ETH' });
    const found = service.getGoal(created.id);
    assert.ok(found);
    assert.equal(found!.title, 'Lookup');
  });

  it('updateGoal modifies goal fields', () => {
    const created = service.createGoal({ title: 'Old', targetAmount: 10, token: 'USDT' });
    const updated = service.updateGoal(created.id, { title: 'New', targetAmount: 20 });
    assert.ok(updated);
    assert.equal(updated!.title, 'New');
    assert.equal(updated!.targetAmount, 20);
  });

  it('updateGoal returns null for non-existent goal', () => {
    const result = service.updateGoal('nonexistent', { title: 'X' });
    assert.equal(result, null);
  });

  it('deleteGoal removes a goal', () => {
    const created = service.createGoal({ title: 'Delete Me', targetAmount: 1, token: 'ETH' });
    const deleted = service.deleteGoal(created.id);
    assert.equal(deleted, true);
    assert.equal(service.getGoal(created.id), undefined);
  });

  it('updateGoalProgress updates matching goals', () => {
    const goal = service.createGoal({
      title: 'Progress Test',
      targetAmount: 1.0,
      token: 'any',
      recipient: '0xProgressRecipient',
    });
    const updated = service.updateGoalProgress('0xProgressRecipient', 0.5, 'USDT');
    assert.ok(updated.length >= 1);
    const found = service.getGoal(goal.id);
    assert.ok(found);
    assert.ok(found!.currentAmount >= 0.5);
  });
});

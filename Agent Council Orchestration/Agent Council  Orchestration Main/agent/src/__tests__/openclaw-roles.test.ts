/**
 * Tests for openclaw-roles.ts — getDefaultRoles.
 * Pure function tests — no WDK required.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultRoles } from '../services/openclaw-roles.js';

const roles = getDefaultRoles();

describe('getDefaultRoles', () => {
  it('returns 5 roles', () => {
    assert.equal(roles.length, 5);
  });

  it('each role has name, permissions, description', () => {
    for (const role of roles) {
      assert.ok(role.id, 'role must have id');
      assert.ok(role.name.length > 0, `${role.id} must have name`);
      assert.ok(Array.isArray(role.permissions), `${role.id} must have permissions array`);
      assert.ok(role.permissions.length > 0, `${role.id} must have at least one permission`);
      assert.ok(role.description.length > 0, `${role.id} must have description`);
    }
  });

  it('wallet_executor has execute permission', () => {
    const we = roles.find(r => r.id === 'wallet_executor');
    assert.ok(we);
    assert.ok(we.permissions.includes('execute'));
  });

  it('safety_guardian has admin permission', () => {
    const sg = roles.find(r => r.id === 'safety_guardian');
    assert.ok(sg);
    assert.ok(sg.permissions.includes('admin'));
  });

  it('strategy_planner has only read permission', () => {
    const sp = roles.find(r => r.id === 'strategy_planner');
    assert.ok(sp);
    assert.deepEqual(sp.permissions, ['read']);
  });

  it('tip_agent has execute permission', () => {
    const ta = roles.find(r => r.id === 'tip_agent');
    assert.ok(ta);
    assert.ok(ta.permissions.includes('execute'));
  });

  it('defi_operator requires approval', () => {
    const defi = roles.find(r => r.id === 'defi_operator');
    assert.ok(defi);
    assert.equal(defi.requiresApproval, true);
  });
});

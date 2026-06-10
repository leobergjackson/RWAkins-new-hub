/**
 * Tests for openclaw-tools.ts — createBuiltInTools.
 * Verifies tool structure without calling executors.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBuiltInTools } from '../services/openclaw-tools.js';

const tools = createBuiltInTools(() => null);

describe('createBuiltInTools', () => {
  it('returns 6 tools', () => {
    assert.equal(tools.length, 6);
  });

  it('each tool has name, description, category, executor', () => {
    for (const tool of tools) {
      assert.ok(tool.name, `tool must have name`);
      assert.ok(tool.description.length > 0, `${tool.name} must have description`);
      assert.ok(tool.category, `${tool.name} must have category`);
      assert.equal(typeof tool.executor, 'function', `${tool.name} executor must be a function`);
    }
  });

  it('includes price_check tool', () => {
    assert.ok(tools.some(t => t.name === 'price_check'));
  });

  it('includes gas_estimate tool', () => {
    assert.ok(tools.some(t => t.name === 'gas_estimate'));
  });

  it('includes risk_assess tool', () => {
    assert.ok(tools.some(t => t.name === 'risk_assess'));
  });

  it('includes wallet_send tool', () => {
    assert.ok(tools.some(t => t.name === 'wallet_send'));
  });

  it('includes wallet_balance tool', () => {
    assert.ok(tools.some(t => t.name === 'wallet_balance'));
  });

  it('includes market_data tool', () => {
    assert.ok(tools.some(t => t.name === 'market_data'));
  });
});

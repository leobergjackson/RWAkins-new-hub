/**
 * GovernanceService — AI governance proposals and voting.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { GovernanceService } from '../services/governance.service.js';

describe('GovernanceService', () => {
  let service: GovernanceService;

  before(() => {
    service = new GovernanceService();
  });

  it('getGovernedState returns default config values', () => {
    const state = service.getGovernedState();
    assert.equal(typeof state.tipFeeRate, 'number');
    assert.equal(typeof state.maxTipAmountUsd, 'number');
    assert.ok(Array.isArray(state.enabledChains));
  });

  it('getGovernableParameters lists all parameters', () => {
    const params = service.getGovernableParameters();
    assert.ok(Array.isArray(params));
    assert.ok(params.length >= 10);
    const names = params.map(p => p.parameter);
    assert.ok(names.includes('tipFeeRate'));
    assert.ok(names.includes('bridgeEnabled'));
  });

  it('createProposal creates a proposal with valid id', () => {
    const result = service.createProposal({
      title: 'Increase tip fee',
      description: 'Raise fee to 0.5%',
      proposedBy: 'gov_executor',
      executionPayload: { tipFeeRate: 0.005 },
    });
    assert.ok(!('error' in result));
    if (!('error' in result)) {
      assert.ok(result.id);
      // Status may be 'voting' or 'executed' depending on auto-vote
      assert.ok(['voting', 'approved', 'executed'].includes(result.status));
      assert.ok(result.executionPayload.tipFeeRate === 0.005);
    }
  });

  it('createProposal rejects empty execution payload', () => {
    const result = service.createProposal({
      title: 'Empty',
      description: 'No payload',
      proposedBy: 'gov_executor',
      executionPayload: {},
    });
    assert.ok('error' in result);
  });

  it('getStats returns governance statistics', () => {
    const stats = service.getStats();
    assert.equal(typeof stats.totalProposals, 'number');
    assert.equal(typeof stats.governingAgents, 'number');
    assert.ok(stats.governingAgents >= 5);
  });
});

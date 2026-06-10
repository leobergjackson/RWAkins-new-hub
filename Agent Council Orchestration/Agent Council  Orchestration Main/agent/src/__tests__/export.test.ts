/**
 * ExportService — multi-format export for transaction history.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ExportService } from '../services/export.service.js';
import type { TipHistoryEntry } from '../types/index.js';

const makeTip = (overrides: Partial<TipHistoryEntry> = {}): TipHistoryEntry => ({
  id: 'tip-1',
  recipient: '0xRecipient0000000000000000000000000001',
  amount: '0.01',
  token: 'native' as const,
  chainId: 'ethereum-sepolia',
  status: 'confirmed' as const,
  txHash: '0xabc123',
  fee: '0.0001',
  reasoning: 'Test tip',
  createdAt: '2026-03-20T12:00:00.000Z',
  ...overrides,
});

describe('ExportService', () => {
  let service: ExportService;
  const history: TipHistoryEntry[] = [
    makeTip(),
    makeTip({ id: 'tip-2', status: 'failed', chainId: 'ton-testnet', token: 'usdt' }),
  ];

  before(() => {
    service = new ExportService();
  });

  it('exportCSV returns comma-separated rows with header', () => {
    const csv = service.exportCSV(history);
    const lines = csv.split('\n');
    assert.ok(lines.length >= 3); // header + 2 rows
    assert.ok(lines[0].includes('Date'));
    assert.ok(lines[0].includes('Recipient'));
    assert.ok(lines[1].includes('0xRecipient'));
  });

  it('exportJSON returns valid JSON with correct structure', () => {
    const json = service.exportJSON(history);
    const parsed = JSON.parse(json);
    assert.equal(parsed.totalEntries, 2);
    assert.ok(Array.isArray(parsed.history));
    assert.equal(parsed.history[0].token, 'ETH');
  });

  it('exportMarkdown returns a markdown table', () => {
    const md = service.exportMarkdown(history);
    assert.ok(md.includes('# AeroFyta Transaction History'));
    assert.ok(md.includes('| Date |'));
    assert.ok(md.includes('Total transactions: 2'));
  });

  it('exportSummary returns aggregated stats', () => {
    const summary = service.exportSummary(history);
    assert.ok(summary.includes('Total transactions:'));
    assert.ok(summary.includes('Success rate:'));
    assert.ok(summary.includes('Unique recipients:'));
  });
});

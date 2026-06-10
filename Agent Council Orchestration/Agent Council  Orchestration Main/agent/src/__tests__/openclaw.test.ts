/**
 * OpenClawService — ReAct Agent Framework tests.
 * Tests tool registry, role management, and ReAct trace execution.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { OpenClawService } from '../services/openclaw.service.js';
import type { ToolDefinition } from '../services/openclaw.service.js';

function makeTool(name: string, category: ToolDefinition['category'] = 'data'): ToolDefinition {
  return {
    name,
    description: `Test tool: ${name}`,
    category,
    parameters: [{ name: 'input', type: 'string', required: true, description: 'Test input' }],
    permissions: ['read'],
    maxConcurrency: 1,
    timeoutMs: 5000,
    executor: async (params) => ({
      success: true,
      data: { echo: params.input },
      executionTimeMs: 1,
    }),
  };
}

describe('OpenClawService', () => {
  let service: OpenClawService;

  before(() => {
    service = new OpenClawService();
  });

  // ── Tool Registry ──

  describe('registerTool()', () => {
    it('registers a custom tool', () => {
      service.registerTool(makeTool('test_echo'));
      const tools = service.listTools();
      const found = tools.find(t => t.name === 'test_echo');
      assert.ok(found, 'Custom tool should be registered');
      assert.equal(found!.description, 'Test tool: test_echo');
    });

    it('registers tools with different categories', () => {
      service.registerTool(makeTool('wallet_test', 'wallet'));
      service.registerTool(makeTool('safety_test', 'safety'));
      const walletTools = service.listTools('wallet');
      assert.ok(walletTools.some(t => t.name === 'wallet_test'));
      const safetyTools = service.listTools('safety');
      assert.ok(safetyTools.some(t => t.name === 'safety_test'));
    });
  });

  describe('deregisterTool()', () => {
    it('removes a registered tool', () => {
      service.registerTool(makeTool('to_remove'));
      const removed = service.deregisterTool('to_remove');
      assert.equal(removed, true);
      const tools = service.listTools();
      assert.ok(!tools.some(t => t.name === 'to_remove'));
    });

    it('returns false for non-existent tool', () => {
      const removed = service.deregisterTool('nonexistent_tool_xyz');
      assert.equal(removed, false);
    });
  });

  describe('getToolSchema()', () => {
    it('returns schemas with name, description, category, and parameters', () => {
      const schemas = service.getToolSchema();
      assert.ok(Array.isArray(schemas));
      assert.ok(schemas.length > 0, 'Should have built-in tools');
      for (const schema of schemas) {
        assert.equal(typeof schema.name, 'string');
        assert.equal(typeof schema.description, 'string');
        assert.equal(typeof schema.category, 'string');
        assert.ok(Array.isArray(schema.parameters));
      }
    });

    it('includes built-in tools like price_check', () => {
      const schemas = service.getToolSchema();
      const priceCheck = schemas.find(s => s.name === 'price_check');
      assert.ok(priceCheck, 'Should have price_check built-in tool');
    });
  });

  describe('listTools()', () => {
    it('returns all tools when no category filter', () => {
      const all = service.listTools();
      assert.ok(all.length > 0);
    });

    it('filters by category', () => {
      const dataTools = service.listTools('data');
      for (const t of dataTools) {
        assert.equal(t.category, 'data');
      }
    });
  });

  // ── Role Management ──

  describe('getRoles()', () => {
    it('returns default roles', () => {
      const roles = service.getRoles();
      assert.ok(roles.length >= 5, 'Should have at least 5 default roles');
      const roleIds = roles.map(r => r.id);
      assert.ok(roleIds.includes('wallet_executor'));
      assert.ok(roleIds.includes('strategy_planner'));
      assert.ok(roleIds.includes('safety_guardian'));
      assert.ok(roleIds.includes('defi_operator'));
      assert.ok(roleIds.includes('tip_agent'));
    });
  });

  describe('getRole()', () => {
    it('returns a specific role by ID', () => {
      const role = service.getRole('wallet_executor');
      assert.ok(role);
      assert.equal(role!.name, 'Wallet Executor');
      assert.ok(role!.permissions.includes('execute'));
    });

    it('returns undefined for unknown role', () => {
      assert.equal(service.getRole('nonexistent'), undefined);
    });
  });

  // ── Role-based access check ──

  describe('Role-based access', () => {
    it('strategy_planner has only read permission', () => {
      const role = service.getRole('strategy_planner');
      assert.ok(role);
      assert.deepEqual(role!.permissions, ['read']);
      assert.equal(role!.maxBudgetUsd, 0);
    });

    it('safety_guardian has admin permission', () => {
      const role = service.getRole('safety_guardian');
      assert.ok(role);
      assert.ok(role!.permissions.includes('admin'));
    });

    it('defi_operator requires approval', () => {
      const role = service.getRole('defi_operator');
      assert.ok(role);
      assert.equal(role!.requiresApproval, true);
    });
  });

  // ── Service wiring ──

  describe('Service wiring', () => {
    it('setWalletService does not throw', () => {
      assert.doesNotThrow(() => {
        service.setWalletService({
          sendTransaction: async () => ({ hash: '0x', fee: '0' }),
          sendUsdtTransfer: async () => ({ hash: '0x', fee: '0' }),
        });
      });
    });

    it('setAIService does not throw', () => {
      assert.doesNotThrow(() => {
        service.setAIService({
          isAvailable: () => false,
        });
      });
    });
  });
});

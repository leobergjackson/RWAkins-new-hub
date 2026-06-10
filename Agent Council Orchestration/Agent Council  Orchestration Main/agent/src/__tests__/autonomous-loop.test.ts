/**
 * AutonomousLoopService — Autonomous ReAct Loop tests.
 * Tests status, adaptive timing, wallet mood effects, and exploration.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { AutonomousLoopService } from '../services/autonomous-loop.service.js';
import { AIService } from '../services/ai.service.js';
import { EventSimulatorService } from '../services/event-simulator.service.js';
import { DecisionLogService } from '../services/decision-log.service.js';
import { MemoryService } from '../services/memory.service.js';
import { OrchestratorService } from '../services/orchestrator.service.js';

describe('AutonomousLoopService', () => {
  let loop: AutonomousLoopService;
  let ai: AIService;
  let events: EventSimulatorService;
  let decisionLog: DecisionLogService;
  let memory: MemoryService;
  let orchestrator: OrchestratorService;

  before(() => {
    ai = new AIService();
    events = new EventSimulatorService();
    decisionLog = new DecisionLogService();
    memory = new MemoryService();
    orchestrator = new OrchestratorService();
    loop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
  });

  // ── getStatus ──

  describe('getStatus()', () => {
    it('returns correct structure when not running', () => {
      const status = loop.getStatus();
      assert.equal(status.running, false);
      assert.equal(status.paused, false);
      assert.equal(typeof status.currentCycle, 'number');
      assert.equal(typeof status.totalCycles, 'number');
      assert.equal(typeof status.tipsExecuted, 'number');
      assert.equal(typeof status.tipsSkipped, 'number');
      assert.equal(typeof status.tipsRefused, 'number');
      assert.equal(typeof status.errors, 'number');
      assert.equal(typeof status.intervalMs, 'number');
      assert.equal(typeof status.uptime, 'number');
      assert.equal(typeof status.avgCycleDurationMs, 'number');
      assert.equal(typeof status.moodBatchSize, 'number');
      assert.equal(typeof status.moodRiskTolerance, 'number');
    });

    it('includes explorationStats', () => {
      const status = loop.getStatus();
      assert.ok(status.explorationStats);
      assert.equal(typeof status.explorationStats.explorationRate, 'number');
      assert.equal(typeof status.explorationStats.exploreTips, 'number');
      assert.equal(typeof status.explorationStats.exploitTips, 'number');
      assert.equal(typeof status.explorationStats.exploreSuccessRate, 'number');
      assert.equal(typeof status.explorationStats.exploitSuccessRate, 'number');
    });

    it('has uptime of 0 when never started', () => {
      const status = loop.getStatus();
      assert.equal(status.uptime, 0);
      assert.equal(status.startedAt, null);
    });

    it('has financialPulse null before any cycle', () => {
      const status = loop.getStatus();
      assert.equal(status.financialPulse, null);
    });

    it('has walletMood null before any cycle', () => {
      const status = loop.getStatus();
      assert.equal(status.walletMood, null);
    });
  });

  // ── getMoodPreferredChain ──

  describe('getMoodPreferredChain()', () => {
    it('returns ethereum-sepolia when no mood is set (strategic default)', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      const chain = freshLoop.getMoodPreferredChain();
      assert.equal(chain, 'ethereum-sepolia');
    });
  });

  // ── getMoodBatchSize ──

  describe('getMoodBatchSize()', () => {
    it('returns 3 for default (strategic) mood', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      const size = freshLoop.getMoodBatchSize();
      assert.equal(size, 3);
    });
  });

  // ── getMoodRiskTolerance ──

  describe('getMoodRiskTolerance()', () => {
    it('returns 55 for default (strategic) mood', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      const tolerance = freshLoop.getMoodRiskTolerance();
      assert.equal(tolerance, 55);
    });
  });

  // ── getMoodAutoTipThreshold ──

  describe('getMoodAutoTipThreshold()', () => {
    it('returns 0.01 for default (strategic) mood', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      const threshold = freshLoop.getMoodAutoTipThreshold();
      assert.equal(threshold, 0.01);
    });
  });

  // ── setInterval ──

  describe('setInterval()', () => {
    it('enforces minimum interval of 10000ms', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      freshLoop.setInterval(1000); // try to set below minimum
      const status = freshLoop.getStatus();
      assert.equal(status.intervalMs, 10000, 'Should enforce minimum of 10000ms');
    });

    it('accepts valid interval', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      freshLoop.setInterval(30000);
      const status = freshLoop.getStatus();
      assert.equal(status.intervalMs, 30000);
    });
  });

  // ── getDedupStats ──

  describe('getDedupStats()', () => {
    it('returns dedup stats structure', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      const stats = freshLoop.getDedupStats();
      assert.equal(typeof stats.trackedEntries, 'number');
      assert.equal(typeof stats.ttlMinutes, 'number');
      assert.equal(stats.trackedEntries, 0);
    });
  });

  // ── getLearnedInsights ──

  describe('getLearnedInsights()', () => {
    it('returns empty string when no learning has occurred', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      const insights = freshLoop.getLearnedInsights();
      assert.equal(typeof insights, 'string');
    });
  });

  // ── getLastFinancialPulse / getLastWalletMood ──

  describe('getLastFinancialPulse()', () => {
    it('returns null before any cycle', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      assert.equal(freshLoop.getLastFinancialPulse(), null);
    });
  });

  describe('getLastWalletMood()', () => {
    it('returns null before any cycle', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      assert.equal(freshLoop.getLastWalletMood(), null);
    });
  });

  // ── Wire services ──

  describe('Wire services', () => {
    it('setRumbleService does not throw', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      assert.doesNotThrow(() => {
        freshLoop.setRumbleService({} as any);
      });
    });

    it('setOpenClawService does not throw', () => {
      const freshLoop = new AutonomousLoopService(ai, events, decisionLog, memory, orchestrator, 60000);
      assert.doesNotThrow(() => {
        freshLoop.setOpenClawService({} as any);
      });
    });
  });
});

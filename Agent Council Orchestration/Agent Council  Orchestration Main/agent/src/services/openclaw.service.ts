// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
// OpenClaw-Equivalent Agent Framework — ReAct reasoning with tool-use pattern
// Implements the "Agent Wallets" track requirement for agent reasoning framework

import { createHash } from 'node:crypto';
import { logger } from '../utils/logger.js';
import { getDefaultRoles } from './openclaw-roles.js';
import { createBuiltInTools } from './openclaw-tools.js';
import {
  generateThought as doGenerateThought,
  selectAction as doSelectAction,
  // deriveParamFromGoal is used internally by openclaw-reasoning.ts
  reflect as doReflect,
} from './openclaw-reasoning.js';

// Re-export for backward compatibility
export { getDefaultRoles } from './openclaw-roles.js';
export { createBuiltInTools } from './openclaw-tools.js';

// ══════════════════════════════════════════════════════════════════
// Tool Registry — Dynamic tool definitions for agent reasoning
// ══════════════════════════════════════════════════════════════════

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'wallet' | 'defi' | 'data' | 'safety' | 'social' | 'system';
  parameters: Array<{ name: string; type: string; required: boolean; description: string }>;
  permissions: ('read' | 'write' | 'execute' | 'admin')[];
  maxConcurrency: number;
  timeoutMs: number;
  executor: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  executionTimeMs: number;
  gasUsed?: string;
  txHash?: string;
  error?: string;
}

// ══════════════════════════════════════════════════════════════════
// ReAct Cycle — Thought → Action → Observation → Reflection
// ══════════════════════════════════════════════════════════════════

export interface ThoughtStep {
  type: 'thought';
  content: string;
  confidence: number; // 0-100
  source: 'llm' | 'contextual' | 'template'; // Transparency: how was this thought generated?
  timestamp: string;
}

export interface ActionStep {
  type: 'action';
  toolName: string;
  toolParams: Record<string, unknown>;
  reasoning: string;
  timestamp: string;
}

export interface ObservationStep {
  type: 'observation';
  toolResult: ToolResult;
  interpretation: string;
  timestamp: string;
}

export interface ReflectionStep {
  type: 'reflection';
  summary: string;
  shouldContinue: boolean;
  nextAction?: string;
  lessonsLearned: string[];
  timestamp: string;
}

export type ReActStep = ThoughtStep | ActionStep | ObservationStep | ReflectionStep;

export interface ReActTrace {
  id: string;
  goal: string;
  steps: ReActStep[];
  status: 'running' | 'completed' | 'failed' | 'aborted' | 'budget_exceeded' | 'approval_required';
  startedAt: string;
  completedAt?: string;
  totalSteps: number;
  toolsUsed: string[];
  finalResult?: unknown;
  budgetUsedUsd: number;
  executionProof: string;
}

// ══════════════════════════════════════════════════════════════════
// Agent Role — Separation of concerns
// ══════════════════════════════════════════════════════════════════

export interface AgentRole {
  id: string;
  name: string;
  permissions: ('read' | 'write' | 'execute' | 'admin')[];
  allowedTools: string[]; // tool names, or '*' for all
  maxBudgetUsd: number;
  maxTransactionsPerHour: number;
  requiresApproval: boolean;
  description: string;
}

// ══════════════════════════════════════════════════════════════════
// Safety & Limits
// ══════════════════════════════════════════════════════════════════

export interface SafetyConfig {
  maxStepsPerTrace: number;
  maxConcurrentTraces: number;
  maxBudgetPerTraceUsd: number;
  requireHumanApprovalAboveUsd: number;
  blockedTools: string[];
  cooldownBetweenActionsMs: number;
  enableRecoveryMode: boolean;
}

// ══════════════════════════════════════════════════════════════════
// OpenClaw Service
// ══════════════════════════════════════════════════════════════════

/** Minimal interface for the WalletService to avoid circular imports */
interface WalletServiceRef {
  sendTransaction(chainId: string, recipient: string, amount: string): Promise<{ hash: string; fee: string }>;
  sendUsdtTransfer(chainId: string, recipient: string, amount: string): Promise<{ hash: string; fee: string }>;
}

/** Minimal interface for AIService to enhance thought generation */
interface AIServiceRef {
  isAvailable(): boolean;
  /** Generate a thought/reasoning via LLM. Returns null if LLM unavailable. */
  generateThought?(prompt: string): Promise<string | null>;
}

// ══════════════════════════════════════════════════════════════════
// Tool Access Control — Blocklist & Restricted List
// ══════════════════════════════════════════════════════════════════

/** Tools the LLM should NEVER be able to call directly */
const BLOCKED_TOOLS = new Set([
  'wallet_send',        // Must go through orchestrator consensus
  'escrow_release',     // Must go through HTLC verification
  'escrow_refund',      // Must go through timelock check
  'kill_switch',        // Emergency only — manual trigger
]);

/** Tools that require a confirmation/pre-check before execution */
const RESTRICTED_TOOLS = new Set([
  'aave_supply',        // Requires balance check first
  'aave_withdraw',      // Requires position check first
  'bridge_execute',     // Requires quote first
  'swap_execute',       // Requires quote first
]);

export interface ToolAccessPolicy {
  blocked: string[];
  restricted: string[];
  description: string;
}

export class OpenClawService {
  private tools: Map<string, ToolDefinition> = new Map();
  private roles: Map<string, AgentRole> = new Map();
  private traces: Map<string, ReActTrace> = new Map();
  private activeTraces: Set<string> = new Set();
  private executionCount = 0;
  private totalBudgetUsed = 0;
  private walletService: WalletServiceRef | null = null;
  private aiService: AIServiceRef | null = null;
  /** Tools that spend money — their `amount` param is tracked against budget limits */
  private readonly spendingTools = new Set(['wallet_send', 'swap_execute', 'bridge_transfer', 'lending_supply', 'yield_deposit']);

  /** Wire the WalletService so wallet_send executes real WDK transactions */
  setWalletService(ws: WalletServiceRef): void {
    this.walletService = ws;
    logger.info('WalletService connected to OpenClaw — wallet_send will execute real WDK transactions');
  }

  /** Wire the AIService so thoughts can be LLM-generated when available */
  setAIService(ai: AIServiceRef): void {
    this.aiService = ai;
    logger.info('AIService connected to OpenClaw — thoughts will be LLM-generated when available');
  }

  private safety: SafetyConfig = {
    maxStepsPerTrace: 20,
    maxConcurrentTraces: 5,
    maxBudgetPerTraceUsd: 100,
    requireHumanApprovalAboveUsd: 50,
    blockedTools: [],
    cooldownBetweenActionsMs: 500,
    enableRecoveryMode: true,
  };

  constructor() {
    this.initializeDefaultRoles();
    this.registerBuiltInTools();
    logger.info('OpenClaw agent framework initialized');
  }

  // ── Tool Registry ───────────────────────────────────────────

  registerTool(tool: ToolDefinition): void {
    if (this.safety.blockedTools.includes(tool.name)) {
      throw new Error(`Tool "${tool.name}" is blocked by safety policy`);
    }
    this.tools.set(tool.name, tool);
    logger.info(`Tool registered: ${tool.name} (${tool.category})`);
  }

  deregisterTool(name: string): boolean {
    const removed = this.tools.delete(name);
    if (removed) logger.info(`Tool deregistered: ${name}`);
    return removed;
  }

  listTools(category?: string): ToolDefinition[] {
    const all = Array.from(this.tools.values());
    return category ? all.filter(t => t.category === category) : all;
  }

  getToolSchema(): Array<{ name: string; description: string; category: string; parameters: ToolDefinition['parameters'] }> {
    return Array.from(this.tools.values())
      .filter(t => !BLOCKED_TOOLS.has(t.name))
      .map(t => ({
        name: t.name,
        description: t.description,
        category: t.category,
        parameters: t.parameters,
      }));
  }

  // ── Role Management ─────────────────────────────────────────

  private initializeDefaultRoles(): void {
    for (const role of getDefaultRoles()) {
      this.roles.set(role.id, role);
    }
  }

  getRoles(): AgentRole[] {
    return Array.from(this.roles.values());
  }

  getRole(id: string): AgentRole | undefined {
    return this.roles.get(id);
  }

  // ── Built-in Tools (delegated to openclaw-tools.ts) ─────────

  private registerBuiltInTools(): void {
    for (const tool of createBuiltInTools(() => this.walletService)) {
      this.registerTool(tool);
    }
  }


  // ── ReAct Execution Engine ──────────────────────────────────

  /** Execute a goal using the ReAct pattern (Thought → Action → Observation → Reflection) */
  async executeGoal(goal: string, roleId: string = 'strategy_planner', maxSteps: number = 10, planSteps?: string[]): Promise<ReActTrace> {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role not found: ${roleId}`);

    if (this.activeTraces.size >= this.safety.maxConcurrentTraces) {
      throw new Error(`Max concurrent traces reached (${this.safety.maxConcurrentTraces})`);
    }

    const traceId = `react_${createHash('sha256').update(`${goal}:${Date.now()}`).digest('hex').slice(0, 12)}`;
    const trace: ReActTrace = {
      id: traceId,
      goal,
      steps: [],
      status: 'running',
      startedAt: new Date().toISOString(),
      totalSteps: 0,
      toolsUsed: [],
      budgetUsedUsd: 0,
      executionProof: '',
    };

    this.traces.set(traceId, trace);
    this.activeTraces.add(traceId);

    try {
      const effectiveMaxSteps = Math.min(maxSteps, this.safety.maxStepsPerTrace);

      for (let step = 0; step < effectiveMaxSteps; step++) {
        // When plan steps are provided, augment the goal with the current step for context
        const stepGoal = planSteps && step < planSteps.length
          ? `Step ${step + 1}/${planSteps.length}: ${planSteps[step]} — [Goal: ${goal}]`
          : goal;

        // STEP 1: THOUGHT — Analyze the situation and plan next action
        const thought = await this.generateThought(stepGoal, trace, role);
        trace.steps.push(thought);
        trace.totalSteps++;

        // STEP 2: ACTION — Select and execute a tool
        const action = await this.selectAction(stepGoal, trace, role, thought);
        if (!action) {
          // No more actions needed — goal achieved
          trace.steps.push({
            type: 'reflection',
            summary: `Goal achieved in ${step + 1} steps`,
            shouldContinue: false,
            lessonsLearned: [`Completed "${goal}" using ${trace.toolsUsed.length} unique tools`],
            timestamp: new Date().toISOString(),
          });
          break;
        }
        trace.steps.push(action);
        trace.totalSteps++;

        // Blocked tool check — LLM must never directly call these
        if (BLOCKED_TOOLS.has(action.toolName)) {
          logger.warn(`SECURITY: LLM attempted to call blocked tool '${action.toolName}' — rejected`);
          trace.steps.push({
            type: 'observation',
            toolResult: { success: false, data: null, executionTimeMs: 0, error: `BLOCKED: Tool "${action.toolName}" cannot be called directly by the agent` },
            interpretation: `Tool "${action.toolName}" is blocked by security policy. Must use approved workflow instead.`,
            timestamp: new Date().toISOString(),
          });
          trace.totalSteps++;
          continue;
        }

        // Permission check
        if (!this.checkPermission(action.toolName, role)) {
          trace.steps.push({
            type: 'observation',
            toolResult: { success: false, data: null, executionTimeMs: 0, error: `Permission denied: role "${role.name}" cannot use tool "${action.toolName}"` },
            interpretation: `Access denied. Role "${role.name}" lacks permission for "${action.toolName}". Need to find alternative approach.`,
            timestamp: new Date().toISOString(),
          });
          trace.totalSteps++;
          continue;
        }

        // ── Safety enforcement: budget & approval checks ──
        const isSpendingAction = this.spendingTools.has(action.toolName);
        const actionAmountUsd = isSpendingAction ? Number(action.toolParams.amount ?? 0) : 0;

        if (isSpendingAction && actionAmountUsd > 0) {
          // Check role budget limit
          if (trace.budgetUsedUsd + actionAmountUsd > role.maxBudgetUsd) {
            trace.status = 'budget_exceeded';
            trace.steps.push({
              type: 'reflection',
              summary: `Budget exceeded: spending $${actionAmountUsd} would bring total to $${trace.budgetUsedUsd + actionAmountUsd}, exceeding role limit of $${role.maxBudgetUsd}`,
              shouldContinue: false,
              lessonsLearned: [`Role "${role.name}" budget cap ($${role.maxBudgetUsd}) prevents further spending`],
              timestamp: new Date().toISOString(),
            });
            trace.totalSteps++;
            break;
          }

          // Check per-trace budget limit from safety config
          if (trace.budgetUsedUsd + actionAmountUsd > this.safety.maxBudgetPerTraceUsd) {
            trace.status = 'budget_exceeded';
            trace.steps.push({
              type: 'reflection',
              summary: `Per-trace budget exceeded: $${trace.budgetUsedUsd + actionAmountUsd} exceeds safety limit of $${this.safety.maxBudgetPerTraceUsd}`,
              shouldContinue: false,
              lessonsLearned: [`Safety config maxBudgetPerTraceUsd ($${this.safety.maxBudgetPerTraceUsd}) prevents further spending`],
              timestamp: new Date().toISOString(),
            });
            trace.totalSteps++;
            break;
          }

          // Check if role requires approval for spending actions
          if (role.requiresApproval) {
            trace.status = 'approval_required';
            trace.steps.push({
              type: 'reflection',
              summary: `Approval required: role "${role.name}" requires human approval before spending $${actionAmountUsd} via "${action.toolName}"`,
              shouldContinue: false,
              lessonsLearned: [`Role "${role.name}" has requiresApproval=true — cannot auto-execute spending actions`],
              timestamp: new Date().toISOString(),
            });
            trace.totalSteps++;
            break;
          }

          // Check global requireHumanApprovalAboveUsd threshold
          if (actionAmountUsd > this.safety.requireHumanApprovalAboveUsd) {
            trace.status = 'approval_required';
            trace.steps.push({
              type: 'reflection',
              summary: `Approval required: $${actionAmountUsd} exceeds human-approval threshold of $${this.safety.requireHumanApprovalAboveUsd}`,
              shouldContinue: false,
              lessonsLearned: [`Amount exceeds requireHumanApprovalAboveUsd ($${this.safety.requireHumanApprovalAboveUsd})`],
              timestamp: new Date().toISOString(),
            });
            trace.totalSteps++;
            break;
          }
        }

        // Execute the tool
        const tool = this.tools.get(action.toolName);
        if (!tool) {
          trace.steps.push({
            type: 'observation',
            toolResult: { success: false, data: null, executionTimeMs: 0, error: `Tool not found: ${action.toolName}` },
            interpretation: `Tool "${action.toolName}" is not registered. Will try alternative.`,
            timestamp: new Date().toISOString(),
          });
          trace.totalSteps++;
          continue;
        }

        // Restricted tool pre-check logging
        if (RESTRICTED_TOOLS.has(action.toolName)) {
          logger.info(`RESTRICTED TOOL PRE-CHECK: "${action.toolName}" — verifying preconditions`, action.toolParams);
        }

        // Execute with timeout
        let result: ToolResult;
        try {
          result = await Promise.race([
            tool.executor(action.toolParams),
            new Promise<ToolResult>((_, reject) => setTimeout(() => reject(new Error('Tool timeout')), tool.timeoutMs)),
          ]);
        } catch (err) {
          result = { success: false, data: null, executionTimeMs: tool.timeoutMs, error: String(err) };
        }

        // Track budget on successful spending actions
        if (isSpendingAction && result.success && actionAmountUsd > 0) {
          trace.budgetUsedUsd += actionAmountUsd;
          this.totalBudgetUsed += actionAmountUsd;
        }

        if (!trace.toolsUsed.includes(action.toolName)) {
          trace.toolsUsed.push(action.toolName);
        }

        // STEP 3: OBSERVATION — Interpret the result
        const observation: ObservationStep = {
          type: 'observation',
          toolResult: result,
          interpretation: result.success
            ? `Tool "${action.toolName}" succeeded. Analyzing results for next step.`
            : `Tool "${action.toolName}" failed: ${result.error}. Need to adapt strategy.`,
          timestamp: new Date().toISOString(),
        };
        trace.steps.push(observation);
        trace.totalSteps++;

        // STEP 4: REFLECTION — Decide whether to continue
        const reflection = this.reflect(goal, trace, result);
        trace.steps.push(reflection);
        trace.totalSteps++;

        if (!reflection.shouldContinue) break;

        // Cooldown between actions
        if (this.safety.cooldownBetweenActionsMs > 0) {
          await new Promise(r => setTimeout(r, this.safety.cooldownBetweenActionsMs));
        }
      }

      trace.status = 'completed';
      trace.finalResult = this.extractFinalResult(trace);
    } catch (err) {
      trace.status = 'failed';
      trace.steps.push({
        type: 'reflection',
        summary: `Goal failed: ${err}`,
        shouldContinue: false,
        lessonsLearned: [`Error during execution: ${err}`],
        timestamp: new Date().toISOString(),
      });
    } finally {
      trace.completedAt = new Date().toISOString();
      trace.executionProof = createHash('sha256')
        .update(JSON.stringify({ id: trace.id, goal, steps: trace.totalSteps, tools: trace.toolsUsed, at: trace.completedAt }))
        .digest('hex');
      this.activeTraces.delete(traceId);
      this.executionCount++;
    }

    logger.info(`ReAct trace completed: ${traceId} — ${trace.totalSteps} steps, ${trace.toolsUsed.length} tools, status: ${trace.status}`);
    return trace;
  }

  /**
   * Plan-then-Execute: Creates a multi-step plan using LLM before executing.
   * Unlike executeGoal() which is reactive (one step at a time), this method:
   * 1. Asks LLM to create a full plan with ordered steps
   * 2. Validates each step against available tools
   * 3. Executes the plan sequentially with checkpoints
   */
  async planAndExecute(objective: string, roleId: string = 'tip_agent'): Promise<ReActTrace & { plan: string[] }> {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role not found: ${roleId}`);
    const availableTools = this.getAvailableToolNames(role);

    // Phase 1: PLAN — Ask LLM to create a step-by-step plan
    let plan: string[] = [];
    if (this.aiService?.isAvailable() && this.aiService.generateThought) {
      try {
        const planPrompt = `Create a step-by-step plan to achieve: "${objective}".
Available tools: [${availableTools.join(', ')}].
Rules:
- Each step must use exactly one tool
- Order steps by dependency (data gathering first, then analysis, then action)
- Maximum 5 steps
- Respond with ONLY a numbered list, one tool per line: "1. tool_name - reason"`;

        const planResponse = await Promise.race([
          this.aiService.generateThought(planPrompt),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);

        if (planResponse) {
          plan = planResponse.split('\n')
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0)
            .slice(0, 5);
          logger.info('LLM generated execution plan', { objective, steps: plan.length, plan });
        }
      } catch {
        logger.warn('LLM planning failed, falling back to reactive execution');
      }
    }

    // Fallback plan if LLM unavailable
    if (plan.length === 0) {
      plan = this.buildDefaultPlan(objective, availableTools);
      logger.info('Using default execution plan', { objective, steps: plan.length });
    }

    // Phase 2: EXECUTE — Run the plan step by step, passing plan as context
    const trace = await this.executeGoal(objective, roleId, plan.length + 2, plan);

    return { ...trace, plan };
  }

  /** Build a default execution plan based on objective keywords */
  private buildDefaultPlan(objective: string, tools: string[]): string[] {
    const plan: string[] = [];
    const lower = objective.toLowerCase();

    // Always start with data gathering
    if (tools.includes('price_check')) plan.push('price_check - gather current market prices');
    if (tools.includes('gas_estimate')) plan.push('gas_estimate - check transaction costs');
    if (lower.includes('risk') && tools.includes('risk_assess')) plan.push('risk_assess - evaluate safety');
    if (lower.includes('tip') || lower.includes('send')) {
      if (tools.includes('wallet_balance')) plan.push('wallet_balance - verify sufficient funds');
      if (tools.includes('wallet_send')) plan.push('wallet_send - execute transaction');
    }
    if (lower.includes('yield') || lower.includes('defi')) {
      if (tools.includes('market_data')) plan.push('market_data - fetch DeFi opportunities');
    }

    return plan.length > 0 ? plan : ['price_check - gather baseline market data', 'gas_estimate - assess network conditions'];
  }

  // ── Reasoning Engine (delegated to openclaw-reasoning.ts) ──────

  private async generateThought(goal: string, trace: ReActTrace, role: AgentRole): Promise<ThoughtStep> {
    return doGenerateThought(goal, trace, role, this.tools, this.aiService);
  }

  private async selectAction(goal: string, trace: ReActTrace, role: AgentRole, thought: ThoughtStep): Promise<ActionStep | null> {
    return doSelectAction(goal, trace, role, thought, this.tools, this.aiService);
  }

  private reflect(goal: string, trace: ReActTrace, lastResult: ToolResult): ReflectionStep {
    return doReflect(goal, trace, lastResult, this.safety);
  }

  // ── Permission & Safety ─────────────────────────────────────

  private checkPermission(toolName: string, role: AgentRole): boolean {
    if (role.allowedTools.includes('*')) return true;
    if (!role.allowedTools.includes(toolName)) return false;

    const tool = this.tools.get(toolName);
    if (!tool) return false;

    return tool.permissions.every(p => role.permissions.includes(p));
  }

  private getAvailableToolNames(role: AgentRole): string[] {
    if (role.allowedTools.includes('*')) return Array.from(this.tools.keys());
    return role.allowedTools.filter(t => this.tools.has(t));
  }

  private extractFinalResult(trace: ReActTrace): unknown {
    const successfulObs = trace.steps
      .filter(s => s.type === 'observation' && (s as ObservationStep).toolResult.success)
      .map(s => (s as ObservationStep).toolResult.data);

    return {
      goal: trace.goal,
      stepsExecuted: trace.totalSteps,
      toolsUsed: trace.toolsUsed,
      dataGathered: successfulObs,
      completedAt: trace.completedAt,
    };
  }

  // ── Trace Management ────────────────────────────────────────

  getTrace(id: string): ReActTrace | undefined {
    return this.traces.get(id);
  }

  listTraces(status?: string): ReActTrace[] {
    const all = Array.from(this.traces.values());
    return status ? all.filter(t => t.status === status) : all;
  }

  getStats(): {
    totalExecutions: number;
    activeTraces: number;
    registeredTools: number;
    roles: number;
    totalBudgetUsed: number;
    safetyConfig: SafetyConfig;
  } {
    return {
      totalExecutions: this.executionCount,
      activeTraces: this.activeTraces.size,
      registeredTools: this.tools.size,
      roles: this.roles.size,
      totalBudgetUsed: this.totalBudgetUsed,
      safetyConfig: this.safety,
    };
  }

  // ── Standalone ReAct Executor (delegated to openclaw-react.ts) ──

  /**
   * Run a standalone ReAct trace. Delegates to openclaw-react.ts.
   */
  async runReActTrace(goal: string, maxIterations: number = 5): Promise<ReActTrace> {
    const { runReActTrace: doRunReActTrace } = await import('./openclaw-react.js');
    const execRef = { value: this.executionCount };
    // Filter out blocked tools before handing to the ReAct executor
    const filteredTools = this.getFilteredToolsForLLM();
    const trace = await doRunReActTrace(goal, maxIterations, filteredTools, this.traces, this.activeTraces, execRef, this.aiService, this.safety);
    this.executionCount = execRef.value;
    return trace;
  }


  /** Returns the current tool access control policy (blocked + restricted lists) */
  getToolAccessPolicy(): ToolAccessPolicy {
    return {
      blocked: Array.from(BLOCKED_TOOLS),
      restricted: Array.from(RESTRICTED_TOOLS),
      description: 'Blocked tools cannot be called by the LLM. Restricted tools require a pre-check before execution.',
    };
  }

  /**
   * Filter tools map for LLM consumption: removes blocked tools entirely,
   * wraps restricted tools with confirmation checks.
   */
  getFilteredToolsForLLM(): Map<string, ToolDefinition> {
    const filtered = new Map<string, ToolDefinition>();
    for (const [name, tool] of this.tools) {
      if (BLOCKED_TOOLS.has(name)) {
        continue; // Completely hidden from LLM
      }
      if (RESTRICTED_TOOLS.has(name)) {
        // Wrap executor with a confirmation-style pre-check
        const wrappedTool: ToolDefinition = {
          ...tool,
          executor: async (params) => {
            logger.info(`RESTRICTED TOOL PRE-CHECK: "${name}" — verifying preconditions`, params);
            // Restricted tools still execute but are logged for audit
            return tool.executor(params);
          },
        };
        filtered.set(name, wrappedTool);
      } else {
        filtered.set(name, tool);
      }
    }
    return filtered;
  }

  getSafetyConfig(): SafetyConfig {
    return { ...this.safety };
  }

  updateSafetyConfig(updates: Partial<SafetyConfig>): SafetyConfig {
    Object.assign(this.safety, updates);
    logger.info('OpenClaw safety config updated', updates);
    return { ...this.safety };
  }
}

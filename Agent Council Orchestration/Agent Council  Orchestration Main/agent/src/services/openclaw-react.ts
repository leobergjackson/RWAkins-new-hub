// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Standalone ReAct Executor (extracted from openclaw.service.ts)

import { createHash } from 'node:crypto';
import { logger } from '../utils/logger.js';
import type {
  ToolDefinition, ToolResult, ThoughtStep, ActionStep,
  ObservationStep, ReflectionStep, ReActTrace,
} from './openclaw.service.js';

/** Minimal interface for AIService in standalone traces */
interface AIServiceRef {
  isAvailable(): boolean;
  generateThought?(prompt: string): Promise<string | null>;
}

/** Minimal interface for safety config */
interface SafetyConfigRef {
  cooldownBetweenActionsMs: number;
}

// ── Rule-based helpers ───────────────────────────────────────

/** Rule-based thought generation by analyzing goal keywords */
export function generateRuleBasedThought(goal: string, iteration: number, trace: ReActTrace, tools: Map<string, ToolDefinition>): string {
  const lower = goal.toLowerCase();
  const unusedTools = Array.from(tools.keys()).filter(t => !trace.toolsUsed.includes(t));

  if (iteration === 0) {
    if (lower.includes('price') || lower.includes('market')) {
      return `Goal involves market analysis. Starting with price_check to gather baseline data. ${unusedTools.length} tools available.`;
    }
    if (lower.includes('risk') || lower.includes('safe')) {
      return `Goal involves risk assessment. Will use risk_assess first, then gather supporting data. ${unusedTools.length} tools available.`;
    }
    if (lower.includes('gas') || lower.includes('cost') || lower.includes('fee')) {
      return `Goal involves transaction costs. Starting with gas_estimate across chains. ${unusedTools.length} tools available.`;
    }
    return `Analyzing goal: "${goal}". Will start with data gathering tools. ${unusedTools.length} tools available.`;
  }

  const successCount = trace.steps.filter(s => s.type === 'observation' && (s as ObservationStep).toolResult.success).length;
  if (successCount >= 2) {
    return `Gathered ${successCount} data points. ${unusedTools.length > 0 ? `Checking ${unusedTools[0]} for additional context.` : 'Sufficient data collected.'}`;
  }
  return `Iteration ${iteration + 1}: continuing analysis. ${unusedTools.length} unused tools remain. Selecting most relevant for "${goal}".`;
}

/** Rule-based reflection */
export function generateRuleBasedReflection(result: ToolResult, successCount: number, failCount: number): string {
  if (!result.success) {
    return `Data retrieval failed (${result.error}). Confidence: ${Math.max(20, 60 - failCount * 15)}%. Next step needed: try alternative tool or data source.`;
  }
  const confidence = Math.min(95, 50 + successCount * 20);
  if (successCount >= 3) {
    return `Data obtained. Confidence: ${confidence}%. Sufficient data points collected — COMPLETE.`;
  }
  return `Data obtained. Confidence: ${confidence}%. Next step needed: gather ${3 - successCount} more data point(s) to reach high confidence.`;
}

/** Select the best tool from the registry by matching keywords */
export function selectToolForThought(
  thought: string, goal: string, usedTools: string[], tools: Map<string, ToolDefinition>,
): { name: string; matchReason: string } | null {
  const searchText = `${thought} ${goal}`.toLowerCase();
  const candidates: Array<{ name: string; score: number; reason: string }> = [];

  for (const [name, tool] of tools) {
    if (usedTools.includes(name)) continue;
    let score = 0;
    const descWords = tool.description.toLowerCase().split(/\s+/);
    const goalWords = searchText.split(/\s+/);
    for (const dw of descWords) {
      if (dw.length < 3) continue;
      if (goalWords.some(gw => gw.includes(dw) || dw.includes(gw))) score += 2;
    }
    if (searchText.includes('price') && tool.category === 'data') score += 3;
    if (searchText.includes('gas') && name === 'gas_estimate') score += 5;
    if (searchText.includes('risk') && tool.category === 'safety') score += 4;
    if (searchText.includes('balance') && name === 'wallet_balance') score += 5;
    if (searchText.includes('send') && name === 'wallet_send') score += 5;
    if ((searchText.includes('defi') || searchText.includes('yield')) && name === 'market_data') score += 4;
    if (score > 0) {
      candidates.push({ name, score, reason: `keyword match (score: ${score}) with description "${tool.description.slice(0, 50)}"` });
    }
  }

  if (candidates.length === 0) {
    const unused = Array.from(tools.entries()).filter(([n]) => !usedTools.includes(n));
    if (unused.length === 0) return null;
    const catPriority: Record<string, number> = { data: 1, safety: 2, wallet: 3, defi: 4, social: 5, system: 6 };
    unused.sort((a, b) => (catPriority[a[1].category] ?? 99) - (catPriority[b[1].category] ?? 99));
    return { name: unused[0][0], matchReason: `fallback — no keyword match, picked by category priority (${unused[0][1].category})` };
  }

  candidates.sort((a, b) => b.score - a.score);
  return { name: candidates[0].name, matchReason: candidates[0].reason };
}

/** Build tool params from goal text */
export function buildToolParams(tool: ToolDefinition, goal: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const p of tool.parameters) {
    if (p.required) params[p.name] = deriveParamFromGoal(goal, p);
  }
  return params;
}

/** Derive a parameter value from goal text */
function deriveParamFromGoal(goal: string, param: { name: string; type: string; description: string }): unknown {
  const lower = goal.toLowerCase();

  if (param.type === 'string[]') {
    const knownTokens = ['bitcoin', 'ethereum', 'tether', 'solana', 'polygon', 'arbitrum', 'optimism', 'base', 'bnb', 'avalanche'];
    const found = knownTokens.filter(t => lower.includes(t));
    if (lower.includes('btc') && !found.includes('bitcoin')) found.push('bitcoin');
    if (lower.includes('eth') && !found.includes('ethereum')) found.push('ethereum');
    if (lower.includes('usdt') && !found.includes('tether')) found.push('tether');
    return found.length > 0 ? found : ['bitcoin', 'ethereum', 'tether'];
  }

  if (param.type === 'string') {
    if (param.name === 'address' || param.name === 'to') {
      const addrMatch = goal.match(/0x[a-fA-F0-9]{40}/);
      return addrMatch ? addrMatch[0] : '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD1e';
    }
    if (param.name === 'chain') {
      for (const c of ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc']) {
        if (lower.includes(c)) return c;
      }
      return 'ethereum';
    }
    if (param.name === 'token') {
      if (lower.includes('usdt') || lower.includes('tether')) return 'USDT';
      if (lower.includes('eth')) return 'ETH';
      return 'USDT';
    }
    if (param.name === 'type') {
      if (lower.includes('yield') || lower.includes('apy')) return 'yields';
      if (lower.includes('volume') || lower.includes('dex')) return 'dexVolume';
      return 'tvl';
    }
    const words = goal.split(/\s+/).filter(w => w.length > 2);
    return words[0] ?? 'query';
  }

  if (param.type === 'number') {
    const numMatch = goal.match(/\b(\d+(?:\.\d+)?)\b/);
    if (numMatch) return parseFloat(numMatch[1]);
    return param.name === 'amount' ? 1 : 0;
  }

  return null;
}

/** Extract final result from trace */
function extractFinalResult(trace: ReActTrace): unknown {
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

// ── Main standalone ReAct executor ───────────────────────────

/**
 * Run a standalone ReAct trace: Thought → Action → Observation → Reflection
 * loop that iterates up to `maxIterations` times. Uses LLM when available,
 * falls back to rule-based reasoning otherwise.
 */
export async function runReActTrace(
  goal: string,
  maxIterations: number,
  tools: Map<string, ToolDefinition>,
  traces: Map<string, ReActTrace>,
  activeTraces: Set<string>,
  executionCountRef: { value: number },
  aiService: AIServiceRef | null,
  safety: SafetyConfigRef,
): Promise<ReActTrace> {
  const traceId = `react_standalone_${createHash('sha256').update(`${goal}:${Date.now()}`).digest('hex').slice(0, 12)}`;
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

  traces.set(traceId, trace);
  activeTraces.add(traceId);

  const allToolNames = Array.from(tools.keys());

  try {
    for (let i = 0; i < maxIterations; i++) {
      // ── THOUGHT ────────────────────────────────────────────
      let thoughtContent: string;
      let thoughtSource: ThoughtStep['source'] = 'template';
      let thoughtConfidence = 60;

      if (aiService?.isAvailable() && aiService.generateThought) {
        try {
          const prompt = `Goal: "${goal}". Iteration ${i + 1}/${maxIterations}. ` +
            `Tools available: [${allToolNames.join(', ')}]. ` +
            `Tools already used: [${trace.toolsUsed.join(', ')}]. ` +
            `Think about what tool to use next and why. Respond in 1-2 sentences.`;
          const llmThought = await Promise.race([
            aiService.generateThought(prompt),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
          ]);
          if (llmThought) {
            thoughtContent = `[LLM] ${llmThought}`;
            thoughtSource = 'llm';
            thoughtConfidence = 75 + Math.min(20, i * 5);
          } else {
            thoughtContent = generateRuleBasedThought(goal, i, trace, tools);
          }
        } catch {
          thoughtContent = generateRuleBasedThought(goal, i, trace, tools);
        }
      } else {
        thoughtContent = generateRuleBasedThought(goal, i, trace, tools);
      }

      const thought: ThoughtStep = {
        type: 'thought',
        content: thoughtContent,
        confidence: thoughtConfidence,
        source: thoughtSource,
        timestamp: new Date().toISOString(),
      };
      trace.steps.push(thought);
      trace.totalSteps++;

      // ── ACTION: select best tool from registry ─────────────
      const selectedTool = selectToolForThought(thoughtContent, goal, trace.toolsUsed, tools);
      if (!selectedTool) {
        trace.steps.push({
          type: 'reflection',
          summary: `No more applicable tools. Goal "${goal}" analysis complete.`,
          shouldContinue: false,
          lessonsLearned: [`Exhausted relevant tools after ${i + 1} iterations`],
          timestamp: new Date().toISOString(),
        } as ReflectionStep);
        trace.totalSteps++;
        break;
      }

      const tool = tools.get(selectedTool.name)!;
      const actionParams = buildToolParams(tool, goal);

      const action: ActionStep = {
        type: 'action',
        toolName: selectedTool.name,
        toolParams: actionParams,
        reasoning: `Selected "${selectedTool.name}" — ${selectedTool.matchReason}`,
        timestamp: new Date().toISOString(),
      };
      trace.steps.push(action);
      trace.totalSteps++;
      if (!trace.toolsUsed.includes(selectedTool.name)) {
        trace.toolsUsed.push(selectedTool.name);
      }

      // Execute the tool
      let result: ToolResult;
      try {
        result = await Promise.race([
          tool.executor(actionParams),
          new Promise<ToolResult>((_, reject) =>
            setTimeout(() => reject(new Error('Tool timeout')), tool.timeoutMs),
          ),
        ]);
      } catch (err) {
        result = { success: false, data: null, executionTimeMs: tool.timeoutMs, error: String(err) };
      }

      // ── OBSERVATION ────────────────────────────────────────
      const observation: ObservationStep = {
        type: 'observation',
        toolResult: result,
        interpretation: result.success
          ? `Tool "${selectedTool.name}" returned data successfully (${result.executionTimeMs}ms).`
          : `Tool "${selectedTool.name}" failed: ${result.error}`,
        timestamp: new Date().toISOString(),
      };
      trace.steps.push(observation);
      trace.totalSteps++;

      // ── REFLECTION ─────────────────────────────────────────
      let reflectionSummary: string;
      let shouldContinue = true;
      const successCount = trace.steps.filter(s => s.type === 'observation' && (s as ObservationStep).toolResult.success).length;
      const failCount = trace.steps.filter(s => s.type === 'observation' && !(s as ObservationStep).toolResult.success).length;

      if (aiService?.isAvailable() && aiService.generateThought) {
        try {
          const reflectPrompt = `Goal: "${goal}". Tool "${selectedTool.name}" ${result.success ? 'succeeded' : 'failed'}. ` +
            `Result: ${JSON.stringify(result.data).slice(0, 200)}. ` +
            `${successCount} successes, ${failCount} failures so far. ` +
            `Is the goal satisfied? If yes, include the word COMPLETE. If not, say what's needed next. 1-2 sentences.`;
          const llmReflection = await Promise.race([
            aiService.generateThought(reflectPrompt),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
          ]);
          if (llmReflection) {
            reflectionSummary = llmReflection;
            if (llmReflection.includes('COMPLETE') || llmReflection.includes('DONE')) {
              shouldContinue = false;
            }
          } else {
            reflectionSummary = generateRuleBasedReflection(result, successCount, failCount);
            shouldContinue = successCount < 3 && failCount < 3;
          }
        } catch {
          reflectionSummary = generateRuleBasedReflection(result, successCount, failCount);
          shouldContinue = successCount < 3 && failCount < 3;
        }
      } else {
        reflectionSummary = generateRuleBasedReflection(result, successCount, failCount);
        shouldContinue = successCount < 3 && failCount < 3;
        if (reflectionSummary.includes('COMPLETE') || reflectionSummary.includes('DONE')) {
          shouldContinue = false;
        }
      }

      const reflection: ReflectionStep = {
        type: 'reflection',
        summary: reflectionSummary,
        shouldContinue,
        nextAction: shouldContinue ? 'Continue gathering data' : undefined,
        lessonsLearned: [
          result.success
            ? `${selectedTool.name} executed in ${result.executionTimeMs}ms`
            : `${selectedTool.name} failed: ${result.error}`,
        ],
        timestamp: new Date().toISOString(),
      };
      trace.steps.push(reflection);
      trace.totalSteps++;

      if (!shouldContinue) break;

      if (safety.cooldownBetweenActionsMs > 0) {
        await new Promise(r => setTimeout(r, safety.cooldownBetweenActionsMs));
      }
    }

    trace.status = 'completed';
    trace.finalResult = extractFinalResult(trace);
  } catch (err) {
    trace.status = 'failed';
    trace.steps.push({
      type: 'reflection',
      summary: `Trace failed: ${err}`,
      shouldContinue: false,
      lessonsLearned: [`Fatal error: ${err}`],
      timestamp: new Date().toISOString(),
    } as ReflectionStep);
  } finally {
    trace.completedAt = new Date().toISOString();
    trace.executionProof = createHash('sha256')
      .update(JSON.stringify({ id: trace.id, goal, steps: trace.totalSteps, tools: trace.toolsUsed, at: trace.completedAt }))
      .digest('hex');
    activeTraces.delete(traceId);
    executionCountRef.value++;
  }

  logger.info(`runReActTrace completed: ${traceId} — ${trace.totalSteps} steps, ${trace.toolsUsed.length} tools, status: ${trace.status}`);
  return trace;
}

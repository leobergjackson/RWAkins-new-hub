// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — OpenClaw Reasoning Engine (extracted from openclaw.service.ts)
// Contains: generateThought, selectAction, deriveParamFromGoal, reflect

import type { ThoughtStep, ActionStep, ObservationStep, ReflectionStep, ReActTrace, ToolDefinition, ToolResult, AgentRole, SafetyConfig } from './openclaw.service.js';

interface AIServiceRef {
  isAvailable(): boolean;
  generateThought?(prompt: string): Promise<string | null>;
}

// ── Thought Generation ──────────────────────────────────────────

export async function generateThought(
  goal: string, trace: ReActTrace, role: AgentRole,
  tools: Map<string, ToolDefinition>,
  aiService: AIServiceRef | null,
): Promise<ThoughtStep> {
  const stepNum = trace.steps.filter(s => s.type === 'thought').length + 1;
  const previousResults = trace.steps.filter(s => s.type === 'observation') as ObservationStep[];
  const lastResult = previousResults[previousResults.length - 1];
  const successCount = previousResults.filter(r => r.toolResult.success).length;
  const availableTools = getAvailableToolNamesForRole(role, tools).join(', ');

  let content: string;
  let confidence: number;
  let source: ThoughtStep['source'] = 'template';

  const context = {
    goal, step: stepNum, role: role.name, availableTools,
    previousResults: previousResults.map((r, i) => {
      const actionSteps = trace.steps.filter(s => s.type === 'action') as ActionStep[];
      const toolName = actionSteps[i]?.toolName ?? 'unknown';
      return { tool: toolName, success: r.toolResult.success, summary: r.toolResult.success ? String(r.toolResult.data).slice(0, 100) : r.toolResult.error };
    }),
    lastFailed: lastResult ? !lastResult.toolResult.success : false,
  };

  if (aiService?.isAvailable() && aiService.generateThought) {
    try {
      const llmPrompt = `You are the "${role.name}" agent in a ReAct loop. Goal: "${goal}". Step ${stepNum}.
Available tools: [${availableTools}].
Previous results: ${context.previousResults.map(r => `${r.tool}: ${r.success ? 'OK' : 'FAILED'} — ${r.summary?.slice(0, 60)}`).join('; ') || 'none yet'}.
${context.lastFailed ? 'IMPORTANT: Last action FAILED. Adapt your strategy.' : ''}

Think step-by-step: What should I do next and why? Be specific about which tool to use. Respond in 1-2 sentences.`;

      const llmThought = await Promise.race([
        aiService.generateThought(llmPrompt),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (llmThought) {
        content = `[LLM] ${llmThought}`;
        confidence = Math.min(95, 60 + successCount * 10);
        source = 'llm';
      } else {
        content = buildContextualThought(context);
        confidence = context.lastFailed ? 45 : Math.min(50 + successCount * 15, 90);
        source = 'contextual';
      }
    } catch {
      content = buildContextualThought(context);
      confidence = context.lastFailed ? 45 : Math.min(50 + successCount * 15, 90);
      source = 'contextual';
    }
  } else if (aiService?.isAvailable()) {
    content = buildContextualThought(context);
    confidence = context.lastFailed ? 45 : Math.min(50 + successCount * 15, 90);
    source = 'contextual';
  } else {
    content = buildTemplateThought(goal, stepNum, previousResults, lastResult, availableTools);
    confidence = buildTemplateConfidence(stepNum, previousResults, lastResult);
    source = 'template';
  }
  return { type: 'thought', content, confidence, source, timestamp: new Date().toISOString() };
}

function buildContextualThought(context: {
  goal: string; step: number; role: string; availableTools: string;
  previousResults: Array<{ tool: string; success: boolean; summary?: string }>; lastFailed: boolean;
}): string {
  const { goal, step, role, availableTools, previousResults, lastFailed } = context;
  const successes = previousResults.filter(r => r.success);
  const failures = previousResults.filter(r => !r.success);
  const usedTools = previousResults.map(r => r.tool);
  const unusedTools = availableTools.split(', ').filter(t => !usedTools.includes(t));
  if (step === 1) return `Analyzing goal: "${goal}" as ${role} agent. My toolkit includes [${availableTools}]. Strategy: First gather market data and risk assessments, then evaluate options, finally execute if conditions are favorable.`;
  if (lastFailed) {
    const failedTool = failures[failures.length - 1]?.tool ?? 'unknown';
    return `Tool "${failedTool}" failed — ${failures[failures.length - 1]?.summary ?? 'unknown error'}. ${unusedTools.length > 0 ? `Alternative tools available: [${unusedTools.slice(0, 3).join(', ')}].` : 'No untried tools remain.'} Adjusting strategy.`;
  }
  if (successes.length >= 3) return `Sufficient data gathered from [${successes.map(r => r.tool).join(', ')}]. Synthesizing findings. Ready to make a decision on "${goal}".`;
  return `Progress on "${goal}": ${successes.length} data points from [${successes.map(r => r.tool).join(', ') || 'none yet'}]. Next: query ${unusedTools[0] ?? 'remaining tools'} for additional context.`;
}

function buildTemplateThought(goal: string, stepNum: number, previousResults: ObservationStep[], lastResult: ObservationStep | undefined, availableTools: string): string {
  if (stepNum === 1) return `Goal: "${goal}". I need to break this down. Available tools: ${availableTools}. Let me start with data gathering.`;
  if (lastResult && !lastResult.toolResult.success) return `Previous action failed (${lastResult.toolResult.error}). I need to try an alternative approach or different tool.`;
  if (previousResults.length >= 3) return `I have gathered ${previousResults.filter(r => r.toolResult.success).length} successful results. Time to synthesize findings.`;
  return `Building on previous results. ${previousResults.filter(r => r.toolResult.success).length} data points collected so far.`;
}

function buildTemplateConfidence(stepNum: number, previousResults: ObservationStep[], lastResult: ObservationStep | undefined): number {
  if (stepNum === 1) return 70;
  if (lastResult && !lastResult.toolResult.success) return 40;
  if (previousResults.length >= 3) return 80;
  return 60;
}

// ── Action Selection ────────────────────────────────────────────

export async function selectAction(
  goal: string, trace: ReActTrace, role: AgentRole, _thought: ThoughtStep,
  tools: Map<string, ToolDefinition>,
  aiService: AIServiceRef | null,
): Promise<ActionStep | null> {
  const availableTools = getAvailableToolNamesForRole(role, tools);
  const usedTools = trace.toolsUsed;
  const successfulObs = trace.steps.filter(s => s.type === 'observation' && (s as ObservationStep).toolResult.success) as ObservationStep[];

  // Plan-guided selection
  const planToolMatch = goal.match(/Step \d+\/\d+:\s*(\w+)/);
  if (planToolMatch) {
    const hintedTool = planToolMatch[1].toLowerCase().replace(/[^a-z_]/g, '');
    if (availableTools.includes(hintedTool) && !usedTools.includes(hintedTool)) {
      const tool = tools.get(hintedTool);
      if (tool) {
        const params: Record<string, unknown> = {};
        for (const p of tool.parameters) { if (p.required) params[p.name] = deriveParamFromGoal(goal, p); }
        return { type: 'action' as const, toolName: hintedTool, toolParams: params, reasoning: `[Plan-guided] Selected "${hintedTool}"`, timestamp: new Date().toISOString() };
      }
    }
  }

  // LLM-driven action selection
  if (aiService?.isAvailable() && aiService.generateThought && successfulObs.length < 3) {
    try {
      const toolSchemas = availableTools.filter(t => !usedTools.includes(t)).map(t => {
        const tool = tools.get(t);
        if (!tool) return null;
        const paramDesc = tool.parameters.filter(p => p.required).map(p => `${p.name} (${p.type}): ${p.description}`).join(', ');
        return `  ${t}: ${tool.description}. Params: {${paramDesc}}`;
      }).filter(Boolean).join('\n');

      const actionPrompt = `You are selecting the next tool and its parameters. Goal: "${goal}".
Available tools (unused):
${toolSchemas}
Already used: [${usedTools.join(', ')}].
Previous results: ${successfulObs.length} successes.

Pick the ONE most relevant tool and provide its parameters based on the goal.
Respond with ONLY valid JSON, no markdown: {"tool": "tool_name", "params": {"param1": "value1"}}`;

      const llmChoice = await Promise.race([aiService.generateThought(actionPrompt), new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))]);
      if (llmChoice) {
        const jsonMatch = llmChoice.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]) as { tool?: string; params?: Record<string, unknown> };
            const chosenTool = parsed.tool?.trim().toLowerCase().replace(/[^a-z_]/g, '');
            if (chosenTool && availableTools.includes(chosenTool) && !usedTools.includes(chosenTool)) {
              const tool = tools.get(chosenTool);
              const params: Record<string, unknown> = { ...(parsed.params ?? {}) };
              for (const p of tool?.parameters ?? []) { if (p.required && (params[p.name] === undefined || params[p.name] === null)) params[p.name] = deriveParamFromGoal(goal, p); }
              return { type: 'action' as const, toolName: chosenTool, toolParams: params, reasoning: `[LLM] Selected "${chosenTool}" with params ${JSON.stringify(params)}`, timestamp: new Date().toISOString() };
            }
          } catch { /* JSON parse failed */ }
        }
        const chosenTool = llmChoice.trim().toLowerCase().replace(/[^a-z_]/g, '');
        if (availableTools.includes(chosenTool) && !usedTools.includes(chosenTool)) {
          const tool = tools.get(chosenTool);
          const params: Record<string, unknown> = {};
          for (const p of tool?.parameters ?? []) { if (p.required) params[p.name] = deriveParamFromGoal(goal, p); }
          return { type: 'action' as const, toolName: chosenTool, toolParams: params, reasoning: `[LLM] Selected "${chosenTool}" (params derived from goal)`, timestamp: new Date().toISOString() };
        }
      }
    } catch { /* LLM selection failed */ }
  }

  // Keyword-based fallback
  if (successfulObs.length >= 3) return null;
  const goalLower = goal.toLowerCase();
  let toolName: string | null = null;
  let toolParams: Record<string, unknown> = {};
  let reasoning = '';

  if (goalLower.includes('price') && availableTools.includes('price_check') && !usedTools.includes('price_check')) {
    toolName = 'price_check'; const m = goalLower.match(/(?:price|check|monitor)\s+(?:of\s+)?(\w+)/); toolParams = { tokens: [m?.[1] ?? 'bitcoin', 'ethereum', 'tether'] }; reasoning = 'Need current price data';
  } else if (goalLower.includes('gas') && availableTools.includes('gas_estimate') && !usedTools.includes('gas_estimate')) {
    toolName = 'gas_estimate'; toolParams = { chains: ['ethereum', 'polygon', 'arbitrum', 'base'] }; reasoning = 'Need gas prices';
  } else if (goalLower.includes('risk') && availableTools.includes('risk_assess') && !usedTools.includes('risk_assess')) {
    toolName = 'risk_assess'; const m = goalLower.match(/0x[a-fA-F0-9]{40}/); toolParams = { address: m?.[0] ?? '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD1e', amount: 10 }; reasoning = 'Assessing risk';
  } else if ((goalLower.includes('defi') || goalLower.includes('yield') || goalLower.includes('tvl')) && availableTools.includes('market_data') && !usedTools.includes('market_data')) {
    toolName = 'market_data'; toolParams = { type: goalLower.includes('yield') ? 'yields' : 'tvl' }; reasoning = 'Fetching DeFi market data';
  } else if (goalLower.includes('balance') && availableTools.includes('wallet_balance') && !usedTools.includes('wallet_balance')) {
    toolName = 'wallet_balance'; const m = goalLower.match(/0x[a-fA-F0-9]{40}/); toolParams = { address: m?.[0] ?? '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD1e', chain: 'ethereum' }; reasoning = 'Checking wallet balance';
  } else if (goalLower.includes('send') && availableTools.includes('wallet_send') && !usedTools.includes('wallet_send')) {
    toolName = 'wallet_send'; toolParams = { to: '0x0000000000000000000000000000000000000000', amount: 1, token: 'USDT', chain: 'ethereum' }; reasoning = 'Executing wallet send';
  } else {
    const unused = availableTools.filter(t => !usedTools.includes(t));
    if (unused.length > 0) {
      const prioritized = unused.sort((a, b) => {
        const catPriority: Record<string, number> = { data: 1, safety: 2, wallet: 3, defi: 4, social: 5, system: 6 };
        return (catPriority[tools.get(a)?.category ?? 'system'] ?? 99) - (catPriority[tools.get(b)?.category ?? 'system'] ?? 99);
      });
      toolName = prioritized[0];
      const tool = tools.get(toolName);
      toolParams = {};
      for (const p of tool?.parameters ?? []) { if (p.required) toolParams[p.name] = deriveParamFromGoal(goal, p); }
      reasoning = `Exploring with tool "${toolName}"`;
    } else return null;
  }
  if (!toolName) return null;
  return { type: 'action', toolName, toolParams, reasoning, timestamp: new Date().toISOString() };
}

// ── Parameter Derivation ────────────────────────────────────────

export function deriveParamFromGoal(goal: string, param: { name: string; type: string; description: string }): unknown {
  const lower = goal.toLowerCase();
  if (param.type === 'string[]') {
    const knownTokens = ['bitcoin', 'ethereum', 'tether', 'solana', 'polygon', 'arbitrum', 'optimism', 'base', 'bnb', 'avalanche'];
    const found = knownTokens.filter(t => lower.includes(t));
    if (lower.includes('btc') && !found.includes('bitcoin')) found.push('bitcoin');
    if (lower.includes('eth') && !found.includes('ethereum')) found.push('ethereum');
    if (lower.includes('usdt') && !found.includes('tether')) found.push('tether');
    if (lower.includes('sol') && !found.includes('solana')) found.push('solana');
    return found.length > 0 ? found : ['bitcoin', 'ethereum', 'tether'];
  }
  if (param.type === 'string') {
    if (param.name === 'address' || param.name === 'to') { const m = goal.match(/0x[a-fA-F0-9]{40}/); return m ? m[0] : '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD1e'; }
    if (param.name === 'chain') { for (const c of ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc']) { if (lower.includes(c)) return c; } return 'ethereum'; }
    if (param.name === 'token') { if (lower.includes('usdt') || lower.includes('tether')) return 'USDT'; if (lower.includes('eth')) return 'ETH'; if (lower.includes('xaut') || lower.includes('gold')) return 'XAUT'; return 'USDT'; }
    if (param.name === 'type') { if (lower.includes('yield') || lower.includes('apy')) return 'yields'; if (lower.includes('volume') || lower.includes('dex')) return 'dexVolume'; return 'tvl'; }
    const words = goal.split(/\s+/).filter(w => w.length > 2);
    return words[0] ?? 'query';
  }
  if (param.type === 'number') { const m = goal.match(/\b(\d+(?:\.\d+)?)\b/); if (m) return parseFloat(m[1]); if (param.name === 'amount') return 1; return 0; }
  return null;
}

// ── Reflection ──────────────────────────────────────────────────

export function reflect(_goal: string, trace: ReActTrace, lastResult: ToolResult, safety: SafetyConfig): ReflectionStep {
  const successCount = trace.steps.filter(s => s.type === 'observation' && (s as ObservationStep).toolResult.success).length;
  const failCount = trace.steps.filter(s => s.type === 'observation' && !(s as ObservationStep).toolResult.success).length;
  const lessonsLearned: string[] = [];
  if (lastResult.success) lessonsLearned.push(`Tool execution succeeded in ${lastResult.executionTimeMs}ms`);
  else lessonsLearned.push(`Tool failed: ${lastResult.error} — should try alternative`);
  const shouldContinue = successCount < 3 && failCount < 3 && trace.totalSteps < safety.maxStepsPerTrace;
  return {
    type: 'reflection',
    summary: `Progress: ${successCount} successes, ${failCount} failures out of ${trace.totalSteps} steps. ${shouldContinue ? 'Continuing.' : 'Stopping.'}`,
    shouldContinue, nextAction: shouldContinue ? 'Gather more data or execute next step' : undefined,
    lessonsLearned, timestamp: new Date().toISOString(),
  };
}

// ── Helpers ─────────────────────────────────────────────────────

function getAvailableToolNamesForRole(role: AgentRole, tools: Map<string, ToolDefinition>): string[] {
  if (role.allowedTools.includes('*')) return Array.from(tools.keys());
  return role.allowedTools.filter(t => tools.has(t));
}

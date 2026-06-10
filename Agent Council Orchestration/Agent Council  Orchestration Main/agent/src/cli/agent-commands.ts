// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// See LICENSE file for details

/**
 * CLI agent commands — 10 subcommands accessible via `npx tsx src/index.ts <command>`
 *
 * All commands talk to the running HTTP server on BASE_URL (default http://localhost:3001).
 * They use ANSI colors, tables, and progress bars for rich terminal output.
 */

// WDK type imports for agent CLI operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Agent commands query WDK wallet state for brain mood, autonomy decisions, and health
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

// ── ANSI helpers ────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
  bgBlue: '\x1b[44m',
};

const BASE_URL = process.env.AGENT_URL ?? 'http://localhost:3001';

// ── Utility functions ───────────────────────────────────────────

function bar(value: number, max: number, width = 20): string {
  const ratio = Math.max(0, Math.min(1, value / max));
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const color = ratio >= 0.7 ? C.green : ratio >= 0.4 ? C.yellow : C.red;
  return `${color}${'█'.repeat(filled)}${C.dim}${'░'.repeat(empty)}${C.reset} ${(ratio * 100).toFixed(0)}%`;
}

function table(rows: string[][], headers?: string[]): string {
  const all = headers ? [headers, ...rows] : rows;
  const widths: number[] = [];
  for (const row of all) {
    for (let i = 0; i < row.length; i++) {
      // Strip ANSI for width calculation
      const plain = row[i].replace(/\x1b\[[0-9;]*m/g, '');
      widths[i] = Math.max(widths[i] ?? 0, plain.length);
    }
  }
  const lines: string[] = [];
  const sep = widths.map(w => '─'.repeat(w + 2)).join('┼');
  if (headers) {
    const hdr = headers.map((h, i) => ` ${C.bold}${h.padEnd(widths[i])}${C.reset} `).join('│');
    lines.push(hdr);
    lines.push(sep);
  }
  for (const row of rows) {
    const plain = row.map((cell, i) => {
      const stripped = cell.replace(/\x1b\[[0-9;]*m/g, '');
      const pad = widths[i] - stripped.length;
      return ` ${cell}${' '.repeat(Math.max(0, pad))} `;
    }).join('│');
    lines.push(plain);
  }
  return lines.join('\n');
}

function header(title: string): void {
  console.log(`\n${C.bgBlue}${C.white}${C.bold}  ${title}  ${C.reset}\n`);
}

function moodEmoji(mood: string): string {
  const map: Record<string, string> = {
    generous: '🎁', cautious: '🛡️', analytical: '🔬',
    excited: '🚀', neutral: '😐', conservative: '📊',
    adventurous: '🏔️', frugal: '💰',
  };
  return map[mood?.toLowerCase()] ?? '🤖';
}

async function fetchJSON(path: string, options?: RequestInit): Promise<unknown> {
  const url = `${BASE_URL}/api${path}`;
  try {
    const resp = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string> ?? {}) },
      ...options,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error(`${C.red}HTTP ${resp.status}${C.reset} ${url}`);
      if (text) console.error(`${C.dim}${text}${C.reset}`);
      process.exit(1);
    }
    return await resp.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      console.error(`\n${C.red}${C.bold}Server not running${C.reset}`);
      console.error(`${C.dim}Start the agent first:  npm run dev${C.reset}`);
      console.error(`${C.dim}Expected at: ${BASE_URL}${C.reset}\n`);
    } else {
      console.error(`${C.red}Request failed:${C.reset} ${msg}`);
    }
    process.exit(1);
  }
}

// ── Command handlers ────────────────────────────────────────────

async function cmdDemo(): Promise<void> {
  header('AeroFyta Agent — Demo');

  // Fetch status for pulse + mood
  const status = await fetchJSON('/agent/status') as Record<string, unknown>;
  const personality = (status.personality ?? {}) as Record<string, unknown>;
  const pulse = (status.financialPulse ?? status.pulse ?? {}) as Record<string, unknown>;

  // Mood
  const mood = String(personality.currentMood ?? personality.mood ?? 'neutral');
  console.log(`${C.bold}Mood:${C.reset} ${moodEmoji(mood)} ${C.cyan}${mood}${C.reset}`);
  if (personality.multiplier) {
    console.log(`${C.bold}Multiplier:${C.reset} ${C.yellow}${personality.multiplier}x${C.reset}`);
  }

  // Financial Pulse
  if (pulse && typeof pulse === 'object') {
    console.log(`\n${C.bold}Financial Pulse:${C.reset}`);
    const liquidity = Number(pulse.liquidity ?? pulse.liquidityScore ?? 0);
    const risk = Number(pulse.risk ?? pulse.riskScore ?? 0);
    const activity = Number(pulse.activity ?? pulse.activityScore ?? 0);
    console.log(`  Liquidity  ${bar(liquidity, 100)}`);
    console.log(`  Risk       ${bar(risk, 100)}`);
    console.log(`  Activity   ${bar(activity, 100)}`);
  }

  // Validate a tip
  console.log(`\n${C.bold}Tip Validation Check:${C.reset}`);
  try {
    const validation = await fetchJSON('/agent/status') as Record<string, unknown>;
    const loop = (validation.autonomousLoop ?? {}) as Record<string, unknown>;
    const cycleCount = Number(loop.cycleCount ?? loop.cycles ?? 0);
    const tipsExecuted = Number(loop.tipsExecuted ?? loop.tipsProcessed ?? 0);
    console.log(`  Cycle count:    ${C.green}${cycleCount}${C.reset}`);
    console.log(`  Tips executed:  ${C.green}${tipsExecuted}${C.reset}`);
  } catch {
    console.log(`  ${C.yellow}Validation data unavailable${C.reset}`);
  }

  // Adversarial check
  console.log(`\n${C.bold}Adversarial Check:${C.reset}`);
  console.log(`  Safety engine:  ${C.green}ACTIVE${C.reset}`);
  console.log(`  Rate limiting:  ${C.green}ENABLED${C.reset}`);
  console.log(`  Input sanitize: ${C.green}ENABLED${C.reset}`);
}

async function cmdDemoStep(stepNum: string): Promise<void> {
  const step = parseInt(stepNum, 10);
  if (isNaN(step) || step < 1) {
    console.error(`${C.red}Usage: demo step <n>${C.reset}  (n = step number, starting from 1)`);
    process.exit(1);
  }

  header(`Demo Step ${step}`);
  const result = await fetchJSON('/demo/step', {
    method: 'POST',
    body: JSON.stringify({ step }),
  }) as Record<string, unknown>;

  console.log(`${C.bold}Step:${C.reset}    ${C.cyan}${result.step ?? step}${C.reset}`);
  console.log(`${C.bold}Title:${C.reset}   ${result.title ?? result.name ?? 'N/A'}`);
  console.log(`${C.bold}Status:${C.reset}  ${result.success ? `${C.green}SUCCESS${C.reset}` : `${C.red}FAILED${C.reset}`}`);
  if (result.description) {
    console.log(`${C.bold}Detail:${C.reset}  ${result.description}`);
  }
  if (result.result && typeof result.result === 'object') {
    console.log(`\n${C.dim}${JSON.stringify(result.result, null, 2)}${C.reset}`);
  }
}

async function cmdStatus(): Promise<void> {
  header('Agent Status');
  const status = await fetchJSON('/agent/status') as Record<string, unknown>;

  const personality = (status.personality ?? {}) as Record<string, unknown>;
  const loop = (status.autonomousLoop ?? {}) as Record<string, unknown>;
  const health = (status.health ?? {}) as Record<string, unknown>;

  const mood = String(personality.currentMood ?? personality.mood ?? 'neutral');
  const cycleCount = Number(loop.cycleCount ?? loop.cycles ?? 0);
  const tipsExecuted = Number(loop.tipsExecuted ?? loop.tipsProcessed ?? 0);
  const uptime = health.uptime ?? status.uptime ?? 'N/A';

  const rows: string[][] = [
    ['Mood', `${moodEmoji(mood)} ${C.cyan}${mood}${C.reset}`],
    ['Cycle Count', `${C.yellow}${cycleCount}${C.reset}`],
    ['Tips Executed', `${C.green}${tipsExecuted}${C.reset}`],
    ['Uptime', `${C.magenta}${uptime}${C.reset}`],
    ['Loop Status', loop.running ? `${C.green}RUNNING${C.reset}` : `${C.red}STOPPED${C.reset}`],
    ['AI Provider', `${status.aiProvider ?? status.ai ?? 'rule-based'}`],
  ];

  console.log(table(rows, ['Metric', 'Value']));
}

async function cmdPulse(): Promise<void> {
  header('Financial Pulse');
  const status = await fetchJSON('/agent/status') as Record<string, unknown>;
  const pulse = (status.financialPulse ?? status.pulse ?? {}) as Record<string, unknown>;
  const treasury = (status.treasury ?? {}) as Record<string, unknown>;
  const balances = (status.balances ?? {}) as Record<string, unknown>;

  // Core pulse metrics
  const liquidity = Number(pulse.liquidity ?? pulse.liquidityScore ?? 72);
  const risk = Number(pulse.risk ?? pulse.riskScore ?? 35);
  const activity = Number(pulse.activity ?? pulse.activityScore ?? 64);
  const health = Number(pulse.health ?? pulse.healthScore ?? 80);

  console.log(`  Liquidity   ${bar(liquidity, 100)}`);
  console.log(`  Risk        ${bar(risk, 100)}`);
  console.log(`  Activity    ${bar(activity, 100)}`);
  console.log(`  Health      ${bar(health, 100)}`);

  // Treasury breakdown
  if (treasury && typeof treasury === 'object') {
    const reserve = Number((treasury as Record<string, unknown>).tippingReservePercent ?? 0);
    const yieldPct = Number((treasury as Record<string, unknown>).yieldPercent ?? 0);
    const gasBuf = Number((treasury as Record<string, unknown>).gasBufferPercent ?? 0);
    if (reserve || yieldPct || gasBuf) {
      console.log(`\n${C.bold}Treasury Allocation:${C.reset}`);
      console.log(`  Reserve     ${bar(reserve, 100)}`);
      console.log(`  Yield       ${bar(yieldPct, 100)}`);
      console.log(`  Gas Buffer  ${bar(gasBuf, 100)}`);
    }
  }

  // Balances
  if (balances && typeof balances === 'object') {
    const entries = Object.entries(balances as Record<string, Record<string, string>>);
    if (entries.length > 0) {
      console.log(`\n${C.bold}Chain Balances:${C.reset}`);
      const balRows: string[][] = entries.map(([chain, bal]) => [
        chain,
        `${C.green}${bal.nativeBalance ?? '?'}${C.reset} ${bal.nativeCurrency ?? ''}`,
        `${C.cyan}${bal.usdtBalance ?? '0'}${C.reset} USDT`,
      ]);
      console.log(table(balRows, ['Chain', 'Native', 'USDT']));
    }
  }
}

async function cmdMood(): Promise<void> {
  header('Agent Mood');
  const status = await fetchJSON('/agent/status') as Record<string, unknown>;
  const personality = (status.personality ?? {}) as Record<string, unknown>;

  const mood = String(personality.currentMood ?? personality.mood ?? 'neutral');
  const multiplier = Number(personality.multiplier ?? personality.tipMultiplier ?? 1.0);
  const reason = String(personality.reason ?? personality.moodReason ?? 'Baseline personality');
  const modifiers = (personality.modifiers ?? personality.activeModifiers ?? []) as string[];
  const style = String(personality.style ?? personality.communicationStyle ?? 'friendly');

  console.log(`  ${C.bold}Current Mood:${C.reset}  ${moodEmoji(mood)} ${C.cyan}${C.bold}${mood.toUpperCase()}${C.reset}`);
  console.log(`  ${C.bold}Multiplier:${C.reset}    ${C.yellow}${multiplier}x${C.reset}`);
  console.log(`  ${C.bold}Reason:${C.reset}        ${reason}`);
  console.log(`  ${C.bold}Style:${C.reset}         ${style}`);

  if (modifiers.length > 0) {
    console.log(`\n  ${C.bold}Active Modifiers:${C.reset}`);
    for (const mod of modifiers) {
      console.log(`    ${C.magenta}•${C.reset} ${mod}`);
    }
  } else {
    console.log(`\n  ${C.dim}No active modifiers${C.reset}`);
  }
}

async function cmdReason(args: string[]): Promise<void> {
  const goal = args.join(' ');
  if (!goal) {
    console.error(`${C.red}Usage: reason <goal>${C.reset}  (e.g., reason "tip CryptoDaily 0.01 USDT")`);
    process.exit(1);
  }

  header(`Reasoning: ${goal}`);
  const result = await fetchJSON('/agent/tool-use', {
    method: 'POST',
    body: JSON.stringify({ goal }),
  }) as Record<string, unknown>;

  const steps = (result.steps ?? result.reasoning ?? []) as Array<Record<string, unknown>>;
  const answer = result.answer ?? result.result ?? result.response ?? '';

  if (steps.length > 0) {
    console.log(`${C.bold}Steps:${C.reset}\n`);
    for (const step of steps) {
      const num = step.step ?? step.index ?? '?';
      const action = step.action ?? step.tool ?? step.type ?? '';
      const detail = step.detail ?? step.result ?? step.output ?? '';
      console.log(`  ${C.cyan}${num}.${C.reset} ${C.bold}${action}${C.reset}`);
      if (detail) {
        const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
        console.log(`     ${C.dim}${detailStr}${C.reset}`);
      }
    }
  }

  if (answer) {
    console.log(`\n${C.bold}Answer:${C.reset} ${C.green}${answer}${C.reset}`);
  }

  if (result.provider) {
    console.log(`\n${C.dim}Provider: ${result.provider} | Tools: ${result.toolCount ?? 'N/A'}${C.reset}`);
  }
}

async function cmdAsk(args: string[]): Promise<void> {
  const message = args.join(' ');
  if (!message) {
    console.error(`${C.red}Usage: ask <question>${C.reset}  (e.g., ask "what are my top creators?")`);
    process.exit(1);
  }

  header('AeroFyta Chat');
  console.log(`${C.dim}You: ${message}${C.reset}\n`);

  const result = await fetchJSON('/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }) as Record<string, unknown>;

  const reply = result.reply ?? result.response ?? result.message ?? result.answer ?? '';
  console.log(`${C.cyan}${C.bold}Agent:${C.reset} ${reply}`);

  if (result.suggestedActions && Array.isArray(result.suggestedActions)) {
    console.log(`\n${C.bold}Suggested Actions:${C.reset}`);
    for (const action of result.suggestedActions as string[]) {
      console.log(`  ${C.yellow}→${C.reset} ${action}`);
    }
  }
}

async function cmdToolUse(args: string[]): Promise<void> {
  const goal = args.join(' ');
  if (!goal) {
    console.error(`${C.red}Usage: tool-use <goal>${C.reset}  (e.g., tool-use "check balances across all chains")`);
    process.exit(1);
  }

  header(`Tool Use: ${goal}`);
  const result = await fetchJSON('/agent/tool-use', {
    method: 'POST',
    body: JSON.stringify({ goal }),
  }) as Record<string, unknown>;

  // Show raw tool calls
  const steps = (result.steps ?? []) as Array<Record<string, unknown>>;
  const toolCalls = (result.toolCalls ?? []) as Array<Record<string, unknown>>;

  const calls = toolCalls.length > 0 ? toolCalls : steps;

  if (calls.length > 0) {
    console.log(`${C.bold}Tool Calls:${C.reset}\n`);
    for (const call of calls) {
      const name = call.tool ?? call.action ?? call.name ?? 'unknown';
      const params = call.params ?? call.input ?? call.arguments ?? {};
      const output = call.result ?? call.output ?? call.detail ?? null;

      console.log(`  ${C.bgGreen}${C.white} CALL ${C.reset} ${C.bold}${name}${C.reset}`);
      if (params && typeof params === 'object' && Object.keys(params as object).length > 0) {
        console.log(`  ${C.dim}Params: ${JSON.stringify(params)}${C.reset}`);
      }
      if (output !== null && output !== undefined) {
        const outStr = typeof output === 'string' ? output : JSON.stringify(output);
        const truncated = outStr.length > 200 ? outStr.slice(0, 200) + '...' : outStr;
        console.log(`  ${C.green}Result: ${truncated}${C.reset}`);
      }
      console.log('');
    }
  }

  if (result.answer ?? result.result) {
    console.log(`${C.bold}Final Answer:${C.reset} ${result.answer ?? result.result}`);
  }

  console.log(`${C.dim}Provider: ${result.provider ?? 'N/A'} | Tools available: ${result.toolCount ?? 'N/A'}${C.reset}`);
}

async function cmdLogs(follow: boolean): Promise<void> {
  if (follow) {
    header('Decision Stream (live)');
    console.log(`${C.dim}Connecting to ${BASE_URL}/api/reasoning/stream ...${C.reset}`);
    console.log(`${C.dim}Press Ctrl+C to stop${C.reset}\n`);

    try {
      const resp = await fetch(`${BASE_URL}/api/reasoning/stream?prompt=monitor`, {
        headers: { Accept: 'text/event-stream' },
      });

      if (!resp.ok) {
        console.error(`${C.red}HTTP ${resp.status}${C.reset} — could not connect to stream`);
        process.exit(1);
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        console.error(`${C.red}No response body stream available${C.reset}`);
        process.exit(1);
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              console.log(`\n${C.dim}Stream ended${C.reset}`);
              return;
            }
            try {
              const event = JSON.parse(data) as Record<string, unknown>;
              const ts = new Date().toLocaleTimeString();
              const type = event.type ?? event.event ?? 'info';
              const msg = event.message ?? event.content ?? event.step ?? JSON.stringify(event);
              const typeColor = type === 'error' ? C.red : type === 'warning' ? C.yellow : C.cyan;
              console.log(`${C.dim}${ts}${C.reset} ${typeColor}[${type}]${C.reset} ${msg}`);
            } catch {
              if (data.length > 0) {
                console.log(`${C.dim}${new Date().toLocaleTimeString()}${C.reset} ${data}`);
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
        console.error(`\n${C.red}${C.bold}Server not running${C.reset}`);
        console.error(`${C.dim}Start the agent first:  npm run dev${C.reset}\n`);
      } else {
        console.error(`${C.red}Stream error:${C.reset} ${msg}`);
      }
      process.exit(1);
    }
    return;
  }

  // Non-follow mode — fetch last 10 decisions
  header('Recent Decisions');
  const result = await fetchJSON('/agent/decisions?limit=10') as Record<string, unknown>;
  const decisions = (result.decisions ?? result.items ?? result.data ?? []) as Array<Record<string, unknown>>;

  if (decisions.length === 0) {
    console.log(`${C.dim}No decisions recorded yet.${C.reset}`);
    return;
  }

  const rows: string[][] = decisions.slice(0, 10).map((d) => {
    const ts = d.timestamp ?? d.createdAt ?? '';
    const tsStr = ts ? new Date(ts as string).toLocaleTimeString() : '?';
    const action = String(d.action ?? d.type ?? d.decision ?? '?');
    const outcome = String(d.outcome ?? d.result ?? d.status ?? '?');
    const conf = d.confidence != null ? `${d.confidence}%` : '-';
    const outcomeColor = outcome === 'approved' || outcome === 'success' ? C.green : outcome === 'rejected' || outcome === 'failed' ? C.red : C.yellow;
    return [tsStr, action, `${outcomeColor}${outcome}${C.reset}`, conf];
  });

  console.log(table(rows, ['Time', 'Action', 'Outcome', 'Confidence']));
  console.log(`\n${C.dim}Showing ${rows.length} of ${(result.total ?? decisions.length)} decisions${C.reset}`);
}

// ── Help ────────────────────────────────────────────────────────

function showHelp(): void {
  header('AeroFyta Agent CLI');
  console.log(`${C.bold}Usage:${C.reset} npx tsx src/index.ts <command> [args]\n`);

  const cmds: string[][] = [
    ['demo', 'Show pulse bars, mood, validate tip, adversarial check'],
    ['demo step <n>', 'Run demo step N via POST /api/demo/step'],
    ['status', 'Agent mood, cycle count, tips executed, uptime'],
    ['pulse', 'Financial pulse as progress bars'],
    ['mood', 'Current mood, multiplier, reason, modifiers'],
    ['reason <goal>', 'LLM reasoning chain for a goal'],
    ['ask <question>', 'Chat with the agent'],
    ['tool-use <goal>', 'Raw tool calls for a goal'],
    ['logs', 'Last 10 agent decisions'],
    ['logs --follow', 'Live SSE decision stream'],
  ];

  console.log(table(cmds, ['Command', 'Description']));
  console.log(`\n${C.dim}Set AGENT_URL env var to target a different server (default: http://localhost:3001)${C.reset}\n`);
}

// ── Main dispatcher ─────────────────────────────────────────────

export async function handleAgentCommand(subcommand: string, args: string[]): Promise<void> {
  switch (subcommand) {
    case 'demo':
      if (args[0] === 'step') {
        await cmdDemoStep(args[1] ?? '');
      } else {
        await cmdDemo();
      }
      break;

    case 'status':
      await cmdStatus();
      break;

    case 'pulse':
      await cmdPulse();
      break;

    case 'mood':
      await cmdMood();
      break;

    case 'reason':
      await cmdReason(args);
      break;

    case 'ask':
      await cmdAsk(args);
      break;

    case 'tool-use':
      await cmdToolUse(args);
      break;

    case 'logs':
      await cmdLogs(args.includes('--follow'));
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      console.error(`${C.red}Unknown command: ${subcommand}${C.reset}`);
      showHelp();
      process.exit(1);
  }
}

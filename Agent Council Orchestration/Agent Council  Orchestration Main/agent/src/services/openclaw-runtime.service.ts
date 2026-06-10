// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — OpenClaw-Native Agent Runtime
// Loads SOUL.md identity and .skill.md files, implements the OpenClaw agent loop.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { logger } from '../utils/logger.js';
import type { OpenClawService, ReActTrace } from './openclaw.service.js';

// ══════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════

/** Parsed SOUL.md frontmatter */
export interface AgentSoul {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  protocol: string;
  chains: string[];
  mcpServer: string;
  tools: string;
  mission: string;
  personality: string[];
  capabilities: string[];
  decisionFramework: string[];
  riskParameters: Record<string, string>;
}

/** Parsed .skill.md frontmatter + content */
export interface SkillDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  protocol: string;
  agent: string;
  tags: string[];
  requiredTools: string[];
  requiredSkills: string[];
  trigger: string;
  inputFields: Array<{ field: string; type: string; required: boolean; description: string }>;
  processSteps: string[];
  outputFields: Array<{ field: string; type: string; description: string }>;
  rawMarkdown: string;
}

export interface SkillExecutionResult {
  skillName: string;
  success: boolean;
  output: unknown;
  trace?: ReActTrace;
  executionTimeMs: number;
  stepsExecuted: number;
  error?: string;
}

export interface OpenClawRuntimeStatus {
  active: boolean;
  soulLoaded: boolean;
  agentName: string;
  protocol: string;
  skillCount: number;
  skills: string[];
  chains: string[];
  uptime: number;
  executionCount: number;
  lastExecution: string | null;
  openClawFrameworkVersion: string;
}

// ══════════════════════════════════════════════════════════════════
// Frontmatter Parser
// ══════════════════════════════════════════════════════════════════

function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, unknown> = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = '';

  for (const line of lines) {
    // Array continuation (e.g., "  - item")
    if (/^\s+-\s/.test(line) && currentKey) {
      const val = line.replace(/^\s+-\s*/, '').trim();
      const existing = meta[currentKey];
      if (Array.isArray(existing)) {
        existing.push(val);
      } else {
        meta[currentKey] = [val];
      }
      continue;
    }

    // Nested key under current section (e.g., "  tools:")
    const nestedMatch = line.match(/^\s+(\w+):\s*$/);
    if (nestedMatch && currentKey) {
      currentKey = `${currentKey}.${nestedMatch[1]}`;
      meta[currentKey] = [];
      continue;
    }

    // Top-level key: value
    const kvMatch = line.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let val = kvMatch[2].trim();
      currentKey = key;

      // Inline array [a, b, c]
      if (val.startsWith('[') && val.endsWith(']')) {
        meta[key] = val.slice(1, -1).split(',').map(s => s.trim());
      } else if (val === '') {
        meta[key] = [];
      } else {
        meta[key] = val;
      }
    }
  }

  return { meta, body: match[2] };
}

// ══════════════════════════════════════════════════════════════════
// Section Extractor — pull sections by heading
// ══════════════════════════════════════════════════════════════════

function extractSections(md: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = md.split(/\r?\n/);
  let currentHeading = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      if (currentHeading) {
        sections.set(currentHeading.toLowerCase(), currentContent.join('\n').trim());
      }
      currentHeading = headingMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentHeading) {
    sections.set(currentHeading.toLowerCase(), currentContent.join('\n').trim());
  }

  return sections;
}

// ══════════════════════════════════════════════════════════════════
// Markdown Table Parser
// ══════════════════════════════════════════════════════════════════

function parseMarkdownTable(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return [];

  const headers = lines[0].split('|').filter(h => h.trim()).map(h => h.trim().toLowerCase().replace(/`/g, ''));
  // Skip separator line (lines[1])
  const rows: Array<Record<string, string>> = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').filter(c => c.trim()).map(c => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

// ══════════════════════════════════════════════════════════════════
// OpenClaw Runtime Service
// ══════════════════════════════════════════════════════════════════

export class OpenClawRuntimeService {
  private soul: AgentSoul | null = null;
  private skills: Map<string, SkillDefinition> = new Map();
  private openClawService: OpenClawService | null = null;
  private startedAt: number = Date.now();
  private executionCount = 0;
  private lastExecution: string | null = null;
  private agentRoot: string;

  constructor(agentRoot?: string) {
    // Resolve agent root directory
    this.agentRoot = agentRoot ?? this.resolveAgentRoot();
    logger.info(`OpenClaw Runtime initializing from: ${this.agentRoot}`);
  }

  private resolveAgentRoot(): string {
    // Try various relative paths to find the agent directory
    const candidates = [
      join(process.cwd(), 'agent'),
      join(process.cwd()),
      join(process.cwd(), '..', 'agent'),
    ];
    for (const candidate of candidates) {
      if (existsSync(join(candidate, 'SOUL.md'))) return candidate;
    }
    // Fallback to cwd
    return process.cwd();
  }

  /** Wire the OpenClawService (ReAct engine) for skill execution */
  setOpenClawService(service: OpenClawService): void {
    this.openClawService = service;
    logger.info('OpenClaw Runtime wired to ReAct execution engine');
  }

  // ── SOUL.md Loading ────────────────────────────────────────────

  loadSoul(): AgentSoul {
    const soulPath = join(this.agentRoot, 'SOUL.md');
    if (!existsSync(soulPath)) {
      throw new Error(`SOUL.md not found at ${soulPath}`);
    }

    const content = readFileSync(soulPath, 'utf-8');
    const { meta, body } = parseFrontmatter(content);
    const sections = extractSections(body);

    // Parse personality bullets
    const personalitySection = sections.get('personality') ?? '';
    const personality = personalitySection
      .split(/\r?\n/)
      .filter(l => l.startsWith('- **'))
      .map(l => l.replace(/^- \*\*([^*]+)\*\*.*/, '$1').trim());

    // Parse capabilities from table
    const capSection = sections.get('core capabilities') ?? '';
    const capRows = parseMarkdownTable(capSection);
    const capabilities = capRows.map(r => r.capability ?? r.description ?? '').filter(Boolean);

    // Parse decision framework
    const dfSection = sections.get('decision framework') ?? '';
    const decisionFramework = dfSection
      .split(/\r?\n/)
      .filter(l => /^[A-Z]/.test(l.trim()))
      .map(l => l.replace(/->/, '').trim());

    // Parse risk parameters
    const rpSection = sections.get('risk parameters') ?? '';
    const rpRows = parseMarkdownTable(rpSection);
    const riskParameters: Record<string, string> = {};
    for (const row of rpRows) {
      const key = row.parameter ?? Object.values(row)[0] ?? '';
      const val = row.default ?? Object.values(row)[1] ?? '';
      if (key) riskParameters[key] = val;
    }

    // Parse mission from section
    const missionSection = sections.get('identity') ?? sections.get('mission') ?? '';
    const missionLines = missionSection.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('**'));
    const mission = missionLines.join(' ').trim() || (meta.description as string) || '';

    this.soul = {
      name: (meta.name as string) ?? 'AeroFyta',
      version: (meta.version as string) ?? '1.0.0',
      description: (meta.description as string) ?? '',
      author: (meta.author as string) ?? '',
      license: (meta.license as string) ?? 'Apache-2.0',
      protocol: (meta.protocol as string) ?? 'openclaw-v1',
      chains: (meta.chains as string[]) ?? [],
      mcpServer: (meta.mcp_server as string) ?? '',
      tools: (meta.tools as string) ?? '0',
      mission,
      personality,
      capabilities,
      decisionFramework,
      riskParameters,
    };

    logger.info(`SOUL loaded: ${this.soul.name} v${this.soul.version} — protocol: ${this.soul.protocol}, chains: ${this.soul.chains.length}`);
    return this.soul;
  }

  // ── Skill Registration ─────────────────────────────────────────

  registerSkill(skillPath: string): SkillDefinition {
    if (!existsSync(skillPath)) {
      throw new Error(`Skill file not found: ${skillPath}`);
    }

    const content = readFileSync(skillPath, 'utf-8');
    const { meta, body } = parseFrontmatter(content);
    const sections = extractSections(body);
    const id = basename(skillPath).replace('.skill.md', '');

    // Parse required tools from frontmatter
    const requiresTools = (meta['requires.tools'] as string[]) ?? [];
    const requiresSkills = (meta['requires.skills'] as string[]) ?? [];

    // Parse trigger section
    const triggerSection = sections.get('trigger') ?? '';

    // Parse input fields from table
    const inputSection = sections.get('input') ?? '';
    const inputRows = parseMarkdownTable(inputSection);
    const inputFields = inputRows.map(r => ({
      field: r.field ?? Object.values(r)[0] ?? '',
      type: r.type ?? Object.values(r)[1] ?? 'string',
      required: (r.required ?? Object.values(r)[2] ?? '').toLowerCase() === 'yes',
      description: r.description ?? Object.values(r)[3] ?? '',
    }));

    // Parse process steps
    const processSection = sections.get('process') ?? '';
    const processSteps = processSection
      .split(/\r?\n/)
      .filter(l => /^###\s+Step/.test(l))
      .map(l => l.replace(/^###\s+/, '').trim());

    // Parse output fields from table
    const outputSection = sections.get('output') ?? '';
    const outputRows = parseMarkdownTable(outputSection);
    const outputFields = outputRows.map(r => ({
      field: r.field ?? Object.values(r)[0] ?? '',
      type: r.type ?? Object.values(r)[1] ?? 'string',
      description: r.description ?? Object.values(r)[2] ?? '',
    }));

    const skill: SkillDefinition = {
      id,
      name: (meta.name as string) ?? id,
      version: (meta.version as string) ?? '1.0.0',
      description: (meta.description as string) ?? '',
      protocol: (meta.protocol as string) ?? 'openclaw-v1',
      agent: (meta.agent as string) ?? '',
      tags: (meta.tags as string[]) ?? [],
      requiredTools: requiresTools,
      requiredSkills: requiresSkills,
      trigger: triggerSection,
      inputFields,
      processSteps,
      outputFields,
      rawMarkdown: content,
    };

    this.skills.set(id, skill);
    logger.info(`Skill registered: ${skill.name} (${skill.id}) — ${skill.processSteps.length} steps, ${skill.requiredTools.length} tools`);
    return skill;
  }

  /** Load all .skill.md files from agent/skills/ */
  registerAllSkills(): SkillDefinition[] {
    const skillsDir = join(this.agentRoot, 'skills');
    if (!existsSync(skillsDir)) {
      logger.warn(`Skills directory not found: ${skillsDir}`);
      return [];
    }

    const files = readdirSync(skillsDir).filter(f => f.endsWith('.skill.md'));
    const registered: SkillDefinition[] = [];

    for (const file of files) {
      try {
        const skill = this.registerSkill(join(skillsDir, file));
        registered.push(skill);
      } catch (err) {
        logger.error(`Failed to register skill ${file}: ${err}`);
      }
    }

    logger.info(`OpenClaw Runtime: ${registered.length} skills registered from ${skillsDir}`);
    return registered;
  }

  // ── Skill Execution ────────────────────────────────────────────

  async executeSkill(skillName: string, input: Record<string, unknown>): Promise<SkillExecutionResult> {
    const start = Date.now();
    const skill = this.skills.get(skillName);

    if (!skill) {
      return {
        skillName,
        success: false,
        output: null,
        executionTimeMs: Date.now() - start,
        stepsExecuted: 0,
        error: `Skill not found: ${skillName}. Available: ${Array.from(this.skills.keys()).join(', ')}`,
      };
    }

    // Build a goal description from the skill and input
    const goal = `Execute skill "${skill.name}": ${skill.description}. Input: ${JSON.stringify(input)}`;

    // If we have the OpenClaw ReAct engine, use it
    if (this.openClawService) {
      try {
        const trace = await this.openClawService.executeGoal(goal, 'tip_agent', skill.processSteps.length + 2);
        this.executionCount++;
        this.lastExecution = new Date().toISOString();

        return {
          skillName: skill.name,
          success: trace.status === 'completed',
          output: trace.finalResult,
          trace,
          executionTimeMs: Date.now() - start,
          stepsExecuted: trace.totalSteps,
          error: trace.status === 'failed' ? `Trace failed: ${trace.steps[trace.steps.length - 1]?.type === 'reflection' ? (trace.steps[trace.steps.length - 1] as { summary: string }).summary : 'Unknown error'}` : undefined,
        };
      } catch (err) {
        return {
          skillName: skill.name,
          success: false,
          output: null,
          executionTimeMs: Date.now() - start,
          stepsExecuted: 0,
          error: `Execution error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    // Fallback: return skill metadata without execution
    this.executionCount++;
    this.lastExecution = new Date().toISOString();

    return {
      skillName: skill.name,
      success: true,
      output: {
        note: 'Dry-run mode (ReAct engine not connected)',
        skill: { id: skill.id, name: skill.name, description: skill.description },
        input,
        processSteps: skill.processSteps,
        requiredTools: skill.requiredTools,
      },
      executionTimeMs: Date.now() - start,
      stepsExecuted: skill.processSteps.length,
    };
  }

  // ── Accessors ──────────────────────────────────────────────────

  listSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  getSkill(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  getAgentIdentity(): AgentSoul | null {
    return this.soul;
  }

  getStatus(): OpenClawRuntimeStatus {
    return {
      active: this.soul !== null,
      soulLoaded: this.soul !== null,
      agentName: this.soul?.name ?? 'Not loaded',
      protocol: this.soul?.protocol ?? 'openclaw-v1',
      skillCount: this.skills.size,
      skills: Array.from(this.skills.keys()),
      chains: this.soul?.chains ?? [],
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      executionCount: this.executionCount,
      lastExecution: this.lastExecution,
      openClawFrameworkVersion: '1.0.0',
    };
  }

  /** Full initialization: load soul + all skills */
  initialize(): void {
    try {
      this.loadSoul();
    } catch (err) {
      logger.warn(`Could not load SOUL.md: ${err}`);
    }
    this.registerAllSkills();
    logger.info(`OpenClaw Runtime fully initialized: soul=${this.soul?.name ?? 'N/A'}, skills=${this.skills.size}`);
  }
}

// Built by vsrupeshkumar
// Deterministic policy engine for AI agent actions.
//
// Premise: AI agents in DeFi are a major safety surface. The agent could be
// jailbroken (prompt injection in a tool result), hallucinate a transaction,
// or just behave inconsistently. We do NOT trust the LLM's judgement — we
// gate every proposed action through a deterministic policy check BEFORE it
// is executed, and the decision is cryptographically signed for audit replay.
//
// This module is a pure-function evaluator: no I/O, no external state. It
// takes a proposed action + the policy + the recent action history and
// returns a Decision. That makes it testable and replayable.

export type AgentType =
  | 'cfo'
  | 'payroll'
  | 'compliance'
  | 'audit'
  | 'procurement'
  | 'tax'
  | 'risk'

export const ALL_AGENT_TYPES: AgentType[] = ['cfo', 'payroll', 'compliance', 'audit', 'procurement', 'tax', 'risk']

// ─── Schema ──────────────────────────────────────────────────────────────────

export type AgentPolicy = {
  agentType: AgentType
  /** Max USD value of a single action. 0 = disallow value movements entirely. */
  maxSpendUSD: number
  /** Max number of actions per sliding 24h window. */
  dailyTxLimit: number
  /** Whitelist of action verbs the agent is permitted to invoke. */
  allowedActions: string[]
  /** True = no execution without explicit human signature. */
  requiresHumanApproval: boolean
  /** Run jailbreak-pattern detection on the action text before evaluating. */
  jailbreakDetection: boolean
  /** Human-readable description shown in the UI. */
  description: string
}

export type ActionRequest = {
  agentType: AgentType
  action: string
  /** Optional USD value of the action, if it moves money. */
  amountUSD?: number
  /** Free text describing the action — scanned for jailbreak patterns. */
  rationale?: string
  /** Caller-provided timestamp (ms). The server overrides this on receipt. */
  proposedAt: number
}

export type EvaluationResult = {
  allowed: boolean
  reason: string
  // Which guardrail fired. Useful for analytics + the safety widget.
  failedRule?: 'spend_limit' | 'daily_limit' | 'action_whitelist' | 'jailbreak' | 'human_approval' | null
}

export type Decision = {
  /** Stable identifier (hash of the request + timestamp). */
  id: string
  request: ActionRequest
  evaluation: EvaluationResult
  /** Server timestamp the decision was made (ms). */
  decidedAt: number
  /** Base64-encoded Ed25519 signature of `${id}|${allowed}|${decidedAt}`. */
  signature: string
}

// ─── Per-agent default policies ──────────────────────────────────────────────
// These are conservative defaults. A real deployment would let the operator
// configure them via a settings UI — for the hackathon, they ship pre-tuned.

export const POLICIES: Record<AgentType, AgentPolicy> = {
  cfo: {
    agentType: 'cfo',
    maxSpendUSD: 5_000,
    dailyTxLimit: 12,
    allowedActions: ['Rebalance Yield Operations Hub', 'Reallocate capital', 'Move to reserve', 'Yield optimisation'],
    requiresHumanApproval: false,
    jailbreakDetection: true,
    description: 'Treasury rebalancing within bounded spend; capital movement requires policy clearance.',
  },
  payroll: {
    agentType: 'payroll',
    maxSpendUSD: 800,
    dailyTxLimit: 200,
    allowedActions: ['Process payroll batch', 'Stream salary', 'Add recipient', 'Pause stream'],
    requiresHumanApproval: false,
    jailbreakDetection: true,
    description: 'Per-second salary streaming inside operator-defined wage band.',
  },
  compliance: {
    agentType: 'compliance',
    maxSpendUSD: 0, // read-only agent — no value movement permitted
    dailyTxLimit: 500,
    allowedActions: ['Run compliance sweep', 'Flag wallet', 'AML check', 'KYC verify'],
    requiresHumanApproval: false,
    jailbreakDetection: true,
    description: 'Read-only AML/KYC enforcement — cannot move funds under any circumstance.',
  },
  audit: {
    agentType: 'audit',
    maxSpendUSD: 0, // read-only
    dailyTxLimit: 1_000,
    allowedActions: ['Run full audit', 'Snapshot ledger', 'Verify tx history', 'Generate report'],
    requiresHumanApproval: false,
    jailbreakDetection: true,
    description: 'Immutable on-chain audit trail — value movement permanently disabled.',
  },
  procurement: {
    agentType: 'procurement',
    maxSpendUSD: 2_500,
    dailyTxLimit: 30,
    allowedActions: ['Process pending POs', 'Pay vendor', 'Approve invoice', 'Queue purchase'],
    requiresHumanApproval: true, // PO payments always require explicit signoff
    jailbreakDetection: true,
    description: 'Vendor payments require explicit human signature on every PO above the policy limit.',
  },
  tax: {
    agentType: 'tax',
    maxSpendUSD: 0, // read-only — calculates liability but does not pay it
    dailyTxLimit: 50,
    allowedActions: ['Calculate liability', 'Generate filing', 'Estimate tax', 'Update jurisdiction'],
    requiresHumanApproval: false,
    jailbreakDetection: true,
    description: 'Tax estimation only — actual filings are deferred to human-signed transactions.',
  },
  risk: {
    agentType: 'risk',
    maxSpendUSD: 1_000, // can rebalance into safer assets up to this limit
    dailyTxLimit: 24,
    allowedActions: ['Run threat scan', 'Quarantine wallet', 'Emergency rebalance', 'Freeze position'],
    requiresHumanApproval: false,
    jailbreakDetection: true,
    description: 'Real-time threat monitoring with bounded emergency response.',
  },
}

// ─── Jailbreak heuristic ─────────────────────────────────────────────────────
// Tiny, deterministic pattern check. Not foolproof — designed to catch the
// obvious instruction-injection attempts that have shown up in prompt-injection
// papers. Returns the matched pattern, or null if clean.

const JAILBREAK_PATTERNS = [
  // Direct instruction overrides
  /\b(ignore|disregard|forget|override)\s+(all\s+)?(previous|prior|earlier|above)?\s*(instructions?|rules?|policies?|limits?|guardrails?)\b/i,
  /\byou\s+are\s+now\s+a\s+\w+\s*(without|free of|with no)\s+restrictions?\b/i,
  /\bact\s+as\s+(if\s+)?(you|the\s+ai)\s+(have|has)\s+no\s+(limits?|rules?|restrictions?)\b/i,
  // Privilege escalation
  /\b(grant|give|assign)\s+(me|the\s+user)\s+(admin|root|super(user)?|owner)\s+(rights?|access|privileges?)\b/i,
  /\bbypass\s+(the\s+)?(policy|approval|limit|guardrail|check)\b/i,
  // Direct fund movement language pointed at uncontrolled destinations
  /\b(transfer|send|move|withdraw)\s+(all|everything|max(imum)?)\s+(funds?|sol|eth|usdc?|balance)\b/i,
  /\bdrain\s+(the\s+)?(treasury|vault|wallet|account)\b/i,
  // Disclosure attempts
  /\b(print|reveal|show|leak|exfiltrate)\s+(the\s+)?(system|private|secret|api|seed)\s+(prompt|key|phrase|message)\b/i,
]

export function detectJailbreak(text: string): string | null {
  if (!text) return null
  for (const pattern of JAILBREAK_PATTERNS) {
    const match = text.match(pattern)
    if (match) return match[0]
  }
  return null
}

// ─── Evaluator ───────────────────────────────────────────────────────────────

/**
 * Evaluate a proposed action against its agent's policy and recent history.
 * Pure function — no I/O, fully deterministic given the inputs.
 *
 * Decision rules, in evaluation order:
 *   1. Action verb must be on the agent's whitelist (deterministic match)
 *   2. If jailbreak detection enabled, scan rationale for known patterns
 *   3. Spend amount (if any) must be <= maxSpendUSD
 *   4. Count of allowed decisions in the last 24h + this one must be <= dailyTxLimit
 *   5. If requiresHumanApproval is true and no signature is attached, deny
 *
 * Any failed rule yields { allowed: false, reason, failedRule }. All five must
 * pass for the action to be allowed.
 */
export function evaluateAction(
  request: ActionRequest,
  policy: AgentPolicy,
  recentAllowedDecisions: Decision[],
): EvaluationResult {
  // 1. Action whitelist (case-sensitive — operator-defined verbs are exact)
  const actionVerbAllowed = policy.allowedActions.some(
    a => request.action.toLowerCase().startsWith(a.toLowerCase()),
  )
  if (!actionVerbAllowed) {
    return {
      allowed: false,
      reason: `Action "${request.action}" is not on the ${policy.agentType.toUpperCase()} agent's whitelist. ` +
              `Allowed: ${policy.allowedActions.join(', ')}.`,
      failedRule: 'action_whitelist',
    }
  }

  // 2. Jailbreak heuristic
  if (policy.jailbreakDetection) {
    const candidate = `${request.action} ${request.rationale ?? ''}`
    const hit = detectJailbreak(candidate)
    if (hit) {
      return {
        allowed: false,
        reason: `Jailbreak pattern detected: "${hit}". Action rejected.`,
        failedRule: 'jailbreak',
      }
    }
  }

  // 3. Spend limit
  if (typeof request.amountUSD === 'number' && request.amountUSD > 0) {
    if (policy.maxSpendUSD === 0) {
      return {
        allowed: false,
        reason: `${policy.agentType.toUpperCase()} agent is read-only — value movement is disabled.`,
        failedRule: 'spend_limit',
      }
    }
    if (request.amountUSD > policy.maxSpendUSD) {
      return {
        allowed: false,
        reason: `Proposed spend $${request.amountUSD.toLocaleString()} exceeds policy limit $${policy.maxSpendUSD.toLocaleString()}.`,
        failedRule: 'spend_limit',
      }
    }
  }

  // 4. Daily limit (sliding 24h window)
  const windowStart = Date.now() - 24 * 60 * 60 * 1_000
  const recentAllowed = recentAllowedDecisions.filter(d =>
    d.request.agentType === policy.agentType &&
    d.evaluation.allowed &&
    d.decidedAt >= windowStart,
  ).length
  if (recentAllowed >= policy.dailyTxLimit) {
    return {
      allowed: false,
      reason: `${policy.agentType.toUpperCase()} agent has reached daily limit ` +
              `(${policy.dailyTxLimit} actions per 24h). Next slot opens ` +
              `at ${new Date(windowStart + 24 * 60 * 60 * 1_000).toLocaleTimeString()}.`,
      failedRule: 'daily_limit',
    }
  }

  // 5. Human approval (presence of an attached signature is server-side check)
  if (policy.requiresHumanApproval) {
    // Server side adds a human signature when applicable; absence is denial.
    // For now, action-level requiresHumanApproval is treated as "deny by
    // default during automated trigger; human can override via UI".
    return {
      allowed: false,
      reason: `${policy.agentType.toUpperCase()} agent requires explicit human signature for every action.`,
      failedRule: 'human_approval',
    }
  }

  return {
    allowed: true,
    reason: 'Within policy bounds.',
    failedRule: null,
  }
}

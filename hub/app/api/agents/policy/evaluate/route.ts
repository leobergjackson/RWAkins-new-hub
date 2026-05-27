// Built by vsrupeshkumar
// Deterministic policy evaluator + Ed25519 signer for AI agent actions.
//
// POST body shape: { agentType, action, amountUSD?, rationale?, proposedAt }
//
// Response:
//   {
//     decision: Decision,
//     pubKeySpkiBase64: string  // the public key used to sign this decision
//   }
//
// Every call results in exactly one Decision (allowed or blocked). Both
// outcomes are persisted to the in-process decision log so /api/agents/policy/log
// can return them in order.
import { NextResponse } from 'next/server'
import {
  POLICIES,
  evaluateAction,
  type AgentType,
  type ActionRequest,
  type Decision,
  type EvaluationResult,
} from '@/lib/agent-policies'
import { allDecisions } from '@/lib/policy-store'
import { appendDecision } from '@/lib/policy-store'
import { signDecision, requestId, getPublicKeySpkiBase64 } from '@/lib/policy-signer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isAgentType(s: string): s is AgentType {
  return ['cfo', 'payroll', 'compliance', 'audit', 'procurement', 'tax', 'risk'].includes(s)
}

export async function POST(req: Request) {
  let body: Partial<ActionRequest>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const agentType = String(body.agentType ?? '')
  if (!isAgentType(agentType)) {
    return NextResponse.json({ error: `invalid agentType "${agentType}"` }, { status: 400 })
  }
  const action = String(body.action ?? '').trim()
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  const request: ActionRequest = {
    agentType,
    action,
    amountUSD: typeof body.amountUSD === 'number' ? body.amountUSD : undefined,
    rationale: body.rationale ? String(body.rationale) : undefined,
    proposedAt: Date.now(), // server-authoritative
  }

  const policy = POLICIES[agentType]
  const history = allDecisions()
  const evaluation: EvaluationResult = evaluateAction(request, policy, history)

  const id = requestId(request)
  const decidedAt = Date.now()
  const canonicalMessage = `${id}|${evaluation.allowed}|${decidedAt}`
  const signature = signDecision(canonicalMessage)

  const decision: Decision = {
    id,
    request,
    evaluation,
    decidedAt,
    signature,
  }
  appendDecision(decision)

  return NextResponse.json({
    decision,
    pubKeySpkiBase64: getPublicKeySpkiBase64(),
    canonicalMessage,
  })
}

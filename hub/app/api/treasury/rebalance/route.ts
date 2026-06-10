// Built by vsrupeshkumar
// Server-side AI rebalancer for the RWAkins AI x RWA Treasury.
// Reads real on-chain inputs (balances + mock RWA yields) supplied by the client,
// asks Groq for a target USDY/mETH allocation, then validates + clamps the result
// against the SAME risk rule the smart contract enforces (mETH <= 70%, sum == 100%)
// so the on-chain rebalance() can never revert on the AI's suggestion.
import { NextResponse } from 'next/server'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'
const MAX_RISK_BPS = 7000

const SYSTEM_PROMPT =
  'You are the autonomous treasury agent for RWAkins, an AI x RWA vault on Mantle. ' +
  'You allocate a treasury between USDY (a stable real-world-asset yield token) and ' +
  'mETH (ETH staking yield, the higher-risk asset). Hard rule: mETH may never exceed ' +
  '70% (7000 bps); the two targets must sum to exactly 10000 bps. Favour mETH when its ' +
  'APY meaningfully beats USDY and balances are healthy, but stay conservative. ' +
  'Respond with ONLY a JSON object: {"usdyBps": number, "methBps": number, "rationale": string}. ' +
  'rationale must be one concise sentence.'

interface Body {
  usdyBalance?: number
  methBalance?: number
  usdyApy?: number // percent, e.g. 4.8
  methApy?: number // percent, e.g. 3.6
  currentUsdyBps?: number
  currentMethBps?: number
}

function clampAllocation(usdyBps: number, methBps: number) {
  let m = Math.round(Number.isFinite(methBps) ? methBps : 4000)
  if (m < 0) m = 0
  if (m > MAX_RISK_BPS) m = MAX_RISK_BPS // enforce the on-chain risk cap
  const u = 10000 - m
  return { usdyBps: u, methBps: m }
}

export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const {
    usdyBalance = 0, methBalance = 0,
    usdyApy = 4.8, methApy = 3.6,
    currentUsdyBps = 5000, currentMethBps = 5000,
  } = body

  // No AI key configured → let the client fall back to manual sliders.
  if (!key) return NextResponse.json({ error: 'AI_DISABLED' }, { status: 503 })

  const userPrompt =
    `Vault position:\n` +
    `- USDY balance: ${usdyBalance} kUSDY earning ${usdyApy}% APY\n` +
    `- mETH balance: ${methBalance} kMETH earning ${methApy}% APY\n` +
    `- Current allocation: ${(currentUsdyBps / 100).toFixed(0)}% USDY / ${(currentMethBps / 100).toFixed(0)}% mETH\n` +
    `Recommend a new target allocation in basis points.`

  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 15_000)
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
    if (!res.ok) return NextResponse.json({ error: 'UPSTREAM_FAILED' }, { status: 502 })

    const json = await res.json()
    const raw = json?.choices?.[0]?.message?.content ?? '{}'

    let parsed: { usdyBps?: number; methBps?: number; rationale?: string } = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'PARSE_FAILED' }, { status: 502 })
    }

    const rawMeth = Number(parsed.methBps)
    const rawUsdy = Number(parsed.usdyBps)
    const before = clampAllocation(rawUsdy, rawMeth)
    const clamped = rawMeth > MAX_RISK_BPS || rawUsdy + rawMeth !== 10000

    return NextResponse.json({
      usdyBps: before.usdyBps,
      methBps: before.methBps,
      rationale: String(parsed.rationale ?? 'Allocation adjusted toward the higher net-of-risk yield.').slice(0, 280),
      clamped,
      model: MODEL,
    })
  } catch {
    return NextResponse.json({ error: 'NETWORK_ERROR' }, { status: 504 })
  } finally {
    clearTimeout(timeout)
  }
}

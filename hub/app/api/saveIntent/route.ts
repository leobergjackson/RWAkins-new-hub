// Built by vsrupeshkumar
// Persists a user's AI-CFO "wealth rules" for the onboarding flow.
//
// The client POSTs the free-text intent + wallet address. We try to parse it
// into a structured allocation policy with Groq (same provider as the rest of
// the hub); on any failure — no key, bad JSON, timeout — we fall back to the
// deterministic parser in lib/intent. Either way the result is run through
// normalizeRules(), so the persisted mETH share can never exceed the vault's
// on-chain MAX_RISK_BPS. Rules are also returned so the client can mirror them
// to localStorage (no off-chain database — parity with the contracts).
import { NextResponse } from 'next/server'
import { parseIntent, normalizeRules, type WealthRules } from '@/lib/intent'
import { setIntent, getIntent } from '@/lib/intentStore'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT =
  'You convert a user\'s plain-English financial goals into an allocation policy ' +
  'for an AI x RWA treasury on Mantle that holds USDY (stable real-world-asset ' +
  'yield) and mETH (ETH staking yield, the higher-risk asset). Hard rule: mETH may ' +
  'never exceed 7000 bps (70%); targetUsdyBps + targetMethBps must equal 10000. ' +
  'Respond with ONLY a JSON object: {"riskLevel":"low"|"medium"|"high","defaultAsset":"USDY"|"mETH",' +
  '"targetUsdyBps":number,"targetMethBps":number,"autoRebalance":boolean,"rebalanceThresholdPct":number}.'

// Durable copy lives in the client's localStorage; this lets a same-instance GET read back.

interface Body {
  address?: string
  rawIntent?: string
  rules?: Partial<WealthRules>
}

async function aiParse(rawIntent: string): Promise<Partial<WealthRules> | null> {
  const key = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
  if (!key) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12_000)
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: rawIntent.slice(0, 1000) },
        ],
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const text = json?.choices?.[0]?.message?.content
    if (!text) return null
    return JSON.parse(text) as Partial<WealthRules>
  } catch {
    return null // any failure → caller uses the deterministic parser
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const address = (body.address || '').trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 })
  }

  const rawIntent = (body.rawIntent || '').toString()
  let rules: WealthRules

  if (body.rules) {
    // Client supplied an already-structured policy — just normalize/clamp it.
    rules = normalizeRules(body.rules, rawIntent)
  } else if (rawIntent.trim()) {
    const ai = await aiParse(rawIntent)
    rules = ai ? normalizeRules(ai, rawIntent) : parseIntent(rawIntent)
  } else {
    return NextResponse.json({ error: 'EMPTY_INTENT' }, { status: 400 })
  }

  setIntent(address, rules)
  return NextResponse.json({ ok: true, rules })
}

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get('address') ?? ''
  if (!address) return NextResponse.json({ error: 'MISSING_ADDRESS' }, { status: 400 })
  return NextResponse.json({ rules: getIntent(address) })
}

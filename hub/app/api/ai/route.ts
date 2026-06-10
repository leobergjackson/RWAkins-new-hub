// Built by vsrupeshkumar
// Server-side proxy for the Groq AI chat used by Protocol Borrow Engine.
// Keeps GROQ_API_KEY off the client. Falls back to NEXT_PUBLIC_GROQ_API_KEY
// only for migration — remove that var from Vercel once GROQ_API_KEY is set.
import { NextResponse } from 'next/server'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT =
  'You are a DeFi loan negotiation AI for the RWAkins Protocol Borrow Engine on Mantle Network. Be concise and specific about rates, ZK credit, and RWA collateral (USDY, mETH).'

export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'AI_DISABLED' }, { status: 503 })
  }

  let message: string
  try {
    const body = await req.json()
    message = String(body?.message ?? '').slice(0, 2000)
    if (!message.trim()) {
      return NextResponse.json({ error: 'EMPTY_MESSAGE' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 15_000)
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
      }),
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'UPSTREAM_FAILED' }, { status: 502 })
    }
    const json = await res.json()
    const text = json?.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'NETWORK_ERROR' }, { status: 504 })
  } finally {
    clearTimeout(timeout)
  }
}

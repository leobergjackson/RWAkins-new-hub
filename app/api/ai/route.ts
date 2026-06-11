// Built by vsrupeshkumar
// Server-side OpenAI proxy for the RWAkins AI CFO. Keeps OPENAI_API_KEY off the
// client. Used by the onboarding IntentChat to confirm a parsed wealth policy
// back to the user in natural language. Returns { error: 'AI_DISABLED' } when no
// key is configured so the client can fall back to its deterministic message.
import { NextResponse } from 'next/server'
import { chat, hasOpenAIKey } from '@/lib/openai'

const SYSTEM_PROMPT =
  'You are the RWAkins AI CFO, an autonomous treasury agent on Mantle Network. ' +
  'You manage a two-asset real-world-asset portfolio: USDY (Ondo tokenized US ' +
  'treasuries, the stable yield leg) and mETH (Mantle liquid-staked ETH, the ' +
  'higher-risk growth leg). Your ONLY job here is to NARRATE — write the warm, ' +
  'concise confirmation prose for an allocation that has ALREADY been decided ' +
  'in code. Never change, recompute, or second-guess the numbers you are given; ' +
  'use them exactly. Be concise, warm, and specific. Never promise returns. ' +
  'When you reference a mETH limit, quote the USER\'S OWN target mETH share from ' +
  'their wealth rules — that is the cap you enforce for them. Do NOT claim a 70% ' +
  'cap when the user chose a lower number; 70% is only the vault\'s absolute hard ' +
  'maximum and should be mentioned solely when the user\'s own target reaches it.'

export async function POST(req: Request) {
  if (!hasOpenAIKey()) {
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

  const text = await chat({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ],
    temperature: 0.5,
    maxTokens: 200,
  })

  if (text == null) {
    return NextResponse.json({ error: 'UPSTREAM_FAILED' }, { status: 502 })
  }
  return NextResponse.json({ text })
}

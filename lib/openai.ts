// Built by vsrupeshkumar
// Thin server-side wrapper around an OpenAI-compatible Chat Completions API.
// RWAkins uses an LLM for two things: (1) confirming a parsed wealth policy back
// to the user in natural language, and (2) the risk-evaluation decision step.
// Both run server-side so OPENAI_API_KEY never reaches the client. Every helper
// returns null on any failure so callers can fall back to the deterministic
// logic in lib/intent / the rebalance evaluator.
//
// Provider-agnostic: set OPENAI_BASE_URL to any OpenAI-compatible endpoint
// (e.g. Groq https://api.groq.com/openai/v1, Gemini, OpenRouter, local Ollama)
// and OPENAI_MODEL to that provider's model. Defaults to OpenAI itself.
const BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
const OPENAI_URL = `${BASE_URL}/chat/completions`

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY
}

interface ChatOpts {
  messages: ChatMessage[]
  /** Force a JSON object response (uses response_format: json_object). */
  json?: boolean
  temperature?: number
  timeoutMs?: number
  maxTokens?: number
}

/** Low-level call. Returns the assistant message content, or null on failure. */
export async function chat(opts: ChatOpts): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15_000)
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 512,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        messages: opts.messages,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content
    return typeof text === 'string' ? text : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Call expecting a JSON object back; parses it, returns null on any failure. */
export async function chatJson<T>(opts: Omit<ChatOpts, 'json'>): Promise<T | null> {
  const text = await chat({ ...opts, json: true })
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

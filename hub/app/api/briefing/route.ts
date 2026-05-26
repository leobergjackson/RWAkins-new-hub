// Built by vsrupeshkumar
// Daily crypto briefing — pulls headlines from up to 3 free news sources in
// parallel, dedupes by title, then asks Groq to produce a 3-bullet summary.
// Everything runs server-side so the API keys never leave the route.
//
// Sources, all optional:
//   - CryptoCompare News  (no key, always queried)
//   - CryptoPanic         (CRYPTOPANIC_AUTH_TOKEN)
//   - NewsAPI             (NEWSAPI_KEY)
//
// Response is cached in-memory for 30 minutes to stay under free-tier limits.
import { NextResponse } from 'next/server'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const CACHE_MS = 30 * 60 * 1_000  // 30 minutes
const FETCH_TIMEOUT_MS = 7_000

export type Headline = {
  title: string
  url: string
  source: string
  publishedAt: string  // ISO
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export type BriefingResponse = {
  summary: string[]
  headlines: Headline[]
  sources: { name: string; ok: boolean }[]
  generatedAt: string
}

let cache: { data: BriefingResponse; expires: number } | null = null

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  return fetch(url, { ...init, signal: ctrl.signal })
    .finally(() => clearTimeout(t))
}

async function fetchCryptoCompare(): Promise<Headline[]> {
  const res = await fetchWithTimeout('https://min-api.cryptocompare.com/data/v2/news/?lang=EN')
  if (!res.ok) throw new Error(`CryptoCompare HTTP ${res.status}`)
  const json = await res.json() as { Data?: Array<{ title: string; url: string; source: string; published_on: number }> }
  return (json.Data ?? []).slice(0, 10).map(d => ({
    title: d.title,
    url: d.url,
    source: d.source || 'CryptoCompare',
    publishedAt: new Date(d.published_on * 1000).toISOString(),
  }))
}

async function fetchCryptoPanic(token: string): Promise<Headline[]> {
  const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${encodeURIComponent(token)}&public=true&kind=news`
  const res = await fetchWithTimeout(url)
  if (!res.ok) throw new Error(`CryptoPanic HTTP ${res.status}`)
  const json = await res.json() as {
    results?: Array<{
      title: string
      url: string
      published_at: string
      source?: { title?: string }
      votes?: { positive: number; negative: number }
    }>
  }
  return (json.results ?? []).slice(0, 10).map(d => {
    const positive = d.votes?.positive ?? 0
    const negative = d.votes?.negative ?? 0
    const sentiment: Headline['sentiment'] =
      positive > negative + 1 ? 'positive' :
      negative > positive + 1 ? 'negative' : 'neutral'
    return {
      title: d.title,
      url: d.url,
      source: d.source?.title || 'CryptoPanic',
      publishedAt: d.published_at,
      sentiment,
    }
  })
}

async function fetchNewsApi(key: string): Promise<Headline[]> {
  const url = `https://newsapi.org/v2/everything?q=crypto+OR+blockchain+OR+defi&language=en&sortBy=publishedAt&pageSize=10&apiKey=${encodeURIComponent(key)}`
  const res = await fetchWithTimeout(url)
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`)
  const json = await res.json() as { articles?: Array<{ title: string; url: string; publishedAt: string; source?: { name?: string } }> }
  return (json.articles ?? []).slice(0, 10).map(d => ({
    title: d.title,
    url: d.url,
    source: d.source?.name || 'NewsAPI',
    publishedAt: d.publishedAt,
  }))
}

function dedupe(headlines: Headline[]): Headline[] {
  const seen = new Set<string>()
  const out: Headline[] = []
  for (const h of headlines) {
    const key = h.title.toLowerCase().replace(/[^\w\s]/g, '').slice(0, 60)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(h)
  }
  return out
}

async function summarizeWithGroq(headlines: Headline[]): Promise<string[]> {
  const key = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
  if (!key || headlines.length === 0) return []

  const list = headlines.slice(0, 12)
    .map((h, i) => `${i + 1}. [${h.source}] ${h.title}`)
    .join('\n')

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 14_000)
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'You are a Kubryx markets analyst. Given crypto news headlines, produce exactly 3 short bullet points capturing the most material market signals. Each bullet must be under 18 words, lead with a chain/asset/protocol name in bold-equivalent prose, and avoid speculation. Output ONLY a JSON array of 3 strings, no prose, no markdown.',
          },
          { role: 'user', content: `Today's headlines:\n${list}\n\nReturn JSON array of 3 bullets.` },
        ],
      }),
    })
    if (!res.ok) return []
    const json = await res.json()
    const raw = json?.choices?.[0]?.message?.content ?? ''
    // Try to extract a JSON array from the model output.
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed: unknown = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is string => typeof s === 'string').slice(0, 3)
  } catch {
    return []
  } finally {
    clearTimeout(t)
  }
}

export async function GET() {
  if (cache && Date.now() < cache.expires) {
    return NextResponse.json(cache.data)
  }

  const cryptoPanicToken = process.env.CRYPTOPANIC_AUTH_TOKEN || ''
  const newsApiKey = process.env.NEWSAPI_KEY || ''

  const results = await Promise.allSettled([
    fetchCryptoCompare(),
    cryptoPanicToken ? fetchCryptoPanic(cryptoPanicToken) : Promise.resolve([]),
    newsApiKey      ? fetchNewsApi(newsApiKey)            : Promise.resolve([]),
  ])

  const sourceNames = ['CryptoCompare', 'CryptoPanic', 'NewsAPI']
  const sources = results.map((r, i) => ({ name: sourceNames[i], ok: r.status === 'fulfilled' && (r.value as Headline[]).length > 0 }))

  const combined: Headline[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') combined.push(...r.value)
  }

  // Sort by publishedAt desc, then dedupe, then keep top 12.
  combined.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  const headlines = dedupe(combined).slice(0, 12)
  const summary = await summarizeWithGroq(headlines)

  const payload: BriefingResponse = {
    summary,
    headlines,
    sources,
    generatedAt: new Date().toISOString(),
  }
  cache = { data: payload, expires: Date.now() + CACHE_MS }
  return NextResponse.json(payload)
}

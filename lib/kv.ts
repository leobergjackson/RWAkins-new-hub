// Built by vsrupeshkumar
// Durable key-value backend for the server stores (wealth rules, activities,
// notifications). When a Vercel KV / Upstash Redis store is provisioned, its REST
// credentials are injected as env vars and we use it — so the autonomous heartbeat
// sees EVERY active wallet across every serverless instance. With no store
// configured (local dev), getRedis() returns null and each store falls back to a
// per-process in-memory Map.
//
// Provisioning (one-time, in the Vercel dashboard): Storage → Marketplace →
// Upstash Redis (or Vercel KV) → connect to this project. Vercel injects
// KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN). No
// code change needed once those exist.
import { Redis } from '@upstash/redis'

let cached: Redis | null | undefined

function readEnv(): { url: string; token: string } | null {
  // Support both the Vercel KV and the native Upstash env var names.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

/** The shared Redis client, or null when no KV store is configured (→ in-memory). */
export function getRedis(): Redis | null {
  if (cached !== undefined) return cached
  const env = readEnv()
  cached = env ? new Redis({ url: env.url, token: env.token }) : null
  return cached
}

/** True when a durable KV store is wired up. */
export function kvEnabled(): boolean {
  return getRedis() !== null
}

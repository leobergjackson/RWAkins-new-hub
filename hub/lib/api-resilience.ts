import { logTelemetryError } from './telemetry'

export type ResilienceErrorType = 'TIMEOUT' | 'BAD_STATUS' | 'OFFLINE' | 'PARSE_ERROR'

export class ResilienceError extends Error {
  constructor(public type: ResilienceErrorType, message: string, public details?: any) {
    super(message)
    this.name = 'ResilienceError'
  }
}

export async function resilientRequest<T>(
  url: string,
  options?: RequestInit,
  cacheKey?: string,
  maxRetries = 2
): Promise<T> {
  // 1. Offline Mode Check
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    if (cacheKey) {
      const cached = localStorage.getItem(`stale_cache_${cacheKey}`)
      if (cached) {
        logTelemetryError('FETCH_ERROR', `API [Offline Fallback: ${cacheKey}]`, 'System is offline, utilizing stale cache data.')
        return JSON.parse(cached) as T
      }
    }
    throw new ResilienceError('OFFLINE', 'No internet connection detected.')
  }

  let attempt = 0
  while (attempt <= maxRetries) {
    const controller = new AbortController()
    const signal = options?.signal || controller.signal
    const timeoutId = setTimeout(() => controller.abort(), 6000) // 6s timeout

    try {
      const res = await fetch(url, {
        ...options,
        signal,
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new ResilienceError(
          'BAD_STATUS',
          `HTTP Error ${res.status}: ${res.statusText}`,
          { status: res.status, url }
        )
      }

      const data = await res.json() as T
      
      // Update stale cache with the latest successful payload
      if (cacheKey && typeof window !== 'undefined') {
        localStorage.setItem(`stale_cache_${cacheKey}`, JSON.stringify(data))
      }

      return data
    } catch (err: any) {
      clearTimeout(timeoutId)

      const isTimeout = err.name === 'AbortError'
      const errorType: ResilienceErrorType = isTimeout ? 'TIMEOUT' : (err instanceof ResilienceError ? err.type : 'BAD_STATUS')
      const errorMsg = isTimeout ? 'Gateway/Connection Timeout' : err.message || 'Unknown network error'

      if (attempt === maxRetries) {
        // Log final failure to telemetry
        logTelemetryError(
          'FETCH_ERROR',
          `API Request [${url.slice(0, 45)}]`,
          `Final attempt failed: ${errorMsg}`,
          { attempt, errorType, url }
        )

        // Attempt to serve stale cache as a last resort
        if (cacheKey && typeof window !== 'undefined') {
          const cached = localStorage.getItem(`stale_cache_${cacheKey}`)
          if (cached) {
            logTelemetryError(
              'FETCH_ERROR',
              `API [Stale Fallback: ${cacheKey}]`,
              'All retry attempts failed. Utilizing stale cache data for resilience.'
            )
            return JSON.parse(cached) as T
          }
        }

        throw new ResilienceError(errorType, errorMsg, err)
      }

      // Exponential backoff delay: 200ms, 400ms
      const delay = Math.pow(2, attempt) * 200
      await new Promise((resolve) => setTimeout(resolve, delay))
      attempt++
    }
  }

  throw new ResilienceError('TIMEOUT', 'Request timed out after maximum retries.')
}

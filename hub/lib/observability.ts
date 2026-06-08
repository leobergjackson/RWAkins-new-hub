// Built by vsrupeshkumar
import { logTelemetryError } from './telemetry'

export interface ObservabilityLog {
  id: string
  timestamp: string
  type: 'RUNTIME_ERROR' | 'RPC_FAILURE' | 'WEBSOCKET_DISCONNECT' | 'EXECUTION_FAILURE' | 'HYDRATION_MISMATCH' | 'STALE_SYNC'
  source: string
  message: string
  details?: any
}

const STORAGE_KEY = 'kubryx_production_observability_logs'

// 1. Core tracking functions
export function trackRuntimeError(err: Error | string, source: string, details?: any) {
  const message = err instanceof Error ? err.message : String(err)
  logEvent('RUNTIME_ERROR', source, message, details)
}

export function trackRPCFailure(chain: string, nodeUrl: string, error: string) {
  logEvent('RPC_FAILURE', `RPC [${chain}]`, `Node failed: ${nodeUrl}. Error: ${error}`)
}

export function trackWebsocketDisconnect(chain: string, error?: string) {
  logEvent('WEBSOCKET_DISCONNECT', `WebSocket [${chain}]`, `Connection dropped: ${error || 'Unknown network drift'}`)
}

export function trackExecutionFailure(chain: string, action: string, error: string) {
  logEvent('EXECUTION_FAILURE', `Execution [${chain}]`, `Transaction failed: ${action}. Reason: ${error}`)
}

export function trackHydrationMismatch(details: string) {
  logEvent('HYDRATION_MISMATCH', 'React Hydration Guard', `Mismatch captured: ${details}`)
}

export function trackStaleSync(gapMs: number) {
  logEvent('STALE_SYNC', 'Sync Engine', `Synchronization drift detected. Current lag: ${gapMs}ms`)
}

function maskSensitiveInfo(str: string): string {
  if (typeof str !== 'string') return str
  // Mask EVM addresses
  let res = str.replace(/0x[a-fA-F0-9]{40}/g, (m) => `${m.slice(0, 6)}...${m.slice(-4)}`)
  // Mask Mantle addresses
  res = res.replace(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g, (m) => `${m.slice(0, 6)}...${m.slice(-4)}`)
  return res
}

// 2. Local storage logging wrapper
function logEvent(
  type: ObservabilityLog['type'],
  source: string,
  message: string,
  details?: any
) {
  if (typeof window === 'undefined') return

  try {
    const logsStr = localStorage.getItem(STORAGE_KEY) || '[]'
    const logs: ObservabilityLog[] = JSON.parse(logsStr)
    const sanitizedMsg = maskSensitiveInfo(message)
    const newLog: ObservabilityLog = {
      id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      type,
      source,
      message: sanitizedMsg,
      details
    }

    logs.unshift(newLog)
    // Keep last 100 logs in storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 100)))

    // Simultaneously route critical errors into core Telemetry Error log for visibility
    if (type === 'RUNTIME_ERROR' || type === 'HYDRATION_MISMATCH') {
      logTelemetryError('AI_ERROR', source, `[Observability] ${message}`, details)
    } else if (type === 'RPC_FAILURE') {
      logTelemetryError('RPC_ERROR', source, `[Observability] ${message}`, details)
    } else if (type === 'EXECUTION_FAILURE') {
      logTelemetryError('WALLET_ERROR', source, `[Observability] ${message}`, details)
    }

    // Broadcast update event
    window.dispatchEvent(new CustomEvent('kubryx_observability_update', { detail: newLog }))
  } catch (e) {
    console.error('Failed to write observability log', e)
  }
}

// 3. Fetch logs
export function getObservabilityLogs(): ObservabilityLog[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

// 4. Clear logs
export function clearObservabilityLogs() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

// 5. Automatic browser runtime interceptor
if (typeof window !== 'undefined') {
  // Capture general runtime exceptions
  window.addEventListener('error', (event) => {
    const msg = event.message || ''
    if (msg.toLowerCase().includes('hydration') || msg.toLowerCase().includes('minified react error #418') || msg.toLowerCase().includes('minified react error #423')) {
      trackHydrationMismatch(msg)
    } else {
      trackRuntimeError(msg, 'Browser Exception Handler', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }
  })

  // Capture unhandled promise rejections (essential for silent async drops)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const msg = reason instanceof Error ? reason.message : String(reason)
    trackRuntimeError(msg, 'Unhandled Promise Rejection', { stack: reason?.stack })
  })
}

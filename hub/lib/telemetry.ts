export type TelemetryError = {
  id: string
  timestamp: string
  source: string
  message: string
  type: 'RPC_ERROR' | 'FETCH_ERROR' | 'WALLET_ERROR' | 'AI_ERROR'
  details?: any
}

export function logTelemetryError(type: TelemetryError['type'], source: string, message: string, details?: any) {
  if (typeof window === 'undefined') return
  try {
    const logsStr = localStorage.getItem('kubryx_telemetry_errors') || '[]'
    const logs: TelemetryError[] = JSON.parse(logsStr)
    const newLog: TelemetryError = {
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      source,
      message,
      type,
      details
    }
    logs.unshift(newLog)
    // Keep last 100 errors to prevent storage bloating
    localStorage.setItem('kubryx_telemetry_errors', JSON.stringify(logs.slice(0, 100)))
  } catch (e) {
    console.error('Failed to log telemetry error', e)
  }
}

export function getTelemetryErrors(): TelemetryError[] {
  if (typeof window === 'undefined') return []
  try {
    const logsStr = localStorage.getItem('kubryx_telemetry_errors') || '[]'
    return JSON.parse(logsStr)
  } catch {
    return []
  }
}

export function clearTelemetryErrors() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('kubryx_telemetry_errors')
}

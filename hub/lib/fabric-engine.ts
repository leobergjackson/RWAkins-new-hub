// Built by vsrupeshkumar
'use client'

import { useState, useEffect } from 'react'
import { recordOSEvent } from './cross-tool-intelligence'
import { toast } from './toast'

export interface DeploymentRegion {
  name: string
  zone: string
  latency: number // ms
  status: 'nominal' | 'degraded' | 'outage'
  failoverTarget: string
  resilienceScore: number // %
}

export interface CompatibilityItem {
  protocolName: string
  readinessState: 'certified' | 'compatible' | 'experimental'
  trustWeight: number // %
  lastAudited: string
}

export interface FabricState {
  regions: DeploymentRegion[]
  compatibility: CompatibilityItem[]
  maturityScore: number // %
  ecosystemTrustForecast: number // %
  readinessHeatmapValue: number // %
  failoverInProgress: boolean
}

const DEFAULT_REGIONS: DeploymentRegion[] = [
  { name: 'Singapore', zone: 'ap-southeast-1', latency: 45, status: 'nominal', failoverTarget: 'Tokyo', resilienceScore: 99.4 },
  { name: 'Frankfurt', zone: 'eu-central-1', latency: 12, status: 'nominal', failoverTarget: 'Virginia', resilienceScore: 99.8 },
  { name: 'Tokyo', zone: 'ap-northeast-1', latency: 85, status: 'nominal', failoverTarget: 'Singapore', resilienceScore: 98.2 },
  { name: 'Virginia', zone: 'us-east-1', latency: 22, status: 'nominal', failoverTarget: 'Frankfurt', resilienceScore: 99.5 },
  { name: 'Mumbai', zone: 'ap-south-1', latency: 120, status: 'nominal', failoverTarget: 'Singapore', resilienceScore: 95.8 }
]

const DEFAULT_COMPATIBILITY: CompatibilityItem[] = [
  { protocolName: 'EVM JSON-RPC (Mantle)', readinessState: 'certified', trustWeight: 99.8, lastAudited: '1 hour ago' },
  { protocolName: 'Phantom Ed25519 (Mantle)', readinessState: 'certified', trustWeight: 99.4, lastAudited: '4 hours ago' },
  { protocolName: 'Mantle XDR', readinessState: 'compatible', trustWeight: 98.5, lastAudited: '12 hours ago' },
  { protocolName: 'Mantle Rollups L2', readinessState: 'compatible', trustWeight: 96.2, lastAudited: '24 hours ago' },
  { protocolName: 'ZK-SNARK Gateway', readinessState: 'experimental', trustWeight: 84.8, lastAudited: '3 days ago' }
]

let fabricState: FabricState = {
  regions: [...DEFAULT_REGIONS],
  compatibility: [...DEFAULT_COMPATIBILITY],
  maturityScore: 98.4,
  ecosystemTrustForecast: 97.8,
  readinessHeatmapValue: 96.5,
  failoverInProgress: false
}

const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach(l => l())
  if (typeof window !== 'undefined') {
    localStorage.setItem('kubryx_fabric_ops', JSON.stringify(fabricState))
    window.dispatchEvent(new Event('kubryx_fabric_update'))
  }
}

// Hydrate safely
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('kubryx_fabric_ops')
    if (saved) {
      fabricState = JSON.parse(saved)
    }
  } catch {
    // ignore
  }
}

export function getFabricState(): FabricState {
  return fabricState
}

export function toggleRegionalOutage(regionName: string) {
  const region = fabricState.regions.find(r => r.name === regionName)
  if (!region) return

  const updatedRegions: DeploymentRegion[] = fabricState.regions.map(r => {
    if (r.name === regionName) {
      const nextStatus: 'nominal' | 'degraded' | 'outage' = r.status === 'nominal' ? 'outage' : 'nominal'
      const nextLatency = nextStatus === 'outage' ? 9999 : DEFAULT_REGIONS.find(d => d.name === regionName)!.latency
      const nextResilience = nextStatus === 'outage' ? 10 : 99.4
      return { ...r, status: nextStatus, latency: nextLatency, resilienceScore: nextResilience }
    }
    return r
  })

  const isOutageActive = updatedRegions.some(r => r.status === 'outage')
  
  fabricState = {
    ...fabricState,
    regions: updatedRegions,
    failoverInProgress: isOutageActive,
    maturityScore: isOutageActive ? 84.5 : 98.4,
    ecosystemTrustForecast: isOutageActive ? 89.2 : 97.8
  }

  notifyListeners()
  recordOSEvent('Deployment Realism', `Toggled simulated regional outage for region: "${regionName}"`, 'Load Balancer Desk')

  if (isOutageActive) {
    toast.warning(`Simulated regional outage active: Rerouting all ${regionName} transactions to ${region.failoverTarget}!`)
    
    // Fast automatic recovery simulation
    setTimeout(() => {
      triggerAutomaticRegionalHealing(regionName)
    }, 4000)
  } else {
    toast.success(`Restored nominal operational status for region: ${regionName}`)
  }
}

export function triggerAutomaticRegionalHealing(regionName: string) {
  // Restore region cleanly
  const updatedRegions: DeploymentRegion[] = fabricState.regions.map(r => {
    if (r.name === regionName) {
      const nominal = DEFAULT_REGIONS.find(d => d.name === regionName)!
      return { ...r, status: 'nominal' as const, latency: nominal.latency, resilienceScore: nominal.resilienceScore }
    }
    return r
  })

  fabricState = {
    ...fabricState,
    regions: updatedRegions,
    failoverInProgress: false,
    maturityScore: 98.4,
    ecosystemTrustForecast: 97.8
  }

  notifyListeners()
  recordOSEvent('Autonomous Recovery', `Auto-mitigated regional outage for "${regionName}". Restored connection path.`, 'Fabric Balancer')
  toast.success(`Autonomous recovery complete: Region ${regionName} online!`)
}

export function useFabric() {
  const [state, setState] = useState<FabricState>({ ...fabricState })

  useEffect(() => {
    const handler = () => setState({ ...fabricState })
    listeners.add(handler)

    if (typeof window !== 'undefined') {
      window.addEventListener('kubryx_fabric_update', handler)
    }

    // Dynamic latency flutter loop
    const interval = setInterval(() => {
      const updatedRegions = fabricState.regions.map(r => {
        if (r.status === 'outage') return r
        const drift = (Math.random() * 6 - 3)
        const nominal = DEFAULT_REGIONS.find(d => d.name === r.name)!
        const latency = Math.max(5, Math.floor(nominal.latency + drift))
        return { ...r, latency }
      })

      fabricState = {
        ...fabricState,
        regions: updatedRegions
      }
      notifyListeners()
    }, 4000)

    return () => {
      listeners.delete(handler)
      clearInterval(interval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('kubryx_fabric_update', handler)
      }
    }
  }, [])

  return {
    ...state,
    toggleOutage: toggleRegionalOutage
  }
}

// Built by vsrupeshkumar
'use client'

import { useState, useEffect } from 'react'

export type PlatformMode = 'live' | 'demo' | 'simulation' | 'executive' | 'developer'

export interface ChainMetadata {
  id: string
  name: string
  chainId?: string
  explorerUrl: string
  rpcUrl: string
  status: 'healthy' | 'degraded' | 'congested' | 'offline'
}

export type SimulationScenario =
  | 'none'
  | 'degraded_rpc'
  | 'chain_congestion'
  | 'suspicious_activity'
  | 'treasury_imbalance'
  | 'loan_risk_escalation'
  | 'telemetry_anomaly_spikes'
  | 'treasury_depletion'
  | 'latency_crisis'
  | 'wallet_compromise'
  | 'telemetry_storm'
  | 'coordination_failure'
  | 'rpc_fragmentation'

export interface SimulationProfile {
  id: SimulationScenario
  name: string
  description: string
  symptoms: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface OperationalAnalytics {
  aiRequestsProcessed: number
  transactionsObserved: number
  walletConnectionsCount: number
  backendUptimeTrends: Record<string, number>
  chainActivityRates: Record<string, number>
  telemetryAnomalyCount: number
  averageLatency: number
  fallbackActivations: number
}

export interface ModeProfile {
  id: PlatformMode
  name: string
  description: string
  indicatorColor: string
}

export const PLATFORM_MODES: ModeProfile[] = [
  { id: 'live', name: 'Live Production Mode', description: 'Connects to remote blockchain endpoints and captures live transaction flows.', indicatorColor: '#10B981' },
  { id: 'demo', name: 'Deterministic Demo Mode', description: 'Pre-populates all wallet portfolios, scores, and streams with investor-safe datasets.', indicatorColor: '#F5C518' },
  { id: 'simulation', name: 'Synthetic Simulation Mode', description: 'Simulates mempool congestion, key compromises, and multi-sig payroll disparities.', indicatorColor: '#A855F7' },
  { id: 'executive', name: 'Executive Showcase Mode', description: 'Locks storytelling paths, highlights slideshow overlays, and optimizes UX.', indicatorColor: '#3B82F6' },
  { id: 'developer', name: 'Developer Diagnostics Mode', description: 'Exposes hydration timers, latency timelines, memory pressures, and technical logs.', indicatorColor: '#EC4899' },
]

export const CHAIN_REGISTRY: Record<string, ChainMetadata> = {
  qie: { id: 'qie', name: 'Mantle Network', chainId: '1990', explorerUrl: 'https://explorer.sepolia.mantle.xyz', rpcUrl: 'https://explorer.sepolia.mantle.xyz/api/eth-rpc', status: 'healthy' },
  solana: { id: 'solana', name: 'Mantle Sepolia', explorerUrl: 'https://explorer.sepolia.mantle.xyz', rpcUrl: 'https://rpc.sepolia.mantle.xyz', status: 'healthy' },
  stellar: { id: 'stellar', name: 'Mantle Sepolia', explorerUrl: 'https://explorer.sepolia.mantle.xyz', rpcUrl: 'https://rpc.sepolia.mantle.xyz', status: 'healthy' },
  arbitrum: { id: 'arbitrum', name: 'Mantle Network', chainId: '42161', explorerUrl: 'https://mantlescan.xyz', rpcUrl: 'https://rpc.sepolia.mantle.xyz', status: 'healthy' },
}

export const SIMULATION_SCENARIOS: SimulationProfile[] = [
  { id: 'none', name: 'Nominal Operational State', description: 'All pipelines operate normally under production-grade SLA parameters (45ms).', symptoms: ['Optimal gateway response times', 'Zero error backoffs', 'Normal security baseline'], severity: 'low' },
  { id: 'degraded_rpc', name: 'Degraded RPC Gateway Infrastructure', description: 'Simulates high request failure bounds on remote EVM and Mantle RPC nodes.', symptoms: ['Average latency spikes to 950ms', 'Cache fallback layers activate automatically', 'Telemetry registers RETRY_BACKOFF alerts'], severity: 'medium' },
  { id: 'chain_congestion', name: 'Chain Congestion & Mempool Saturation', description: 'Simulates severe network delay and high gas limits on Ethereum-based layers.', symptoms: ['Transaction confirmation times delayed by 180s', 'Estimated gas prices spike by 400%', 'Mantle bridge timeouts detected'], severity: 'medium' },
  { id: 'suspicious_activity', name: 'Suspicious Wallet Keys & Key Compromise', description: 'Simulates rapid token routing attempts from blacklisted high-risk contracts.', symptoms: ['Private Vault locks routing key locks', 'Security score falls to CRITICAL', 'Security console fires RPC_DEGRADATION warnings'], severity: 'high' },
  { id: 'treasury_imbalance', name: 'Treasury Asset Disparity & Drift Warning', description: 'Simulates severe automated payroll mismatch between active multi-sig stream balances.', symptoms: ['Treasury AI issues rebalance request', 'Debt threshold warning triggered', 'Asset allocation drift score exceeds 15%'], severity: 'medium' },
  { id: 'loan_risk_escalation', name: 'AI Lending Risk Level Escalation', description: 'Simulates massive default rate trends under sudden high yield market drops.', symptoms: ['Lendora AI triggers loan health freeze', 'Credit Passport staking requirement doubles', 'Repayment window narrows to 14 days'], severity: 'high' },
  { id: 'telemetry_anomaly_spikes', name: 'Telemetry Diagnostics Spike Anomalies', description: 'Simulates a high volume of server failures due to remote cold restarts.', symptoms: ['Anomaly logs exceed 45 triggers', 'Visual telemetry dashboard flashes warnings', 'Offline backup servers take routing precedence'], severity: 'critical' },
  { id: 'treasury_depletion', name: 'Treasury Depletion Cascade', description: 'Simulates active cascading failure and dynamic liquidity drain across multi-sig nodes.', symptoms: ['Treasury reserves decline by 80%', 'Smart streams freeze autonomously', 'Collateral thresholds trigger warnings'], severity: 'critical' },
  { id: 'latency_crisis', name: 'Chain-Wide Latency Crisis', description: 'Models cascading network-wide dropouts with peak latencies above 5000ms.', symptoms: ['RPC nodes timeout completely', 'UI routing delays', 'State synchronization mismatch pings'], severity: 'critical' },
  { id: 'wallet_compromise', name: 'Wallet Compromise Chain Reaction', description: 'Simulates cascading wallet drainage vectors across multi-chain private vault locks.', symptoms: ['Multiple malicious signature calls detected', 'Security posture falls to CRITICAL', 'Emergency zero-metadata routing override active'], severity: 'critical' },
  { id: 'telemetry_storm', name: 'Telemetry Anomaly Storm', description: 'Triggers a synthetic packet storm flooding telemetry ingestion buffers.', symptoms: ['Anomaly logs cross 500 triggers', 'Gateway retry loops overload', 'Dynamic load balancer limits reached'], severity: 'high' },
  { id: 'coordination_failure', name: 'AI Coordination Failure', description: 'Models synchronization loss between AI agents and smart contract state locks.', symptoms: ['Agent workload balance fails', 'Task queues delay', 'Autonomous rebalancing recommendations locked'], severity: 'high' },
  { id: 'rpc_fragmentation', name: 'RPC Fragmentation Scenario', description: 'Models isolated regional state splits where distinct RPCs return inconsistent block states.', symptoms: ['Block index drift measured at 4 blocks', 'Chain consistency score drops to 60%', 'Dynamic routing switches to consensus baseline'], severity: 'critical' }
]

const DEFAULT_ANALYTICS: OperationalAnalytics = {
  aiRequestsProcessed: 2840,
  transactionsObserved: 1145,
  walletConnectionsCount: 3,
  backendUptimeTrends: {
    'CreditBlocks': 99.98,
    'Legacy Vault': 99.95,
    'SyncSplit': 99.99,
    'AI Lending': 98.85,
    'Agent Mesh': 99.92,
    'Stealth Executive Suite': 99.97,
    'Treasury AI': 99.94,
    'Private Vault': 99.96,
  },
  chainActivityRates: {
    'Mantle Network': 14.5,
    'Mantle Sepolia': 285.2,
    'RWA Vault': 84.8,
    'Lending': 48.6,
  },
  telemetryAnomalyCount: 0,
  averageLatency: 45,
  fallbackActivations: 0,
}

interface PlatformState {
  currentMode: PlatformMode
  activeScenario: SimulationScenario
  analytics: OperationalAnalytics
  chains: Record<string, ChainMetadata>
}

let platformState: PlatformState = {
  currentMode: 'demo', // default to demo mode for deterministic show-safe dashboards
  activeScenario: 'none',
  analytics: { ...DEFAULT_ANALYTICS },
  chains: { ...CHAIN_REGISTRY },
}

const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((l) => l())
  if (typeof window !== 'undefined') {
    localStorage.setItem('kubryx_platform_state', JSON.stringify(platformState))
    window.dispatchEvent(new Event('kubryx_platform_update'))
  }
}

// Hydrate safely on client
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('kubryx_platform_state')
    if (saved) {
      const parsed = JSON.parse(saved)
      platformState = {
        currentMode: parsed.currentMode || 'demo',
        activeScenario: parsed.activeScenario || 'none',
        analytics: { ...DEFAULT_ANALYTICS, ...parsed.analytics },
        chains: parsed.chains || { ...CHAIN_REGISTRY },
      }
    }
  } catch {
    // ignore
  }
}

export function getPlatformState() {
  return platformState
}

export function updatePlatformState(updater: (prev: PlatformState) => Partial<PlatformState>) {
  const diff = updater(platformState)
  
  // Safe Isolation between modes:
  // If switched to Live mode, reset active simulation scenarios to none
  if (diff.currentMode === 'live') {
    diff.activeScenario = 'none'
  }
  // If switched to simulation mode and no active scenario, default to degraded_rpc
  if (diff.currentMode === 'simulation' && platformState.activeScenario === 'none') {
    diff.activeScenario = 'degraded_rpc'
  }
  
  platformState = { ...platformState, ...diff }
  notifyListeners()
}

export function usePlatformState() {
  const [state, setState] = useState<PlatformState>({ ...platformState })

  useEffect(() => {
    const handler = () => setState({ ...platformState })
    listeners.add(handler)

    if (typeof window !== 'undefined') {
      window.addEventListener('kubryx_platform_update', handler)
    }

    return () => {
      listeners.delete(handler)
      if (typeof window !== 'undefined') {
        window.removeEventListener('kubryx_platform_update', handler)
      }
    }
  }, [])

  // Auto fluctuate analytics depending on the current Operating Mode and Sim Scenarios
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const interval = setInterval(() => {
      updatePlatformState((prev) => {
        const mode = prev.currentMode
        const scenario = prev.activeScenario
        
        let latencyBase = 45
        let telemetryAnomalies = 0
        let fallbackBase = prev.analytics.fallbackActivations

        // Isolate behaviors by Mode & Scenario
        if (mode === 'live') {
          // Live mode is very stable, low fluctuation
          latencyBase = 42 + Math.floor(Math.sin(Date.now() / 15000) * 4)
        } else if (mode === 'demo') {
          // Demo mode is extremely deterministic and static
          latencyBase = 45
          telemetryAnomalies = 0
        } else if (mode === 'simulation' || scenario !== 'none') {
          // Simulation injects synthetic anomalies
          if (scenario === 'degraded_rpc') {
            latencyBase = 950 + Math.floor(Math.random() * 80)
            telemetryAnomalies = 14 + Math.floor(Math.random() * 5)
            fallbackBase += Math.random() > 0.8 ? 1 : 0
          } else if (scenario === 'chain_congestion') {
            latencyBase = 320 + Math.floor(Math.random() * 40)
            telemetryAnomalies = 3
          } else if (scenario === 'telemetry_anomaly_spikes') {
            latencyBase = 180 + Math.floor(Math.random() * 30)
            telemetryAnomalies = 48 + Math.floor(Math.random() * 10)
            fallbackBase += 1
          } else if (scenario === 'suspicious_activity') {
            telemetryAnomalies = 6
            latencyBase = 55
          } else {
            latencyBase = 65
          }
        } else if (mode === 'executive') {
          // Executive mode optimizes performance numbers for clean presenting
          latencyBase = 35
          telemetryAnomalies = 0
        } else if (mode === 'developer') {
          // Developer mode shows higher detailed metrics and medium fluctuations
          latencyBase = 48 + Math.floor(Math.random() * 12)
          telemetryAnomalies = Math.random() > 0.9 ? 1 : 0
        }

        return {
          analytics: {
            ...prev.analytics,
            aiRequestsProcessed: prev.analytics.aiRequestsProcessed + (Math.random() > 0.4 ? 1 : 0),
            transactionsObserved: prev.analytics.transactionsObserved + (Math.random() > 0.6 ? 1 : 0),
            averageLatency: latencyBase,
            telemetryAnomalyCount: telemetryAnomalies,
            fallbackActivations: fallbackBase,
            chainActivityRates: {
              'Mantle Network': mode === 'demo' ? 14.5 : Number((14.5 + Math.sin(Date.now() / 5000) * 1.5).toFixed(1)),
              'Mantle Sepolia': mode === 'demo' ? 285.2 : Number((285.2 + Math.sin(Date.now() / 4000) * 20).toFixed(1)),
              'RWA Vault': mode === 'demo' ? 84.8 : Number((84.8 + Math.sin(Date.now() / 6000) * 5).toFixed(1)),
              'Lending': mode === 'demo' ? 48.6 : Number((48.6 + Math.sin(Date.now() / 7000) * 3).toFixed(1)),
            }
          }
        }
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return state
}

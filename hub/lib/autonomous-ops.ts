// Built by vsrupeshkumar
'use client'

import { useState, useEffect } from 'react'
import { getPlatformState, PlatformMode, SimulationScenario } from './platform-engine'
import { getOrgState } from './org-context'
import { getIntelligenceState } from './cross-tool-intelligence'

export interface OperationalRecommendation {
  id: string
  title: string
  description: string
  tool: string
  confidence: number
  impact: 'low' | 'medium' | 'high'
  reasoningSummary: string
  causalityChain: string[]
  whyExplanation: string
  applied: boolean
  dismissed: boolean
  timestamp: string
}

export interface AIMemory {
  historicalRecommendations: { id: string; title: string; status: 'applied' | 'dismissed'; timestamp: string }[]
  pastAnomalies: { scenario: SimulationScenario; timestamp: string; details: string }[]
  interactionThreads: { role: 'user' | 'assistant'; text: string; timestamp: string }[]
  continuitySessionId: string
}

export interface AutonomousOpsState {
  recommendations: OperationalRecommendation[]
  aiMemory: AIMemory
  operationalRiskScore: number
  infrastructureConfidenceScore: number
  aiOrchestrationHealth: number
  activeAutomationCount: number
  liveAnomalyDensity: number
  walletTrustState: 'Trusted' | 'Review Required' | 'Compromised Lock'
  resilienceStatus: 'Nominal' | 'Degraded SLA' | 'Fallback Isolation'
  lastRecalculated: string
}

const DEFAULT_MEMORY: AIMemory = {
  historicalRecommendations: [],
  pastAnomalies: [],
  interactionThreads: [
    { role: 'assistant', text: 'Autonomous Ops Engine online. Ready to coordinate multi-chain treasury streams and security layers.', timestamp: new Date().toISOString() }
  ],
  continuitySessionId: 'ops-session-2026-v8'
}

let opsState: AutonomousOpsState = {
  recommendations: [],
  aiMemory: { ...DEFAULT_MEMORY },
  operationalRiskScore: 4,
  infrastructureConfidenceScore: 99.98,
  aiOrchestrationHealth: 99.92,
  activeAutomationCount: 4,
  liveAnomalyDensity: 0,
  walletTrustState: 'Trusted',
  resilienceStatus: 'Nominal',
  lastRecalculated: new Date().toISOString()
}

const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((l) => l())
  if (typeof window !== 'undefined') {
    localStorage.setItem('kubryx_autonomous_ops', JSON.stringify(opsState))
    window.dispatchEvent(new Event('kubryx_autonomous_ops_update'))
  }
}

// Hydrate safely on client
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('kubryx_autonomous_ops')
    if (saved) {
      const parsed = JSON.parse(saved)
      opsState = {
        recommendations: parsed.recommendations || [],
        aiMemory: parsed.aiMemory || { ...DEFAULT_MEMORY },
        operationalRiskScore: parsed.operationalRiskScore ?? 4,
        infrastructureConfidenceScore: parsed.infrastructureConfidenceScore ?? 99.98,
        aiOrchestrationHealth: parsed.aiOrchestrationHealth ?? 99.92,
        activeAutomationCount: parsed.activeAutomationCount ?? 4,
        liveAnomalyDensity: parsed.liveAnomalyDensity ?? 0,
        walletTrustState: parsed.walletTrustState || 'Trusted',
        resilienceStatus: parsed.resilienceStatus || 'Nominal',
        lastRecalculated: parsed.lastRecalculated || new Date().toISOString()
      }
    }
  } catch {
    // ignore
  }
}

export function getAutonomousOpsState() {
  return opsState
}

export function updateAutonomousOpsState(updater: (prev: AutonomousOpsState) => Partial<AutonomousOpsState>) {
  const diff = updater(opsState)
  opsState = { ...opsState, ...diff }
  notifyListeners()
}

export function applyRecommendation(id: string) {
  const recIndex = opsState.recommendations.findIndex(r => r.id === id)
  if (recIndex === -1) return
  
  const rec = opsState.recommendations[recIndex]
  const updatedRecs = [...opsState.recommendations]
  updatedRecs[recIndex] = { ...rec, applied: true }
  
  const history = [...opsState.aiMemory.historicalRecommendations, {
    id: rec.id,
    title: rec.title,
    status: 'applied' as const,
    timestamp: new Date().toISOString()
  }]
  
  const nextThreads = [...opsState.aiMemory.interactionThreads, {
    role: 'assistant' as const,
    text: `Applied recommendation: ${rec.title}. Executed operational trigger to restore balance parameters.`,
    timestamp: new Date().toISOString()
  }]

  updateAutonomousOpsState(() => ({
    recommendations: updatedRecs,
    aiMemory: {
      ...opsState.aiMemory,
      historicalRecommendations: history,
      interactionThreads: nextThreads
    }
  }))
  
  // Custom execution trigger inside specific tools
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('applied_recommendation', { detail: { id, tool: rec.tool } }))
  }
}

export function dismissRecommendation(id: string) {
  const recIndex = opsState.recommendations.findIndex(r => r.id === id)
  if (recIndex === -1) return

  const rec = opsState.recommendations[recIndex]
  const updatedRecs = [...opsState.recommendations]
  updatedRecs[recIndex] = { ...rec, dismissed: true }

  const history = [...opsState.aiMemory.historicalRecommendations, {
    id: rec.id,
    title: rec.title,
    status: 'dismissed' as const,
    timestamp: new Date().toISOString()
  }]

  updateAutonomousOpsState(() => ({
    recommendations: updatedRecs,
    aiMemory: {
      ...opsState.aiMemory,
      historicalRecommendations: history
    }
  }))
}

export function clearMemory() {
  updateAutonomousOpsState(() => ({
    aiMemory: {
      historicalRecommendations: [],
      pastAnomalies: [],
      interactionThreads: [
        { role: 'assistant', text: 'Autonomous Memory wiped and synchronized with secure node storage.', timestamp: new Date().toISOString() }
      ],
      continuitySessionId: `ops-session-2026-${Math.floor(Math.random() * 10000)}`
    }
  }))
}

export function addInteractionThread(role: 'user' | 'assistant', text: string) {
  updateAutonomousOpsState((prev) => ({
    aiMemory: {
      ...prev.aiMemory,
      interactionThreads: [...prev.aiMemory.interactionThreads, { role, text, timestamp: new Date().toISOString() }]
    }
  }))
}

export function triggerAutonomousRecalculation() {
  const plat = getPlatformState()
  const org = getOrgState()
  const intel = getIntelligenceState()

  const scenario = plat.activeScenario
  const mode = plat.currentMode

  let risk = 4
  let sla = 99.98
  let orchestration = 99.92
  let anomalies = 0
  let trust: AutonomousOpsState['walletTrustState'] = 'Trusted'
  let resilience: AutonomousOpsState['resilienceStatus'] = 'Nominal'

  const recs: OperationalRecommendation[] = []

  // Base setup depending on active scenario
  if (scenario === 'degraded_rpc') {
    risk = 35
    sla = 98.42
    anomalies = 6
    resilience = 'Degraded SLA'
    recs.push({
      id: 'rec-rpc-cache',
      title: 'Trigger Gateway Cache Fallback Route',
      description: 'Divert pending transaction queries through fallback memory caches due to severe node response spikes.',
      tool: 'Private Vault',
      confidence: 97,
      impact: 'high',
      reasoningSummary: 'EVM and Mantle gateway nodes exceeded SLA threshold bounds. Swerving queries avoids application freezes.',
      whyExplanation: 'SLA target is 45ms. Degraded gateway latency on Mantle and Mantle endpoints requires immediate routing through cached read failovers to preserve client performance.',
      causalityChain: [
        'Remote JSON-RPC server failed standard ping check.',
        'Average gateway connection latency drifted above 950ms.',
        'SLA monitoring flagged operational latency regression.',
        'Automatic cache fallback layer activated.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  } else if (scenario === 'chain_congestion') {
    risk = 45
    sla = 99.12
    anomalies = 11
    recs.push({
      id: 'rec-congestion-stellar',
      title: 'Optimize Mantle Gas Settings',
      description: 'Saturate batch operations into multi-party split payouts to bypass mempool backlogs on congested layers.',
      tool: 'SyncSplit',
      confidence: 91,
      impact: 'medium',
      reasoningSummary: 'Mempool limits on Mantle and Mantle test networks require optimized batch sizes to guarantee inclusion.',
      whyExplanation: 'Transaction confirmation time is delayed by 180s. Optimizing batch split transactions reduces total payload footprint, lowering absolute gas price overhead by 400%.',
      causalityChain: [
        'Mempool saturation index spiked past structural boundary limit.',
        'Mantle bridge routing timed out under high transaction flow.',
        'SyncSplit payment streams delayed in soroban split queue.',
        'Automated Gas Optimizer recommended transaction pack resizing.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  } else if (scenario === 'suspicious_activity' || intel.memory.suspiciousActivityFlag) {
    risk = 85
    sla = 99.95
    anomalies = 4
    trust = 'Review Required'
    resilience = 'Fallback Isolation'
    recs.push({
      id: 'rec-security-compromise',
      title: 'Isolate High-Risk Private Key Routings',
      description: 'Immediately lock the signing certificates associated with EVM key signatures to block potential outflow.',
      tool: 'Security Console',
      confidence: 99,
      impact: 'high',
      reasoningSummary: 'Rapid token transfer attempts from blacklisted EVM address match standard multi-sig drainage vectors.',
      whyExplanation: 'Detected anomalous transaction signatures on Mantle Network. Placing an immediate hold on certificate signatures isolates key compromise threat, preserving multi-sig safety.',
      causalityChain: [
        'Cryptographic trace matched blacklisted token routing footprint.',
        'Security posture score dropped to CRITICAL.',
        'Private Vault certificate engine triggered automated isolation routine.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  } else if (scenario === 'treasury_imbalance') {
    risk = 25
    sla = 99.96
    anomalies = 2
    recs.push({
      id: 'rec-treasury-rebalance',
      title: 'Execute Multi-Chain Treasury Rebalance',
      description: 'Initiate dynamic payroll stream adjustments to correct the 15% asset allocation drift across Mantle treasury streams.',
      tool: 'Treasury AI',
      confidence: 94,
      impact: 'high',
      reasoningSummary: 'Moving 250 MNT to EVM pools will raise APY by 4.2% while satisfying multi-sig liquidity drift barriers.',
      whyExplanation: 'Payroll streaming balance shows severe asset disparity across Mantle treasury streams. Rebalancing optimizes staking yield and prevents cash flow debt threshold warnings.',
      causalityChain: [
        'Asset allocation drift exceeded designated 15% threshold boundary.',
        'Mantle liquidity pool saturated while Mantle yield margins expanded.',
        'Treasury AI issued immediate liquidity drift warning.',
        'Rebalance pipeline prepared dynamic re-staking allocation.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  } else if (scenario === 'loan_risk_escalation') {
    risk = 60
    sla = 98.85
    anomalies = 7
    recs.push({
      id: 'rec-lending-exposure',
      title: 'Narrow Loan Repayment Window to 14 Days',
      description: 'Adjust default thresholds inside active lending desk smart streams to mitigate systemic risk spirals.',
      tool: 'AI Lending',
      confidence: 89,
      impact: 'high',
      reasoningSummary: 'Sudden default default rate trends observed under high-yield volatility drops require strict recovery parameters.',
      whyExplanation: 'Staking requirements doubled to absorb default defaults. Narrowing the repayment grace window preserves asset recovery rates, protecting active liquidity providers.',
      causalityChain: [
        'Systemic default default rate trend spiked across peer liquidity pools.',
        'Lendora AI triggered automated loan health freeze routine.',
        'Credit Passport NCRD staking requirement doubled.',
        'Exposure mitigation engine recommended tighter recovery windows.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  } else if (scenario === 'telemetry_anomaly_spikes') {
    risk = 75
    sla = 95.84
    anomalies = 48
    resilience = 'Fallback Isolation'
    recs.push({
      id: 'rec-telemetry-failover',
      title: 'Prioritize Regional RPC Failovers',
      description: 'Re-route gateway traffic to offline secondary node relays to circumvent regional RPC packet dropouts.',
      tool: 'Performance Center',
      confidence: 96,
      impact: 'high',
      reasoningSummary: 'High density of server failure logs due to remote gateway cold restarts requires automatic traffic redirection.',
      whyExplanation: 'Telemetry anomaly logs exceeded 45 triggers, threatening node SLAs. Re-routing to secondary nodes avoids packet drops and keeps service availability nominal.',
      causalityChain: [
        'Regional node SLA pings dropped below 90% threshold.',
        'Telemetry diagnostics registered high server cold restart counts.',
        'Performance center registered packet drops.',
        'Failover routing automated to secondary cloud gateways.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  } else if (scenario === 'treasury_depletion') {
    risk = 90
    sla = 94.2
    anomalies = 15
    resilience = 'Fallback Isolation'
    recs.push({
      id: 'rec-treasury-depletion',
      title: 'Execute Emergency Collateral Sweep',
      description: 'Trigger autonomous multi-sig balance sweeps to inject collateral into active high-exposure loan streams.',
      tool: 'Treasury AI',
      confidence: 98,
      impact: 'high',
      reasoningSummary: 'Venture vault depletion threatens active liquidity streams. Immediate swap stabilizes pools.',
      whyExplanation: 'Venture vault balances declined below critical 20% thresholds, requiring secondary stablecoin reserves to sweep into active debt pools dynamically.',
      causalityChain: [
        'Multi-sig vault capital reserves drained by 80%.',
        'Staking loan yields triggered severe margin defaults warnings.',
        'Emergency liquidity sweep script propagated across Mantle and Mantle.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  } else if (scenario === 'latency_crisis') {
    risk = 92
    sla = 90.1
    anomalies = 68
    resilience = 'Fallback Isolation'
    recs.push({
      id: 'rec-latency-crisis',
      title: 'Enable Consensus Routing Fallbacks',
      description: 'Force state queries through secondary regional RPC backup relays to bypass network-wide packet loss.',
      tool: 'Performance Center',
      confidence: 95,
      impact: 'high',
      reasoningSummary: 'Average ping latency crosses 5000ms threshold bounds. Switching routes avoids UI freeze.',
      whyExplanation: 'Severe network degradation has spiked normal response times to 5.2 seconds. Restoring operation requires ignoring dead RPCs and reading directly from local cached checkpoints.',
      causalityChain: [
        'Consensus heartbeat pings failed standard response checks.',
        'UI telemetry registered packet delivery loss exceeding 55%.',
        'Consensus proxy automatically rerouted standard queries to local failovers.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  } else if (scenario === 'wallet_compromise') {
    risk = 99
    sla = 99.8
    anomalies = 9
    trust = 'Compromised Lock'
    resilience = 'Fallback Isolation'
    recs.push({
      id: 'rec-wallet-compromise',
      title: 'Revoke Key Lock Certificates',
      description: 'Immediately lock authorization certificates associated with the active EVM signing keys to secure remaining funds.',
      tool: 'Security Console',
      confidence: 99,
      impact: 'high',
      reasoningSummary: 'Cascading signing anomaly attempts detected from compromised zero-metadata routes.',
      whyExplanation: 'Interrupted unauthorized signature attempt matching standard drainage vectors. Zero-metadata certificates revoked, isolating all multi-sig wallets autonomously.',
      causalityChain: [
        'Malicious transaction signature detected on Mantle bridge.',
        'Global trust confidence metric dropped below 20%.',
        'Automated Key Lock engine activated certificate revocation.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  } else if (scenario === 'telemetry_storm') {
    risk = 78
    sla = 97.4
    anomalies = 512
    recs.push({
      id: 'rec-telemetry-storm',
      title: 'Purge Telemetry Logs and Flush Buffers',
      description: 'Clear the Performance Center live diagnostic trace log memory to prevent browser storage overflow.',
      tool: 'Performance Center',
      confidence: 97,
      impact: 'medium',
      reasoningSummary: 'Telemetry ingestion rates exceeded 500 triggers/sec, creating heavy memory processing spikes.',
      whyExplanation: 'A synthetic transaction storm flooded local logging engines. Purging non-essential debug traces cleans garbage buffers and preserves sub-second client render speeds.',
      causalityChain: [
        'Diagnostics server ingress registered packet volume warning.',
        'Local log capacity limits exceeded standard buffer values.',
        'Load balancer activated auxiliary log queue failovers.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  } else if (scenario === 'coordination_failure') {
    risk = 70
    sla = 98.5
    anomalies = 5
    recs.push({
      id: 'rec-coordination-failure',
      title: 'Trigger Distributed Agent Mesh Re-Sync',
      description: 'Broadcast a coordination heartbeat signal to re-verify the active workloads and tasks of all 8 nodes.',
      tool: 'Agent Mesh',
      confidence: 93,
      impact: 'medium',
      reasoningSummary: 'Heartbeat signals timed out, indicating synchronization lag in the operational agent framework.',
      whyExplanation: 'Distributed agents failed to register status heartbeats, causing task queue delays. Forcing a global re-sync reconnects disconnected worker nodes.',
      causalityChain: [
        'Operational agent registry heartbeat metrics lost.',
        'Task queue balancing failed to propagate pending delegations.',
        'Re-sync trigger initiated distributed coordination mesh recovery.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  } else if (scenario === 'rpc_fragmentation') {
    risk = 85
    sla = 93.8
    anomalies = 8
    resilience = 'Fallback Isolation'
    recs.push({
      id: 'rec-rpc-fragmentation',
      title: 'Enforce Consensus Validator Checkpoints',
      description: 'Lock transaction validations to nodes that match consistent block height outputs, blocking drifted RPCs.',
      tool: 'Security Console',
      confidence: 96,
      impact: 'high',
      reasoningSummary: 'RPC endpoints returned inconsistent transaction indexes, drifting by 4 blocks.',
      whyExplanation: 'Regional network partition caused state bifurcation. Enforcing a strict validator consensus check prevents submitting transactions on drifted or orphaned chains.',
      causalityChain: [
        'Block height consistency monitor registered EVM state drifts.',
        'Chain consistency score fell to 60% standard baseline.',
        'Consensus consensus baseline engine isolated drifted nodes.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  }

  // Nominal default recommendations
  if (recs.length === 0) {
    recs.push({
      id: 'rec-nominal-syncsplit',
      title: 'Optimize Staking Yield Allocations',
      description: 'Fine-tune the Mantle multi-party splits to maximize yield performance.',
      tool: 'SyncSplit',
      confidence: 92,
      impact: 'low',
      reasoningSummary: 'Active EVM staking pools exhibit slight yield drifts that are corrective via Mantle split adjustments.',
      whyExplanation: 'Mantle split streams remain highly efficient. Minor drift tweaks ensure maximum interest routing.',
      causalityChain: [
        'Yield comparison index verified across Mantle and Mantle pools.',
        'SyncSplit telemetry verified optimal routing lanes.',
        'Yield Optimization trigger generated nominal split adjustment suggestion.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    }, {
      id: 'rec-nominal-agents',
      title: 'Delegate Mantle Worker Nodes',
      description: 'Expand the active worker mesh by 3 autonomous agents to parallelize query operations.',
      tool: 'Agent Mesh',
      confidence: 88,
      impact: 'medium',
      reasoningSummary: 'Increasing autonomous worker delegation yields 14.2% higher aggregate transaction throughput.',
      whyExplanation: 'Worker utilization metrics indicate room for transaction scaling. delegating more operations parallelizes verification steps.',
      causalityChain: [
        'Active Mantle agent mesh capacity verified below threshold.',
        'Pending transaction queues cleared to sub-second bounds.',
        'Worker Delegation suggested to optimize long-run transaction load.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    }, {
      id: 'rec-nominal-telemetry',
      title: 'Flush Telemetry Diagnostic Logs',
      description: 'Purge local diagnostics error logs to maintain optimal UI render and parsing speeds.',
      tool: 'Performance Center',
      confidence: 95,
      impact: 'low',
      reasoningSummary: 'Regular garbage collection of client state keeps dashboard loading speeds sub-second.',
      whyExplanation: 'Clearing harmless diagnostic telemetry logs restores browser storage buffer sizes to nominal limits.',
      causalityChain: [
        'Local log registries reached nominal size capacity limits.',
        'Hydration speed metrics measured sub-second performance.',
        'Garbage collection trigger recommended clean telemetry flush.'
      ],
      applied: false,
      dismissed: false,
      timestamp: new Date().toISOString()
    })
  }

  // Update history of anomalies if a scenario was newly loaded
  const nextAnomalies = [...opsState.aiMemory.pastAnomalies]
  if (scenario !== 'none' && !nextAnomalies.some(a => a.scenario === scenario)) {
    nextAnomalies.push({
      scenario,
      timestamp: new Date().toISOString(),
      details: `Observed simulation anomaly scenario: ${scenario}`
    })
  }

  // Re-map applied/dismissed flags based on existing recommendations
  const mappedRecs = recs.map(newRec => {
    const existing = opsState.recommendations.find(r => r.id === newRec.id)
    if (existing) {
      return { ...newRec, applied: existing.applied, dismissed: existing.dismissed }
    }
    const historical = opsState.aiMemory.historicalRecommendations.find(h => h.id === newRec.id)
    if (historical) {
      return { ...newRec, applied: historical.status === 'applied', dismissed: historical.status === 'dismissed' }
    }
    return newRec
  })

  // Final updates
  opsState = {
    ...opsState,
    recommendations: mappedRecs,
    operationalRiskScore: risk,
    infrastructureConfidenceScore: sla,
    aiOrchestrationHealth: orchestration,
    liveAnomalyDensity: anomalies,
    walletTrustState: trust,
    resilienceStatus: resilience,
    aiMemory: {
      ...opsState.aiMemory,
      pastAnomalies: nextAnomalies
    },
    lastRecalculated: new Date().toISOString()
  }

  notifyListeners()
}

export function useAutonomousOps() {
  const [state, setState] = useState<AutonomousOpsState>({ ...opsState })

  useEffect(() => {
    const handler = () => setState({ ...opsState })
    listeners.add(handler)

    if (typeof window !== 'undefined') {
      window.addEventListener('kubryx_autonomous_ops_update', handler)
    }

    // Auto-recalculate when platform engine changes
    const platHandler = () => {
      triggerAutonomousRecalculation()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('kubryx_platform_update', platHandler)
      // trigger initial
      triggerAutonomousRecalculation()
    }

    return () => {
      listeners.delete(handler)
      if (typeof window !== 'undefined') {
        window.removeEventListener('kubryx_autonomous_ops_update', handler)
        window.removeEventListener('kubryx_platform_update', platHandler)
      }
    }
  }, [])

  return state
}

// Built by vsrupeshkumar
'use client'

import { useState, useEffect } from 'react'
import { recordOSEvent } from './cross-tool-intelligence'
import { toast } from './toast'

export type ProposalStatus = 'draft' | 'voting' | 'passed' | 'failed' | 'executed'
export type ProposalType =
  | 'treasury_rebalancing'
  | 'protocol_migration'
  | 'rpc_upgrades'
  | 'telemetry_escalation'
  | 'security_hardening'
  | 'ai_rule_changes'

export interface GovernanceProposal {
  id: string
  title: string
  description: string
  type: ProposalType
  status: ProposalStatus
  votesFor: number
  votesAgainst: number
  quorumRequired: number
  confidenceScore: number
  proposer: string
  timestamp: string
  rationale: string
  decisionLineage: string[]
}

export interface ValidatorNode {
  id: string
  name: string
  trustScore: number
  latency: number
  syncStatus: 'synced' | 'lagging' | 'offline'
  stakeWeight: number
}

export interface SecurityThreat {
  vector: string
  likelihood: number // %
  severity: 'low' | 'medium' | 'high' | 'critical'
  anomalyImpact: number
  compromiseSimulationActive: boolean
}

export interface SovereignOpsState {
  proposals: GovernanceProposal[]
  validators: ValidatorNode[]
  sovereigntyIndex: number // %
  consensusStability: number // %
  quorumIntegrity: number // %
  threats: SecurityThreat[]
  activeSimulationPolicyId: string | null
}

const DEFAULT_PROPOSALS: GovernanceProposal[] = [
  {
    id: 'prop-001',
    title: 'KIP-24: Optimize Multi-Sig Treasury Yield Splits',
    description: 'Trigger autonomous rebalancing of 450,000 USDC from Mantle devnet vault relays into high-yielding Mantle pools.',
    type: 'treasury_rebalancing',
    status: 'voting',
    votesFor: 840210,
    votesAgainst: 124030,
    quorumRequired: 1000000,
    confidenceScore: 94,
    proposer: 'Treasury AI Agent',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    rationale: 'Current allocation drifts by 14.8%. Rebalancing optimizes cross-chain yield spreads by 3.2% while securing default reserves.',
    decisionLineage: ['Imbalance detected by Treasury AI', 'Quorum parameters loaded dynamically', 'Proposal propagated to active validator mesh']
  },
  {
    id: 'prop-002',
    title: 'KIP-25: Emergency Key Lock Hardening',
    description: 'Revoke compromised EVM bridge signer locks and force multi-factor threshold signatures on all subsequent vault streams.',
    type: 'security_hardening',
    status: 'executed',
    votesFor: 1205300,
    votesAgainst: 5120,
    quorumRequired: 800000,
    confidenceScore: 99,
    proposer: 'Security Agent Mesh',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    rationale: 'Detected zero-metadata proxy anomalies on Mantle gateway, necessitating automated certificate revocation protocols.',
    decisionLineage: ['Anomaly trigger logged by Security Console', 'Key certificates isolated', 'Consensus voting validated block lock']
  },
  {
    id: 'prop-003',
    title: 'KIP-26: Regional RPC Gateway Migration',
    description: 'Deploy secondary consensus caching nodes in London and Singapore to maintain sub-second response times under telemetry packet storms.',
    type: 'rpc_upgrades',
    status: 'draft',
    votesFor: 0,
    votesAgainst: 0,
    quorumRequired: 950000,
    confidenceScore: 88,
    proposer: 'Infrastructure Agent',
    timestamp: new Date().toISOString(),
    rationale: 'Mitigates regional failure cascades by establishing redundant off-chain validator relays.',
    decisionLineage: ['Latency crisis symptoms logged', 'Simulation profiles formulated']
  }
]

const DEFAULT_VALIDATORS: ValidatorNode[] = [
  { id: 'val-01', name: 'Validator-Alpha (Mantle Network)', trustScore: 99.8, latency: 12, syncStatus: 'synced', stakeWeight: 35 },
  { id: 'val-02', name: 'Validator-Beta (Mantle Sepolia)', trustScore: 99.4, latency: 45, syncStatus: 'synced', stakeWeight: 25 },
  { id: 'val-03', name: 'Validator-Gamma (Mantle Sepolia)', trustScore: 98.9, latency: 50, syncStatus: 'synced', stakeWeight: 20 },
  { id: 'val-04', name: 'Validator-Delta (Mantle L2)', trustScore: 95.2, latency: 125, syncStatus: 'lagging', stakeWeight: 15 },
  { id: 'val-05', name: 'Validator-Epsilon (Auxiliary Relay)', trustScore: 78.4, latency: 980, syncStatus: 'lagging', stakeWeight: 5 }
]

const DEFAULT_THREATS: SecurityThreat[] = [
  { vector: 'Multi-Sig Key Compromise Spill', likelihood: 8, severity: 'critical', anomalyImpact: 99, compromiseSimulationActive: false },
  { vector: 'JSON-RPC Packet Congestion Storm', likelihood: 35, severity: 'medium', anomalyImpact: 60, compromiseSimulationActive: false },
  { vector: 'AI Mesh Synchronization Loss', likelihood: 15, severity: 'high', anomalyImpact: 70, compromiseSimulationActive: false },
  { vector: 'Consensus Block Bifurcation Split', likelihood: 12, severity: 'critical', anomalyImpact: 85, compromiseSimulationActive: false }
]

let sovereignState: SovereignOpsState = {
  proposals: [...DEFAULT_PROPOSALS],
  validators: [...DEFAULT_VALIDATORS],
  sovereigntyIndex: 98.4,
  consensusStability: 96.8,
  quorumIntegrity: 99.9,
  threats: [...DEFAULT_THREATS],
  activeSimulationPolicyId: null
}

const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach(l => l())
  if (typeof window !== 'undefined') {
    localStorage.setItem('kubryx_sovereign_ops', JSON.stringify(sovereignState))
    window.dispatchEvent(new Event('kubryx_sovereign_update'))
  }
}

// Hydrate safely
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('kubryx_sovereign_ops')
    if (saved) {
      sovereignState = JSON.parse(saved)
    }
  } catch {
    // ignore
  }
}

export function getSovereignState(): SovereignOpsState {
  return sovereignState
}

export function castGovernanceVote(proposalId: string, support: boolean) {
  const proposal = sovereignState.proposals.find(p => p.id === proposalId)
  if (!proposal || proposal.status !== 'voting') return

  const amount = Math.floor(Math.random() * 80000) + 20000
  const updatedProposals = sovereignState.proposals.map(p => {
    if (p.id === proposalId) {
      const votesFor = support ? p.votesFor + amount : p.votesFor
      const votesAgainst = !support ? p.votesAgainst + amount : p.votesAgainst
      const total = votesFor + votesAgainst
      let status = p.status
      if (total >= p.quorumRequired) {
        status = votesFor > votesAgainst ? 'passed' : 'failed'
      }
      return { ...p, votesFor, votesAgainst, status }
    }
    return p
  })

  // Dynamic sovereignty shift
  let newSovereignty = sovereignState.sovereigntyIndex + (support ? 0.2 : -0.1)
  if (newSovereignty > 100) newSovereignty = 100
  if (newSovereignty < 50) newSovereignty = 50

  sovereignState = {
    ...sovereignState,
    proposals: updatedProposals,
    sovereigntyIndex: parseFloat(newSovereignty.toFixed(1))
  }

  notifyListeners()
  recordOSEvent('Sovereign Governance', `Cast ${amount} votes ${support ? 'FOR' : 'AGAINST'} proposal ${proposalId}`, 'Validator Mesh')
  toast.success(`Cast ${amount.toLocaleString()} votes successfully!`)
}

export function triggerProposalSimulation(proposalId: string) {
  const proposal = sovereignState.proposals.find(p => p.id === proposalId)
  if (!proposal) return

  // Fast forward voting simulation
  const updatedProposals = sovereignState.proposals.map(p => {
    if (p.id === proposalId) {
      const votesFor = p.votesFor + Math.floor(p.quorumRequired * 0.75)
      const votesAgainst = p.votesAgainst + Math.floor(p.quorumRequired * 0.15)
      return {
        ...p,
        votesFor,
        votesAgainst,
        status: 'passed' as const,
        decisionLineage: [...p.decisionLineage, 'Simulated voting propagation succeeded', 'Decentralized consensus validated KIP']
      }
    }
    return p
  })

  sovereignState = {
    ...sovereignState,
    proposals: updatedProposals
  }

  notifyListeners()
  recordOSEvent('Sovereign Governance', `Fast-forwarded voting simulation for KIP: "${proposal.title}"`, 'Global')
  toast.success(`Simulation completed: Proposal Passed!`)
}

export function createGovernanceProposal(title: string, description: string, type: ProposalType, rationale: string) {
  const newProp: GovernanceProposal = {
    id: `prop-${Date.now()}`,
    title,
    description,
    type,
    status: 'voting',
    votesFor: 0,
    votesAgainst: 0,
    quorumRequired: 1000000,
    confidenceScore: Math.floor(Math.random() * 15) + 85,
    proposer: 'Operator Multi-Sig Admin',
    timestamp: new Date().toISOString(),
    rationale,
    decisionLineage: ['Draft formulated by Operator Admin', 'Propagated to validator pools']
  }

  sovereignState = {
    ...sovereignState,
    proposals: [newProp, ...sovereignState.proposals]
  }

  notifyListeners()
  recordOSEvent('Sovereign Governance', `Propagated new active policy proposal: "${title}"`, 'Governance Registry')
  toast.success('Proposal propagated statefully to quorum registers')
}

export function toggleThreatSimulation(vectorName: string) {
  const updatedThreats = sovereignState.threats.map(t => {
    if (t.vector === vectorName) {
      const active = !t.compromiseSimulationActive
      if (active) {
        toast.warning(`Simulated threat active: ${vectorName}`)
      } else {
        toast.success(`Mitigated simulated threat: ${vectorName}`)
      }
      return { ...t, compromiseSimulationActive: active }
    }
    return t
  })

  const activeCount = updatedThreats.filter(t => t.compromiseSimulationActive).length
  let stability = 96.8 - activeCount * 12.5
  if (stability < 10) stability = 10

  sovereignState = {
    ...sovereignState,
    threats: updatedThreats,
    consensusStability: parseFloat(stability.toFixed(1))
  }

  notifyListeners()
  recordOSEvent('Threat Intelligence', `Toggled security simulation for vector "${vectorName}"`, 'Quorum Guard')
}

export function useSovereignOps() {
  const [state, setState] = useState<SovereignOpsState>({ ...sovereignState })

  useEffect(() => {
    const handler = () => setState({ ...sovereignState })
    listeners.add(handler)

    if (typeof window !== 'undefined') {
      window.addEventListener('kubryx_sovereign_update', handler)
    }

    return () => {
      listeners.delete(handler)
      if (typeof window !== 'undefined') {
        window.removeEventListener('kubryx_sovereign_update', handler)
      }
    }
  }, [])

  return {
    ...state,
    castVote: castGovernanceVote,
    simulateVoting: triggerProposalSimulation,
    proposePolicy: createGovernanceProposal,
    toggleThreat: toggleThreatSimulation
  }
}

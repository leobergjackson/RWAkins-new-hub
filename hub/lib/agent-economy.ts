// Built by vsrupeshkumar
'use client'

import { useState, useEffect } from 'react'
import { recordOSEvent } from './cross-tool-intelligence'

export type AgentRole =
  | 'Treasury Agent'
  | 'Risk Agent'
  | 'Security Agent'
  | 'Liquidity Agent'
  | 'Coordination Agent'
  | 'Analytics Agent'
  | 'Compliance Agent'
  | 'Infrastructure Agent'

export interface OperationalAgent {
  id: string
  name: string
  role: AgentRole
  status: 'Idle' | 'Active' | 'Recovering' | 'Offline'
  health: number // 0 - 100
  trustScore: number // 0 - 100
  workload: number // % capacity, e.g. 45
  tasksCompleted: number
  activeTask?: string
}

export interface AgentTask {
  id: string
  title: string
  assignedAgentId: string
  targetChain: string
  status: 'Pending' | 'In Progress' | 'Completed' | 'Failed'
  urgency: 'low' | 'medium' | 'high'
  log: string[]
}

export interface AgentEconomyState {
  agents: OperationalAgent[]
  tasks: AgentTask[]
  globalTrustConfidence: number // 0-100%
  totalActiveWorkload: number // aggregate %
  isBalancing: boolean
}

const DEFAULT_AGENTS: OperationalAgent[] = [
  { id: 'agt-1', name: 'TreasurySentinel-01', role: 'Treasury Agent', status: 'Active', health: 99, trustScore: 99.8, workload: 40, tasksCompleted: 242, activeTask: 'Streaming multi-sig splits on Mantle' },
  { id: 'agt-2', name: 'RiskGuardian-03', role: 'Risk Agent', status: 'Idle', health: 98, trustScore: 99.5, workload: 0, tasksCompleted: 189 },
  { id: 'agt-3', name: 'CipherLock-09', role: 'Security Agent', status: 'Active', health: 100, trustScore: 99.9, workload: 65, tasksCompleted: 512, activeTask: 'Auditing EVM ledger signature certs' },
  { id: 'agt-4', name: 'LiquiditySwerve-05', role: 'Liquidity Agent', status: 'Active', health: 96, trustScore: 98.7, workload: 30, tasksCompleted: 115, activeTask: 'Optimizing Mantle lending yield spreads' },
  { id: 'agt-5', name: 'MeshRouter-11', role: 'Coordination Agent', status: 'Idle', health: 97, trustScore: 99.1, workload: 0, tasksCompleted: 94 },
  { id: 'agt-6', name: 'StatsOracle-07', role: 'Analytics Agent', status: 'Active', health: 99, trustScore: 99.4, workload: 50, tasksCompleted: 405, activeTask: 'Polling rollups latency performance metrics' },
  { id: 'agt-7', name: 'SoulVerifier-13', role: 'Compliance Agent', status: 'Idle', health: 100, trustScore: 100.0, workload: 0, tasksCompleted: 88 },
  { id: 'agt-8', name: 'SlaShield-15', role: 'Infrastructure Agent', status: 'Active', health: 95, trustScore: 97.9, workload: 85, tasksCompleted: 318, activeTask: 'Mitigating regional packet drops via cache backup routing' }
]

const DEFAULT_TASKS: AgentTask[] = [
  {
    id: 'tsk-101',
    title: 'Audit transaction signature limits',
    assignedAgentId: 'agt-3',
    targetChain: 'Mantle Network',
    status: 'In Progress',
    urgency: 'high',
    log: ['Task propagation initialized', 'Acquiring active cryptographic state', 'Verifying Ed25519 detached payload signature']
  },
  {
    id: 'tsk-102',
    title: 'Sweeping venture locker yields',
    assignedAgentId: 'agt-1',
    targetChain: 'Mantle Sepolia',
    status: 'Completed',
    urgency: 'medium',
    log: ['Task assigned to TreasurySentinel-01', 'Scanning self-claiming inheritance vault', 'Yield swap of 45 MNT finalized', 'State snapshot stored in local OS memory']
  },
  {
    id: 'tsk-103',
    title: 'Resolve regional server latency regression',
    assignedAgentId: 'agt-8',
    targetChain: 'Mantle Sepolia',
    status: 'In Progress',
    urgency: 'high',
    log: ['Regional RPC ping timeout intercepted', 'Cache fallback pathway instantiated', 'Exp backoff active']
  }
]

let economyState: AgentEconomyState = {
  agents: [...DEFAULT_AGENTS],
  tasks: [...DEFAULT_TASKS],
  globalTrustConfidence: 99.3,
  totalActiveWorkload: 33.7,
  isBalancing: false
}

const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach(l => l())
  if (typeof window !== 'undefined') {
    localStorage.setItem('kubryx_agent_economy', JSON.stringify(economyState))
    window.dispatchEvent(new Event('kubryx_agent_economy_update'))
  }
}

// Hydrate safely
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('kubryx_agent_economy')
    if (saved) {
      economyState = JSON.parse(saved)
    }
  } catch {
    // ignore
  }
}

export function getAgentEconomyState(): AgentEconomyState {
  return economyState
}

export function updateAgentEconomyState(updater: (prev: AgentEconomyState) => Partial<AgentEconomyState>) {
  const diff = updater(economyState)
  economyState = { ...economyState, ...diff }
  notifyListeners()
}

// Balance agents workloads autonomously
export function balanceAgentWorkloads() {
  updateAgentEconomyState(() => ({ isBalancing: true }))
  
  setTimeout(() => {
    const balancedAgents = economyState.agents.map(a => {
      if (a.workload > 70) {
        // Divert workload to idle agents
        return { ...a, workload: Math.max(10, a.workload - 30) }
      }
      if (a.workload === 0) {
        return { ...a, workload: 15, status: 'Active' as const, activeTask: 'Assumed distributed load share' }
      }
      return a
    })

    const totalLoad = balancedAgents.reduce((sum, ag) => sum + ag.workload, 0) / balancedAgents.length

    updateAgentEconomyState(() => ({
      agents: balancedAgents,
      totalActiveWorkload: parseFloat(totalLoad.toFixed(1)),
      isBalancing: false
    }))

    recordOSEvent('Agent Economy', 'Distributed workload rebalancing executed across 8 agent nodes.', 'All Protocols')
  }, 1000)
}

// Propagate new task dynamically to registry
export function propagateAgentTask(title: string, roleRequired: AgentRole, chain: string, urgency: 'low' | 'medium' | 'high') {
  const matchingAgent = economyState.agents.find(a => a.role === roleRequired) || economyState.agents[0]
  
  const newTask: AgentTask = {
    id: `tsk-${Date.now()}`,
    title,
    assignedAgentId: matchingAgent.id,
    targetChain: chain,
    status: 'Pending',
    urgency,
    log: ['Task queued in memory registry', `Propagated to agent node: ${matchingAgent.name}`]
  }

  const updatedTasks = [newTask, ...economyState.tasks]
  
  // Increase agent workload
  const updatedAgents = economyState.agents.map(a => {
    if (a.id === matchingAgent.id) {
      return {
        ...a,
        status: 'Active' as const,
        workload: Math.min(100, a.workload + 20),
        activeTask: title
      }
    }
    return a
  })

  const totalLoad = updatedAgents.reduce((sum, ag) => sum + ag.workload, 0) / updatedAgents.length

  updateAgentEconomyState(() => ({
    tasks: updatedTasks,
    agents: updatedAgents,
    totalActiveWorkload: parseFloat(totalLoad.toFixed(1))
  }))

  recordOSEvent('Agent Economy', `Task propagated: "${title}" delegated to ${matchingAgent.name}`, chain)
}

// Simulate agent execution cycles
export function useAgentEconomy() {
  const [state, setState] = useState<AgentEconomyState>({ ...economyState })

  useEffect(() => {
    const handler = () => setState({ ...economyState })
    listeners.add(handler)

    if (typeof window !== 'undefined') {
      window.addEventListener('kubryx_agent_economy_update', handler)
    }

    // Dynamic execution simulation loops
    const timer = setInterval(() => {
      const activeIdx = Math.floor(Math.random() * economyState.agents.length)
      const currentAgents = [...economyState.agents]
      const agent = currentAgents[activeIdx]

      // Random task simulation completions
      if (agent.status === 'Active' && Math.random() > 0.6) {
        currentAgents[activeIdx] = {
          ...agent,
          tasksCompleted: agent.tasksCompleted + 1,
          workload: Math.max(0, agent.workload - 10),
          status: agent.workload <= 10 ? 'Idle' : 'Active',
          activeTask: agent.workload <= 10 ? undefined : agent.activeTask
        }
        
        updateAgentEconomyState(() => ({ agents: currentAgents }))
      }
    }, 8000)

    return () => {
      listeners.delete(handler)
      if (typeof window !== 'undefined') {
        window.removeEventListener('kubryx_agent_economy_update', handler)
      }
      clearInterval(timer)
    }
  }, [])

  return {
    ...state,
    balanceWorkloads: balanceAgentWorkloads,
    propagateTask: propagateAgentTask
  }
}

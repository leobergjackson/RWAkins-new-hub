// Built by vsrupeshkumar
'use client'

import { useState, useEffect } from 'react'
import { recordOSEvent } from './cross-tool-intelligence'
import { toast } from './toast'

export interface LiquidityPoolFlow {
  poolName: string
  solanaDevnetBalance: number
  qieMainnetBalance: number
  stellarTestnetBalance: number
  arbitrumSepoliaBalance: number
  stabilityScore: number // %
  utilizationRate: number // %
}

export interface IncentiveReward {
  id: string
  agentRole: string
  allocatedReward: number // NCRD
  accruedYieldRate: number // % APY
  performanceFactor: number // %
}

export interface EconomicOpsState {
  pools: LiquidityPoolFlow[]
  incentives: IncentiveReward[]
  treasuryEquilibriumIndex: number // %
  coordinationEfficiency: number // %
  treasuryPressureLevel: 'nominal' | 'elevated' | 'critical'
}

const DEFAULT_POOLS: LiquidityPoolFlow[] = [
  { poolName: 'Enterprise Payroll Vault', solanaDevnetBalance: 120500, qieMainnetBalance: 240900, stellarTestnetBalance: 88000, arbitrumSepoliaBalance: 51200, stabilityScore: 98.4, utilizationRate: 42 },
  { poolName: 'NCRD Lending Liquidity', solanaDevnetBalance: 450000, qieMainnetBalance: 980000, stellarTestnetBalance: 120000, arbitrumSepoliaBalance: 640000, stabilityScore: 95.8, utilizationRate: 68 },
  { poolName: 'SyncSplit Fee Reserve', solanaDevnetBalance: 12500, qieMainnetBalance: 32000, stellarTestnetBalance: 145000, arbitrumSepoliaBalance: 15400, stabilityScore: 99.2, utilizationRate: 15 },
  { poolName: 'Zero-Knowledge Bridge Collateral', solanaDevnetBalance: 50000, qieMainnetBalance: 150000, stellarTestnetBalance: 0, arbitrumSepoliaBalance: 320000, stabilityScore: 88.5, utilizationRate: 84 }
]

const DEFAULT_INCENTIVES: IncentiveReward[] = [
  { id: 'inc-01', agentRole: 'Treasury Agent', allocatedReward: 12500, accruedYieldRate: 14.5, performanceFactor: 98.2 },
  { id: 'inc-02', agentRole: 'Risk Agent', allocatedReward: 8400, accruedYieldRate: 9.8, performanceFactor: 94.6 },
  { id: 'inc-03', agentRole: 'Security Agent', allocatedReward: 15000, accruedYieldRate: 12.2, performanceFactor: 99.4 },
  { id: 'inc-04', agentRole: 'Compliance Agent', allocatedReward: 5000, accruedYieldRate: 5.4, performanceFactor: 91.8 }
]

let economicState: EconomicOpsState = {
  pools: [...DEFAULT_POOLS],
  incentives: [...DEFAULT_INCENTIVES],
  treasuryEquilibriumIndex: 94.6,
  coordinationEfficiency: 96.2,
  treasuryPressureLevel: 'nominal'
}

const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach(l => l())
  if (typeof window !== 'undefined') {
    localStorage.setItem('kubryx_economic_ops', JSON.stringify(economicState))
    window.dispatchEvent(new Event('kubryx_economic_update'))
  }
}

// Hydrate safely
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('kubryx_economic_ops')
    if (saved) {
      economicState = JSON.parse(saved)
    }
  } catch {
    // ignore
  }
}

export function getEconomicState(): EconomicOpsState {
  return economicState
}

export function balanceEconomicIncentives() {
  const updatedIncentives = economicState.incentives.map(inc => {
    // Re-balance reward factors based on slight performance drifts
    const delta = (Math.random() * 2 - 1) * 0.5
    const performanceFactor = Math.min(100, Math.max(80, inc.performanceFactor + delta))
    const allocatedReward = Math.floor(inc.allocatedReward * (1 + delta * 0.05))
    return {
      ...inc,
      performanceFactor: parseFloat(performanceFactor.toFixed(1)),
      allocatedReward
    }
  })

  // Recalculate economic properties
  const avgPerformance = updatedIncentives.reduce((sum, i) => sum + i.performanceFactor, 0) / updatedIncentives.length
  
  economicState = {
    ...economicState,
    incentives: updatedIncentives,
    coordinationEfficiency: parseFloat(avgPerformance.toFixed(1)),
    treasuryEquilibriumIndex: parseFloat((90 + Math.random() * 8).toFixed(1))
  }

  notifyListeners()
  recordOSEvent('Economic Coordination', 'Rebalanced decentralized agent incentive reward rates.', 'Smart Contract Desk')
  toast.success('Agent rewards calibrated statefully!')
}

export function simulateLiquidityFlow(poolName: string, destinationChain: string, amount: number) {
  const matchedPool = economicState.pools.find(p => p.poolName === poolName)
  if (!matchedPool) return

  const updatedPools = economicState.pools.map(p => {
    if (p.poolName === poolName) {
      // Simulate shift from Mantle to Mantle or vice-versa
      let sol = p.solanaDevnetBalance
      let qie = p.qieMainnetBalance
      let stellar = p.stellarTestnetBalance
      let arb = p.arbitrumSepoliaBalance

      if (destinationChain === 'Mantle Network' && sol >= amount) {
        sol -= amount
        qie += amount
      } else if (destinationChain === 'Mantle Sepolia' && qie >= amount) {
        qie -= amount
        sol += amount
      } else if (destinationChain === 'Mantle Sepolia' && arb >= amount) {
        arb -= amount
        stellar += amount
      } else {
        // Fallback generic transfer
        qie += amount
        sol -= amount / 2
        arb -= amount / 2
      }

      // Readjust stability metrics dynamically
      const stabilityScore = Math.min(100, Math.max(60, p.stabilityScore + (Math.random() * 4 - 2)))
      const utilizationRate = Math.min(99, Math.max(10, p.utilizationRate + (Math.random() * 10 - 5)))

      return {
        ...p,
        solanaDevnetBalance: Math.floor(sol),
        qieMainnetBalance: Math.floor(qie),
        stellarTestnetBalance: Math.floor(stellar),
        arbitrumSepoliaBalance: Math.floor(arb),
        stabilityScore: parseFloat(stabilityScore.toFixed(1)),
        utilizationRate: Math.floor(utilizationRate)
      }
    }
    return p
  })

  // Readjust pressure
  let pressure: 'nominal' | 'elevated' | 'critical' = 'nominal'
  const highUtil = updatedPools.some(p => p.utilizationRate > 80)
  if (highUtil) pressure = 'elevated'

  economicState = {
    ...economicState,
    pools: updatedPools,
    treasuryPressureLevel: pressure
  }

  notifyListeners()
  recordOSEvent('Economic Coordination', `Simulated liquidity migration of ${amount} units inside "${poolName}" to ${destinationChain}`, 'Bridge Ledger')
  toast.success(`Liquidity simulated flow completed: ${amount.toLocaleString()} units shifted`)
}

export function useEconomicOps() {
  const [state, setState] = useState<EconomicOpsState>({ ...economicState })

  useEffect(() => {
    const handler = () => setState({ ...economicState })
    listeners.add(handler)

    if (typeof window !== 'undefined') {
      window.addEventListener('kubryx_economic_update', handler)
    }

    return () => {
      listeners.delete(handler)
      if (typeof window !== 'undefined') {
        window.removeEventListener('kubryx_economic_update', handler)
      }
    }
  }, [])

  return {
    ...state,
    rebalanceIncentives: balanceEconomicIncentives,
    migrateLiquidity: simulateLiquidityFlow
  }
}

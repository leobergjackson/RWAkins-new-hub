// Built by vsrupeshkumar
// 4-agent council for RWAkins AI x RWA rebalancing decisions

export interface AgentConfig {
  id: string
  name: string
  icon: string
  role: string
  description: string
  color: string
  hasVeto: boolean
}

export const COUNCIL_AGENTS: AgentConfig[] = [
  {
    id: 'market-analyst',
    name: 'Market Analyst',
    icon: '🔍',
    role: 'Market Intelligence',
    description: 'Reads yield curves, ETH volatility, and real-time market conditions',
    color: '#3b82f6',
    hasVeto: false,
  },
  {
    id: 'risk-guardian',
    name: 'Risk Guardian',
    icon: '🛡️',
    role: 'Risk Management',
    description: 'Enforces mETH ≤ 70% hard cap; veto power overrides all votes',
    color: '#ef4444',
    hasVeto: true,
  },
  {
    id: 'yield-optimizer',
    name: 'Yield Optimizer',
    icon: '💰',
    role: 'Yield Strategy',
    description: 'Calculates optimal USDY/mETH weighting for maximum risk-adjusted return',
    color: '#10b981',
    hasVeto: false,
  },
  {
    id: 'execution-planner',
    name: 'Execution Planner',
    icon: '⚙️',
    role: 'Execution',
    description: 'Confirms on-chain liquidity, estimates slippage, validates gas cost',
    color: '#f59e0b',
    hasVeto: false,
  },
]

export type VoteChoice = 'YES' | 'NO' | 'ABSTAIN'

export interface AgentVote {
  agentId: string
  vote: VoteChoice
  confidence: number  // 0-100
  reasoning: string
  timestamp: number
  vetoed?: boolean
}

export interface CouncilResult {
  votes: AgentVote[]
  approved: boolean
  vetoed: boolean
  quorumMet: boolean
  yesCount: number
  finalDecision: string
  sessionId: string
  timestamp: number
}

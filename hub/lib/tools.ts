// Built by vsrupeshkumar
// Central registry of every RWAkins tool — names, chains, colors, wallet types.
// The Turing Test Hackathon 2026: every tool targets Mantle Sepolia (chain 5003).

export interface ToolConfig {
  route: string
  name: string
  tagline: string
  description: string
  icon: string
  category: string
  chain: string
  status: 'Live' | 'Beta' | 'Soon'
  color: string
  walletType: 'evm' | 'solana'
  networkKey: string
}

export const TOOLS: ToolConfig[] = [
  {
    route: '/treasury',
    name: 'AI RWA Treasury',
    tagline: 'Autonomous USDY / mETH yield',
    description: 'The hero. An AI agent rebalances a vault between USDY (stable yield) and mETH (staking yield) on Mantle — it proposes, the smart contract enforces on-chain risk guardrails, you execute in one click.',
    icon: '◇',
    category: 'AI x RWA',
    chain: 'Mantle Sepolia',
    status: 'Live',
    color: '#10b981',
    walletType: 'evm',
    networkKey: 'MANTLE_SEPOLIA',
  },
  {
    route: '/credit',
    name: 'Credit Passport',
    tagline: 'AI Credit Scoring',
    description: 'Generate your on-chain credit score as a soulbound NFT on Mantle. Every DeFi protocol reads your score with a single contract call.',
    icon: '◈',
    category: 'Identity',
    chain: 'Mantle Sepolia',
    status: 'Live',
    color: '#06b6d4',
    walletType: 'evm',
    networkKey: 'MANTLE_SEPOLIA',
  },
  {
    route: '/lend',
    name: 'AI Lending',
    tagline: 'DeFi Loan Negotiation',
    description: 'AI agents negotiate your loan terms in natural language. Zero-knowledge credit verification. Settles on Mantle.',
    icon: '◎',
    category: 'DeFi',
    chain: 'Mantle Sepolia',
    status: 'Live',
    color: '#f59e0b',
    walletType: 'evm',
    networkKey: 'MANTLE_SEPOLIA',
  },
  {
    route: '/vault',
    name: 'Private Vault',
    tagline: 'Private Trading',
    description: 'Trade assets with privacy on Mantle. Minimal transaction metadata exposed to any observer.',
    icon: '🔐',
    category: 'Privacy',
    chain: 'Mantle Sepolia',
    status: 'Live',
    color: '#14b8a6',
    walletType: 'evm',
    networkKey: 'MANTLE_SEPOLIA',
  },
  {
    route: '/agents',
    name: 'Agent Co-ordinator',
    tagline: 'AI Agent Coordination',
    description: 'Deploy AI agents with verified on-chain identities on Mantle. Every delegation is signed and permanently logged.',
    icon: '⬡',
    category: 'AI',
    chain: 'Mantle Sepolia',
    status: 'Live',
    color: '#6366f1',
    walletType: 'evm',
    networkKey: 'MANTLE_SEPOLIA',
  },
  {
    route: '/split',
    name: 'Bill Split',
    tagline: 'On-Chain Bill Splitting',
    description: 'Split bills using smart contracts on Mantle. Multi-wallet support with automatic settlement on full payment.',
    icon: '◆',
    category: 'Payments',
    chain: 'Mantle Sepolia',
    status: 'Live',
    color: '#3b82f6',
    walletType: 'evm',
    networkKey: 'MANTLE_SEPOLIA',
  },
  {
    route: '/legacy',
    name: 'Family Vault',
    tagline: 'Encrypted Inheritance',
    description: 'Store your most important files with AES-GCM encryption. Heirs unlock access on Mantle after validator attestation.',
    icon: '⬟',
    category: 'Security',
    chain: 'Mantle Sepolia',
    status: 'Live',
    color: '#f43f5e',
    walletType: 'evm',
    networkKey: 'MANTLE_SEPOLIA',
  },
  {
    route: '/shadow',
    name: 'Stealth Execution Suite',
    tagline: 'Autonomous Operations',
    description: 'Run your entire financial organization on-chain on Mantle. Specialized AI agents, fully autonomous.',
    icon: '▲',
    category: 'Enterprise',
    chain: 'Mantle Sepolia',
    status: 'Live',
    color: '#8b5cf6',
    walletType: 'evm',
    networkKey: 'MANTLE_SEPOLIA',
  },
]

export function getToolByRoute(route: string): ToolConfig | undefined {
  return TOOLS.find(t => t.route === route)
}

export function getToolColor(route: string): string {
  return getToolByRoute(route)?.color ?? '#F5C518'
}

export function getToolName(route: string): string {
  return getToolByRoute(route)?.name ?? 'RWAkins'
}

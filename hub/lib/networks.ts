// Built by vsrupeshkumar
// All network (chain) configuration for Kubryx wallet connectivity.
// Updated for ETH Mexico 2026 Hackathon: Arbitrum Sepolia ONLY.

export const NETWORKS = {
  ARBITRUM_SEPOLIA: {
    chainId: '0x66eee',
    chainIdDecimal: 421614,
    name: 'Arbitrum Sepolia',
    shortName: 'Arb Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorer: 'https://sepolia.arbiscan.io',
    explorerTx: 'https://sepolia.arbiscan.io/tx/',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: '#28a0f0',
    type: 'evm' as const,
    coingeckoId: 'ethereum',
    selectable: true,
  },
}

export type NetworkKey = keyof typeof NETWORKS
export type NetworkConfig = (typeof NETWORKS)[NetworkKey]

// Which route uses which network (All Arbitrum Sepolia now)
export const TOOL_NETWORKS: Record<string, NetworkKey> = {
  '/dashboard': 'ARBITRUM_SEPOLIA',
  '/credit':    'ARBITRUM_SEPOLIA',
  '/legacy':    'ARBITRUM_SEPOLIA',
  '/agents':    'ARBITRUM_SEPOLIA',
  '/vault':     'ARBITRUM_SEPOLIA',
  '/split':     'ARBITRUM_SEPOLIA',
  '/lend':      'ARBITRUM_SEPOLIA',
  '/treasury':  'ARBITRUM_SEPOLIA',
  '/shadow':    'ARBITRUM_SEPOLIA',
}

// EVM tools (use MetaMask)
export const EVM_TOOLS = [
  '/dashboard', '/credit', '/legacy', '/vault', '/split', '/lend', '/agents', '/treasury', '/shadow'
]

// Solana tools (use Phantom)
export const SOLANA_TOOLS: string[] = []

// Get network type for a route
export function getWalletTypeForRoute(route: string): 'evm' | 'solana' {
  return 'evm'
}

// Get network config for a route
export function getNetworkForRoute(route: string): NetworkConfig {
  return NETWORKS.ARBITRUM_SEPOLIA
}

// Find an EVM network config by its decimal chain id
export function getNetworkByChainId(chainId: number | null): NetworkConfig | null {
  if (chainId == null) return null
  const found = Object.values(NETWORKS).find(
    n => n.chainIdDecimal != null && n.chainIdDecimal === chainId,
  )
  return found ?? null
}

// ── Chain selection (in-app chain switcher) ─────────────────────────────────

const SELECTABLE_ORDER: NetworkKey[] = [
  'ARBITRUM_SEPOLIA'
]

export type SelectableChain = NetworkConfig & { key: NetworkKey }

/** Every chain the user can pick in the global / per-tool chain switcher. */
export function getSelectableChains(): SelectableChain[] {
  return SELECTABLE_ORDER
    .filter(k => NETWORKS[k]?.selectable)
    .map(k => ({ key: k, ...NETWORKS[k] }))
}

export function getNetworkByKey(key: NetworkKey): NetworkConfig {
  return NETWORKS[key]
}

/** The NetworkKey that backs the resilient `rpcClient` ChainType, if any.
 *  Used to bridge the user's selected chain to the generic RPC read layer. */
export const NETWORK_KEY_TO_RPC_CHAIN: Partial<Record<NetworkKey, string>> = {
  ARBITRUM_SEPOLIA: 'ARBITRUM_SEPOLIA',
}

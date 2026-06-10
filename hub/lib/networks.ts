// Built by vsrupeshkumar
// All network (chain) configuration for RWAkins wallet connectivity.
// Updated for The Turing Test Hackathon 2026: Mantle Sepolia ONLY.

export const NETWORKS = {
  MANTLE: {
    chainId: '0x1388',
    chainIdDecimal: 5000,
    name: 'Mantle Network',
    shortName: 'Mantle',
    rpcUrl: 'https://rpc.mantle.xyz',
    explorer: 'https://explorer.mantle.xyz',
    explorerTx: 'https://explorer.mantle.xyz/tx/',
    currency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
    color: '#000000',
    type: 'evm' as const,
    coingeckoId: 'mantle',
    selectable: true,
  },
  MANTLE_SEPOLIA: {
    chainId: '0x138b',
    chainIdDecimal: 5003,
    name: 'Mantle Sepolia Testnet',
    shortName: 'Mantle Sepolia',
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorer: 'https://explorer.sepolia.mantle.xyz',
    explorerTx: 'https://explorer.sepolia.mantle.xyz/tx/',
    currency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
    color: '#000000',
    type: 'evm' as const,
    coingeckoId: 'mantle',
    selectable: true,
  },
}

export type NetworkKey = keyof typeof NETWORKS
export type NetworkConfig = (typeof NETWORKS)[NetworkKey]

export const TOOL_NETWORKS: Record<string, NetworkKey> = {
  '/dashboard': 'MANTLE_SEPOLIA',
  '/credit':    'MANTLE_SEPOLIA',
  '/legacy':    'MANTLE_SEPOLIA',
  '/agents':    'MANTLE_SEPOLIA',
  '/vault':     'MANTLE_SEPOLIA',
  '/split':     'MANTLE_SEPOLIA',
  '/lend':      'MANTLE_SEPOLIA',
  '/treasury':  'MANTLE_SEPOLIA',
  '/shadow':    'MANTLE_SEPOLIA',
  '/ext':       'MANTLE_SEPOLIA',
}

// EVM tools (use MetaMask)
export const EVM_TOOLS = [
  '/dashboard', '/credit', '/legacy', '/vault', '/split', '/lend', '/agents', '/treasury', '/shadow'
]

// Mantle tools (use Phantom)
export const SOLANA_TOOLS: string[] = []

// Get network type for a route
export function getWalletTypeForRoute(route: string): 'evm' | 'solana' {
  return 'evm'
}

export function getNetworkForRoute(route: string): NetworkConfig {
  const key = TOOL_NETWORKS[route] || 'MANTLE_SEPOLIA'
  return NETWORKS[key as NetworkKey] || NETWORKS.MANTLE_SEPOLIA
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
  'MANTLE',
  'MANTLE_SEPOLIA'
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
  MANTLE: 'MANTLE',
  MANTLE_SEPOLIA: 'MANTLE_SEPOLIA',
}

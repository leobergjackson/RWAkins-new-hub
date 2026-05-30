// Built by vsrupeshkumar
// All network (chain) configuration for Kubryx wallet connectivity.
//
// Every chain the user can select platform-wide lives here. `coingeckoId` is the
// CoinGecko id for the chain's native asset (null for assets with no listing, e.g.
// QIE) so generic price reads can follow the user's selected chain. `selectable`
// marks a chain as available in the in-app chain switcher.

export const NETWORKS = {

  ETHEREUM: {
    chainId: '0x1',
    chainIdDecimal: 1,
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    explorerTx: 'https://etherscan.io/tx/',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: '#627eea',
    type: 'evm' as const,
    coingeckoId: 'ethereum',
    selectable: true,
  },

  ARBITRUM: {
    chainId: '0xa4b1',
    chainIdDecimal: 42161,
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    explorerTx: 'https://arbiscan.io/tx/',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: '#28a0f0',
    type: 'evm' as const,
    coingeckoId: 'ethereum',
    selectable: true,
  },

  QIE: {
    chainId: '0x7c6',       // decimal: 1990
    chainIdDecimal: 1990,
    name: 'QIE Mainnet',
    shortName: 'QIE',
    rpcUrl: 'https://mainnet.qie.digital/api/eth-rpc',
    explorer: 'https://mainnet.qie.digital',
    explorerTx: 'https://mainnet.qie.digital/tx/',
    currency: { name: 'QIE', symbol: 'QIE', decimals: 18 },
    color: '#F5C518',
    type: 'evm' as const,
    coingeckoId: null,
    selectable: true,
  },

  SOLANA_DEVNET: {
    chainId: null,
    chainIdDecimal: null,
    name: 'Solana Devnet',
    shortName: 'Solana',
    rpcUrl: 'https://api.devnet.solana.com',
    explorer: 'https://explorer.solana.com/?cluster=devnet',
    explorerTx: 'https://explorer.solana.com/tx/',
    currency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    color: '#9945ff',
    type: 'solana' as const,
    coingeckoId: 'solana',
    selectable: true,
  },

  STELLAR_TESTNET: {
    chainId: null,
    chainIdDecimal: null,
    name: 'Stellar Testnet',
    shortName: 'Stellar',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    explorer: 'https://stellar.expert/explorer/testnet',
    explorerTx: 'https://stellar.expert/explorer/testnet/tx/',
    currency: { name: 'Lumens', symbol: 'XLM', decimals: 7 },
    color: '#7e36bb',
    type: 'stellar' as const,
    coingeckoId: 'stellar',
    selectable: true,
  },

  POLYGON: {
    chainId: '0x89',
    chainIdDecimal: 137,
    name: 'Polygon',
    shortName: 'Polygon',
    rpcUrl: 'https://polygon.llamarpc.com',
    explorer: 'https://polygonscan.com',
    explorerTx: 'https://polygonscan.com/tx/',
    currency: { name: 'POL', symbol: 'POL', decimals: 18 },
    color: '#8247e5',
    type: 'evm' as const,
    coingeckoId: 'matic-network',
    selectable: true,
  },

  BSC: {
    chainId: '0x38',
    chainIdDecimal: 56,
    name: 'BNB Smart Chain',
    shortName: 'BNB Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    explorerTx: 'https://bscscan.com/tx/',
    currency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    color: '#f0b90b',
    type: 'evm' as const,
    coingeckoId: 'binancecoin',
    selectable: true,
  },

  OPTIMISM: {
    chainId: '0xa',
    chainIdDecimal: 10,
    name: 'Optimism',
    shortName: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    explorerTx: 'https://optimistic.etherscan.io/tx/',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: '#ff0420',
    type: 'evm' as const,
    coingeckoId: 'ethereum',
    selectable: true,
  },
}

export type NetworkKey = keyof typeof NETWORKS
export type NetworkConfig = (typeof NETWORKS)[NetworkKey]

// Which route uses which network
export const TOOL_NETWORKS: Record<string, NetworkKey> = {
  '/dashboard': 'QIE',
  '/credit':    'QIE',           // Credit Passport
  '/legacy':    'QIE',           // Family Vault
  '/agents':    'SOLANA_DEVNET', // Agent Co-ordinator
  '/vault':     'ARBITRUM',      // Private Vault
  '/split':     'QIE',           // Bill Split
  '/lend':      'ARBITRUM',      // AI Lending
  '/treasury':  'SOLANA_DEVNET', // Yield Operations Hub
  '/shadow':    'SOLANA_DEVNET', // Stealth Execution Suite
}

// EVM tools (use MetaMask)
export const EVM_TOOLS = [
  '/dashboard', '/credit', '/legacy', '/vault', '/split', '/lend',
]

// Solana tools (use Phantom)
export const SOLANA_TOOLS = [
  '/agents', '/treasury', '/shadow',
]

// Get network type for a route
export function getWalletTypeForRoute(route: string): 'evm' | 'solana' {
  return SOLANA_TOOLS.includes(route) ? 'solana' : 'evm'
}

// Get network config for a route
export function getNetworkForRoute(route: string): NetworkConfig {
  const key = TOOL_NETWORKS[route]
  return key ? NETWORKS[key] : NETWORKS.QIE
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

// Order chains are presented in the switcher. Native/first-class chains first,
// then the additional EVM networks.
const SELECTABLE_ORDER: NetworkKey[] = [
  'QIE', 'SOLANA_DEVNET', 'STELLAR_TESTNET', 'ARBITRUM',
  'ETHEREUM', 'POLYGON', 'BSC', 'OPTIMISM',
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
  QIE: 'QIE',
  SOLANA_DEVNET: 'SOLANA',
  STELLAR_TESTNET: 'STELLAR',
  ARBITRUM: 'ARBITRUM',
  ETHEREUM: 'ETHEREUM',
  POLYGON: 'POLYGON',
  BSC: 'BSC',
  OPTIMISM: 'OPTIMISM',
}

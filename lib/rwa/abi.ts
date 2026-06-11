// Built by vsrupeshkumar
// ABIs for the RWAkins AI x RWA stack on Mantle Sepolia.

export const RWA_TOKEN_ABI = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'currentYield', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  // Owner-only: the agent syncs the live reference APY on-chain (lib/rwa/oracleSync).
  { type: 'function', name: 'setYield', stateMutability: 'nonpayable', inputs: [{ name: 'yieldBps', type: 'uint256' }], outputs: [] },
] as const

export const VAULT_ABI = [
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'rebalance', stateMutability: 'nonpayable', inputs: [{ name: 'usdyBps', type: 'uint256' }, { name: 'methBps', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'rebalanceFor', stateMutability: 'nonpayable', inputs: [{ name: 'user', type: 'address' }, { name: 'usdyBps', type: 'uint256' }, { name: 'methBps', type: 'uint256' }], outputs: [] },
  {
    type: 'function', name: 'getPortfolio', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'usdyBal', type: 'uint256' }, { name: 'methBal', type: 'uint256' }, { name: 'usdyBps', type: 'uint256' }, { name: 'methBps', type: 'uint256' }],
  },
  { type: 'function', name: 'getTotalValue', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'usdy', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'meth', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'MAX_RISK_BPS', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  // Live mETH price (USDY units, 1e18) the vault values the mETH leg at. The agent
  // keeps this in sync with the real market via setMethPrice (lib/rwa/oracleSync).
  { type: 'function', name: 'methPriceE18', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  // Owner-only: push the live mETH/USD price on-chain so vault math tracks reality.
  { type: 'function', name: 'setMethPrice', stateMutability: 'nonpayable', inputs: [{ name: 'methPriceE18', type: 'uint256' }], outputs: [] },
  { type: 'event', name: 'Deposited', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'asset', type: 'address', indexed: false }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Withdrawn', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'asset', type: 'address', indexed: false }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Rebalanced', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'usdyBps', type: 'uint256', indexed: false }, { name: 'methBps', type: 'uint256', indexed: false }, { name: 'timestamp', type: 'uint256', indexed: false }] },
] as const

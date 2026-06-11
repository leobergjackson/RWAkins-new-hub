// Built by vsrupeshkumar
// Server-side vault access for the AUTONOMOUS agent (the heartbeat cron). Unlike
// lib/rwa/vaultClient (which signs through the user's browser wallet), this signs
// with the agent's own key so it can act with no human present.
//
//   - readPortfolioServer(user)  — read any user's vault position over public RPC
//   - executeRebalanceFor(user)  — call vault.rebalanceFor(user, …) as the owner
//
// SECURITY / OPS: executeRebalanceFor needs AGENT_PRIVATE_KEY set to the vault
// OWNER key (the deploy key), and the deployed vault must expose rebalanceFor
// (added in contracts/src/RWAkinsVault.sol — redeploy required). When the key is
// absent, isAgentSignerConfigured() is false and the heartbeat degrades to
// logging a decision + notification WITHOUT a fabricated tx hash. The key lives
// only in the server env and never reaches the client.
import {
  createPublicClient, createWalletClient, formatEther, type Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { VAULT_ABI, RWA_TOKEN_ABI } from './abi'
import deployed from '@/lib/rwa-deployed.json'
import { mantleSepolia, mantleTransport } from './rpc'

export { mantleSepolia }

export const isVaultDeployed = typeof deployed.vault === 'string' && deployed.vault.length === 42

export const publicClient = createPublicClient({ chain: mantleSepolia, transport: mantleTransport() })

/** Normalize a private key from env to the 0x-prefixed form viem expects. */
function agentKey(): `0x${string}` | null {
  const raw = process.env.AGENT_PRIVATE_KEY?.trim()
  if (!raw) return null
  const key = raw.startsWith('0x') ? raw : `0x${raw}`
  return /^0x[0-9a-fA-F]{64}$/.test(key) ? (key as `0x${string}`) : null
}

/**
 * A viem wallet client signing as the agent owner key, plus its account — or null
 * when no key is configured. Shared by the rebalance executor and the oracle sync
 * so both act as the on-chain owner with one code path.
 */
export function getAgentWallet() {
  const key = agentKey()
  if (!key) return null
  const account = privateKeyToAccount(key)
  const wallet = createWalletClient({ account, chain: mantleSepolia, transport: mantleTransport() })
  return { wallet, account }
}

/** True when the heartbeat can actually execute on-chain (key present + vault live). */
export function isAgentSignerConfigured(): boolean {
  return isVaultDeployed && agentKey() !== null
}

/** The agent's on-chain address, or null when no key is configured. */
export function agentAddress(): Address | null {
  const key = agentKey()
  return key ? privateKeyToAccount(key).address : null
}

export interface ServerPortfolio {
  usdyBal: bigint
  methBal: bigint
  usdyBps: bigint
  methBps: bigint
}

/** Read any user's vault position over public RPC (no signing needed). */
export async function readPortfolioServer(user: Address): Promise<ServerPortfolio> {
  const res = (await publicClient.readContract({
    address: deployed.vault as Address,
    abi: VAULT_ABI,
    functionName: 'getPortfolio',
    args: [user],
  })) as readonly [bigint, bigint, bigint, bigint]
  return { usdyBal: res[0], methBal: res[1], usdyBps: res[2], methBps: res[3] }
}

/** Read the on-chain USDY + mETH reported APY (basis points) over the resilient RPC. */
export async function readYieldsServer(): Promise<{ usdyApyBps: number; methApyBps: number }> {
  const [usdy, meth] = await Promise.all([
    publicClient.readContract({ address: deployed.usdy as Address, abi: RWA_TOKEN_ABI, functionName: 'currentYield' }) as Promise<bigint>,
    publicClient.readContract({ address: deployed.meth as Address, abi: RWA_TOKEN_ABI, functionName: 'currentYield' }) as Promise<bigint>,
  ])
  return { usdyApyBps: Number(usdy), methApyBps: Number(meth) }
}

/** Read the live mETH price (USD) the vault values the mETH leg at. */
export async function readMethPriceServer(): Promise<number> {
  const e18 = (await publicClient.readContract({
    address: deployed.vault as Address, abi: VAULT_ABI, functionName: 'methPriceE18',
  })) as bigint
  return Number(e18) / 1e18
}

/**
 * Autonomously rebalance `user` to the target split, signing as the agent owner.
 * Returns the confirmed Mantle tx hash. Throws if no signer is configured — the
 * caller is expected to check isAgentSignerConfigured() first and degrade.
 */
export async function executeRebalanceFor(
  user: Address, usdyBps: number, methBps: number,
): Promise<`0x${string}`> {
  const signer = getAgentWallet()
  if (!signer) throw new Error('AGENT_PRIVATE_KEY not configured')
  const { wallet } = signer
  const hash = await wallet.writeContract({
    address: deployed.vault as Address,
    abi: VAULT_ABI,
    functionName: 'rebalanceFor',
    args: [user, BigInt(usdyBps), BigInt(methBps)],
  })
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

export const toNum = (b: bigint) => Number(formatEther(b))

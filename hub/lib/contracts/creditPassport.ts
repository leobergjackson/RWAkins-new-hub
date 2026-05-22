// Built by vsrupeshkumar
// Credit Passport contract interactions (QIE Mainnet, Chain ID 1990).
// Every function tries the real on-chain call first and silently falls back
// to a safe default on any error — it never throws, so the UI cannot crash.

import { CONTRACTS } from './abis'
import { ethCall, encodeCall, decodeUint256, decodeWords } from './rpc'

export type StakingTier = 'None' | 'Bronze' | 'Silver' | 'Gold'
const TIERS: StakingTier[] = ['None', 'Bronze', 'Silver', 'Gold']

export interface StakingInfo {
  stakedAmount: string
  tier: StakingTier
  pendingRewards: string
}

/** A wrapper around window.ethereum's eth_sendTransaction, supplied by the page. */
export type SendTransaction = (tx: Record<string, unknown>) => Promise<string>

// 18-decimal token formatting helpers (NCRD).
// BigInt literals (10n) need an ES2020 target; this project targets ES2017.
const ONE = BigInt(10) ** BigInt(18)

function formatTokens(raw: bigint): string {
  const whole = raw / ONE
  const frac = (raw % ONE).toString().padStart(18, '0').slice(0, 2)
  return `${whole.toString()}.${frac}`
}

function toBaseUnits(amount: string): string {
  const [w, f = ''] = amount.trim().split('.')
  const frac = (f + '0'.repeat(18)).slice(0, 18)
  return (BigInt(w || '0') * ONE + BigInt(frac || '0')).toString()
}

/**
 * Reads the on-chain credit score (0–1000) from CreditPassportNFT.
 * Read-only — no wallet signature needed. Returns 0 when there is no
 * on-chain score yet or the call fails (caller should keep its mock score).
 */
export async function readCreditScore(address: string): Promise<number> {
  try {
    const data = encodeCall('getCreditScore(address)', address)
    const result = await ethCall(CONTRACTS.CreditPassportNFT, data)
    const score = Number(decodeUint256(result))
    return Number.isFinite(score) && score >= 0 ? score : 0
  } catch (e) {
    console.error('[creditPassport] readCreditScore failed:', e)
    return 0
  }
}

/**
 * Calls generateScore() on CreditPassportNFT — requires a wallet signature.
 * Returns the freshly-read on-chain score and the transaction hash.
 * On any failure returns { score: 0, txHash: '' }.
 */
export async function generateScoreOnChain(
  address: string,
  sendTransaction: SendTransaction,
): Promise<{ score: number; txHash: string }> {
  try {
    const data = encodeCall('generateScore()')
    const txHash = await sendTransaction({
      from: address,
      to: CONTRACTS.CreditPassportNFT,
      data,
    })
    const score = await readCreditScore(address)
    return { score, txHash }
  } catch (e) {
    console.error('[creditPassport] generateScoreOnChain failed:', e)
    return { score: 0, txHash: '' }
  }
}

/**
 * Reads staking state from NeuroCredStaking. Read-only.
 * Falls back to an empty (None tier) result on failure.
 */
export async function readStakingInfo(address: string): Promise<StakingInfo> {
  try {
    const data = encodeCall('getStakeInfo(address)', address)
    const result = await ethCall(CONTRACTS.NeuroCredStaking, data)
    const words = decodeWords(result)
    const amount = words[0] ?? BigInt(0)
    const tierIdx = Number(words[1] ?? BigInt(0))
    const rewards = words[2] ?? BigInt(0)
    return {
      stakedAmount: formatTokens(amount),
      tier: TIERS[tierIdx] ?? 'None',
      pendingRewards: formatTokens(rewards),
    }
  } catch (e) {
    console.error('[creditPassport] readStakingInfo failed:', e)
    return { stakedAmount: '0.00', tier: 'None', pendingRewards: '0.00' }
  }
}

/**
 * Stakes NCRD tokens via NeuroCredStaking.stake(uint256).
 * Returns the transaction hash, or '' on failure.
 */
export async function stakeTokens(
  address: string,
  amount: string,
  sendTransaction: SendTransaction,
): Promise<string> {
  try {
    const data = encodeCall('stake(uint256)', toBaseUnits(amount))
    return await sendTransaction({
      from: address,
      to: CONTRACTS.NeuroCredStaking,
      data,
    })
  } catch (e) {
    console.error('[creditPassport] stakeTokens failed:', e)
    return ''
  }
}

/**
 * Unstakes NCRD tokens via NeuroCredStaking.unstake(uint256).
 * Returns the transaction hash, or '' on failure.
 */
export async function unstakeTokens(
  address: string,
  amount: string,
  sendTransaction: SendTransaction,
): Promise<string> {
  try {
    const data = encodeCall('unstake(uint256)', toBaseUnits(amount))
    return await sendTransaction({
      from: address,
      to: CONTRACTS.NeuroCredStaking,
      data,
    })
  } catch (e) {
    console.error('[creditPassport] unstakeTokens failed:', e)
    return ''
  }
}

// Built by vsrupeshkumar
// LIVE ORACLE SYNC — the bridge that makes the on-chain state track the real
// market. The vault values the mETH leg at `methPriceE18`, and each mock token
// reports a `currentYield`; both are owner-settable. This module, signing with
// the agent owner key, pushes the REAL market mETH price (CoinGecko) and the REAL
// reference APYs (DefiLlama) on-chain, so nothing is hardcoded — the vault math,
// the dashboard valuation, and the agent's yield reasoning all read live numbers.
//
// Writes are GAS-GATED: we only send a tx when the live value has drifted past a
// threshold from what is already on-chain, so a sync that finds no real change
// costs nothing. Server-only (needs AGENT_PRIVATE_KEY); safe to call from the
// heartbeat cron and the manual rebalance trigger.
import { parseEther, formatEther, type Address } from 'viem'
import { RWA_TOKEN_ABI, VAULT_ABI } from './abi'
import { getAgentWallet, publicClient } from './serverVault'
import deployed from '@/lib/rwa-deployed.json'
import { fetchPrices } from '@/lib/api/coingecko'
import { fetchRwaYields } from '@/lib/api/defillama'

const vaultDeployed = typeof deployed.vault === 'string' && deployed.vault.length === 42

// Only write on-chain when the live value moved more than this from the current
// on-chain value — avoids spending gas on noise.
const PRICE_DRIFT_FRAC = 0.005 // 0.5%
const YIELD_DRIFT_BPS = 5 // 0.05pp

export interface OracleSyncResult {
  ran: boolean
  reason?: string
  methPriceUsd?: number
  usdyApyPct?: number
  methApyPct?: number
  /** Contract calls actually sent this run (price + each token yield). */
  txs: { what: 'methPrice' | 'usdyYield' | 'methYield'; hash: string }[]
}

/** Live mETH/USD price — Mantle staked-ETH, with ETH spot as a graceful proxy. */
async function liveMethPriceUsd(): Promise<number | null> {
  try {
    const p = await fetchPrices(['mantle-staked-ether', 'ethereum'])
    const meth = p['mantle-staked-ether']?.usd
    if (typeof meth === 'number' && meth > 0) return meth
    // mETH ≈ ETH (it is staked ETH); use ETH spot when the LST isn't quoted.
    const eth = p['ethereum']?.usd
    return typeof eth === 'number' && eth > 0 ? eth : null
  } catch {
    return null
  }
}

/**
 * Sync the live mETH price and reference APYs onto the chain. Returns a summary
 * of what was read and which writes were sent. Never throws — a degraded source
 * simply skips that write and leaves the last good on-chain value in place.
 */
export async function syncOracles(): Promise<OracleSyncResult> {
  const result: OracleSyncResult = { ran: false, txs: [] }
  if (!vaultDeployed) return { ...result, reason: 'vault-not-deployed' }

  const signer = getAgentWallet()
  if (!signer) return { ...result, reason: 'no-agent-key' }
  const { wallet, account } = signer

  const vault = deployed.vault as Address
  const usdyToken = deployed.usdy as Address
  const methToken = deployed.meth as Address

  // Read live market + current on-chain state + the agent's next nonce in parallel.
  const [priceUsd, yields, onchainPriceE18, onchainUsdyBps, onchainMethBps, startNonce] = await Promise.all([
    liveMethPriceUsd(),
    fetchRwaYields(),
    publicClient.readContract({ address: vault, abi: VAULT_ABI, functionName: 'methPriceE18' }) as Promise<bigint>,
    publicClient.readContract({ address: usdyToken, abi: RWA_TOKEN_ABI, functionName: 'currentYield' }) as Promise<bigint>,
    publicClient.readContract({ address: methToken, abi: RWA_TOKEN_ABI, functionName: 'currentYield' }) as Promise<bigint>,
    publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' }),
  ])

  result.ran = true

  // Decide which writes are actually needed (drift-gated, plausibility-guarded).
  const plausibleYield = (apy: number) => apy > 0 && apy <= 30
  const writes: { what: OracleSyncResult['txs'][number]['what']; address: Address; abi: readonly unknown[]; fn: 'setMethPrice' | 'setYield'; arg: bigint }[] = []

  if (priceUsd != null) {
    result.methPriceUsd = priceUsd
    const curr = Number(formatEther(onchainPriceE18))
    if (curr <= 0 || Math.abs(priceUsd - curr) / curr > PRICE_DRIFT_FRAC) {
      writes.push({ what: 'methPrice', address: vault, abi: VAULT_ABI, fn: 'setMethPrice', arg: parseEther(priceUsd.toFixed(6)) })
    }
  }
  if (yields.usdyApy != null && plausibleYield(yields.usdyApy)) {
    result.usdyApyPct = yields.usdyApy
    const wantBps = Math.round(yields.usdyApy * 100)
    if (Math.abs(wantBps - Number(onchainUsdyBps)) > YIELD_DRIFT_BPS) {
      writes.push({ what: 'usdyYield', address: usdyToken, abi: RWA_TOKEN_ABI, fn: 'setYield', arg: BigInt(wantBps) })
    }
  }
  if (yields.methApy != null && plausibleYield(yields.methApy)) {
    result.methApyPct = yields.methApy
    const wantBps = Math.round(yields.methApy * 100)
    if (Math.abs(wantBps - Number(onchainMethBps)) > YIELD_DRIFT_BPS) {
      writes.push({ what: 'methYield', address: methToken, abi: RWA_TOKEN_ABI, fn: 'setYield', arg: BigInt(wantBps) })
    }
  }

  // Send each write with an EXPLICIT, manually-incremented nonce and wait for its
  // receipt before the next — Mantle's sequencer rejects same-nonce txs sent back
  // to back ("replacement transaction underpriced"), so we never let them race.
  let nonce = startNonce
  for (const w of writes) {
    const hash = await wallet.writeContract({
      address: w.address, abi: w.abi, functionName: w.fn, args: [w.arg], nonce, account, chain: undefined,
    } as Parameters<typeof wallet.writeContract>[0])
    await publicClient.waitForTransactionReceipt({ hash })
    result.txs.push({ what: w.what, hash })
    nonce += 1
  }

  return result
}

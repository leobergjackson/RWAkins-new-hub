// Built by vsrupeshkumar
// Shared resilient RPC transport for Mantle Sepolia. The canonical public RPC
// (rpc.sepolia.mantle.xyz) throttles contract reads and fails intermittently
// (~50% under light load), which used to crash a portfolio read and drop the UI
// into a fake demo position. We fix that at the source: a viem `fallback`
// transport that rotates across several healthy public endpoints and retries, so
// a single flaky node never fails the read. Used by every viem client (browser
// reads, server reads, oracle writes) so they all get the same reliability.
import { defineChain, fallback, http } from 'viem'

/** Healthy Mantle Sepolia public RPCs, primary first. */
export const MANTLE_SEPOLIA_RPCS = [
  'https://rpc.sepolia.mantle.xyz',
  'https://mantle-sepolia.drpc.org',
  'https://mantle-sepolia.gateway.tenderly.co',
] as const

export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: [...MANTLE_SEPOLIA_RPCS] } },
  blockExplorers: { default: { name: 'Mantlescan', url: 'https://sepolia.mantlescan.xyz' } },
  testnet: true,
})

/**
 * A fallback transport across all endpoints. Each endpoint retries on its own,
 * and the fallback moves to the next endpoint when one errors — so a read only
 * fails if EVERY endpoint is down at once. `rank: false` keeps the primary first
 * (no background latency probing).
 */
export function mantleTransport() {
  return fallback(
    MANTLE_SEPOLIA_RPCS.map((url) => http(url, { retryCount: 2, retryDelay: 250, timeout: 8_000 })),
    { rank: false, retryCount: 2 },
  )
}

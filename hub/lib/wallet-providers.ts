// Built by vsrupeshkumar
// Multi-wallet provider discovery for EVM injected wallets.
//
// Problem: when the user has multiple extensions installed (MetaMask + Phantom
// + Coinbase Wallet + Brave Wallet + Backpack ...), all of them race to claim
// `window.ethereum`. The first one to win the race answers every JSON-RPC
// request. If a non-MetaMask provider wins but the user expects MetaMask,
// `eth_requestAccounts` is sent to the wrong wallet — MetaMask never shows a
// popup, the promise hangs, and the user sees "Connection timed out".
//
// Solution: EIP-6963 ("Multi Injected Provider Discovery") — wallets dispatch
// an `eip6963:announceProvider` event when the page broadcasts a
// `eip6963:requestProvider`. We collect every announced provider, optionally
// pick by name (e.g. "MetaMask"), and fall back to a `window.ethereum.providers`
// array, then plain `window.ethereum` as a last resort.

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void
  isMetaMask?: boolean
  isCoinbaseWallet?: boolean
  isBraveWallet?: boolean
  isPhantom?: boolean
  isBackpack?: boolean
}

type Eip6963ProviderInfo = {
  uuid: string
  name: string
  icon: string
  rdns: string
}

type Eip6963ProviderDetail = {
  info: Eip6963ProviderInfo
  provider: Eip1193Provider
}

type Eip6963AnnounceEvent = CustomEvent<Eip6963ProviderDetail>

// Module-level cache of announced providers. Wallets announce on every
// `eip6963:requestProvider` event, so this fills up after the first call.
const announced: Eip6963ProviderDetail[] = []
let listenerInstalled = false

function installListenerOnce(): void {
  if (listenerInstalled || typeof window === 'undefined') return
  window.addEventListener('eip6963:announceProvider', (e) => {
    const detail = (e as Eip6963AnnounceEvent).detail
    if (!detail?.provider) return
    // Dedupe by uuid.
    if (announced.some(p => p.info.uuid === detail.info.uuid)) return
    announced.push(detail)
  })
  listenerInstalled = true
}

/** Trigger every installed wallet to announce itself via EIP-6963. */
function requestProviders(): void {
  if (typeof window === 'undefined') return
  installListenerOnce()
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}

/**
 * Resolve an EVM provider, preferring a named wallet if it's been announced.
 *
 * Resolution order:
 *   1. EIP-6963 announced provider matching `preferredName` (e.g. "MetaMask")
 *   2. Any EIP-6963 announced provider with `isMetaMask` true
 *   3. `window.ethereum.providers[]` entry with `isMetaMask` true (legacy MM)
 *   4. The first entry of `window.ethereum.providers[]` (legacy)
 *   5. `window.ethereum` (last-resort fallback)
 *
 * Returns `undefined` if nothing injected anything — that means no EVM wallet
 * is installed and the caller should send the user to an install page.
 */
export function getEvmProvider(preferredName = 'MetaMask'): Eip1193Provider | undefined {
  if (typeof window === 'undefined') return undefined

  // Fire-and-forget — providers respond synchronously on the same tick.
  requestProviders()

  // 1. Named EIP-6963 match (most reliable for new wallets).
  const byName = announced.find(p =>
    p.info.name.toLowerCase().includes(preferredName.toLowerCase()),
  )
  if (byName) return byName.provider

  // 2. Any EIP-6963 provider that flags itself as MetaMask.
  const byFlag = announced.find(p => p.provider.isMetaMask)
  if (byFlag) return byFlag.provider

  // 3-4. Legacy `window.ethereum.providers[]` array (pre-EIP-6963 wallets
  // that coexist on the same page advertise themselves here).
  const eth = (window as unknown as { ethereum?: Eip1193Provider & { providers?: Eip1193Provider[] } }).ethereum
  if (eth?.providers && eth.providers.length > 0) {
    const mmInProviders = eth.providers.find(p => p.isMetaMask)
    if (mmInProviders) return mmInProviders
    // No specifically-tagged MM — return the first non-Phantom EVM-ish entry.
    const firstNonPhantom = eth.providers.find(p => !p.isPhantom)
    if (firstNonPhantom) return firstNonPhantom
    return eth.providers[0]
  }

  // 5. Last-resort fallback. Could be a single MetaMask install, OR could
  // be Phantom hijacking the slot when MetaMask isn't installed.
  if (eth?.isMetaMask) return eth
  if (eth && !eth.isPhantom) return eth
  return eth
}

/** True if at least one EVM provider is installed on this page. */
export function hasAnyEvmProvider(): boolean {
  if (typeof window === 'undefined') return false
  if (announced.length > 0) return true
  const eth = (window as unknown as { ethereum?: Eip1193Provider & { providers?: Eip1193Provider[] } }).ethereum
  return !!eth
}

/** True if a MetaMask-specific provider is reachable. Used for UX hints. */
export function hasMetaMask(): boolean {
  if (typeof window === 'undefined') return false
  requestProviders()
  if (announced.some(p => p.provider.isMetaMask || p.info.name.toLowerCase().includes('metamask'))) {
    return true
  }
  const eth = (window as unknown as { ethereum?: Eip1193Provider & { providers?: Eip1193Provider[] } }).ethereum
  if (eth?.providers?.some(p => p.isMetaMask)) return true
  return !!eth?.isMetaMask
}

/** Returns the list of all detected EVM providers (for a future picker UI). */
export function listEvmProviders(): Eip6963ProviderDetail[] {
  requestProviders()
  return [...announced]
}

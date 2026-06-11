// Built by vsrupeshkumar
'use client'

import {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode,
} from 'react'
import { NETWORKS } from '@/lib/networks'
import { weiHexToEther } from '@/lib/wallet-utils'
import { getEvmProvider, hasAnyEvmProvider, type Eip1193Provider } from '@/lib/wallet-providers'

// ── Browser wallet typings ────────────────────────────────────────────────────
// Other tool pages declare their own (differing) `window.ethereum` / `window.solana`
// global shapes, so we deliberately avoid augmenting `Window` here and instead
// resolve the providers through narrowly-typed accessors.

type EthereumProvider = Eip1193Provider

interface PhantomProvider {
  isPhantom?: boolean
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>
  disconnect: () => Promise<void>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

// Resolve the EVM provider via EIP-6963 first, falling back to window.ethereum.
// Without this, having multiple wallet extensions installed (Phantom + MetaMask
// + Coinbase Wallet) lets the wrong one win the window.ethereum race — and
// every connect request silently hits a wallet that never shows a popup.
function getEthereum(): EthereumProvider | undefined {
  return getEvmProvider('MetaMask')
}

function getPhantom(): PhantomProvider | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { solana?: PhantomProvider }).solana
}

// ── Timeout helpers ───────────────────────────────────────────────────────────
// Wallet provider requests can hang indefinitely — a MetaMask popup that never
// surfaces, a dead chain RPC, a dismissed prompt. These guards guarantee every
// awaited call settles, so the UI can never stick on "Connecting…".

const RPC_TIMEOUT = 5_000      // data reads: eth_chainId, eth_getBalance, getBalance
const CONNECT_TIMEOUT = 15_000 // user-interaction calls: requestAccounts, chain switch

/** Rejects if `promise` has not settled within `ms` milliseconds. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
      ms,
    )
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EVMWalletState {
  address: string | null
  chainId: number | null
  balance: string | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
}

export interface SolanaWalletState {
  address: string | null
  balance: string | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
}

export interface WalletContextType {
  evm: EVMWalletState
  connectEVM: () => Promise<void>
  disconnectEVM: () => void
  switchToNetwork: (chainIdHex: string, networkKey: string) => Promise<void>

  solana: SolanaWalletState
  connectSolana: () => Promise<void>
  disconnectSolana: () => void

  isAnyWalletConnected: boolean
  activeWalletAddress: string | null

  refreshBalances: () => Promise<void>
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const defaultEVM: EVMWalletState = {
  address: null, chainId: null, balance: null,
  isConnecting: false, isConnected: false, error: null,
}

const defaultSolana: SolanaWalletState = {
  address: null, balance: null,
  isConnecting: false, isConnected: false, error: null,
}

const EVM_STORAGE_KEY = 'kubryx_evm_address'

const WalletContext = createContext<WalletContextType | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [evm, setEvm] = useState<EVMWalletState>(defaultEVM)
  const [solana, setSolana] = useState<SolanaWalletState>(defaultSolana)

  // ─ EVM helpers ─────────────────────────────────────────────────────────────

  async function loadEVMDetails(address: string) {
    // The connection is confirmed the moment we have an account address.
    // Commit it to state + storage FIRST so a failed chainId/balance read
    // (e.g. a flaky or non-standard chain RPC) can never drop the wallet.
    try { localStorage.setItem(EVM_STORAGE_KEY, address) } catch { /* noop */ }
    setEvm(p => ({
      ...p,
      address,
      isConnecting: false,
      isConnected: true,
      error: null,
    }))

    // chainId + balance are best-effort enrichment — failures here must not
    // undo the connection committed above. The address guard prevents a
    // stale in-flight read from clobbering a newer account.
    const eth = getEthereum()
    if (!eth) return
    try {
      const chainIdHex = await withTimeout(
        eth.request({ method: 'eth_chainId' }) as Promise<string>,
        RPC_TIMEOUT, 'eth_chainId',
      )
      setEvm(p => (p.address === address ? { ...p, chainId: parseInt(chainIdHex, 16) } : p))
    } catch { /* keep the connection without a chainId */ }
    try {
      const balanceHex = await withTimeout(
        eth.request({ method: 'eth_getBalance', params: [address, 'latest'] }) as Promise<string>,
        RPC_TIMEOUT, 'eth_getBalance',
      )
      setEvm(p => (p.address === address ? { ...p, balance: weiHexToEther(balanceHex) } : p))
    } catch { /* keep the connection without a balance */ }
  }

  const disconnectEVM = useCallback(() => {
    setEvm(defaultEVM)
    try { localStorage.removeItem(EVM_STORAGE_KEY) } catch { /* noop */ }
  }, [])

  const connectEVM = useCallback(async () => {
    if (!hasAnyEvmProvider()) {
      if (typeof window !== 'undefined') window.open('https://metamask.io/download/', '_blank')
      setEvm(p => ({ ...p, error: 'MetaMask not installed — install it and reload' }))
      return
    }
    const eth = getEthereum()
    if (!eth) {
      setEvm(p => ({ ...p, error: 'Could not reach MetaMask — disable other wallet extensions and retry' }))
      return
    }

    // Wipe any stale saved address — if a previous session left a wallet
    // address that the user has since disconnected in MetaMask, the silent
    // eth_accounts probe returns empty and the UI dead-ends.
    try { localStorage.removeItem(EVM_STORAGE_KEY) } catch { /* noop */ }
    setEvm(p => ({ ...p, isConnecting: true, error: null }))

    // Hard safety net — even if every guard below somehow fails, the UI must
    // never stay stuck on "Connecting…".
    const safetyNet = setTimeout(() => {
      setEvm(p => (p.isConnecting
        ? {
            ...p,
            isConnecting: false,
            error: 'No response from MetaMask — click the extension icon to bring up the popup, or unlock the wallet',
          }
        : p))
    }, CONNECT_TIMEOUT + 3_000)

    try {
      // First, see if MetaMask already has authorised accounts for this site
      // (no popup needed). This handles the case where a stale localStorage
      // wipe above made us think the user was disconnected, but MetaMask
      // still trusts the dApp.
      const existing = await withTimeout(
        eth.request({ method: 'eth_accounts' }) as Promise<string[]>,
        RPC_TIMEOUT,
        'eth_accounts probe',
      ).catch(() => [])
      if (existing && existing.length > 0) {
        await loadEVMDetails(existing[0])
        return
      }

      // Otherwise, prompt the user. eth_requestAccounts opens the MetaMask
      // popup. If a previous request is still pending (code -32002), this
      // immediately rejects rather than hanging — the catch block handles it.
      const accounts = await withTimeout(
        eth.request({ method: 'eth_requestAccounts' }) as Promise<string[]>,
        CONNECT_TIMEOUT,
        'Wallet connection request',
      )
      if (accounts.length > 0) await loadEVMDetails(accounts[0])
      else setEvm(p => ({ ...p, error: 'MetaMask returned no accounts — unlock your wallet and retry' }))
    } catch (e) {
      const code = (e as { code?: number })?.code
      const message = (e as { message?: string })?.message ?? ''
      let error = 'Connection failed — try again'
      if (code === 4001) error = 'You cancelled the request. Click Connect again when ready.'
      else if (code === -32002) error = 'A connection popup is already open — click the MetaMask icon to find it'
      else if (code === -32603) error = 'MetaMask internal error — close the extension and reopen, then retry'
      else if (message.includes('timed out')) error = 'No response from MetaMask — click the extension icon, unlock if locked, then retry'
      else if (message) error = message.slice(0, 120)
      setEvm(p => ({ ...p, error }))
    } finally {
      // Guaranteed reset — the wallet can never be left "Connecting…".
      clearTimeout(safetyNet)
      setEvm(p => (p.isConnecting ? { ...p, isConnecting: false } : p))
    }
  }, [])

  const switchToNetwork = useCallback(async (chainIdHex: string, networkKey: string) => {
    const eth = getEthereum()
    if (!eth) return
    const net = NETWORKS[networkKey as keyof typeof NETWORKS]
    if (!net || net.chainId == null) return

    // Always try wallet_addEthereumChain first.
    // This pushes the correct RPC URL into MetaMask even for users who
    // previously added QIE with a stale/broken URL (e.g. rpc.qie.digital).
    // MetaMask: if chain exists with same config → silent switch.
    //           if chain exists with different RPC → "Update network" prompt.
    //           if chain doesn't exist → "Add network" prompt.
    try {
      await withTimeout(
        eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: net.chainId,
            chainName: net.name,
            rpcUrls: [net.rpcUrl],
            blockExplorerUrls: [net.explorer],
            nativeCurrency: net.currency,
          }],
        }),
        CONNECT_TIMEOUT, 'Add/update network',
      )
    } catch {
      // wallet_addEthereumChain failed (user dismissed or MetaMask rejected) —
      // fall back to a plain switch in case the chain is already correct.
      try {
        await withTimeout(
          eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
          }),
          CONNECT_TIMEOUT, 'Network switch',
        )
      } catch { /* user dismissed or the prompt never settled */ }
    }
  }, [])

  // ─ Solana helpers ──────────────────────────────────────────────────────────

  async function loadSolanaDetails(address: string) {
    // Connection is confirmed — commit it immediately (parity with the EVM path).
    setSolana(p => ({
      ...p, address, isConnecting: false, isConnected: true, error: null,
    }))
    // Balance is best-effort — an AbortController bounds the fetch so it can
    // never hang the connect flow.
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT)
      const res = await fetch(NETWORKS.MANTLE_SEPOLIA.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address],
        }),
        signal: controller.signal,
      })
      clearTimeout(timer)
      const json = await res.json()
      const lamports: number = json?.result?.value ?? 0
      setSolana(p => (p.address === address
        ? { ...p, balance: (lamports / 1e9).toFixed(4) }
        : p))
    } catch { /* keep the connection without a balance */ }
  }

  const disconnectSolana = useCallback(async () => {
    const ph = getPhantom()
    if (ph?.isPhantom) {
      try { await ph.disconnect() } catch { /* noop */ }
    }
    setSolana(defaultSolana)
  }, [])

  const connectSolana = useCallback(async () => {
    const ph = getPhantom()
    if (!ph?.isPhantom) {
      if (typeof window !== 'undefined') window.open('https://phantom.app/', '_blank')
      setSolana(p => ({ ...p, error: 'Phantom not installed — install it and reload' }))
      return
    }
    setSolana(p => ({ ...p, isConnecting: true, error: null }))

    // Hard safety net — the UI must never stay stuck on "Connecting…".
    const safetyNet = setTimeout(() => {
      setSolana(p => (p.isConnecting
        ? {
            ...p,
            isConnecting: false,
            error: 'No response from Phantom — click the extension icon to bring up the popup, or unlock the wallet',
          }
        : p))
    }, CONNECT_TIMEOUT + 3_000)

    try {
      const r = await withTimeout(ph.connect(), CONNECT_TIMEOUT, 'Wallet connection request')
      await loadSolanaDetails(r.publicKey.toString())
    } catch (e) {
      const code = (e as { code?: number })?.code
      const rawMsg = (e as { message?: string })?.message ?? ''
      let error = 'Connection failed — try again'
      if (code === 4001 || /reject|denied|cancel/i.test(rawMsg)) {
        error = 'You cancelled the request. Click Connect again when ready.'
      } else if (rawMsg.includes('timed out')) {
        error = 'No response from Phantom — click the extension icon, unlock if locked, then retry'
      } else if (rawMsg) {
        error = rawMsg.slice(0, 120)
      }
      setSolana(p => ({ ...p, error }))
    } finally {
      // Guaranteed reset.
      clearTimeout(safetyNet)
      setSolana(p => (p.isConnecting ? { ...p, isConnecting: false } : p))
    }
  }, [])

  const refreshBalances = useCallback(async () => {
    if (evm.address) await loadEVMDetails(evm.address)
    if (solana.address) await loadSolanaDetails(solana.address)
     
  }, [evm.address, solana.address])

  // ─ EVM auto-reconnect ──────────────────────────────────────────────────────
  useEffect(() => {
    const eth = getEthereum()
    if (!eth) return
    const saved = localStorage.getItem(EVM_STORAGE_KEY)
    if (!saved) return
    eth
      .request({ method: 'eth_accounts' })
      .then(result => {
        const accounts = result as string[]
        if (accounts.length > 0) loadEVMDetails(accounts[0])
        else disconnectEVM()
      })
      .catch(() => {})
     
  }, [])

  // ─ EVM event listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const eth = getEthereum()
    if (!eth) return

    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[]
      if (!accounts || accounts.length === 0) disconnectEVM()
      else loadEVMDetails(accounts[0])
    }
    const onChain = (...args: unknown[]) => {
      const chainId = parseInt(args[0] as string, 16)
      // Reload full details (chainId + balance) for the newly-selected chain.
      const current = localStorage.getItem(EVM_STORAGE_KEY)
      if (current) loadEVMDetails(current)
      else setEvm(p => (p.isConnected ? { ...p, chainId } : p))
    }

    eth.on('accountsChanged', onAccounts)
    eth.on('chainChanged', onChain)
    return () => {
      eth.removeListener('accountsChanged', onAccounts)
      eth.removeListener('chainChanged', onChain)
    }
     
  }, [])

  // ─ Solana auto-reconnect + listeners ───────────────────────────────────────
  useEffect(() => {
    const ph = getPhantom()
    if (!ph?.isPhantom) return

    ph.connect({ onlyIfTrusted: true })
      .then(r => loadSolanaDetails(r.publicKey.toString()))
      .catch(() => {})

    const onDisconnect = () => setSolana(defaultSolana)
    const onAccountChanged = (...args: unknown[]) => {
      const pk = args[0] as { toString: () => string } | null
      if (pk) loadSolanaDetails(pk.toString())
      else setSolana(defaultSolana)
    }
    ph.on?.('disconnect', onDisconnect)
    ph.on?.('accountChanged', onAccountChanged)
    return () => {
      ph.removeListener?.('disconnect', onDisconnect)
      ph.removeListener?.('accountChanged', onAccountChanged)
    }
     
  }, [])

  return (
    <WalletContext.Provider value={{
      evm, connectEVM, disconnectEVM, switchToNetwork,
      solana, connectSolana, disconnectSolana,
      isAnyWalletConnected: evm.isConnected || solana.isConnected,
      activeWalletAddress: evm.address || solana.address,
      refreshBalances,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be inside WalletProvider')
  return ctx
}

'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { fallbackVaults } from '../../lib/fallback'
import { toast } from '../../lib/toast'
import { loadWallet, persistWallet } from '../../lib/wallet-utils'
import { getExplorerUrl } from '../../lib/explorer'
import DemoBanner from '../components/DemoBanner'
import { SkeletonRow } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import CopyButton from '../components/CopyButton'
import ExecutiveWalkthrough from '../components/ExecutiveWalkthrough'
import CommandPalette from '../components/CommandPalette'

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

type Vault = {
  id?: string
  vaultId?: string
  heir?: string
  owner?: string
  unlockDate?: string
  status?: 'locked' | 'unlocked' | 'claimed' | string
  fileName?: string
  createdAt?: string
}

const QIE_MAINNET = {
  chainId: '0x7C6',
  chainName: 'QIE Mainnet',
  rpcUrls: ['https://rpc.qie.digital'],
  nativeCurrency: { name: 'QIE', symbol: 'QIE', decimals: 18 },
  blockExplorerUrls: ['https://mainnet.qie.digital'],
}

const apiBase = process.env.NEXT_PUBLIC_ETERNALVAULT_API || ''

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function ChainBadge() {
  return (
    <span className="chain-badge">
      <span className="chain-dot" />
      QIE Mainnet
    </span>
  )
}

export default function LegacyPage() {
  const [wallet, setWallet] = useState('')
  const [heir, setHeir] = useState('')
  const [unlockDate, setUnlockDate] = useState('')
  const [unlockCondition, setUnlockCondition] = useState('date')
  const [file, setFile] = useState<File | null>(null)
  const [vaults, setVaults] = useState<Vault[]>([])
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking')
  const [loading, setLoading] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const hasApi = useMemo(() => Boolean(apiBase), [])

  useEffect(() => {
    const saved = loadWallet('evm')
    if (saved) setWallet(saved)
  }, [])

  async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
    if (!apiBase) throw new Error('NEXT_PUBLIC_ETERNALVAULT_API is not configured.')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(`${apiBase}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      return await response.json() as Promise<T>
    } finally {
      clearTimeout(timeout)
    }
  }

  async function connectWallet() {
    try {
      setError('')
      if (!window.ethereum) throw new Error('MetaMask is not installed.')
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [QIE_MAINNET] })
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      const address = accounts[0] || ''
      setWallet(address)
      persistWallet('evm', address)
      toast.success('MetaMask connected')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect MetaMask.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function loadVaults(address: string) {
    try {
      setLoading(true)
      setError('')
      const data = await requestJson<Vault[] | { vaults?: Vault[] }>(`/api/vaults/${address}`)
      setVaults(Array.isArray(data) ? data : data.vaults || [])
      setIsDemo(false)
    } catch {
      setVaults(fallbackVaults as unknown as Vault[])
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }

  async function encryptFile(selected: File) {
    const bytes = await selected.arrayBuffer()
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)
    const rawKey = await crypto.subtle.exportKey('raw', key)
    return {
      name: selected.name,
      type: selected.type,
      size: selected.size,
      iv: Array.from(iv),
      key: btoa(String.fromCharCode(...new Uint8Array(rawKey))),
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    }
  }

  async function createVault(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setLoading(true)
      setError('')
      setMessage('')
      if (!wallet) throw new Error('Connect MetaMask before creating a vault.')
      if (!file) throw new Error('Choose a file to encrypt.')
      if (!heir) throw new Error('Enter an heir wallet address.')
      const encryptedFile = await encryptFile(file)
      await requestJson('/api/vaults/create', {
        method: 'POST',
        body: JSON.stringify({ owner: wallet, heir, file: encryptedFile, unlockDate, unlockCondition }),
      })
      setMessage('Encrypted vault created.')
      toast.success('Vault created on QIE Mainnet')
      setFile(null)
      await loadVaults(wallet)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create vault.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function claimVault(vault: Vault) {
    try {
      setLoading(true)
      setError('')
      await requestJson('/api/vaults/claim', {
        method: 'POST',
        body: JSON.stringify({ vaultId: vault.id || vault.vaultId, heir: wallet }),
      })
      setMessage('Claim submitted.')
      toast.success('Vault claim submitted')
      await loadVaults(wallet)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to claim vault.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function checkHealth() {
      try {
        if (!apiBase) throw new Error('Missing API')
        const data = await requestJson<{ status?: string }>('/health')
        setHealth(data.status === 'ok' ? 'ok' : 'down')
      } catch {
        setHealth('down')
      }
    }
    checkHealth()
  }, [])

  useEffect(() => {
    if (wallet) loadVaults(wallet)
  }, [wallet])

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] || null)
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="eyebrow">EternalVault</p>
          <h1>Legacy Vault</h1>
          <p className="silver-text">Encrypt inheritance files in-browser, assign heirs, and monitor QIE unlock status.</p>
          
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 10, background: isDemo ? 'rgba(255, 255, 255, 0.03)' : 'rgba(34, 197, 94, 0.05)', border: isDemo ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(34, 197, 94, 0.3)', color: isDemo ? '#bbb' : '#22C55E', padding: '4px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isDemo ? '#bbb' : '#22C55E' }} />
              {isDemo ? 'Demo Mode' : 'Live Connection'}
            </span>
            <span style={{ fontSize: 10, background: 'rgba(245, 197, 24, 0.05)', border: '1px solid rgba(245, 197, 24, 0.25)', color: '#F5C518', padding: '4px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5C518' }} />
              Connected to QIE Mainnet
            </span>
          </div>
        </div>
        <div className="hero-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ChainBadge />
          <span className={`health-badge ${health === 'ok' ? 'is-live' : 'is-down'}`}><span className="chain-dot" />{health === 'ok' ? 'Healthy' : health === 'checking' ? 'Checking' : 'Offline'}</span>
          <button className="btn-gold" onClick={connectWallet} aria-label={wallet ? `Connected as ${shortAddress(wallet)}` : 'Connect MetaMask Wallet'}>{wallet ? shortAddress(wallet) : 'Connect MetaMask'}</button>
        </div>
      </section>

      {isDemo && <DemoBanner />}
      {error && <div className="card error-card">{error}</div>}
      {message && <div className="card success-card">{message}</div>}
      {!wallet && <div className="card">Connect MetaMask to create encrypted vaults and see heir claims.</div>}

      <section className="dashboard-grid">
        <form className="card form-panel" onSubmit={createVault}>
          <h2>Create encrypted vault</h2>
          <label>Encrypted file</label>
          <input type="file" onChange={onFileChange} />
          <label>Heir wallet</label>
          <input value={heir} onChange={(event) => setHeir(event.target.value)} placeholder="0x..." />
          <label>Unlock condition</label>
          <select value={unlockCondition} onChange={(event) => setUnlockCondition(event.target.value)}>
            <option value="date">Date based</option>
            <option value="validator">Validator attestation</option>
          </select>
          <label>Unlock date</label>
          <input type="date" value={unlockDate} onChange={(event) => setUnlockDate(event.target.value)} />
          <button className="btn-gold" disabled={loading || !wallet}>{loading ? <span className="spinner" /> : 'Create vault'}</button>
        </form>

        <div className="card">
          <h2>Your vaults</h2>
          <div className="stack-list">
            {loading ? (
              <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
            ) : vaults.length === 0 ? (
              <EmptyState icon="🔒" title="No vaults yet" subtitle="Create your first encrypted vault above." />
            ) : vaults.map((vault, index) => (
              <article className="mini-card" key={vault.id || vault.vaultId || index}>
                <div>
                  <p className="gold-text">{vault.fileName || `Vault ${index + 1}`}</p>
                  <p className="silver-text" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Heir: {vault.heir ? shortAddress(vault.heir) : 'Not assigned'}
                    {vault.heir && <CopyButton text={vault.heir} />}
                    {vault.heir && (
                      <a href={getExplorerUrl('qie', 'address', vault.heir)} target="_blank" rel="noopener noreferrer" className="gold-text" style={{ fontSize: 11 }}>↗</a>
                    )}
                  </p>
                  <p className="silver-text">Unlock: {vault.unlockDate || 'Validator attestation'}</p>
                </div>
                <div className="item-actions">
                  <span className="status-pill">{vault.status || 'locked'}</span>
                  <button className="btn-outline" onClick={() => claimVault(vault)} disabled={!wallet || loading}>Claim</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <ExecutiveWalkthrough />
      <CommandPalette />
    </main>
  )
}

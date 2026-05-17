'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import EmptyState from '../components/EmptyState'
import { loadWallet, persistWallet } from '../../lib/wallet-utils'
import { toast } from '../../lib/toast'

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

type PhantomProvider = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>
  signMessage?: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>
}

type FreighterProvider = {
  isConnected?: () => Promise<boolean>
  getAddress?: () => Promise<string>
  getPublicKey?: () => Promise<string>
  signTransaction?: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
    solana?: PhantomProvider & { isPhantom?: boolean }
    freighter?: FreighterProvider
  }
}

type Health = 'checking' | 'ok' | 'down'

type ActivityItem = {
  id?: string
  timestamp?: string
  tool: string
  action: string
  wallet?: string
}

const tools = [
  { name: 'CreditBlocks', href: '/credit', chain: 'QIE Mainnet', env: process.env.NEXT_PUBLIC_CREDITBLOCKS_API },
  { name: 'Legacy Vault', href: '/legacy', chain: 'QIE Mainnet', env: process.env.NEXT_PUBLIC_ETERNALVAULT_API },
  { name: 'SyncSplit', href: '/split', chain: 'Stellar Testnet', env: process.env.NEXT_PUBLIC_STELLAR_RPC, rpc: true },
  { name: 'AI Lending', href: '/lend', chain: 'Arbitrum', env: process.env.NEXT_PUBLIC_LENDORA_API },
  { name: 'Agent Mesh', href: '/agents', chain: 'Solana Devnet', env: process.env.NEXT_PUBLIC_TRUSTMESH_API },
  { name: 'Shadow OS', href: '/shadow', chain: 'Solana Devnet', env: process.env.NEXT_PUBLIC_SHADOW_API },
  { name: 'Treasury AI', href: '/treasury', chain: 'Solana Devnet', env: process.env.NEXT_PUBLIC_PALMFLOW_API },
  { name: 'Private Vault', href: '/vault', chain: 'Multi-chain', env: process.env.NEXT_PUBLIC_CIPHER_API },
]

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function ChainBadge({ chain }: { chain: string }) {
  return (
    <span className="chain-badge">
      <span className="chain-dot" />
      {chain}
    </span>
  )
}

function StatCard({ label, value, live }: { label: string; value: string | number; live?: boolean }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>{label}</p>
        <span
          title={live ? 'Live data' : 'Fallback / offline'}
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: live ? '#22C55E' : 'rgba(255,255,255,0.25)',
            boxShadow: live ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
          }}
        />
      </div>
      <strong className="gold-text" style={{ fontSize: 28 }}>{value}</strong>
    </div>
  )
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export default function DashboardPage() {
  const pathname = usePathname()
  const [ethWallet, setEthWallet] = useState('')
  const [solWallet, setSolWallet] = useState('')
  const [stellarWallet, setStellarWallet] = useState('')
  const [health, setHealth] = useState<Record<string, Health>>({})
  const [creditScore, setCreditScore] = useState('0')
  const [activeVaults, setActiveVaults] = useState(0)
  const [activeAgents, setActiveAgents] = useState(0)
  const [treasuryBalance, setTreasuryBalance] = useState('0 SOL')
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [liveSources, setLiveSources] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const primaryWallet = useMemo(() => ethWallet || solWallet || stellarWallet, [ethWallet, solWallet, stellarWallet])

  useEffect(() => {
    setEthWallet(loadWallet('evm'))
    setSolWallet(loadWallet('solana'))
    setStellarWallet(loadWallet('stellar'))
  }, [])

  async function connectMetaMask() {
    try {
      setError('')
      if (!window.ethereum) throw new Error('MetaMask is not installed.')
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      const address = accounts[0] || ''
      setEthWallet(address)
      persistWallet('evm', address)
      toast.success('MetaMask connected')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect MetaMask.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function connectPhantom() {
    try {
      setError('')
      if (!window.solana?.isPhantom) throw new Error('Phantom is not installed.')
      const result = await window.solana.connect()
      const address = result.publicKey.toString()
      setSolWallet(address)
      persistWallet('solana', address)
      toast.success('Phantom connected')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect Phantom.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function connectFreighter() {
    try {
      setError('')
      if (!window.freighter) throw new Error('Freighter is not installed.')
      const connected = window.freighter.isConnected ? await window.freighter.isConnected() : true
      if (!connected) throw new Error('Freighter is locked or not connected.')
      const address = window.freighter.getAddress ? await window.freighter.getAddress() : await window.freighter.getPublicKey?.()
      setStellarWallet(address || '')
      persistWallet('stellar', address || '')
      toast.success('Freighter connected')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect Freighter.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function checkOne(tool: typeof tools[number]): Promise<Health> {
    if (!tool.env) return 'down'
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      if (tool.rpc) {
        const res = await fetch(tool.env, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'getHealth', params: {} }),
          signal: controller.signal,
        })
        if (!res.ok) return 'down'
      } else {
        const res = await fetch(`${tool.env}/health`, { signal: controller.signal })
        if (!res.ok) return 'down'
        const data = await res.json().catch(() => ({})) as { status?: string }
        if (data.status && data.status !== 'ok' && data.status !== 'healthy') return 'down'
      }
      return 'ok'
    } catch {
      return 'down'
    } finally {
      clearTimeout(timeout)
    }
  }

  async function loadHealth() {
    setHealth(Object.fromEntries(tools.map((t) => [t.name, 'checking' as Health])))
    const entries = await Promise.all(tools.map(async (t) => [t.name, await checkOne(t)] as const))
    setHealth(Object.fromEntries(entries))
  }

  async function retryOne(tool: typeof tools[number]) {
    setHealth((prev) => ({ ...prev, [tool.name]: 'checking' }))
    const status = await checkOne(tool)
    setHealth((prev) => ({ ...prev, [tool.name]: status }))
  }

  async function loadStats() {
    try {
      setLoading(true)
      setError('')
      const feed: ActivityItem[] = []
      const live: Record<string, boolean> = { credit: false, vaults: false, agents: false, treasury: false }

      const C = process.env.NEXT_PUBLIC_CREDITBLOCKS_API
      const V = process.env.NEXT_PUBLIC_ETERNALVAULT_API
      const A = process.env.NEXT_PUBLIC_TRUSTMESH_API
      const P = process.env.NEXT_PUBLIC_PALMFLOW_API

      const [creditR, vaultR, agentR, treasuryR] = await Promise.allSettled([
        C && ethWallet ? fetch(`${C}/api/score/${ethWallet}`)   : Promise.reject(new Error('no env/wallet')),
        V && ethWallet ? fetch(`${V}/api/vaults/${ethWallet}`)  : Promise.reject(new Error('no env/wallet')),
        A && solWallet ? fetch(`${A}/api/agents/${solWallet}`)  : Promise.reject(new Error('no env/wallet')),
        P && solWallet ? fetch(`${P}/api/treasury/${solWallet}`): Promise.reject(new Error('no env/wallet')),
      ])

      if (creditR.status === 'fulfilled' && creditR.value.ok) {
        const json = await creditR.value.json().catch(() => null) as { score?: string | number } | null
        if (json?.score !== undefined) { setCreditScore(String(json.score)); live.credit = true }
      }
      if (vaultR.status === 'fulfilled' && vaultR.value.ok) {
        const json = await vaultR.value.json().catch(() => null) as unknown
        const vaults = Array.isArray(json) ? json : (json as { vaults?: unknown[] } | null)?.vaults || []
        setActiveVaults(vaults.length); live.vaults = true
        vaults.slice(0, 3).forEach((item, index) => feed.push({ tool: 'Legacy Vault', action: `Vault ${(item as { status?: string }).status || 'active'}`, wallet: ethWallet, id: `vault-${index}` }))
      }
      if (agentR.status === 'fulfilled' && agentR.value.ok) {
        const json = await agentR.value.json().catch(() => null) as unknown
        const agents = Array.isArray(json) ? json : (json as { agents?: unknown[] } | null)?.agents || []
        setActiveAgents(agents.length); live.agents = true
      }
      if (treasuryR.status === 'fulfilled' && treasuryR.value.ok) {
        const json = await treasuryR.value.json().catch(() => null) as { totalBalance?: string; balance?: string } | null
        setTreasuryBalance(json?.totalBalance || json?.balance || '0 SOL'); live.treasury = true
      }
      setLiveSources(live)

      if (process.env.NEXT_PUBLIC_TRUSTMESH_API && solWallet) {
        const agentFeed = await fetchJson<unknown>(`${process.env.NEXT_PUBLIC_TRUSTMESH_API}/api/activity/${solWallet}`).catch(() => null)
        const items = Array.isArray(agentFeed) ? agentFeed : (agentFeed as { activity?: unknown[] } | null)?.activity || []
        items.slice(0, 4).forEach((item, index) => feed.push({ tool: 'Agent Mesh', action: (item as { action?: string }).action || 'Agent action', wallet: solWallet, timestamp: (item as { timestamp?: string }).timestamp, id: `agent-${index}` }))
      }

      const activitySources = [
        { tool: 'Shadow OS', url: process.env.NEXT_PUBLIC_SHADOW_API ? `${process.env.NEXT_PUBLIC_SHADOW_API}/api/activity` : '', wallet: solWallet },
        { tool: 'Treasury AI', url: process.env.NEXT_PUBLIC_PALMFLOW_API && solWallet ? `${process.env.NEXT_PUBLIC_PALMFLOW_API}/api/payroll/${solWallet}` : '', wallet: solWallet },
        { tool: 'Private Vault', url: process.env.NEXT_PUBLIC_CIPHER_API && solWallet ? `${process.env.NEXT_PUBLIC_CIPHER_API}/api/trades/${solWallet}` : '', wallet: solWallet },
      ]

      await Promise.all(activitySources.map(async (source) => {
        if (!source.url) return
        const data = await fetchJson<unknown>(source.url).catch(() => null)
        const items = Array.isArray(data) ? data : (data as { activity?: unknown[]; streams?: unknown[]; trades?: unknown[] } | null)?.activity || (data as { streams?: unknown[] } | null)?.streams || (data as { trades?: unknown[] } | null)?.trades || []
        items.slice(0, 3).forEach((item, index) => feed.push({
          tool: source.tool,
          action: (item as { action?: string; status?: string }).action || (item as { status?: string }).status || 'Activity recorded',
          wallet: source.wallet,
          timestamp: (item as { timestamp?: string; createdAt?: string }).timestamp || (item as { createdAt?: string }).createdAt,
          id: `${source.tool}-${index}`,
        }))
      }))

      setActivity(feed.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || ''))))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard stats.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealth()
    const i = setInterval(() => loadHealth(), 60000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    loadStats()
  }, [ethWallet, solWallet, stellarWallet])

  const navLinkStyle = (href: string) => ({
    color: pathname === href ? '#F5C518' : undefined,
    borderLeft: pathname === href ? '2px solid #F5C518' : '2px solid transparent',
    paddingLeft: 10,
    transition: 'all 0.15s',
  })

  return (
    <main className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Link className="logo" href="/">Kubryx</Link>
        <div className="card wallet-card">
          <h2>Wallets</h2>
          <button className="btn-outline" onClick={connectMetaMask}>{ethWallet ? shortAddress(ethWallet) : 'MetaMask'}</button>
          <button className="btn-outline" onClick={connectPhantom}>{solWallet ? shortAddress(solWallet) : 'Phantom'}</button>
          <button className="btn-outline" onClick={connectFreighter}>{stellarWallet ? shortAddress(stellarWallet) : 'Freighter'}</button>
        </div>
        <nav className="sidebar-nav">
          {tools.map((tool) => (
            <Link key={tool.name} href={tool.href} style={navLinkStyle(tool.href)}>
              {tool.name}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="dashboard-main">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Command Center</p>
            <h1>Unified Dashboard</h1>
            <p className="silver-text">One health, activity, and wallet view across all Kubryx tools.</p>
          </div>
          <button className="btn-gold" onClick={loadStats} disabled={loading}>{loading ? <span className="spinner" /> : 'Refresh'}</button>
        </section>

        {error && <div className="card error-card">{error}</div>}
        {!primaryWallet && <div className="card">Connect at least one wallet to populate personalized stats and activity.</div>}

        <ErrorBoundary label="stats">
          <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <StatCard label="Credit Score"    value={creditScore}     live={liveSources.credit} />
            <StatCard label="Active Vaults"   value={activeVaults}    live={liveSources.vaults} />
            <StatCard label="Active Agents"   value={activeAgents}    live={liveSources.agents} />
            <StatCard label="Treasury Balance" value={treasuryBalance} live={liveSources.treasury} />
          </section>
        </ErrorBoundary>

        <section className="tool-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {tools.map((tool) => (
            <ErrorBoundary key={tool.name} label={tool.name}>
            <article className="card">
              <div className="metric-row">
                <h2>{tool.name}</h2>
                <span className={`health-badge ${health[tool.name] === 'ok' ? 'is-live' : health[tool.name] === 'checking' ? 'is-checking' : 'is-down'}`}>
                  <span className="chain-dot" />
                  {health[tool.name] === 'ok' ? 'Live' : health[tool.name] === 'checking' ? 'Checking…' : 'Offline'}
                </span>
              </div>
              <ChainBadge chain={tool.chain} />
              <div className="item-actions">
                <Link className="btn-outline" href={tool.href}>Open tool</Link>
                <button className="btn-outline" onClick={() => retryOne(tool)} aria-label={`Retry ${tool.name}`}>↻</button>
              </div>
            </article>
            </ErrorBoundary>
          ))}
        </section>

        <section className="card">
          <h2>Unified activity</h2>
          {loading && <span className="spinner" />}
          {!loading && activity.length === 0 && (
            <EmptyState icon="📊" title="No activity yet" subtitle="Recent backend activity appears here after wallets connect." />
          )}
          {activity.map((item, index) => (
            <article className="mini-card" key={item.id || index}>
              <div>
                <p className="gold-text">{item.tool}</p>
                <p>{item.action}</p>
              </div>
              <div className="item-actions">
                <span className="silver-text">{item.wallet ? shortAddress(item.wallet) : 'system'}</span>
                <span className="silver-text">{item.timestamp || 'recent'}</span>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}

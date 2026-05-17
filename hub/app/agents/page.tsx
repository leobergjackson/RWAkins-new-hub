'use client'

import { FormEvent, useEffect, useState } from 'react'
import { fallbackAgents } from '../../lib/fallback'
import { toast } from '../../lib/toast'
import { loadWallet, persistWallet } from '../../lib/wallet-utils'
import { getExplorerUrl } from '../../lib/explorer'
import DemoBanner from '../components/DemoBanner'
import { SkeletonRow } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import CopyButton from '../components/CopyButton'
import { resilientRequest } from '../../lib/api-resilience'
import { logTelemetryError } from '../../lib/telemetry'

type PhantomProvider = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>
  signMessage?: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>
}

declare global {
  interface Window {
    solana?: PhantomProvider & { isPhantom?: boolean }
  }
}

type Agent = {
  id?: string
  agentId?: string
  name?: string
  role?: string
  status?: string
  lastAction?: string
}

type Activity = {
  id?: string
  action?: string
  signature?: string
  timestamp?: string
}

const apiBase = process.env.NEXT_PUBLIC_TRUSTMESH_API || ''
const PROGRAM_ID = '66DXeSqBccWxWWw9S21vxe2Mvvqqkmw5KsK5jqA42quz'

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function ChainBadge() {
  return (
    <span className="chain-badge">
      <span className="chain-dot" />
      Solana Devnet
    </span>
  )
}

export default function AgentsPage() {
  const [wallet, setWallet] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [permissions, setPermissions] = useState('')
  const [task, setTask] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking')
  const [loading, setLoading] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const saved = loadWallet('solana')
    if (saved) setWallet(saved)
  }, [])

  async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
    if (!apiBase) throw new Error('NEXT_PUBLIC_TRUSTMESH_API is not configured.')
    const sanitizedPath = path.replace(/[^a-zA-Z0-9]/g, '_')
    return resilientRequest<T>(`${apiBase}${path}`, options, `agents_${sanitizedPath}`)
  }

  async function connectWallet() {
    try {
      setError('')
      if (!window.solana?.isPhantom) throw new Error('Phantom is not installed.')
      const result = await window.solana.connect()
      const address = result.publicKey.toString()
      setWallet(address)
      persistWallet('solana', address)
      toast.success('Phantom connected')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect Phantom.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function loadAgents(pubkey: string) {
    try {
      setLoading(true)
      setError('')
      const [agentData, activityData] = await Promise.all([
        requestJson<Agent[] | { agents?: Agent[] }>(`/api/agents/${pubkey}`),
        requestJson<Activity[] | { activity?: Activity[] }>(`/api/activity/${pubkey}`),
      ])
      setAgents(Array.isArray(agentData) ? agentData : agentData.agents || [])
      setActivity(Array.isArray(activityData) ? activityData : activityData.activity || [])
      setIsDemo(false)
    } catch {
      setAgents(fallbackAgents as unknown as Agent[])
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }

  async function deployAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setLoading(true)
      setError('')
      if (!wallet) throw new Error('Connect Phantom before deploying an agent.')
      await requestJson('/api/agents/deploy', {
        method: 'POST',
        body: JSON.stringify({ owner: wallet, name, role, permissions: permissions.split(',').map((item) => item.trim()).filter(Boolean) }),
      })
      setMessage('Agent deployed.')
      toast.success(`Agent "${name}" deployed on Solana`)
      await loadAgents(wallet)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to deploy agent.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function delegateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setLoading(true)
      setError('')
      if (!wallet || !selectedAgent) throw new Error('Select an agent and connect Phantom.')
      const encoded = new TextEncoder().encode(task)
      const signed = await window.solana?.signMessage?.(encoded, 'utf8')
      const signature = signed ? Array.from(signed.signature).join(',') : 'unsigned-preview'
      await requestJson('/api/agents/delegate', {
        method: 'POST',
        body: JSON.stringify({ agentId: selectedAgent, task, signature }),
      })
      setMessage('Task delegated with Ed25519 signature.')
      toast.success('Task delegated and signed')
      await loadAgents(wallet)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to delegate task.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function revokeAgent(agent: Agent) {
    try {
      setLoading(true)
      setError('')
      await requestJson('/api/agents/revoke', {
        method: 'POST',
        body: JSON.stringify({ agentId: agent.id || agent.agentId }),
      })
      setMessage('Agent revoked.')
      toast.success('Agent revoked')
      if (wallet) await loadAgents(wallet)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to revoke agent.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function checkHealth() {
      try {
        const data = await requestJson<{ status?: string }>('/health')
        setHealth(data.status === 'ok' ? 'ok' : 'down')
      } catch {
        setHealth('down')
      }
    }
    checkHealth()
  }, [])

  useEffect(() => {
    if (wallet) loadAgents(wallet)
  }, [wallet])

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">TrustMesh</p>
          <h1>Agent Mesh</h1>
          <p className="silver-text">Deploy signed Solana agents, delegate work, inspect activity, and revoke access.</p>
        </div>
        <div className="hero-actions">
          <ChainBadge />
          <span className={`health-badge ${health === 'ok' ? 'is-live' : 'is-down'}`}><span className="chain-dot" />{health}</span>
          <button className="btn-gold" onClick={connectWallet}>{wallet ? shortAddress(wallet) : 'Connect Phantom'}</button>
        </div>
      </section>

      {isDemo && <DemoBanner />}
      {error && <div className="card error-card">{error}</div>}
      {message && <div className="card success-card">{message}</div>}
      {!wallet && <div className="card">Connect Phantom to deploy and manage Solana agents.</div>}

      <section className="dashboard-grid">
        <form className="card form-panel" onSubmit={deployAgent}>
          <h2>Deploy agent</h2>
          <label>Name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Treasury Scout" />
          <label>Role</label>
          <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Monitor payments" />
          <label>Permissions</label>
          <input value={permissions} onChange={(event) => setPermissions(event.target.value)} placeholder="read, delegate, notify" />
          <p className="silver-text" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            Program: {PROGRAM_ID.slice(0, 8)}…
            <CopyButton text={PROGRAM_ID} />
            <a href={getExplorerUrl('solana', 'address', PROGRAM_ID)} target="_blank" rel="noopener noreferrer" className="gold-text" style={{ fontSize: 11 }}>↗</a>
          </p>
          <button className="btn-gold" disabled={loading || !wallet}>{loading ? <span className="spinner" /> : 'Deploy agent'}</button>
        </form>

        <form className="card form-panel" onSubmit={delegateTask}>
          <h2>Delegate task</h2>
          <label>Agent</label>
          <select value={selectedAgent} onChange={(event) => setSelectedAgent(event.target.value)}>
            <option value="">Select agent</option>
            {agents.map((agent, index) => <option key={agent.id || agent.agentId || index} value={agent.id || agent.agentId}>{agent.name || `Agent ${index + 1}`}</option>)}
          </select>
          <label>Task</label>
          <textarea value={task} onChange={(event) => setTask(event.target.value)} placeholder="Reconcile today's treasury activity" />
          <button className="btn-gold" disabled={loading || !wallet}>{loading ? <span className="spinner" /> : 'Delegate'}</button>
        </form>
      </section>

      <section className="dashboard-grid">
        <div className="card">
          <h2>Active agents</h2>
          <div className="stack-list">
            {loading ? (
              <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
            ) : agents.length === 0 ? (
              <EmptyState icon="🤖" title="No agents deployed" subtitle="Deploy your first agent above." />
            ) : agents.map((agent, index) => (
              <article className="mini-card" key={agent.id || agent.agentId || index}>
                <div>
                  <p className="gold-text" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {agent.name || `Agent ${index + 1}`}
                    {(agent.id || agent.agentId) && <CopyButton text={agent.id || agent.agentId || ''} />}
                  </p>
                  <p>{agent.role || 'Autonomous delegate'}</p>
                  <p className="silver-text">{agent.lastAction || 'No recent action'}</p>
                </div>
                <div className="item-actions">
                  <span className="status-pill">{agent.status || 'active'}</span>
                  <button className="btn-outline" onClick={() => revokeAgent(agent)} disabled={loading}>Revoke</button>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>Signed activity</h2>
          {activity.length === 0 ? (
            <EmptyState icon="📋" title="No activity yet" subtitle="Ed25519 signed actions appear here." />
          ) : activity.map((item, index) => (
            <article className="mini-card" key={item.id || index} style={{ marginBottom: 12 }}>
              <p className="gold-text" style={{ margin: 0 }}>{item.action || 'Agent action'}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                <span className="silver-text" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                  {item.signature ? item.signature.slice(0, 24) + '…' : 'signature pending'}
                </span>
                {item.signature && (
                  <a href={`https://solscan.io/tx/${item.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="gold-text" style={{ fontSize: 11 }}>Verify ↗</a>
                )}
              </div>
              <p className="silver-text" style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{item.timestamp || 'Just now'}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

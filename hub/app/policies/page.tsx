// Built by vsrupeshkumar
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSovereignOps } from '../../lib/sovereign-ops'
import { useOrgContext } from '../../lib/org-context'
import ExecutiveWalkthrough from '../components/ExecutiveWalkthrough'
import CommandPalette from '../components/CommandPalette'

interface PolicyItem {
  id: string
  name: string
  category: 'Telemetry Escalation' | 'AI Constraint' | 'Resilience Enforcement' | 'Yield Operations Hub Governance' | 'Simulation Safety'
  description: string
  status: 'active' | 'monitoring' | 'suspended'
  lastViolated: string
  conflictDetected: boolean
}

const DEFAULT_POLICIES: PolicyItem[] = [
  { id: 'pol-01', name: 'SLA-Escalation-900', category: 'Telemetry Escalation', description: 'If RPC response exceeds 900ms, immediately isolate node and redirect standard queries to regional relays.', status: 'active', lastViolated: 'Never', conflictDetected: false },
  { id: 'pol-02', name: 'Agent-Guardrail-USDC', category: 'AI Constraint', description: 'Prevents AI agents from moving more than 50,000 USDC per single block without manual operator co-signatures.', status: 'active', lastViolated: '24 hours ago', conflictDetected: false },
  { id: 'pol-03', name: 'Zero-Metadata-Routing', category: 'Resilience Enforcement', description: 'Force zero-metadata routing key locks on bridge signatures matching suspicious addresses.', status: 'active', lastViolated: 'Never', conflictDetected: false },
  { id: 'pol-04', name: 'Max-Drift-Payroll-15', category: 'Yield Operations Hub Governance', description: 'Automated alarm triggered if drift between Mantle and Mantle multi-sig balances exceeds 15%.', status: 'active', lastViolated: '3 hours ago', conflictDetected: true },
  { id: 'pol-05', name: 'Twin-Isolation-Sandbox', category: 'Simulation Safety', description: 'Enforce complete simulation state isolation to prevent synthetic anomalies from writing to live production databases.', status: 'active', lastViolated: 'Never', conflictDetected: false }
]

export default function PoliciesPage() {
  const { sovereigntyIndex, activeSimulationPolicyId } = useSovereignOps()
  const { currentOrgId, currentWorkspaceId, tenantRiskThresholds } = useOrgContext()

  const [policies, setPolicies] = useState<PolicyItem[]>(DEFAULT_POLICIES)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [replayPolicyId, setReplayPolicyId] = useState<string | null>(null)
  
  // Custom Policy Creation
  const [showAddPolicy, setShowAddPolicy] = useState(false)
  const [newPolicyName, setNewPolicyName] = useState('')
  const [newPolicyDesc, setNewPolicyDesc] = useState('')
  const [newPolicyCat, setNewPolicyCat] = useState<any>('Telemetry Escalation')

  function handleAddPolicy(e: React.FormEvent) {
    e.preventDefault()
    if (!newPolicyName.trim() || !newPolicyDesc.trim()) return

    const item: PolicyItem = {
      id: `pol-${Date.now()}`,
      name: newPolicyName,
      category: newPolicyCat,
      description: newPolicyDesc,
      status: 'active',
      lastViolated: 'Never',
      conflictDetected: Math.random() > 0.8
    }

    setPolicies([item, ...policies])
    setNewPolicyName('')
    setNewPolicyDesc('')
    setShowAddPolicy(false)
  }

  function handleReplayPolicy(id: string) {
    setReplayPolicyId(id)
    setTimeout(() => {
      setReplayPolicyId(null)
    }, 2000)
  }

  const filtered = selectedCategory === 'All' ? policies : policies.filter(p => p.category === selectedCategory)
  const conflictCount = policies.filter(p => p.conflictDetected).length

  return (
    <main className="dashboard-layout" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>
      
      {/* Header Panel */}
      <header style={{ width: '100%', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link className="gold-text" href="/dashboard" style={{ fontSize: 13, textDecoration: 'none' }}>← Dashboard</Link>
            <span style={{ color: '#666', fontSize: 12 }}>/</span>
            <span style={{ fontSize: 13, color: '#aaa' }}>Infrastructure Policies</span>
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📜</span> Infrastructure Policy Registry
          </h1>
        </div>

        <button
          onClick={() => setShowAddPolicy(true)}
          className="btn-gold"
          style={{ padding: '8px 16px', fontSize: 12 }}
        >
          ➕ Register New Policy
        </button>
      </header>

      {/* Conflicts and Guardrails */}
      {conflictCount > 0 && (
        <section 
          style={{
            background: 'rgba(245, 197, 24, 0.06)',
            border: '1px solid rgba(245, 197, 24, 0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <strong style={{ color: '#F5C518', fontSize: 13 }}>POLICY CONFLICT DETECTED</strong>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#ccc' }}>
                Drift rebalancing criteria conflict with maximum gas limitations. Check priority levels.
              </p>
            </div>
          </div>
          <span style={{ fontSize: 10, background: 'rgba(245, 197, 24, 0.15)', color: '#F5C518', padding: '4px 8px', borderRadius: 4, fontWeight: 'bold' }}>
            {conflictCount} Conflicts Active
          </span>
        </section>
      )}

      {/* Category filters */}
      <section style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['All', 'Telemetry Escalation', 'AI Constraint', 'Resilience Enforcement', 'Yield Operations Hub Governance', 'Simulation Safety'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="btn-outline"
            style={{
              padding: '6px 12px',
              fontSize: 11,
              borderColor: selectedCategory === cat ? '#F5C518' : 'rgba(255,255,255,0.08)',
              color: selectedCategory === cat ? '#F5C518' : '#aaa',
              background: selectedCategory === cat ? 'rgba(245,197,24,0.05)' : '#000'
            }}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* Main layout */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
        
        {/* Left Side: Policies list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {filtered.map((pol) => {
            const isReplaying = replayPolicyId === pol.id
            return (
              <article 
                key={pol.id} 
                className="card"
                style={{
                  padding: 16,
                  borderLeft: `4px solid ${pol.conflictDetected ? '#EF4444' : '#F5C518'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{pol.category}</span>
                    <h3 style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: '#fff' }}>{pol.name}</h3>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleReplayPolicy(pol.id)}
                      className="btn-outline"
                      style={{ padding: '4px 10px', fontSize: 11, height: 'auto' }}
                      disabled={isReplaying}
                    >
                      {isReplaying ? '⌛ Replaying...' : '🔄 Replay Policy'}
                    </button>
                    <span 
                      style={{
                        fontSize: 9,
                        background: pol.status === 'active' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                        color: pol.status === 'active' ? '#10B981' : '#EF4444',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        alignSelf: 'center'
                      }}
                    >
                      {pol.status}
                    </span>
                  </div>
                </div>

                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#ccc', lineHeight: 1.4 }}>{pol.description}</p>

                {/* Constraint details */}
                <div style={{ display: 'flex', gap: 16, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10, fontSize: 10, color: '#888' }}>
                  <span>Last Triggered/Violated: <strong style={{ color: '#ccc' }}>{pol.lastViolated}</strong></span>
                  <span>Conflict Risk: <strong style={{ color: pol.conflictDetected ? '#EF4444' : '#10B981' }}>{pol.conflictDetected ? 'High' : 'None'}</strong></span>
                </div>

                {isReplaying && (
                  <div style={{ marginTop: 12, padding: 10, background: '#030303', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 6, fontSize: 10, fontFamily: 'monospace', color: '#F5C518' }}>
                    📡 [REPLAYING CONSTRAINT]: Initializing historical log audit check... Uptime parameters verified nominal.
                  </div>
                )}
              </article>
            )
          })}

        </div>

        {/* Right Side: Constraints metadata & Anomaly mitigation rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🛡️ Active Constraints Metadata</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Rigorous boundary variables verified before executing automated smart contracts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#aaa' }}>Max Multi-Sig Threshold:</span>
                <strong style={{ color: '#fff' }}>USDC 50,000 / block</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#aaa' }}>Max Staking Allocation Drift:</span>
                <strong style={{ color: '#fff' }}>15% boundary</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#aaa' }}>Min Validator Confidence:</span>
                <strong style={{ color: '#fff' }}>85% aggregate score</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#aaa' }}>Sovereignty Index Baseline:</span>
                <strong style={{ color: '#fff' }}>90% required</strong>
              </div>
            </div>
          </article>

        </div>

      </section>

      {/* Add Policy Modal */}
      {showAddPolicy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card" style={{ width: '90%', maxWidth: 450, padding: 24, border: '1px solid rgba(245,197,24,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Register New Policy Constraint</h3>
              <button onClick={() => setShowAddPolicy(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAddPolicy} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Constraint Name</label>
                <input 
                  type="text"
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  placeholder="e.g. Max-Gas-Cap-Mantle"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Policy Category</label>
                <select 
                  value={newPolicyCat}
                  onChange={(e) => setNewPolicyCat(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none' }}
                >
                  <option value="Telemetry Escalation">Telemetry Escalation</option>
                  <option value="AI Constraint">AI Constraint</option>
                  <option value="Resilience Enforcement">Resilience Enforcement</option>
                  <option value="Yield Operations Hub Governance">Yield Operations Hub Governance</option>
                  <option value="Simulation Safety">Simulation Safety</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Description</label>
                <textarea 
                  value={newPolicyDesc}
                  onChange={(e) => setNewPolicyDesc(e.target.value)}
                  placeholder="Detail the automated boundaries or failover paths..."
                  required
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none', resize: 'none' }}
                />
              </div>

              <button
                type="submit"
                className="btn-gold"
                style={{ padding: '10px', fontSize: 12, fontWeight: 'bold', marginTop: 8 }}
              >
                Register Policy
              </button>
            </form>
          </div>
        </div>
      )}

      <ExecutiveWalkthrough />
      <CommandPalette />
    </main>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSovereignOps, ProposalType } from '../../lib/sovereign-ops'
import { useOrgContext } from '../../lib/org-context'
import { useGlobalOperations } from '../../lib/global-operations-engine'
import ExecutiveWalkthrough from '../components/ExecutiveWalkthrough'
import CommandPalette from '../components/CommandPalette'

export default function GovernancePage() {
  const { proposals, sovereigntyIndex, consensusStability, quorumIntegrity, castVote, simulateVoting, proposePolicy } = useSovereignOps()
  const { currentOrgId, currentWorkspaceId, organizations } = useOrgContext()

  // Sync to Global state layer
  const { publish, consensusIndex } = useGlobalOperations()

  // Form State
  const [propTitle, setPropTitle] = useState('')
  const [propDesc, setPropDesc] = useState('')
  const [propType, setPropType] = useState<ProposalType>('treasury_rebalancing')
  const [propRationale, setPropRationale] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const activeOrg = organizations.find(o => o.id === currentOrgId) || organizations[0]
  const activeWorkspace = activeOrg.workspaces.find(w => w.id === currentWorkspaceId) || activeOrg.workspaces[0]

  const activeProposals = proposals.filter(p => p.status === 'voting' || p.status === 'draft')
  const historicalProposals = proposals.filter(p => p.status === 'passed' || p.status === 'failed' || p.status === 'executed')

  function handleCreateProposal(e: React.FormEvent) {
    e.preventDefault()
    if (!propTitle.trim() || !propDesc.trim()) return
    proposePolicy(propTitle, propDesc, propType, propRationale || 'Operator designated policy re-sync.')
    
    // Sync to Event Bus
    publish(
      'kubryx_governance_vote',
      JSON.stringify({ title: propTitle, type: propType }),
      `Dispatched new policy proposal KIP: "${propTitle}"`
    )

    setPropTitle('')
    setPropDesc('')
    setPropRationale('')
    setShowCreateModal(false)
  }

  function handleVote(id: string, support: boolean) {
    castVote(id, support)
    publish(
      'kubryx_governance_vote',
      JSON.stringify({ proposalId: id, support }),
      `Cast ballot for KIP proposal: ${support ? 'APPROVE' : 'REJECT'}`
    )
  }

  function handleSimulate(id: string) {
    simulateVoting(id)
    publish(
      'kubryx_governance_vote',
      JSON.stringify({ proposalId: id, fastForward: true }),
      `Simulated high-throughput quorum verification run for KIP-${id.split('-')[1]}`
    )
  }

  return (
    <main className="dashboard-layout" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>
      
      {/* Header Panel */}
      <header style={{ width: '100%', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link className="gold-text" href="/dashboard" style={{ fontSize: 13, textDecoration: 'none' }}>◀ Dashboard</Link>
            <span style={{ color: '#666', fontSize: 12 }}>/</span>
            <span style={{ fontSize: 13, color: '#aaa' }}>Governance Center</span>
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🏛️</span> Protocol Governance Center
          </h1>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-gold"
          style={{ padding: '8px 16px', fontSize: 12 }}
        >
          ➕ Submit Proposal KIP
        </button>
      </header>

      {/* Quorum and Stability Indicators */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
        
        <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Global Consensus Index</span>
            <strong style={{ display: 'block', fontSize: 28, fontWeight: 800, marginTop: 4, color: '#F5C518' }}>
              {consensusIndex}%
            </strong>
          </div>
          <span style={{ fontSize: 9, color: '#888', marginTop: 10 }}>Synchronized Global Operational Confidence Score</span>
        </article>

        <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Infrastructure Sovereignty</span>
            <strong style={{ display: 'block', fontSize: 28, fontWeight: 800, marginTop: 4, color: '#F5C518' }}>
              {sovereigntyIndex}%
            </strong>
          </div>
          <span style={{ fontSize: 9, color: '#888', marginTop: 10 }}>Sovereign Autonomy Confidence Rate</span>
        </article>

        <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Consensus Stability</span>
            <strong style={{ display: 'block', fontSize: 28, fontWeight: 800, marginTop: 4, color: consensusStability > 80 ? '#10B981' : '#EF4444' }}>
              {consensusStability}%
            </strong>
          </div>
          <span style={{ fontSize: 9, color: '#888', marginTop: 10 }}>Active Validator synchronization balance</span>
        </article>

        <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quorum Integrity</span>
            <strong style={{ display: 'block', fontSize: 28, fontWeight: 800, marginTop: 4, color: '#fff' }}>
              {quorumIntegrity}%
            </strong>
          </div>
          <span style={{ fontSize: 9, color: '#888', marginTop: 10 }}>Decentralized Multi-Sig quorum health</span>
        </article>

      </section>

      {/* Cross-Region Policy Influence Mapping */}
      <section className="card" style={{ padding: 18, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🌍 Cross-Region Policy Weight Distribution</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
          Validator weights mapped statefully across our primary multi-region quorums to enforce localized compliance constraints.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <strong style={{ color: '#fff' }}>Singapore (ap-southeast-1)</strong>
              <span style={{ color: '#F5C518' }}>30% Weight</span>
            </div>
            <div style={{ height: 4, background: '#0a0a0a', borderRadius: 2, marginTop: 6 }}>
              <div style={{ width: '30%', background: '#F5C518', height: '100%' }} />
            </div>
          </div>

          <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <strong style={{ color: '#fff' }}>Frankfurt (eu-central-1)</strong>
              <span style={{ color: '#F5C518' }}>25% Weight</span>
            </div>
            <div style={{ height: 4, background: '#0a0a0a', borderRadius: 2, marginTop: 6 }}>
              <div style={{ width: '25%', background: '#F5C518', height: '100%' }} />
            </div>
          </div>

          <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <strong style={{ color: '#fff' }}>Tokyo (ap-northeast-1)</strong>
              <span style={{ color: '#F5C518' }}>20% Weight</span>
            </div>
            <div style={{ height: 4, background: '#0a0a0a', borderRadius: 2, marginTop: 6 }}>
              <div style={{ width: '20%', background: '#F5C518', height: '100%' }} />
            </div>
          </div>

          <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <strong style={{ color: '#fff' }}>Virginia (us-east-1)</strong>
              <span style={{ color: '#F5C518' }}>15% Weight</span>
            </div>
            <div style={{ height: 4, background: '#0a0a0a', borderRadius: 2, marginTop: 6 }}>
              <div style={{ width: '15%', background: '#F5C518', height: '100%' }} />
            </div>
          </div>

          <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <strong style={{ color: '#fff' }}>Mumbai (ap-south-1)</strong>
              <span style={{ color: '#F5C518' }}>10% Weight</span>
            </div>
            <div style={{ height: 4, background: '#0a0a0a', borderRadius: 2, marginTop: 6 }}>
              <div style={{ width: '10%', background: '#F5C518', height: '100%' }} />
            </div>
          </div>

        </div>
      </section>

      {/* Main Governance Grid Layout */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 24 }}>
        
        {/* Left Side: Active Proposals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🗳️ Active Infrastructure Proposals</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Dynamic KIP policies awaiting operator quorums or voting propagation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeProposals.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', opacity: 0.6 }}>
                  <span style={{ fontSize: 32 }}>⬡</span>
                  <p style={{ margin: '6px 0 0', fontSize: 12 }}>No active proposals pending. System fully synchronized.</p>
                </div>
              ) : (
                activeProposals.map((prop) => {
                  const totalVotes = prop.votesFor + prop.votesAgainst
                  const forPercent = totalVotes > 0 ? (prop.votesFor / totalVotes) * 100 : 0
                  return (
                    <div 
                      key={prop.id}
                      style={{
                        padding: 16,
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: 8
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                        <div>
                          <span style={{ fontSize: 9, background: 'rgba(245,197,24,0.06)', color: '#F5C518', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', fontWeight: 'bold' }}>
                            {prop.type.replace('_', ' ')}
                          </span>
                          <h4 style={{ margin: '6px 0 2px', fontSize: 14, fontWeight: 700, color: '#fff' }}>{prop.title}</h4>
                          <span style={{ fontSize: 10, color: '#888' }}>Proposer: <strong style={{ color: '#ccc' }}>{prop.proposer}</strong></span>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleVote(prop.id, true)}
                            className="btn-gold"
                            style={{ padding: '4px 10px', fontSize: 11, height: 'auto' }}
                          >
                            Vote For
                          </button>
                          <button
                            onClick={() => handleVote(prop.id, false)}
                            className="btn-outline"
                            style={{ padding: '4px 10px', fontSize: 11, height: 'auto' }}
                          >
                            Vote Against
                          </button>
                          <button
                            onClick={() => handleSimulate(prop.id)}
                            className="btn-outline"
                            style={{ padding: '4px 10px', fontSize: 11, height: 'auto', color: '#F5C518', borderColor: 'rgba(245,197,24,0.3)' }}
                          >
                            ⚡ Fast-Forward
                          </button>
                        </div>
                      </div>

                      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#ccc', lineHeight: 1.4 }}>{prop.description}</p>
                      
                      {/* Voting progress bar */}
                      <div style={{ margin: '12px 0 8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginBottom: 4 }}>
                          <span>Votes FOR: {prop.votesFor.toLocaleString()} ({forPercent.toFixed(1)}%)</span>
                          <span>Quorum: {totalVotes.toLocaleString()} / {prop.quorumRequired.toLocaleString()}</span>
                        </div>
                        <div style={{ height: 6, background: '#0a0a0a', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${forPercent}%`, background: '#F5C518', height: '100%' }} />
                          <div style={{ width: `${100 - forPercent}%`, background: 'rgba(255,255,255,0.05)', height: '100%' }} />
                        </div>
                      </div>

                      {/* Rationale & Lineage */}
                      <div style={{ padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 6, fontSize: 10, marginTop: 10 }}>
                        <strong style={{ color: '#888', textTransform: 'uppercase', fontSize: 9 }}>ZK Policy Rationale</strong>
                        <p style={{ margin: '2px 0 8px', color: '#aaa' }}>{prop.rationale}</p>
                        
                        <strong style={{ color: '#888', textTransform: 'uppercase', fontSize: 9, display: 'block', marginBottom: 4 }}>Decision Lineage</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, color: '#666', fontFamily: 'monospace' }}>
                          {prop.decisionLineage.map((step, idx) => (
                            <span key={idx}>✔ {step}</span>
                          ))}
                        </div>
                      </div>

                    </div>
                  )
                })
              )}
            </div>
          </article>

        </div>

        {/* Right Side: Propose form and Historical Governance Audit Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🔍 Governance History & Audits</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Historical records of passed and executed corporate policy triggers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {historicalProposals.map((prop) => (
                <div 
                  key={prop.id}
                  style={{
                    padding: 12,
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: 6,
                    fontSize: 11
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ color: '#fff' }}>KIP {prop.id.split('-')[1]}</strong>
                    <span 
                      style={{ 
                        fontSize: 8, 
                        background: prop.status === 'executed' ? 'rgba(16,185,129,0.06)' : 'rgba(245,197,24,0.06)', 
                        color: prop.status === 'executed' ? '#10B981' : '#F5C518', 
                        padding: '1px 5px', 
                        borderRadius: 4,
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}
                    >
                      {prop.status}
                    </span>
                  </div>
                  <span style={{ display: 'block', color: '#aaa', fontSize: 11 }}>{prop.title}</span>
                  <span style={{ display: 'block', fontSize: 9, color: '#555', marginTop: 4 }}>Executed on {new Date(prop.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </article>

        </div>

      </section>

      {/* Submit Proposal Modal overlay */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card" style={{ width: '90%', maxWidth: 500, padding: 24, border: '1px solid rgba(245,197,24,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Submit Sovereign Governance KIP</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateProposal} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Proposal Title</label>
                <input 
                  type="text"
                  value={propTitle}
                  onChange={(e) => setPropTitle(e.target.value)}
                  placeholder="e.g. KIP-27: Hardening Arbitrum Bridge"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Policy Category</label>
                <select 
                  value={propType}
                  onChange={(e) => setPropType(e.target.value as ProposalType)}
                  style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none' }}
                >
                  <option value="treasury_rebalancing">Treasury Rebalancing</option>
                  <option value="protocol_migration">Protocol Migration</option>
                  <option value="rpc_upgrades">RPC Infrastructure Upgrade</option>
                  <option value="telemetry_escalation">Telemetry Escalation Policy</option>
                  <option value="security_hardening">Security Hardening Directive</option>
                  <option value="ai_rule_changes">AI Coordination Rule Change</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Description</label>
                <textarea 
                  value={propDesc}
                  onChange={(e) => setPropDesc(e.target.value)}
                  placeholder="Summarize the dynamic operations proposal details..."
                  required
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none', resize: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Governance Rationale</label>
                <input 
                  type="text"
                  value={propRationale}
                  onChange={(e) => setPropRationale(e.target.value)}
                  placeholder="Provide zero-knowledge verification proof why this is necessary..."
                  style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none' }}
                />
              </div>

              <button
                type="submit"
                className="btn-gold"
                style={{ padding: '10px', fontSize: 12, fontWeight: 'bold', marginTop: 8 }}
              >
                Propagate KIP Proposal
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

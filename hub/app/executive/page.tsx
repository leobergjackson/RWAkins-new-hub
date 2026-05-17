'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSovereignOps } from '../../lib/sovereign-ops'
import { useEconomicOps } from '../../lib/economic-ops'
import { useGlobalMemory } from '../../lib/global-memory'
import { usePlatformState } from '../../lib/platform-engine'
import { useAutonomousOps } from '../../lib/autonomous-ops'
import { useCognition } from '../../lib/cognition-engine'
import { useFabric } from '../../lib/fabric-engine'
import { useGlobalOperations } from '../../lib/global-operations-engine'
import ExecutiveWalkthrough from '../components/ExecutiveWalkthrough'
import CommandPalette from '../components/CommandPalette'

export default function ExecutivePage() {
  const { proposals, sovereigntyIndex, consensusStability, quorumIntegrity, threats, toggleThreat } = useSovereignOps()
  const { treasuryEquilibriumIndex, treasuryPressureLevel, rebalanceIncentives } = useEconomicOps()
  const { snapshots: memSnapshots, restoreSnapshot: memRestore } = useGlobalMemory()
  const { activeScenario, currentMode } = usePlatformState()
  const { operationalRiskScore, infrastructureConfidenceScore } = useAutonomousOps()

  // Cognition Engine integrations
  const { livingTelemetry, clusters, chronicle, ecosystemScore, orchestrationPressure, healingSimulationActive, archiveMaturityEpoch, triggerSelfHealing } = useCognition()

  // Fabric Engine integrations
  const { regions, compatibility, maturityScore, ecosystemTrustForecast, failoverInProgress, toggleOutage } = useFabric()

  // Global Operations State Synchronization Hook
  const { 
    consensusIndex, 
    infrastructureHealth, 
    driftIndex, 
    aiConfidence, 
    events: globalEvents, 
    takeSnapshot: globalTakeSnapshot, 
    restoreSnapshot: globalRestoreSnapshot,
    snapshots: globalCheckpoints 
  } = useGlobalOperations()

  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null)
  
  // Custom Epoch Form
  const [epochNameInput, setEpochNameInput] = useState('')
  const [epochSummaryInput, setEpochSummaryInput] = useState('')
  const [showEpochModal, setShowEpochModal] = useState(false)

  // Custom Snapshot Name Form
  const [snapNameInput, setSnapNameInput] = useState('')

  function handleRestore(id: string) {
    globalRestoreSnapshot(id)
    setSelectedSnapshotId(id)
    setTimeout(() => {
      setSelectedSnapshotId(null)
    }, 2000)
  }

  function handleTakeSnapshot(e: React.FormEvent) {
    e.preventDefault()
    if (!snapNameInput.trim()) return
    globalTakeSnapshot(snapNameInput)
    setSnapNameInput('')
  }

  function handleArchiveEpoch(e: React.FormEvent) {
    e.preventDefault()
    if (!epochNameInput.trim() || !epochSummaryInput.trim()) return
    archiveMaturityEpoch(epochNameInput, epochSummaryInput)
    setEpochNameInput('')
    setEpochSummaryInput('')
    setShowEpochModal(false)
  }

  const activePolicyQueueCount = proposals.filter(p => p.status === 'voting').length
  const activeThreatsCount = threats.filter(t => t.compromiseSimulationActive).length

  return (
    <main className="dashboard-layout" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>
      
      {/* Header Panel */}
      <header style={{ width: '100%', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link className="gold-text" href="/dashboard" style={{ fontSize: 13, textDecoration: 'none' }}>◀ Dashboard</Link>
            <span style={{ color: '#666', fontSize: 12 }}>/</span>
            <span style={{ fontSize: 13, color: '#aaa' }}>Executive Control Board</span>
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>👑</span> Sovereign Executive Command Board
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={triggerSelfHealing}
            className="btn-outline"
            style={{ padding: '8px 16px', fontSize: 12, borderColor: 'rgba(16,185,129,0.3)', color: '#10B981' }}
            disabled={healingSimulationActive}
          >
            {healingSimulationActive ? '🧬 Healing System...' : '🛡️ Trigger Self-Healing'}
          </button>
          <button
            onClick={() => setShowEpochModal(true)}
            className="btn-outline"
            style={{ padding: '8px 16px', fontSize: 12 }}
          >
            ✍️ Archive Maturity Epoch
          </button>
          <button
            onClick={rebalanceIncentives}
            className="btn-gold"
            style={{ padding: '8px 16px', fontSize: 12 }}
          >
            ⚖️ Balance Incentives
          </button>
        </div>
      </header>

      {/* Global Consensus Monitor & Stability Meter Dashboard */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 24 }}>
        
        {/* Consensus Stability Meter */}
        <article className="card" style={{ padding: 18, display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.01)', border: '4px solid rgba(245,197,24,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Consensus</span>
            <strong style={{ fontSize: 22, fontWeight: 800, color: '#F5C518' }}>{consensusIndex}%</strong>
            <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '4px solid #F5C518', borderRightColor: 'transparent', borderBottomColor: 'transparent', transform: `rotate(${consensusIndex * 3.6}deg)`, transition: 'transform 0.5s ease' }} />
          </div>

          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Global Consensus Stability Monitor</span>
            <h3 style={{ margin: '4px 0', fontSize: 18, fontWeight: 800, color: '#fff' }}>Sovereign Sync Network Status</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#aaa', lineHeight: 1.4 }}>
              Authoritative operational confidence metric computed dynamically across multi-region quorums, ledger synchronization trust, and AI validation backoffs.
            </p>
          </div>
        </article>

        {/* Operational Drift Detection */}
        <article className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operational Drift Detection</span>
              <span style={{ fontSize: 9, background: 'rgba(239,68,68,0.08)', color: '#EF4444', padding: '2px 6px', borderRadius: 4 }}>ACTIVE WAVE</span>
            </div>
            <strong style={{ display: 'block', fontSize: 26, fontWeight: 800, marginTop: 6, color: '#fff' }}>
              ±{driftIndex}% drift rate
            </strong>
          </div>
          <span style={{ fontSize: 10, color: '#888' }}>Sinusoidal fluctuation targeting APY sweep boundaries.</span>
        </article>

      </section>

      {/* Living Infrastructure Telemetry Dashboard Indicators */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        
        <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sovereignty & Ecosystem</span>
            <strong style={{ display: 'block', fontSize: 28, fontWeight: 800, marginTop: 4, color: '#F5C518' }}>
              {sovereigntyIndex}% / {ecosystemScore}%
            </strong>
          </div>
          <span style={{ fontSize: 9, color: '#888', marginTop: 10 }}>Sovereign Index & Interdependency Health</span>
        </article>

        <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mempool Pressure</span>
            <strong style={{ display: 'block', fontSize: 28, fontWeight: 800, marginTop: 4, color: '#fff' }}>
              {livingTelemetry.mempoolPressure} TPS
            </strong>
          </div>
          <span style={{ fontSize: 9, color: '#888', marginTop: 10 }}>Entropy Index: <strong style={{ color: '#ccc' }}>{livingTelemetry.entropyIndex}%</strong></span>
        </article>

        <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orchestration Pressure</span>
            <strong style={{ display: 'block', fontSize: 28, fontWeight: 800, marginTop: 4, color: '#10B981' }}>
              {orchestrationPressure}%
            </strong>
          </div>
          <span style={{ fontSize: 9, color: '#888', marginTop: 10 }}>Stabilization Forecast: <strong style={{ color: '#F5C518' }}>{livingTelemetry.stabilizationForecast}%</strong></span>
        </article>

        <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Maturity & Trust Forecast</span>
            <strong style={{ display: 'block', fontSize: 28, fontWeight: 800, marginTop: 4, color: '#F5C518' }}>
              {maturityScore}% / {ecosystemTrustForecast}%
            </strong>
          </div>
          <span style={{ fontSize: 9, color: '#888', marginTop: 10 }}>Active Failovers: <strong style={{ color: failoverInProgress ? '#EF4444' : '#10B981' }}>{failoverInProgress ? 'YES (Rerouting)' : 'None'}</strong></span>
        </article>

      </section>

      {/* Deployment Realism Zone Mapping Map */}
      <section className="card" style={{ padding: 18, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🌍 Active Deployment Zones & Infrastructure Regions</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
          Real-time RPC latency mapping, geo-balancing resilience scores, and simulated regional outage controllers.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {regions.map((region) => (
            <div 
              key={region.name}
              style={{
                padding: 14,
                background: region.status === 'outage' ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.01)',
                border: region.status === 'outage' ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.03)',
                borderRadius: 6,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 8
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13, color: '#fff' }}>{region.name}</strong>
                  <span style={{ fontSize: 9, color: '#888', fontFamily: 'monospace' }}>{region.zone}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 8 }}>
                  <span style={{ color: '#888' }}>Latency:</span>
                  <strong style={{ color: region.status === 'outage' ? '#EF4444' : '#10B981' }}>
                    {region.status === 'outage' ? 'OFFLINE' : `${region.latency}ms`}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                  <span style={{ color: '#888' }}>Resilience:</span>
                  <strong style={{ color: '#aaa' }}>{region.resilienceScore}%</strong>
                </div>

                <div style={{ fontSize: 10, color: '#666', marginTop: 4, fontFamily: 'monospace' }}>
                  Failover Target: {region.failoverTarget}
                </div>
              </div>

              <button
                onClick={() => toggleOutage(region.name)}
                className="btn-outline"
                style={{
                  padding: '4px',
                  fontSize: 10,
                  width: '100%',
                  borderColor: region.status === 'outage' ? '#10B981' : 'rgba(239,68,68,0.25)',
                  color: region.status === 'outage' ? '#10B981' : '#EF4444',
                  marginTop: 6
                }}
              >
                {region.status === 'outage' ? '🔌 Power On Region' : '💥 Simulate Outage'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Main Panel Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 24 }}>
        
        {/* Left Side: Living behaviors, cognition, and graphs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Sovereign state timeline stream */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>⛓️ Sovereign Global Event Bus Timeline</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Continuous, event-driven ledger stream logging governance proposals, regional shifts, and webhook playground dispatches.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto', paddingRight: 6 }}>
              {globalEvents.map((evt) => (
                <div 
                  key={evt.id} 
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.01)',
                    borderLeft: '2px solid #F5C518',
                    borderRadius: '0 6px 6px 0',
                    fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', color: '#F5C518', fontSize: 10 }}>[{evt.type}]</span>
                    <span style={{ fontSize: 9, color: '#666' }}>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ color: '#fff' }}>{evt.description}</div>
                </div>
              ))}
            </div>
          </article>

          {/* Distributed Cognition & situational awareness */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🧠 Distributed Operational Cognition Layer</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Specialized heuristic reasoning clusters scanning active network events and prioritizations.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {clusters.map((cluster) => (
                <div 
                  key={cluster.id}
                  style={{
                    padding: 14,
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: '#fff' }}>{cluster.nodeName}</strong>
                    <span style={{ fontSize: 10, background: 'rgba(245,197,24,0.06)', color: '#F5C518', padding: '2px 6px', borderRadius: 4 }}>
                      Cognition Confidence: {cluster.cognitionScore}%
                    </span>
                  </div>

                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                    <span>Prioritized Threat/Anomaly: </span>
                    <strong style={{ color: '#F5C518' }}>{cluster.prioritizedAnomaly}</strong>
                  </div>

                  <div style={{ fontSize: 10, color: '#777', fontFamily: 'monospace', marginTop: 6, padding: '4px 8px', background: '#040404', borderRadius: 4 }}>
                    Heuristic Rule: {cluster.heuristicRule}
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Living Volatility & Drift Graphs */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>📈 Live Volatility & Drift Indicators</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Continuous telemetry fluctuations reflecting mempool capacity waves and RPC congestion indexes.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              
              <div style={{ background: '#030303', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 6, padding: 12 }}>
                <span style={{ fontSize: 10, color: '#888' }}>Validator Reliability Drift</span>
                <strong style={{ display: 'block', fontSize: 20, color: '#fff', margin: '4px 0' }}>
                  {livingTelemetry.validatorParticipation}%
                </strong>
                <div style={{ height: 4, background: '#0a0a0a', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${livingTelemetry.validatorParticipation}%`, background: '#F5C518', height: '100%' }} />
                </div>
              </div>

              <div style={{ background: '#030303', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 6, padding: 12 }}>
                <span style={{ fontSize: 10, color: '#888' }}>RPC Fluctuation Rate</span>
                <strong style={{ display: 'block', fontSize: 20, color: '#fff', margin: '4px 0' }}>
                  +{livingTelemetry.rpcFluctuationRate}ms drift
                </strong>
                <div style={{ height: 4, background: '#0a0a0a', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, livingTelemetry.rpcFluctuationRate * 1.5)}%`, background: '#EF4444', height: '100%' }} />
                </div>
              </div>

            </div>
          </article>

          {/* Chronicle timeline explorer */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>📖 Global Operational Chronicle Explorer</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Immortal system maturity log detailing major organizational epochs and governance sweeps.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chronicle.map((epoch) => (
                <div 
                  key={epoch.id}
                  style={{
                    padding: 14,
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: '#fff' }}>{epoch.epochName}</strong>
                    <span style={{ fontSize: 9, color: '#888' }}>{new Date(epoch.timestamp).toLocaleString()}</span>
                  </div>

                  <p style={{ margin: '4px 0 8px', fontSize: 12, color: '#ccc', lineHeight: 1.4 }}>{epoch.eventSummary}</p>

                  <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#777' }}>
                    <span>Sovereignty: <strong style={{ color: '#aaa' }}>{epoch.sovereigntyLevel}%</strong></span>
                    <span>Clarity: <strong style={{ color: '#aaa' }}>{epoch.cognitiveClarity}%</strong></span>
                    <span>Active Threats: <strong style={{ color: '#aaa' }}>{epoch.activeThreatCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </article>

        </div>

        {/* Right Side: Threat forecasting, compatibility registry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Protocol Compatibility Registry */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🔗 Ecosystem Trust Compatibility Matrix</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Institutional readiness certification weights and auditing matrix.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {compatibility.map((item) => (
                <div 
                  key={item.protocolName}
                  style={{
                    padding: 12,
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 12, color: '#fff' }}>{item.protocolName}</strong>
                    <span 
                      style={{ 
                        fontSize: 9, 
                        background: item.readinessState === 'certified' ? 'rgba(16,185,129,0.06)' : 'rgba(245,197,24,0.06)', 
                        color: item.readinessState === 'certified' ? '#10B981' : '#F5C518', 
                        padding: '2px 6px', 
                        borderRadius: 4,
                        textTransform: 'uppercase'
                      }}
                    >
                      {item.readinessState}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', marginTop: 6 }}>
                    <span>Ecosystem Trust Score:</span>
                    <strong style={{ color: '#fff' }}>{item.trustWeight}%</strong>
                  </div>

                  <div style={{ fontSize: 9, color: '#666', marginTop: 4, fontFamily: 'monospace' }}>
                    Last Security Audit: {item.lastAudited}
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Active threat matrix */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🛡️ Advanced Threat Forecast Matrix</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Simulate security breaches and forecast infrastructure defense confidence.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {threats.map((threat) => (
                <div 
                  key={threat.vector}
                  style={{
                    padding: 12,
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 12, color: '#fff' }}>{threat.vector}</strong>
                    <button
                      onClick={() => toggleThreat(threat.vector)}
                      className="btn-outline"
                      style={{
                        padding: '3px 8px',
                        fontSize: 10,
                        height: 'auto',
                        borderColor: threat.compromiseSimulationActive ? '#EF4444' : 'rgba(255,255,255,0.1)',
                        color: threat.compromiseSimulationActive ? '#EF4444' : '#aaa'
                      }}
                    >
                      {threat.compromiseSimulationActive ? 'Stop Sim' : 'Trigger Sim'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', marginTop: 4 }}>
                    <span>Forecast Likelihood:</span>
                    <strong style={{ color: '#ccc' }}>{threat.likelihood}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', marginTop: 4 }}>
                    <span>Severity Impact:</span>
                    <strong style={{ color: threat.severity === 'critical' ? '#EF4444' : '#F5C518', textTransform: 'uppercase' }}>{threat.severity}</strong>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Historical state snapshots */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>💾 Global Strategic Memory Archive Checkpoints</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Compare historical consensus states and restore parameters statefully.
            </p>

            <form onSubmit={handleTakeSnapshot} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input 
                type="text"
                value={snapNameInput}
                onChange={(e) => setSnapNameInput(e.target.value)}
                placeholder="Checkpoint label..."
                required
                style={{ flex: 1, padding: '6px 10px', background: '#040404', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 11, borderRadius: 6, outline: 'none' }}
              />
              <button type="submit" className="btn-outline" style={{ padding: '6px 12px', fontSize: 11, minWidth: 100 }}>📸 Take Snap</button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {globalCheckpoints.map((snap) => {
                const isRestoring = selectedSnapshotId === snap.id
                return (
                  <div 
                    key={snap.id}
                    style={{
                      padding: 12,
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.03)',
                      borderRadius: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 12, color: '#fff' }}>{snap.description}</strong>
                      <span style={{ display: 'block', fontSize: 9, color: '#888', marginTop: 2 }}>
                        Captured: {new Date(snap.timestamp).toLocaleString()} • Consensus Score: {snap.consensusIndex}%
                      </span>
                    </div>

                    <button
                      onClick={() => handleRestore(snap.id)}
                      className="btn-gold"
                      style={{ padding: '4px 10px', fontSize: 11, height: 'auto' }}
                      disabled={isRestoring}
                    >
                      {isRestoring ? '⌛ Restoring...' : '🔄 Restore State'}
                    </button>
                  </div>
                )
              })}
            </div>
          </article>

        </div>

      </section>

      {/* Epoch Archive Modal */}
      {showEpochModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card" style={{ width: '90%', maxWidth: 450, padding: 24, border: '1px solid rgba(245,197,24,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Archive Maturity Epoch</h3>
              <button onClick={() => setShowEpochModal(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleArchiveEpoch} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Epoch Name</label>
                <input 
                  type="text"
                  value={epochNameInput}
                  onChange={(e) => setEpochNameInput(e.target.value)}
                  placeholder="e.g. Core Staking Quorum Upgrade"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Maturity Chronicle Summary</label>
                <textarea 
                  value={epochSummaryInput}
                  onChange={(e) => setEpochSummaryInput(e.target.value)}
                  placeholder="Summarize the core structural upgrades, compliance additions, or performance adjustments..."
                  required
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none', resize: 'none' }}
                />
              </div>

              <button
                type="submit"
                className="btn-gold"
                style={{ padding: '10px', fontSize: 12, fontWeight: 'bold', marginTop: 8 }}
              >
                Archive Epoch statefully
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

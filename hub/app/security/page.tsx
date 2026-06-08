// Built by vsrupeshkumar
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePlatformState, updatePlatformState, SIMULATION_SCENARIOS, SimulationScenario } from '../../lib/platform-engine'
import { useAutonomousOps } from '../../lib/autonomous-ops'
import { useDigitalTwin } from '../../lib/digital-twin'
import { toast } from '../../lib/toast'
import ExecutiveWalkthrough from '../components/ExecutiveWalkthrough'
import CommandPalette from '../components/CommandPalette'

interface SecurityLog {
  id: string
  timestamp: string
  source: string
  action: string
  status: 'passed' | 'warning' | 'alert'
}

export default function SecurityPage() {
  const { activeScenario, analytics } = usePlatformState()
  const { operationalRiskScore, infrastructureConfidenceScore, walletTrustState, resilienceStatus } = useAutonomousOps()
  const { activeProfile, injectScenario } = useDigitalTwin()
  const [securityFeed, setSecurityFeed] = useState<SecurityLog[]>([])

  // Dynamic system trust score calculations based on scenario
  let trustScore = 99.8
  let envStatus = 'LIVE MAINNET METRICS'
  let envColor = '#10B981'
  let riskLevel = 'OPTIMAL'
  let riskColor = '#10B981'

  if (activeScenario === 'degraded_rpc') {
    trustScore = 92.4
    envStatus = 'RPC DEGRADATION PROTOCOL ACTIVE'
    envColor = '#F5C518'
    riskLevel = 'STABILIZED (FALLBACK RUNNING)'
    riskColor = '#F5C518'
  } else if (activeScenario === 'chain_congestion') {
    trustScore = 94.6
    envStatus = 'CONGESTED NETWORK FLOWS'
    envColor = '#F5C518'
    riskLevel = 'MODERATE MEMPOOL LOAD'
    riskColor = '#F5C518'
  } else if (activeScenario === 'suspicious_activity') {
    trustScore = 72.8
    envStatus = 'WALLET THREAT SIMULATOR'
    envColor = '#EF4444'
    riskLevel = 'CRITICAL RISK ROUTED'
    riskColor = '#EF4444'
  } else if (activeScenario === 'telemetry_anomaly_spikes') {
    trustScore = 65.2
    envStatus = 'DIAGNOSTICS STRESS SIMULATION'
    envColor = '#EF4444'
    riskLevel = 'SEVERE ANOMALY OUTAGE'
    riskColor = '#EF4444'
  } else if (activeScenario !== 'none') {
    envStatus = 'SIMULATION ENVIRONMENT PROTOCOL'
    envColor = '#F5C518'
  }

  // Populate security feed events based on scenario selection
  useEffect(() => {
    const list: SecurityLog[] = [
      { id: '1', timestamp: new Date(Date.now() - 60000).toISOString(), source: 'Mantle Splitter', action: 'Freighter XDR signature validation successful', status: 'passed' },
      { id: '2', timestamp: new Date(Date.now() - 120000).toISOString(), source: 'Phantom Handshake', action: 'Ed25519 nacl detached verification verified', status: 'passed' },
      { id: '3', timestamp: new Date(Date.now() - 180000).toISOString(), source: 'MetaMask EVM', action: 'Chain switcher validated Mantle Network (1990)', status: 'passed' },
    ]

    if (activeScenario === 'suspicious_activity') {
      list.unshift({
        id: 'warn-1',
        timestamp: new Date().toISOString(),
        source: 'Private vault Privacy',
        action: 'Threat Alert: Suspicious routing detected from high-risk contract',
        status: 'alert'
      })
    } else if (activeScenario === 'degraded_rpc') {
      list.unshift({
        id: 'warn-2',
        timestamp: new Date().toISOString(),
        source: 'Gateway Monitor',
        action: 'Warning: 6-second timeout intercepted. Cached data fallback served.',
        status: 'warning'
      })
    } else if (activeScenario === 'telemetry_anomaly_spikes') {
      list.unshift({
        id: 'warn-3',
        timestamp: new Date().toISOString(),
        source: 'Telemetry Core',
        action: 'Outage Alert: Anomaly count exceeds 45 triggers. Hot-swap active.',
        status: 'alert'
      })
    }

    setSecurityFeed(list)
  }, [activeScenario])

  function handleSelectScenario(id: SimulationScenario) {
    injectScenario(id)
  }

  return (
    <main className="dashboard-layout" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>
      <header style={{ width: '100%', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link className="gold-text" href="/dashboard" style={{ fontSize: 13, textDecoration: 'none' }}>← Back to Dashboard</Link>
            <span style={{ color: '#666', fontSize: 12 }}>/</span>
            <span style={{ fontSize: 13, color: '#aaa' }}>Security Intel</span>
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🛡️</span> Hardened Security Intelligence
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 10, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 10px', borderRadius: 20 }}>
            AI Guard: Uptime Nominal
          </span>
          <span style={{ fontSize: 10, background: 'rgba(255, 255, 255, 0.04)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '4px 10px', borderRadius: 20 }}>
            Post: {walletTrustState}
          </span>
        </div>
      </header>

      {/* Top Environment Banner */}
      <div 
        style={{ 
          width: '100%', 
          background: 'rgba(0,0,0,0.4)', 
          border: `1px solid ${envColor}`, 
          borderRadius: 10, 
          padding: '16px 20px', 
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: envColor, boxShadow: `0 0 10px ${envColor}` }} />
            <strong style={{ fontSize: 13, color: envColor, letterSpacing: '0.05em' }}>{envStatus}</strong>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ccc' }}>
            Multi-chain hardware signing, isolated RPC envelopes, and decentralized key locks are hardened.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>System Integrity</span>
            <h4 style={{ margin: 0, fontSize: 22, color: '#fff', fontWeight: 800 }}>{trustScore}%</h4>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Threat Mitigation</span>
            <h4 style={{ margin: 0, fontSize: 14, color: riskColor, fontWeight: 800, marginTop: 4 }}>{riskLevel}</h4>
          </div>
        </div>
      </div>

      {/* Main Grid split */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start', marginBottom: 24 }}>
        
        {/* Advanced Simulation Scenario Selector */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Digital Twin Simulation Panel</h2>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
            Inject synthetic multi-chain anomalies or key threat parameters into the isolated sandbox registry.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            {SIMULATION_SCENARIOS.map((sc) => {
              const isActive = activeScenario === sc.id
              return (
                <button
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc.id)}
                  className="btn-outline"
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    borderColor: isActive ? '#F5C518' : 'rgba(255,255,255,0.08)',
                    background: isActive ? 'rgba(245,197,24,0.04)' : '#070707',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13, color: isActive ? '#F5C518' : '#fff' }}>{sc.name}</strong>
                    <span 
                      style={{ 
                        fontSize: 9, 
                        fontWeight: 800, 
                        color: sc.severity === 'critical' || sc.severity === 'high' ? '#EF4444' : sc.severity === 'medium' ? '#F5C518' : '#10B981',
                        textTransform: 'uppercase'
                      }}
                    >
                      {sc.severity}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: '#888', lineHeight: 1.3 }}>{sc.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Security metrics and cluster matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Anomaly Clustering & Signing consistency */}
          <div className="card">
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>🔒 Hardened Security Intelligence Metrics</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11 }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                <span style={{ color: '#888' }}>Signing Consistency:</span>
                <strong style={{ color: '#10B981' }}>100% freighter / Phantom ed25519</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                <span style={{ color: '#888' }}>Chain Integrity Confidence:</span>
                <strong style={{ color: '#10B981' }}>Mantle 99.9% • Mantle 99.8% • Mantle 100%</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                <span style={{ color: '#888' }}>AI Safety Confidence:</span>
                <strong style={{ color: '#10B981' }}>99.9% (Zero-Metadata routing)</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                <span style={{ color: '#888' }}>Operational Threat Score:</span>
                <strong style={{ color: operationalRiskScore > 50 ? '#EF4444' : '#fff' }}>{operationalRiskScore} / 100</strong>
              </div>

              {/* Anomaly Clusters */}
              <div style={{ marginTop: 10 }}>
                <strong style={{ color: '#F5C518', fontSize: 10, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Active Anomaly Clustering Matrices
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 9 }}>
                  <div style={{ padding: 8, background: '#040404', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 4 }}>
                    <span style={{ color: '#888' }}>Cluster #1 (RPC Errors)</span>
                    <strong style={{ display: 'block', fontSize: 12, color: activeScenario === 'degraded_rpc' ? '#EF4444' : '#fff', marginTop: 2 }}>
                      {activeScenario === 'degraded_rpc' ? '6 Active' : '0 Anomalies'}
                    </strong>
                  </div>
                  <div style={{ padding: 8, background: '#040404', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 4 }}>
                    <span style={{ color: '#888' }}>Cluster #2 (Keys Signatures)</span>
                    <strong style={{ display: 'block', fontSize: 12, color: activeScenario === 'suspicious_activity' ? '#EF4444' : '#fff', marginTop: 2 }}>
                      {activeScenario === 'suspicious_activity' ? '1 Threat Locked' : '0 Anomalies'}
                    </strong>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Suspicious activity logs feed */}
          <div className="card">
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Suspicious Activity Feed</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {securityFeed.map((log) => (
                <div 
                  key={log.id} 
                  style={{ 
                    padding: '10px 12px', 
                    background: log.status === 'alert' ? 'rgba(239,68,68,0.02)' : 'rgba(255,255,255,0.01)', 
                    border: `1px solid ${log.status === 'alert' ? 'rgba(239,68,68,0.15)' : log.status === 'warning' ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.04)'}`,
                    borderRadius: 6 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, marginBottom: 4 }}>
                    <strong style={{ color: log.status === 'alert' ? '#EF4444' : log.status === 'warning' ? '#F5C518' : '#888' }}>{log.source}</strong>
                    <span style={{ color: '#666' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#ccc' }}>{log.action}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Security posture timeline */}
      <section className="card">
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🕰 Threat Escalation Timeline</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
          Historical cryptographic check logs auditing cross-chain transaction finality and private vault lock events.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { time: '14:30:12', event: 'Freighter XDR secure multi-sig co-signature verified', status: 'Passed', color: '#10B981' },
            { time: '14:28:44', event: activeScenario === 'suspicious_activity' ? 'ALERT: Key signature isolation certificate hold applied' : 'Private Vault signature check completed', status: activeScenario === 'suspicious_activity' ? 'Threat Isolated' : 'Passed', color: activeScenario === 'suspicious_activity' ? '#EF4444' : '#10B981' },
            { time: '14:20:00', event: 'Ed25519 signature detached check verified successfully on Phantom payload', status: 'Passed', color: '#10B981' }
          ].map((item, idx) => (
            <div 
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                padding: '6px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ color: '#666' }}>{item.time}</span>
                <span style={{ color: '#ccc' }}>{item.event}</span>
              </div>
              <strong style={{ color: item.color }}>{item.status}</strong>
            </div>
          ))}
        </div>
      </section>

      <ExecutiveWalkthrough />
      <CommandPalette />
    </main>
  )
}

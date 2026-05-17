'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from '../../lib/toast'
import ExecutiveWalkthrough from '../components/ExecutiveWalkthrough'
import CommandPalette from '../components/CommandPalette'

interface WebhookEvent {
  id: string
  name: string
  payload: string
  description: string
}

const DEFAULT_WEBHOOKS: WebhookEvent[] = [
  {
    id: 'evt-01',
    name: 'validator.drift_detected',
    description: 'Triggered when a validator node latency spikes or drifts past trust tolerances.',
    payload: JSON.stringify({
      event: 'validator.drift_detected',
      timestamp: new Date().toISOString(),
      data: {
        nodeId: 'val-04',
        driftLatencyMs: 125,
        confidenceThreshold: 90.0,
        resilienceStatus: 'degraded'
      }
    }, null, 2)
  },
  {
    id: 'evt-02',
    name: 'treasury.imbalance_logged',
    description: 'Dispatched when cross-chain payroll streams drift past the 15% balance gap guardrail.',
    payload: JSON.stringify({
      event: 'treasury.imbalance_logged',
      timestamp: new Date().toISOString(),
      data: {
        solanaReserve: 120500,
        qieReserve: 240900,
        driftRatio: '14.8%',
        actionRecommended: 'USDC rebalancing trigger'
      }
    }, null, 2)
  },
  {
    id: 'evt-03',
    name: 'consensus.healing_completed',
    description: 'Triggered upon successful recovery propagation of the self-healing validator consensus waves.',
    payload: JSON.stringify({
      event: 'consensus.healing_completed',
      timestamp: new Date().toISOString(),
      data: {
        recoveryEpoch: 'epoch-03',
        restorationTimeMs: 3500,
        healthRestored: '99.8%'
      }
    }, null, 2)
  }
]

export default function EcosystemPage() {
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEvent>(DEFAULT_WEBHOOKS[0])
  const [targetUrl, setTargetUrl] = useState('https://api.enterprise.dao/webhooks/kubryx')
  const [inspectPayload, setInspectPayload] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)

  function handleTriggerWebhook() {
    setTriggering(true)
    setTimeout(() => {
      setTriggering(false)
      setInspectPayload(selectedWebhook.payload)
      toast.success(`Sent event: "${selectedWebhook.name}" payload successfully dispatched!`)
    }, 1200)
  }

  return (
    <main className="dashboard-layout" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>
      
      {/* Header Panel */}
      <header style={{ width: '100%', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link className="gold-text" href="/dashboard" style={{ fontSize: 13, textDecoration: 'none' }}>◀ Dashboard</Link>
            <span style={{ color: '#666', fontSize: 12 }}>/</span>
            <span style={{ fontSize: 13, color: '#aaa' }}>Developer Portal</span>
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🛠️</span> Developer Ecosystem & SDK Portal
          </h1>
        </div>
      </header>

      {/* Main Grid Layout */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 24 }}>
        
        {/* Left Side: Code integrations & playground */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Webhook Playground */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>📡 Autonomous Webhook & Event Playground</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Simulate webhook payloads and trace dynamic orchestration synchronization event dispatches.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Webhook Event Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {DEFAULT_WEBHOOKS.map((evt) => (
                    <button
                      key={evt.id}
                      onClick={() => setSelectedWebhook(evt)}
                      className="btn-outline"
                      style={{
                        padding: '6px 12px',
                        fontSize: 11,
                        borderColor: selectedWebhook.id === evt.id ? '#F5C518' : 'rgba(255,255,255,0.08)',
                        color: selectedWebhook.id === evt.id ? '#F5C518' : '#aaa',
                        background: selectedWebhook.id === evt.id ? 'rgba(245,197,24,0.05)' : '#000',
                        flex: 1
                      }}
                    >
                      {evt.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Endpoint Destination URL</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none' }}
                  />
                  <button
                    onClick={handleTriggerWebhook}
                    className="btn-gold"
                    style={{ padding: '8px 16px', fontSize: 12, minWidth: 120 }}
                    disabled={triggering}
                  >
                    {triggering ? '⚡ Dispatching...' : '📡 Trigger Event'}
                  </button>
                </div>
              </div>

              {/* Inspector Output */}
              {inspectPayload && (
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Dispatched JSON Payload Inspector</span>
                  <pre 
                    style={{
                      padding: 12,
                      background: '#030303',
                      border: '1px solid rgba(245,197,24,0.25)',
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: 'monospace',
                      color: '#F5C518',
                      overflowX: 'auto',
                      maxHeight: 180
                    }}
                  >
                    {inspectPayload}
                  </pre>
                </div>
              )}
            </div>
          </article>

          {/* Integration SDK Code Examples */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>💻 Enterprise SDK & REST Integration models</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Simple code integration blocks to connect to the dynamic Sovereign infrastructure fabric.
            </p>

            <pre 
              style={{
                padding: 14,
                background: '#030303',
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: 8,
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#ccc',
                overflowX: 'auto'
              }}
            >
{`// Initialize Sovereign Ops SDK Connection
import { KubryxClient } from '@kubryx/sovereign-sdk';

const client = new KubryxClient({
  endpoint: "https://api.kubryx.network",
  signingKey: "secp256k1_private_key_auth"
});

// Stream active validator quorums
client.on('consensus.drift_detected', (event) => {
  console.log(\`[SLA ALARM] Node \${event.nodeId} drift latency: \${event.driftLatencyMs}ms\`);
  
  // Automate regional cache rerouting fallback
  client.governance.proposeMigration({
    targetRegion: "Singapore ap-southeast-1",
    reason: "EVM consensus latency partition drift mitigation"
  });
});`}
            </pre>
          </article>

        </div>

        {/* Right Side: Architecture & event lifecycles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Operational API topology */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🏛️ Event Schema & API Topology</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              High-level structural outline of the sovereign operational fabric pathways.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 11 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(245,197,24,0.06)', border: '1px solid #F5C518', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: 10, color: '#F5C518' }}>1</div>
                <div>
                  <strong style={{ color: '#fff' }}>Telemetry Ingestion Bus</strong>
                  <span style={{ display: 'block', fontSize: 9, color: '#888' }}>Monitors pings, latencies and packet overflows</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(245,197,24,0.06)', border: '1px solid #F5C518', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: 10, color: '#F5C518' }}>2</div>
                <div>
                  <strong style={{ color: '#fff' }}>Cognitive Prioritizations</strong>
                  <span style={{ display: 'block', fontSize: 9, color: '#888' }}>Heuristic clusters analyze situational awareness indexes</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(245,197,24,0.06)', border: '1px solid #F5C518', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: 10, color: '#F5C518' }}>3</div>
                <div>
                  <strong style={{ color: '#fff' }}>Consensus Policy Gating</strong>
                  <span style={{ display: 'block', fontSize: 9, color: '#888' }}>Enforces maximum drifts, block thresholds and key locks</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(245,197,24,0.06)', border: '1px solid #F5C518', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: 10, color: '#F5C518' }}>4</div>
                <div>
                  <strong style={{ color: '#fff' }}>Sovereign Edge execution</strong>
                  <span style={{ display: 'block', fontSize: 9, color: '#888' }}>Reroutes regional loads automatically across 5 deployment zones</span>
                </div>
              </div>
            </div>
          </article>

        </div>

      </section>

      <ExecutiveWalkthrough />
      <CommandPalette />
    </main>
  )
}

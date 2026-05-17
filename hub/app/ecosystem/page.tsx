'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useGlobalOperations, KubryxEventType } from '../../lib/global-operations-engine'
import { useStrategicIntelligence } from '../../lib/strategic-intelligence-engine'
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
  const { 
    consensusIndex, 
    events: globalEvents, 
    snapshots: globalCheckpoints, 
    publish, 
    restoreSnapshot 
  } = useGlobalOperations()

  // Connect to Strategic Intelligence Layer
  const { recommendations, forecasts, activeMitigationPlan } = useStrategicIntelligence()

  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEvent>(DEFAULT_WEBHOOKS[0])
  const [targetUrl, setTargetUrl] = useState('https://api.enterprise.dao/webhooks/kubryx')
  const [inspectPayload, setInspectPayload] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)

  // Simulator Inputs
  const [customPayload, setCustomPayload] = useState('{\n  "status": "nominal",\n  "active": true\n}')
  const [customEventType, setCustomEventType] = useState<KubryxEventType>('kubryx_ecosystem_alert')
  const [customEventDesc, setCustomEventDesc] = useState('Custom ecosystem webhook telemetry dispatch.')

  // Strategic Explorer State
  const [selectedForecastTimeframe, setSelectedForecastTimeframe] = useState<'1-hour' | '24-hour' | '7-day'>('1-hour')

  function handleTriggerWebhook() {
    setTriggering(true)
    setTimeout(() => {
      setTriggering(false)
      setInspectPayload(selectedWebhook.payload)
      
      // Dispatch statefully to event bus
      publish(
        'kubryx_ecosystem_alert',
        selectedWebhook.payload,
        `Webhook payload dispatched: "${selectedWebhook.name}"`
      )
      
      toast.success(`Sent event: "${selectedWebhook.name}" payload successfully dispatched!`)
    }, 1200)
  }

  function handleDispatchCustomEvent(e: React.FormEvent) {
    e.preventDefault()
    try {
      // Validate JSON content
      JSON.parse(customPayload)
      publish(customEventType, customPayload, customEventDesc)
      toast.success(`Event bus: successfully published "${customEventType}"!`)
      setCustomEventDesc('')
    } catch {
      toast.error('Invalid JSON payload provided inside simulator.')
    }
  }

  function handleReplayEvent(payload: string, desc: string, type: KubryxEventType) {
    publish(type, payload, `[REPLAY] ${desc}`)
    toast.success(`Replayed past event: "${type}" successfully re-dispatched!`)
  }

  const selectedForecast = forecasts.find(f => f.timeframe === selectedForecastTimeframe) || forecasts[0]

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

      {/* Consensus Replay Explorer Panel */}
      <section className="card" style={{ padding: 18, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🔍 Live Consensus Replay & State Explorer</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
          Inspect current sovereign parameters. Every event dispatched below directly mutates consensus scoring in real-time.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <span style={{ fontSize: 10, color: '#888' }}>Current Global Consensus</span>
            <strong style={{ display: 'block', fontSize: 22, color: '#F5C518', marginTop: 4 }}>{consensusIndex}%</strong>
          </div>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <span style={{ fontSize: 10, color: '#888' }}>Active Event Traces</span>
            <strong style={{ display: 'block', fontSize: 22, color: '#fff', marginTop: 4 }}>{globalEvents.length} Events</strong>
          </div>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <span style={{ fontSize: 10, color: '#888' }}>Archived Checkpoints</span>
            <strong style={{ display: 'block', fontSize: 22, color: '#fff', marginTop: 4 }}>{globalCheckpoints.length} Snaps</strong>
          </div>
        </div>
      </section>

      {/* Main Grid Layout */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 24 }}>
        
        {/* Left Side: Code integrations & playground */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Mitigation Simulation Sandbox */}
          <article className="card" style={{ padding: 18, border: '1px solid rgba(245,197,24,0.15)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🧪 Mitigation Simulation Sandbox</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Simulate strategic outage cascades and test real-time failover curves and restoration timelines.
            </p>

            {activeMitigationPlan ? (
              <div style={{ padding: 12, background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6 }}>
                <strong style={{ display: 'block', fontSize: 13, color: '#EF4444', marginBottom: 6 }}>{activeMitigationPlan.title}</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeMitigationPlan.steps.map((step, idx) => (
                    <div key={idx} style={{ fontSize: 11, color: '#ccc', display: 'flex', gap: 6 }}>
                      <span style={{ color: '#F5C518' }}>✔</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#666', marginTop: 10 }}>
                  <span>Timeline: {activeMitigationPlan.estimatedTimelineSeconds}s Target</span>
                  <span>Restoration: 98.2% baseline consensus</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', opacity: 0.7 }}>
                <span style={{ fontSize: 32 }}>🛡️</span>
                <p style={{ margin: '6px 0 0', fontSize: 12 }}>Ecosystem Nominal: Simulate an outage on `/executive` to test recovery cascades.</p>
              </div>
            )}
          </article>

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

          {/* Live Event Simulator Form */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>⚙️ Real-time Event Simulator</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Publish custom event payloads directly onto the authoritative Global Event Bus.
            </p>

            <form onSubmit={handleDispatchCustomEvent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Event Type</label>
                  <select
                    value={customEventType}
                    onChange={(e) => setCustomEventType(e.target.value as KubryxEventType)}
                    style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none' }}
                  >
                    <option value="kubryx_ecosystem_alert">kubryx_ecosystem_alert</option>
                    <option value="kubryx_treasury_shift">kubryx_treasury_shift</option>
                    <option value="kubryx_policy_update">kubryx_policy_update</option>
                    <option value="kubryx_cognition_signal">kubryx_cognition_signal</option>
                    <option value="kubryx_protocol_sync">kubryx_protocol_sync</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Description</label>
                  <input 
                    type="text"
                    value={customEventDesc}
                    onChange={(e) => setCustomEventDesc(e.target.value)}
                    placeholder="Short description..."
                    required
                    style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>JSON Payload</label>
                <textarea 
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                  rows={4}
                  required
                  style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none', fontFamily: 'monospace', resize: 'none' }}
                />
              </div>

              <button type="submit" className="btn-gold" style={{ padding: 10, fontSize: 12, fontWeight: 'bold' }}>⚡ Publish to Event Bus</button>
            </form>
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

        {/* Right Side: Replay Debugger, Snapshot Inspector, API topologies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Operational Recommendation Stream */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🤖 AI Recommendation Stream</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Trace real-time operational optimizations dispatched from our strategic layer.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendations.map((rec) => (
                <div key={rec.id} style={{ padding: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <strong style={{ color: '#fff' }}>{rec.title}</strong>
                    <span style={{ color: '#F5C518' }}>+{rec.estimatedGain}%</span>
                  </div>
                  <span style={{ display: 'block', fontSize: 10, color: '#888', marginTop: 2 }}>{rec.description}</span>
                </div>
              ))}
            </div>
          </article>

          {/* Forecast Payload Explorer & strategic event inspector */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🔮 Forecast Payload Explorer</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Inspect deterministic API response schema outputs for chosen strategic forecasting boundaries.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Forecasting Horizon</label>
                <select
                  value={selectedForecastTimeframe}
                  onChange={(e) => setSelectedForecastTimeframe(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', background: '#040404', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, borderRadius: 6, outline: 'none' }}
                >
                  <option value="1-hour">1-Hour Forecast</option>
                  <option value="24-hour">24-Hour Forecast</option>
                  <option value="7-day">7-Day Forecast</option>
                </select>
              </div>

              {selectedForecast && (
                <div>
                  <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>REST API JSON Output</span>
                  <pre 
                    style={{
                      padding: 12,
                      background: '#030303',
                      border: '1px solid rgba(255,255,255,0.03)',
                      borderRadius: 8,
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: '#F5C518',
                      overflowX: 'auto',
                      maxHeight: 180
                    }}
                  >
                    {JSON.stringify(selectedForecast, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </article>

          {/* Live Event Replay Debugger */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>🐞 Event Replay Debugger</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Re-propagate or debug past event transactions to trace system response.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', paddingRight: 6 }}>
              {globalEvents.map((evt) => (
                <div 
                  key={evt.id}
                  style={{
                    padding: 10,
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <span style={{ fontSize: 9, color: '#F5C518', fontFamily: 'monospace' }}>[{evt.type}]</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#fff', marginTop: 2 }}>{evt.description}</span>
                  </div>
                  <button 
                    onClick={() => handleReplayEvent(evt.payload, evt.description, evt.type)}
                    className="btn-outline" 
                    style={{ padding: '3px 8px', fontSize: 10, height: 'auto' }}
                  >
                    🔄 Replay
                  </button>
                </div>
              ))}
            </div>
          </article>

          {/* Operational Snapshot Inspector */}
          <article className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>💾 Operational Snapshot Inspector</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
              Compare and restore historical consensus checkpoint parameters statefully.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {globalCheckpoints.map((snap) => (
                <div 
                  key={snap.id}
                  style={{
                    padding: 10,
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 11, color: '#fff' }}>{snap.description}</strong>
                    <span style={{ display: 'block', fontSize: 8, color: '#888', marginTop: 2 }}>
                      Consensus: {snap.consensusIndex}% • Votes: {snap.activeGovernanceVotes}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      restoreSnapshot(snap.id)
                      toast.success(`Restored snap state: "${snap.description}"`)
                    }}
                    className="btn-gold" 
                    style={{ padding: '3px 8px', fontSize: 10, height: 'auto' }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </article>

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

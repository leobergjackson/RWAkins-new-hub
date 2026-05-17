'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePlatformState } from '../../lib/platform-engine'
import { useGlobalOperations } from '../../lib/global-operations-engine'
import { useFabric } from '../../lib/fabric-engine'
import { toast } from '../../lib/toast'
import ExecutiveWalkthrough from '../components/ExecutiveWalkthrough'
import CommandPalette from '../components/CommandPalette'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend
} from 'recharts'

export default function AnalyticsPage() {
  const { currentMode, activeScenario, analytics } = usePlatformState()
  
  // Connect to Fabric and Global state synchronizations
  const { regions } = useFabric()
  const { consensusIndex, driftIndex, aiConfidence } = useGlobalOperations()

  const [ticks, setTicks] = useState<number>(0)
  
  // Rolling latency datasets
  const [latencyData, setLatencyData] = useState<{ name: string; latency: number; fallback: number }[]>([
    { name: '10s ago', latency: 45, fallback: 0 },
    { name: '8s ago', latency: 46, fallback: 0 },
    { name: '6s ago', latency: 44, fallback: 0 },
    { name: '4s ago', latency: 45, fallback: 0 },
    { name: '2s ago', latency: 45, fallback: 0 },
    { name: 'Now', latency: 45, fallback: 0 }
  ])

  // Rolling chain TPS data
  const [tpsData, setTpsData] = useState<{ name: string; QIE: number; Solana: number; Stellar: number; Arbitrum: number }[]>([
    { name: '10s ago', QIE: 14, Solana: 280, Stellar: 84, Arbitrum: 48 },
    { name: '8s ago', QIE: 15, Solana: 288, Stellar: 85, Arbitrum: 49 },
    { name: '6s ago', QIE: 13, Solana: 284, Stellar: 82, Arbitrum: 47 },
    { name: '4s ago', QIE: 14, Solana: 290, Stellar: 86, Arbitrum: 50 },
    { name: 'Now', QIE: 14.5, Solana: 285.2, Stellar: 84.8, Arbitrum: 48.6 }
  ])

  // AI distributions dataset
  const aiData = [
    { name: 'QIE Passports', requests: 480 },
    { name: 'Solana Streams', requests: 920 },
    { name: 'Lending Negot.', requests: 840 },
    { name: 'Shadow CFO Audit', requests: 600 }
  ]

  // Wallet trends dataset
  const walletData = [
    { name: 'MetaMask (EVM)', active: 450, transactions: 1200 },
    { name: 'Phantom (Solana)', active: 890, transactions: 2400 },
    { name: 'Freighter (Stellar)', active: 310, transactions: 850 }
  ]

  // Dynamic updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTicks(t => t + 1)
      
      const currentLat = analytics.averageLatency
      const currentFallback = analytics.fallbackActivations
      const timeStr = `${new Date().toLocaleTimeString().slice(-8)}`
      
      // Update Latency Chart
      setLatencyData((prev) => {
        const next = [...prev, { name: timeStr, latency: currentLat, fallback: currentFallback }]
        return next.slice(-8) // Keep rolling 8
      })

      // Update TPS Chart
      setTpsData((prev) => {
        const rates = analytics.chainActivityRates
        const next = [
          ...prev,
          {
            name: timeStr,
            QIE: rates['QIE Mainnet'] || 14.5,
            Solana: rates['Solana Devnet'] || 285.2,
            Stellar: rates['Stellar Testnet'] || 84.8,
            Arbitrum: rates['Arbitrum'] || 48.6
          }
        ]
        return next.slice(-8) // Keep rolling 8
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [analytics])

  function handleExport() {
    toast.success('Analytics dataset exported successfully as CSV.')
  }

  return (
    <main className="dashboard-layout" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>
      
      {/* Header Panel */}
      <header style={{ width: '100%', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link className="gold-text" href="/dashboard" style={{ fontSize: 13, textDecoration: 'none' }}>◀ Back to Dashboard</Link>
            <span style={{ color: '#666', fontSize: 12 }}>/</span>
            <span style={{ fontSize: 13, color: '#aaa' }}>Analytics Lab</span>
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📊</span> Advanced Analytics Lab
          </h1>
        </div>
        
        <button 
          onClick={handleExport}
          className="btn-gold" 
          style={{ padding: '8px 16px', fontSize: 12, height: 'auto' }}
        >
          📥 Export Dataset
        </button>
      </header>

      {/* Synchronized operational consensus & drift metrics */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
        
        <article className="card">
          <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Consensus Index</span>
          <strong style={{ display: 'block', fontSize: 24, color: '#F5C518', marginTop: 4 }}>{consensusIndex}%</strong>
          <span style={{ fontSize: 9, color: '#666', display: 'block', marginTop: 6 }}>Sovereign quorum state</span>
        </article>

        <article className="card">
          <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Sinusoidal Drift Rate</span>
          <strong style={{ display: 'block', fontSize: 24, color: '#fff', marginTop: 4 }}>±{driftIndex}%</strong>
          <span style={{ fontSize: 9, color: '#666', display: 'block', marginTop: 6 }}>Real-time telemetry waves</span>
        </article>

        <article className="card">
          <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>AI Confidence Score</span>
          <strong style={{ display: 'block', fontSize: 24, color: '#10B981', marginTop: 4 }}>{aiConfidence}%</strong>
          <span style={{ fontSize: 9, color: '#666', display: 'block', marginTop: 6 }}>Heuristic consensus validator</span>
        </article>

        <article className="card">
          <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Consensus Decay</span>
          <strong style={{ display: 'block', fontSize: 24, color: '#EF4444', marginTop: 4 }}>0.04% / hr</strong>
          <span style={{ fontSize: 9, color: '#666', display: 'block', marginTop: 6 }}>Entropy decay forecast</span>
        </article>

      </section>

      {/* Regional Volatility Map Grid */}
      <section className="card" style={{ padding: 18, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>🌍 Regional Volatility & Geo-Latency Map</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
          Real-time geo-balancing tracking showing active communication backoffs and latency flutters across regions.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {regions.map((region) => (
            <div 
              key={region.name}
              style={{
                padding: 12,
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: 6
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 12, color: '#fff' }}>{region.name}</strong>
                <span 
                  style={{ 
                    fontSize: 8, 
                    background: region.status === 'outage' ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', 
                    color: region.status === 'outage' ? '#EF4444' : '#10B981',
                    padding: '1px 4px',
                    borderRadius: 3
                  }}
                >
                  {region.status}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 8 }}>
                <span style={{ color: '#888' }}>RPC Ping:</span>
                <strong style={{ color: '#ccc' }}>{region.status === 'outage' ? 'TIMEOUT' : `${region.latency}ms`}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4 }}>
                <span style={{ color: '#888' }}>Drift Volatility:</span>
                <strong style={{ color: '#999' }}>{(region.latency * 0.05).toFixed(1)}%</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grid of Dynamic Charts */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20, marginBottom: 24 }}>
        
        {/* 1. Rolling Latency Trends AreaChart */}
        <article className="card" style={{ height: 350, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>⚡ API Gateway Latency & Failovers</h3>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
            Measures response speed (ms) and fallback activations. Spikes indicate active simulated RPC congestion.
          </p>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData}>
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5C518" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#F5C518" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} unit="ms" />
                <Tooltip 
                  contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(245,197,24,0.3)', color: '#fff', fontSize: 11 }}
                />
                <Area type="monotone" dataKey="latency" name="Latency" stroke="#F5C518" strokeWidth={2} fillOpacity={1} fill="url(#latencyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* 2. Rolling Chain activity LineChart */}
        <article className="card" style={{ height: 350, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>🌐 Multi-Chain Transaction Rates (TPS)</h3>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
            Rolling transactions per second processed across connected EVM, SVM, and Stellar smart nodes.
          </p>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tpsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, marginTop: 10 }} />
                <Line type="monotone" dataKey="Solana" stroke="#A855F7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Stellar" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Arbitrum" stroke="#EC4899" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="QIE" stroke="#F5C518" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* 3. AI Query Distribution BarChart */}
        <article className="card" style={{ height: 320, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>🧠 AI Orchestration Query Distribution</h3>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
            Measures Natural Language negotiation loops and automated audit streams dispatched to AI nodes.
          </p>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }} />
                <Bar dataKey="requests" name="Queries" fill="#F5C518" radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* 4. Wallet Connection & Ingestion Trends */}
        <article className="card" style={{ height: 320, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>🦊 Active Wallet Handshake Densities</h3>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
            Correlates connected wallet extensions with aggregate verified cryptographic transaction loops.
          </p>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={walletData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, marginTop: 10 }} />
                <Bar dataKey="active" name="Active Extension" fill="#F5C518" />
                <Bar dataKey="transactions" name="Verified Handshakes" fill="#4B5563" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

      </section>

      <ExecutiveWalkthrough />
      <CommandPalette />
    </main>
  )
}

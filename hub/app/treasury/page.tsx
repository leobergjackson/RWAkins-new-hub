'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { WrongNetworkBanner } from '@/components/wallet/WrongNetwork'
import { PriceBadge } from '@/components/ui/PriceBadge'
import { useTrustMesh } from '@/hooks/useTrustMesh'
import { useKubrykPlatform } from '@/context/KubrykPlatformContext'
import { type OnChainJobAccount } from '@/lib/api/solana'
import { TRUSTMESH_OWNER_WALLET } from '@/lib/trustmesh-seeds'

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI Payment Routing',
    desc: '7 specialized AI agents optimize every transaction for cost, speed, and privacy.',
    detail: 'Automatic multi-hop routing, slippage protection, 23% avg gas savings',
    color: '#6366F1',
  },
  {
    icon: '💼',
    title: 'Yield Operations Hub Management',
    desc: 'Real-time portfolio view across all blockchains and wallets.',
    detail: 'Asset allocation, yield tracking, risk analysis, predictive simulations',
    color: '#4F46E5',
  },
  {
    icon: '🔄',
    title: 'Seamless Swaps',
    desc: 'Multi-chain DEX integration with intelligent route optimization.',
    detail: 'Merchant Moe, FusionX, Agni Finance, Uniswap — instant price quotes',
    color: '#8B5CF6',
  },
  {
    icon: '⚡',
    title: 'Automated Payments',
    desc: 'Recurring payments, payroll, and scheduled transfers on autopilot.',
    detail: 'Daily/weekly/monthly schedules, batch payments, multi-recipient',
    color: '#3B5BFA',
  },
]

const STATS = [
  { label: 'Yield Operations Hub Managed', value: '$1.2M+' },
  { label: 'AI Agents Online', value: '7' },
  { label: 'Chains Supported', value: '8+' },
  { label: 'Gas Saved (Avg)', value: '23%' },
]

const SUPPORTED = [
  { name:'Mantle',   symbol:'MNT',   color:'#6366F1' },
  { name:'Ethereum', symbol:'ETH',   color:'#60A5FA' },
  { name:'Mantle', symbol:'ARB',   color:'#06B6D4' },
  { name:'Polygon',  symbol:'MATIC', color:'#8B5CF6' },
  { name:'Base',     symbol:'BASE',  color:'#3B82F6' },
  { name:'Optimism', symbol:'OP',    color:'#EF4444' },
]

function secsAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return new Date(ts).toLocaleTimeString()
}

export default function TreasuryLanding() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trustmesh = useTrustMesh()
  const platform = useKubrykPlatform()

  // Derive live stats from on-chain job accounts
  const liveJobs = trustmesh.jobs.filter(j => j.isLive) as OnChainJobAccount[]
  const activeJobCount = liveJobs.filter(j => j.status === 0).length
  const totalBudgetSol = liveJobs.reduce((sum, j) => sum + Number(j.budgetLamports), 0) / 1e9
  const operatorShort = `${TRUSTMESH_OWNER_WALLET.slice(0, 6)}…${TRUSTMESH_OWNER_WALLET.slice(-4)}`

  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (trustmesh.isLive) {
      setLastUpdated(Date.now())
      if (trustmesh.currentSlot) platform.setSolanaSlot(trustmesh.currentSlot)
    }
  }, [trustmesh.currentSlot, trustmesh.isLive])  

  function copyOperator() {
    navigator.clipboard.writeText(TRUSTMESH_OWNER_WALLET).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }

  /* particle canvas background */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    type Particle = { x: number; y: number; vx: number; vy: number; r: number; alpha: number }
    const particles: Particle[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
    }))

    let raf: number
    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`
        ctx.fill()
      })
      /* draw connections */
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  const floatingCircles = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      size: Math.floor(Math.random() * 26) + 8, // 8px - 34px
      left: Math.floor(Math.random() * 100),
      top: Math.floor(Math.random() * 100),
      duration: Math.floor(Math.random() * 6) + 9, // 9s - 15s
      delay: Math.floor(Math.random() * 4),
      opacity: (Math.random() * 0.15 + 0.10).toFixed(2)
    }))
  }, [])

  return (
    <div className="yield-hub-container">
      {/* Google Fonts Link */}
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Sans:wght@400;500;600;700&family=Dancing+Script:wght@600&family=Fira+Code:wght@400&display=swap" rel="stylesheet" />

      {/* Embedded Vanilla CSS Stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        .yield-hub-container {
          background: radial-gradient(60% 55% at 70% 40%, rgba(219,234,254,0.5) 0%, transparent 60%),
                      radial-gradient(50% 50% at 25% 60%, rgba(237,233,254,0.5) 0%, transparent 60%),
                      linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 100%);
          color: #0A0F2E;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          width: 100%;
        }

        .yield-hub-container .page-title {
          color: #0A0F2E !important;
          font-size: clamp(34px, 5vw, 56px);
          font-weight: 800;
          text-shadow: none;
          letter-spacing: -0.02em;
          text-align: center;
        }

        .yield-hub-container .page-subtitle {
          color: #475569 !important;
          font-size: 16px;
          line-height: 1.7;
          max-width: 650px;
          margin: 0 auto 32px auto;
          text-align: center;
        }

        .yield-hub-container .page-eyebrow {
          color: #3B5BFA !important;
          font-weight: 700;
          letter-spacing: 0.12em;
          justify-content: center;
        }

        .floating-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .float-bubble {
          position: absolute;
          background-color: rgba(59, 130, 246, 0.08);
          border-radius: 50%;
          animation: driftBubble linear infinite;
        }
        @keyframes driftBubble {
          0% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          33% { transform: translateY(-30px) translateX(15px) rotate(120deg); }
          66% { transform: translateY(15px) translateX(-20px) rotate(240deg); }
          100% { transform: translateY(0px) translateX(0px) rotate(360deg); }
        }

        .dot-grid-overlay {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(59, 130, 246, 0.12) 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
        }

        .hero-section {
          padding: 90px 20px 80px 20px;
          text-align: center;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }
        .eyebrow-cursive {
          font-family: 'Dancing Script', cursive;
          font-size: 18px;
          color: #3B82F6;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .hero-title {
          margin: 12px 0 24px 0;
          max-width: 800px;
          line-height: 1.25;
        }
        .title-syne-emerald {
          font-family: 'Syne', sans-serif;
          font-size: clamp(40px, 6vw, 66px);
          color: #3B82F6;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .title-cursive-dark {
          font-family: 'Dancing Script', cursive;
          font-size: clamp(38px, 5.5vw, 58px);
          color: #0A0F2E;
          font-weight: 600;
        }
        .hero-subtext {
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          line-height: 1.7;
          color: #475569;
          max-width: 600px;
          margin-bottom: 32px;
        }

        .hero-buttons {
          display: flex;
          gap: 16px;
          margin-bottom: 50px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .btn-indigo-pill {
          background-color: #3B82F6;
          color: #FFFFFF;
          border: none;
          padding: 14px 32px;
          border-radius: 9999px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.22);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-indigo-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.32);
          background-color: #2563EB;
        }
        .btn-navy-pill {
          background-color: #3B82F6;
          color: #FFFFFF;
          border: none;
          padding: 14px 32px;
          border-radius: 9999px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-navy-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 22px rgba(59, 130, 246, 0.25);
          background-color: #2563EB;
        }
        .btn-ghost-pill {
          background-color: transparent;
          color: #F8FAFC;
          border: 1px solid #3B82F6;
          padding: 14px 32px;
          border-radius: 9999px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, background-color 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-ghost-pill:hover {
          transform: translateY(-2px);
          background-color: rgba(59, 130, 246, 0.15);
        }

        .stats-grid-container {
          padding: 0 24px;
          max-width: 1100px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
          margin-bottom: 80px;
        }
        .stat-card {
          border-radius: 24px;
          border: 1px solid rgba(59, 130, 246, 0.2);
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 160px;
          box-shadow: 0 4px 16px rgba(10, 15, 46, 0.06);
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          background-color: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.25);
          border-color: rgba(96, 165, 250, 0.6);
        }
        .stat-eyebrow {
          font-family: 'Dancing Script', cursive;
          font-size: 18px;
          color: #60A5FA;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .stat-number {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: clamp(16px, 1.8vw, 24px);
          color: #0A0F2E;
          margin: 12px 0;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .stat-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #64748B;
          font-weight: 500;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 80px;
        }
        .feature-card {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 24px;
          padding: 32px;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 16px rgba(10, 15, 46, 0.06);
          transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
        }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.12);
          border-color: rgba(59, 130, 246, 0.4);
        }
        .feature-icon {
          font-size: 36px;
          margin-bottom: 20px;
          background: rgba(59, 130, 246, 0.1);
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
        }
        .feature-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #0A0F2E;
          margin-bottom: 12px;
        }
        .feature-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .feature-detail {
          font-family: 'Fira Code', monospace;
          font-size: 11px;
          color: #3B5BFA;
          background: rgba(59, 91, 250, 0.06);
          padding: 10px 14px;
          border-radius: 10px;
          line-height: 1.5;
        }

        .chains-container {
          text-align: center;
          margin-bottom: 80px;
        }
        .chains-title {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #64748B;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 24px;
          font-weight: 600;
        }
        .chains-list {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .chain-pill {
          padding: 10px 20px;
          border-radius: 9999px;
          border: 1px solid rgba(59, 91, 250, 0.2);
          background: rgba(255, 255, 255, 0.85);
          display: flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(10, 15, 46, 0.06);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .chain-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 91, 250, 0.12);
        }
        .chain-name {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #0A0F2E;
        }
        .chain-symbol {
          font-family: 'Fira Code', monospace;
          font-size: 11px;
          color: #3B5BFA;
          font-weight: 500;
        }
        
        .quick-actions-card {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(59, 91, 250, 0.15);
          border-radius: 32px;
          padding: 48px;
          text-align: center;
          backdrop-filter: blur(16px);
          margin-bottom: 80px;
          box-shadow: 0 8px 32px rgba(10, 15, 46, 0.08);
        }
        .qa-title {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #0A0F2E;
          margin-bottom: 12px;
        }
        .qa-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          color: #475569;
          margin-bottom: 32px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .footer-note {
          text-align: center;
          padding-bottom: 40px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #94A3B8;
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto;
        }
        .yield-hub-container .badge-live {
          background-color: rgba(59, 130, 246, 0.15) !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
          color: #60A5FA !important;
        }
      `}} />

      {/* Floating Circles */}
      <div className="floating-container">
        {floatingCircles.map(c => (
          <div
            key={c.id}
            className="float-bubble"
            style={{
              width: `${c.size}px`,
              height: `${c.size}px`,
              left: `${c.left}%`,
              top: `${c.top}%`,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
              opacity: c.opacity as any
            }}
          />
        ))}
      </div>

      <div className="dot-grid-overlay" />
      
      {/* Animated particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, opacity: 0.12 }} />

      <WrongNetworkBanner />

      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* Hero */}
        <section className="hero-section">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="page-eyebrow" style={{ color: '#3B82F6', fontWeight: 700, letterSpacing: '0.12em', justifyContent: 'center' }}>
              ✦ Autonomous Yield Operations Hub OS
            </div>

            <h1 className="page-title" style={{ color: '#0A0F2E' }}>
              Run Your Organization's Finances Invisibly On-Chain
            </h1>

            <p className="page-subtitle" style={{ color: '#475569', marginLeft: 'auto', marginRight: 'auto' }}>
              AI agents manage payments, optimize routing, and execute Yield Operations Hub operations autonomously.
              Yield Operations Hub — the Autonomous Financial Operating System for DAOs and enterprises.
            </p>

            {/* CTAs */}
            <div className="hero-buttons">
              <PriceBadge coinId="solana" label="MNT" />
              <ConnectButton type="solana" size="lg" toolColor="#3B82F6" />
              <Link href="/treasury/dashboard">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-indigo-pill"
                >
                  📊 View Dashboard
                </motion.button>
              </Link>
              <Link href="/treasury/dashboard">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-ghost-pill"
                >
                  🎯 Try Demo
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Stats Grid */}
        <section className="stats-grid-container">
          {/* Live badge + controls */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className={trustmesh.isLive ? 'badge-live' : 'badge-demo'}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: trustmesh.isLive ? '#3B82F6' : '#f59e0b', flexShrink: 0,
                  animation: trustmesh.isLive ? 'tPulse 1.4s ease-in-out infinite' : 'none',
                }} />
                {trustmesh.isLive
                  ? `Live · Mantle Sepolia · Block ${trustmesh.currentSlot.toLocaleString()}`
                  : 'Testnet Data — Connecting to Mantle Sepolia…'}
              </span>
              {trustmesh.isLive && (
                <button
                  onClick={copyOperator}
                  title={`Copy: ${TRUSTMESH_OWNER_WALLET}`}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {copied ? '✓ Copied' : `⎘ ${operatorShort}`}
                </button>
              )}
              <button
                onClick={trustmesh.refresh}
                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}
              >
                ↻ Refresh
              </button>
            </div>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                Last updated: {secsAgo(lastUpdated)}
              </span>
            )}
          </div>
          <style>{`@keyframes tPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="stats-grid"
          >
            {STATS.map((s, idx) => {
              let displayValue = s.value
              if (trustmesh.isLive) {
                if (idx === 0) displayValue = `◎ ${totalBudgetSol.toFixed(3)} MNT`
                if (idx === 1) displayValue = String(activeJobCount)
                if (idx === 3) displayValue = `#${trustmesh.currentSlot.toLocaleString()}`
              }
              const displayLabel = trustmesh.isLive && idx === 3 ? 'Mantle Sepolia Slot' : s.label
              const isLong = displayValue.length > 8
              return (
                <div key={s.label} className="stat-card">
                  <div>
                    <div className="stat-eyebrow">✦ Metric {idx + 1}</div>
                    <div
                      className="stat-number"
                      style={isLong ? { fontSize: 'clamp(14px, 1.8vw, 19px)' } : {}}
                      title={displayValue}
                    >
                      {displayValue}
                    </div>
                  </div>
                  <div className="stat-label">{displayLabel}</div>
                </div>
              )
            })}
          </motion.div>
        </section>

        {/* Feature Cards */}
        <section className="stats-grid-container">
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * i + 0.4, duration: 0.5 }}
                className="feature-card"
              >
                <div className="feature-icon" style={{ color: f.color }}>{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
                <div className="feature-detail" style={{ color: f.color }}>{f.detail}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Supported Chains */}
        <section className="stats-grid-container">
          <div className="chains-container">
            <div className="chains-title">Multi-Chain Support</div>
            <div className="chains-list">
              {SUPPORTED.map(c => (
                <div key={c.name} className="chain-pill">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                  <span className="chain-name">{c.name}</span>
                  <span className="chain-symbol" style={{ color: c.color }}>{c.symbol}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="stats-grid-container">
          <div className="quick-actions-card">
            <div className="eyebrow-cursive" style={{ justifyContent: 'center' }}>Get Started</div>
            <h2 className="qa-title">Ready to automate your Yield Operations Hub?</h2>
            <p className="qa-desc">
              Connect your wallet and let AI agents manage your finances autonomously.
            </p>
            <div className="hero-buttons" style={{ marginBottom: 0 }}>
              {[
                { href:'/treasury/dashboard', label:'📊 Dashboard',  color: '#3B82F6' },
                { href:'/treasury/send',      label:'💸 Send',       color: '#60A5FA' },
                { href:'/treasury/receive',   label:'📥 Receive',    color: '#93C5FD' },
                { href:'/treasury/swap',      label:'🔄 Swap',       color: '#34D399' },
                { href:'/treasury/analytics', label:'📉 Analytics',  color: '#60A5FA' },
                { href:'/treasury/pnl',       label:'📈 P&L',        color: '#34D399' },
                { href:'/treasury/tax',       label:'🧾 Tax Report', color: '#FBBF24' },
              ].map(a => (
                <Link key={a.href} href={a.href}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '12px',
                      border: `1px solid rgba(59, 130, 246, 0.25)`,
                      background: 'rgba(13, 20, 44, 0.65)',
                      color: '#F8FAFC',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = a.color
                      e.currentTarget.style.boxShadow = `0 0 15px ${a.color}40`
                      e.currentTarget.style.color = a.color
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.color = '#F8FAFC'
                    }}
                  >
                    {a.label}
                  </motion.button>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="footer-note">
          Yield Operations Hub is a production-ready financial OS. Connect your wallet to start managing treasury operations.
          All operations are non-custodial — your keys, your funds.
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '24px', fontSize: '12px', color: 'inherit', opacity: 0.6, fontWeight: 500 }}>
        Built by vsrupeshkumar
      </div>
    </div>
  )
}

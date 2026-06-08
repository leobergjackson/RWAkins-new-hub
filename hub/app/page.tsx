// Built by vsrupeshkumar
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, type Variants } from 'framer-motion'
import Link from 'next/link'
import { MessageCircle, ArrowUp, ArrowRight, ArrowUpRight, Check, X, FileText, Zap, Wallet, Shield, CreditCard, TrendingUp, Bot, Lock, RefreshCw, Search } from 'lucide-react'
import Navbar from './components/Navbar'
import LiveStatsStrip from '@/components/ui/LiveStatsStrip'

// ─── Animation variants ───────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}
const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }

function useWindowWidth(): number {
  const [w, setW] = useState(1200)
  useEffect(() => {
    setW(window.innerWidth)
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

function useCountUp(target: number, active: boolean): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf: number
    const t0 = performance.now()
    const dur = 1400
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target])
  return v
}

// ─── Shared utility components ────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'block', width: 24, height: 1, background: 'linear-gradient(90deg, #3B5BFA, #8B5CF6, #EC4899)' }} />
      <span className="gradient-text" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        {children}
      </span>
    </div>
  )
}

function GradBtn({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} style={{ display: 'inline-flex' }}>
      <Link href={href} className={`btn-gradient ${className}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        borderRadius: 999, padding: '14px 32px', fontSize: 16,
        fontWeight: 700, textDecoration: 'none', color: '#fff',
      }}>
        {children}
      </Link>
    </motion.div>
  )
}

function GhostBtn({ href, children, scroll = false }: { href: string; children: React.ReactNode; scroll?: boolean }) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} style={{ display: 'inline-flex' }}>
      <Link href={href} className="btn-ghost" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        borderRadius: 999, padding: '14px 32px', fontSize: 16,
        fontWeight: 600, textDecoration: 'none', color: '#0A0F2E',
      }}>
        {children}
      </Link>
    </motion.div>
  )
}

// ─── HERO ─────────────────────────────────────────────────────
function InvoiceCard() {
  return (
    <motion.div
      animate={{ y: [-8, 8, -8], rotate: [0, 1, -1, 0] }}
      transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      style={{
        width: 300, background: '#fff', borderRadius: 24,
        boxShadow: '0 40px 100px -20px rgba(59,91,250,0.25), 0 0 0 1px rgba(59,91,250,0.08)',
        padding: 28, display: 'flex', flexDirection: 'column', gap: 16,
        position: 'relative', zIndex: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #C8FF00, #86efac)',
          display: 'grid', placeItems: 'center',
        }}>
          <FileText size={16} color="#000" />
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '3px 10px', borderRadius: 999, background: 'rgba(59,91,250,0.08)', color: '#3B5BFA',
        }}>Mantle Sepolia</div>
      </div>

      {/* Amount */}
      <div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total Due</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: '#0A0F2E', letterSpacing: '-0.04em', lineHeight: 1 }}>$2,750</div>
        <div style={{ fontSize: 12, color: '#3B5BFA', marginTop: 4, fontWeight: 700 }}>USDC</div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
        {[
          ['Client', 'Startup Inc'],
          ['Service', 'Full-stack dev · 40h'],
          ['Due', 'Jun 28, 2026'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{k}</span>
            <span style={{ fontSize: 11, color: '#0A0F2E', fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Pay button */}
      <div style={{
        height: 44, background: 'linear-gradient(135deg, #3B5BFA, #8B5CF6)',
        borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: 14,
      }}>
        Pay with USDC →
      </div>
    </motion.div>
  )
}

function Hero() {
  const w = useWindowWidth()
  const isMobile = w < 768
  return (
    <section className="hero-bg grain" id="platform" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: '0 0 auto', height: 1, background: 'rgba(255,255,255,0.4)' }} />
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        padding: isMobile ? '120px 20px 80px' : '176px 24px 128px',
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr',
        gap: isMobile ? 48 : 64, alignItems: 'center',
      }}>
        {/* Left */}
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 28 }}>
          <motion.div variants={fadeUp}><Eyebrow>AI × RWA Financial OS · Mantle Sepolia</Eyebrow></motion.div>
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(44px, 7.4vw, 88px)', lineHeight: 1.02, fontWeight: 900, color: '#0A0F2E', letterSpacing: '-0.035em', margin: 0 }}>
            <span style={{ display: 'block' }}>Get Paid in</span>
            <span style={{ display: 'block' }}>USDC. <span className="gradient-text">Instantly.</span></span>
          </motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: 18, lineHeight: 1.65, color: '#475569', maxWidth: 520, margin: 0 }}>
            Paste any invoice — AI reads it, generates a payment link, client pays in seconds. No banks. No 8% fees. Live on Mantle Sepolia.
          </motion.p>
          <motion.div variants={fadeUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { icon: '⚡', color: '#3B5BFA', label: '100% On-Chain' },
              { icon: '🤖', color: '#8B5CF6', label: 'AI Invoice Parser' },
              { icon: '💲', color: '#10B981', label: 'USDC Native' },
            ].map(pill => (
              <div key={pill.label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.9)', borderRadius: 999,
                padding: '7px 14px',
                boxShadow: '0 2px 10px rgba(15,23,42,0.06)',
                fontSize: 13, fontWeight: 600, color: '#0A0F2E',
              }}>
                <span style={{ fontSize: 14 }}>{pill.icon}</span>
                {pill.label}
              </div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <GradBtn href="/invoice">Create Invoice <ArrowRight size={17} strokeWidth={2.2} /></GradBtn>
            <GhostBtn href="#how-it-works">See How It Works</GhostBtn>
          </motion.div>
          <motion.div variants={fadeUp} style={{ width: '100%' }}>
            <LiveStatsStrip />
          </motion.div>
          {/* Badges */}
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: 'rgba(40,160,240,0.08)', color: '#28a0f0',
              border: '1px solid rgba(40,160,240,0.2)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#28a0f0', display: 'inline-block' }} />
              Live on Mantle Sepolia
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: 'rgba(39,117,202,0.08)', color: '#2775CA',
              border: '1px solid rgba(39,117,202,0.2)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2775CA', display: 'inline-block' }} />
              Powered by USDC
            </div>
          </motion.div>
        </motion.div>

        {/* Right — floating invoice card */}
        {!isMobile && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
            {/* Background glow */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,91,250,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <InvoiceCard />
          </motion.div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 96, background: 'linear-gradient(to bottom, transparent, white)', pointerEvents: 'none' }} />
    </section>
  )
}

// ─── TRUST BAR ────────────────────────────────────────────────
const LOGOS = ['Mantle Network', 'USDY · Ondo', 'mETH', 'Groq AI', 'Wagmi', 'RainbowKit', 'Next.js', 'ERC-8004']
const CHAIN_SWATCHES: Record<string, string> = {
  'Mantle Network': 'linear-gradient(135deg,#000000,#3b4a5a)',
  'USDY · Ondo': 'linear-gradient(135deg,#2775CA,#1a5fa8)',
  'mETH': 'linear-gradient(135deg,#10B981,#059669)',
  'Groq AI': 'linear-gradient(135deg,#FF6B35,#F5A623)',
  'Wagmi': 'linear-gradient(135deg,#6366F1,#8B5CF6)',
  'RainbowKit': 'linear-gradient(135deg,#EC4899,#8B5CF6)',
  'Next.js': 'linear-gradient(135deg,#000,#444)',
  'ERC-8004': 'linear-gradient(135deg,#12AAFF,#0088cc)',
}

function TrustBar() {
  const doubled = [...LOGOS, ...LOGOS]
  return (
    <section style={{ background: '#fff', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '40px 0', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 24 }}>
        Powered by world-class blockchain infrastructure
      </div>
      <div style={{ position: 'relative' }}>
        <div className="marquee" style={{ display: 'flex', alignItems: 'center', gap: 56, whiteSpace: 'nowrap', width: 'max-content' }}>
          {doubled.map((name, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.5 }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: CHAIN_SWATCHES[name] || '#94A3B8', flexShrink: 0 }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#475569' }}>{name}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to right, #fff, transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to left, #fff, transparent)', pointerEvents: 'none' }} />
      </div>
    </section>
  )
}

// ─── HOW IT WORKS ─────────────────────────────────────────────
function HowItWorks() {
  const w = useWindowWidth()
  const cols = w < 768 ? 1 : 3
  const steps = [
    {
      num: '01',
      icon: <FileText size={28} color="#3B5BFA" />,
      title: 'Paste Your Invoice',
      desc: 'Drop any invoice text or PDF content. Groq AI reads it in seconds — extracts amount, client, due date automatically.',
      color: '#3B5BFA',
    },
    {
      num: '02',
      icon: <Zap size={28} color="#8B5CF6" />,
      title: 'Share Payment Link',
      desc: 'One link. Your client pays USDC directly on Mantle. No fees. No middlemen. No bank delays.',
      color: '#8B5CF6',
    },
    {
      num: '03',
      icon: <Wallet size={28} color="#10B981" />,
      title: 'Get Paid Instantly',
      desc: 'USDC lands in your wallet in seconds. Use it across the full Kubryx financial ecosystem.',
      color: '#10B981',
    },
  ]

  return (
    <section id="how-it-works" style={{ background: '#fff', padding: '112px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 64 }}>
          <motion.div variants={fadeUp}><Eyebrow>How It Works</Eyebrow></motion.div>
          <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(36px, 5.2vw, 60px)', fontWeight: 800, color: '#0A0F2E', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.05 }}>
            Three steps. <span className="gradient-text">One seamless flow.</span>
          </motion.h2>
          <motion.p variants={fadeUp} style={{ fontSize: 17, color: '#64748B', maxWidth: 560, margin: 0 }}>
            Stop bouncing between platforms. Paste, generate, get paid — all on-chain.
          </motion.p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24 }}>
          {steps.map((step, i) => (
            <motion.div key={i} variants={fadeUp} className="module-card" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 24, padding: 36, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${step.color}12`, display: 'grid', placeItems: 'center' }}>
                  {step.icon}
                </div>
                <span style={{ fontFamily: '"Fira Code",monospace', fontSize: 28, fontWeight: 900, color: `${step.color}30`, letterSpacing: '-0.04em' }}>{step.num}</span>
              </div>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0A0F2E', letterSpacing: '-0.02em', margin: '0 0 10px' }}>{step.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: '#64748B', margin: 0 }}>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <GradBtn href="/invoice">Create Your First Invoice <ArrowRight size={17} strokeWidth={2.2} /></GradBtn>
        </motion.div>
      </div>
    </section>
  )
}

// ─── STATS BAR ────────────────────────────────────────────────
function StatsBar() {
  const items = [
    '8 Financial Tools', 'ERC-8004 Agents', 'RWA Native (USDY/mETH)', 'AI Powered', 'Mantle Sepolia', '0% Platform Fees',
  ]
  return (
    <section style={{ background: 'linear-gradient(135deg, #F5F7FF 0%, #EEF2FF 100%)', padding: '40px 24px', borderTop: '1px solid #E0E7FF', borderBottom: '1px solid #E0E7FF' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0 }}>
        {items.map((item, i) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#3B5BFA', padding: '0 20px', letterSpacing: '-0.01em' }}>{item}</span>
            {i < items.length - 1 && <span style={{ color: '#C7D2FE', fontSize: 16 }}>·</span>}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── ECOSYSTEM SECTION ────────────────────────────────────────
const ECOSYSTEM_TOOLS = [
  {
    icon: '◈',
    name: 'Credit Passport',
    desc: 'Build your on-chain credit score',
    href: '/credit',
    color: '#06b6d4',
  },
  {
    icon: '◎',
    name: 'AI Lending',
    desc: 'Unlock instant liquidity against your USDC',
    href: '/lend',
    color: '#f59e0b',
  },
  {
    icon: '◆',
    name: 'Bill Split',
    desc: 'Split expenses with clients on-chain',
    href: '/split',
    color: '#3b82f6',
  },
  {
    icon: '◇',
    name: 'Yield Operations',
    desc: 'Put your USDC to work automatically',
    href: '/treasury',
    color: '#10b981',
  },
  {
    icon: '🔐',
    name: 'Private Vault',
    desc: 'Secure your assets cross-chain',
    href: '/vault',
    color: '#14b8a6',
  },
  {
    icon: '⬡',
    name: 'Agent Co-ordinator',
    desc: 'AI agents managing your finances',
    href: '/agents',
    color: '#6366f1',
  },
]

function Ecosystem() {
  const w = useWindowWidth()
  const cols = w < 640 ? 1 : w < 1024 ? 2 : 3
  return (
    <section style={{ background: '#fff', padding: '112px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, marginBottom: 56 }}>
          <motion.div variants={fadeUp}><Eyebrow>Your Full Financial OS</Eyebrow></motion.div>
          <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(36px, 5.2vw, 56px)', fontWeight: 800, color: '#0A0F2E', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.05 }}>
            Once you receive USDC —<br /><span className="gradient-text">do more with it.</span>
          </motion.h2>
          <motion.p variants={fadeUp} style={{ fontSize: 17, color: '#64748B', maxWidth: 540, margin: 0 }}>
            Eight powerful tools in one platform. Invoice is just the beginning.
          </motion.p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
          {ECOSYSTEM_TOOLS.map(tool => (
            <motion.div key={tool.href} variants={fadeUp}>
              <Link href={tool.href} style={{ textDecoration: 'none', display: 'block' }}>
                <div
                  className="module-card"
                  style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 20, padding: 24, cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = tool.color + '55' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 20, background: `${tool.color}18`, color: tool.color }}>{tool.icon}</span>
                    <span className="btn-gradient" style={{ width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
                      <ArrowUpRight size={14} strokeWidth={2.4} color="#fff" />
                    </span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0A0F2E', letterSpacing: '-0.02em', margin: '0 0 6px' }}>{tool.name}</h3>
                  <p style={{ fontSize: 13.5, color: '#64748B', margin: 0, lineHeight: 1.5 }}>{tool.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <Link href="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            borderRadius: 999, border: '1px solid #E2E8F0', color: '#0A0F2E',
            fontWeight: 600, padding: '12px 24px', fontSize: 15, textDecoration: 'none',
          }}>
            View Full Dashboard <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// ─── DASHBOARD PREVIEW ────────────────────────────────────────
function ActivityChart() {
  const W = 600, H = 160
  const pts = (seed: number) => {
    const a: number[] = []
    let v = 50 + seed * 6
    for (let i = 0; i <= 30; i++) {
      v += (Math.sin(i * 0.6 + seed) * 14) + (Math.cos(i * 0.3) * 6) + (seed === 1 ? 2 : seed === 2 ? 1.4 : 1)
      a.push(Math.max(8, Math.min(H - 12, v)))
    }
    return a
  }
  const toPath = (arr: number[], fill = false) => {
    const step = W / (arr.length - 1)
    let d = ''
    for (let i = 0; i < arr.length; i++) {
      const x = i * step
      const y = H - arr[i]
      if (i === 0) d += `M ${x} ${y}`
      else {
        const px = (i - 1) * step
        const py = H - arr[i - 1]
        const cx = (px + x) / 2
        d += ` C ${cx} ${py}, ${cx} ${y}, ${x} ${y}`
      }
    }
    if (fill) d += ` L ${W} ${H} L 0 ${H} Z`
    return d
  }
  const a = pts(1), b = pts(2), c = pts(3)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 160 }}>
      <defs>
        <linearGradient id="fillA" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" /><stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fillB" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#EC4899" stopOpacity="0.25" /><stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(p => <line key={p} x1="0" x2={W} y1={H * p} y2={H * p} stroke="rgba(255,255,255,0.05)" />)}
      <path d={toPath(a, true)} fill="url(#fillA)" />
      <path d={toPath(b, true)} fill="url(#fillB)" />
      <path d={toPath(a)} stroke="#A78BFA" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d={toPath(b)} stroke="#F472B6" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d={toPath(c)} stroke="#22D3EE" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="3 3" />
    </svg>
  )
}

function DashFrame() {
  const sideItems = [
    ['📄', 'Invoice', true],
    ['◈', 'Credit Passport'],
    ['⬟', 'Family Vault'],
    ['⬡', 'Agent Co-ordinator'],
    ['🔐', 'Private Vault'],
    ['◆', 'Bill Split'],
    ['◎', 'AI Lending'],
    ['◇', 'Yield Operations Hub'],
    ['▲', 'Stealth Execution Suite'],
  ]
  return (
    <div className="dash-tilt" style={{ maxWidth: 960, margin: '0 auto', borderRadius: 22, overflow: 'hidden', boxShadow: '0 50px 120px -30px rgba(15,23,42,0.45)', background: '#0A0F2E', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#0E1535', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 999, padding: '6px 12px', fontSize: 12, color: '#94A3B8', fontFamily: 'var(--font-mono, monospace)' }}>
          <Lock size={11} strokeWidth={2.2} /> kubryx.vercel.app/invoice
        </div>
        <RefreshCw size={14} strokeWidth={2.2} color="#94A3B8" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 520 }}>
        <aside style={{ background: '#0C1232', borderRight: '1px solid rgba(255,255,255,0.05)', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#3B5BFA,#EC4899)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>K</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Kubryx</span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sideItems.map(([icon, name, active]) => (
              <div key={String(name)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: active ? 'rgba(200,255,0,0.1)' : 'transparent',
                color: active ? '#C8FF00' : '#94A3B8',
              }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span>{name}</span>
              </div>
            ))}
          </nav>
        </aside>
        <main style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.16em', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>Invoice</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginTop: 2 }}>Create Payment Link</div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, border: '1px solid rgba(200,255,0,0.3)', background: 'rgba(200,255,0,0.1)', color: '#C8FF00' }}>
              <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#C8FF00' }} /> Mantle Sepolia
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            {[['$2,750', 'Invoice Amount', 'USDC'], ['< 3s', 'Settlement', 'On Mantle'], ['0%', 'Fees Taken', 'By Kubryx']].map(([n, label, sub], i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#475569', fontWeight: 700 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>{n}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#C8FF00' }}>{sub}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#475569', fontWeight: 700, marginBottom: 12 }}>Invoice Activity (30d)</div>
            <ActivityChart />
          </div>
        </main>
      </div>
    </div>
  )
}

function DashboardPreview() {
  return (
    <section style={{ padding: '112px 0', position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg, #EEF2FF 0%, #E0F2FE 100%)' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none', background: 'radial-gradient(40% 30% at 50% 20%, #fce7f3 0%, transparent 60%)' }} />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 48 }}>
          <motion.div variants={fadeUp}><Eyebrow>Live Product</Eyebrow></motion.div>
          <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, color: '#0A0F2E', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.05 }}>
            See it in <span className="gradient-text">action.</span>
          </motion.h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: 'easeOut' }}>
          <DashFrame />
        </motion.div>
      </div>
    </section>
  )
}

// ─── FINAL CTA ────────────────────────────────────────────────
function FinalCTA() {
  const w = useWindowWidth()
  const isMobile = w < 768
  return (
    <section style={{ background: '#fff', padding: '0 24px 80px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 32, padding: isMobile ? 40 : 64, background: 'linear-gradient(135deg, #3B5BFA 0%, #8B5CF6 50%, #EC4899 100%)' }}>
            <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', opacity: 0.3, background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr', gap: 40, alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.2)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#fff', marginBottom: 20 }}>
                  <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} /> Live on Mantle Sepolia
                </div>
                <h3 style={{ fontSize: 'clamp(34px, 4.5vw, 52px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.04, margin: '0 0 20px' }}>
                  Ready to get paid in USDC?
                </h3>
                <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', maxWidth: 480, lineHeight: 1.65, margin: 0 }}>
                  Create your first invoice in 60 seconds. No signup. No credit card. Just your wallet.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: isMobile ? 'stretch' : 'flex-end' }}>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/invoice" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 999, background: '#fff', color: '#0A0F2E', fontWeight: 700, padding: '16px 28px', fontSize: 15, textDecoration: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)' }}>
                    <span className="gradient-text">Create Invoice</span>
                    <ArrowRight size={17} strokeWidth={2.4} color="#0A0F2E" />
                  </Link>
                </motion.div>
                <Link href="/dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 999, border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 600, padding: '14px 28px', fontSize: 14, textDecoration: 'none' }}>
                  Full Dashboard
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── FOOTER ──────────────────────────────────────────────────
type FooterLink = { label: string; href: string; external?: boolean }
const FOOTER_COLS: Record<string, FooterLink[]> = {
  PLATFORM: [
    { label: 'Invoice',              href: '/invoice'  },
    { label: 'Credit Passport',      href: '/credit'   },
    { label: 'Family Vault',         href: '/legacy'   },
    { label: 'Agent Co-ordinator',   href: '/agents'   },
    { label: 'Private Vault',        href: '/vault'    },
    { label: 'Bill Split',           href: '/split'    },
    { label: 'AI Lending',           href: '/lend'     },
    { label: 'Yield Operations Hub', href: '/treasury' },
    { label: 'Stealth Execution Suite', href: '/shadow' },
  ],
  CHAINS: [
    { label: 'Mantle Sepolia', href: 'https://explorer.sepolia.mantle.xyz', external: true },
    { label: 'Mantle Network', href: 'https://explorer.mantle.xyz',         external: true },
    { label: 'Mantlescan',     href: 'https://sepolia.mantlescan.xyz',      external: true },
  ],
  RESOURCES: [
    { label: 'Smart Contracts', href: '/protocols'    },
    { label: 'API Docs',        href: '/developers'   },
    { label: 'Architecture',    href: '/architecture' },
  ],
  COMPANY: [
    { label: 'About',     href: '/story'    },
    { label: 'Ecosystem', href: '/ecosystem' },
    { label: 'Contact',   href: 'mailto:vijayakumarsasikalarupeshkumar@gmail.com', external: true },
  ],
}

function Footer() {
  return (
    <footer id="company" style={{ position: 'relative', background: '#0A0F2E', color: '#fff' }}>
      <div style={{ position: 'absolute', inset: '0 0 auto', height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)' }} />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px 40px', position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24, paddingBottom: 48, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #3B5BFA, #8B5CF6 55%, #EC4899)' }}>K</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Kubryx</span>
          </Link>
          <Link href="/invoice" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, padding: '10px 20px', fontSize: 14, textDecoration: 'none' }}>
            Create Invoice <ArrowRight size={15} strokeWidth={2.4} />
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 40, padding: '56px 0' }}>
          {Object.entries(FOOTER_COLS).map(([title, links]) => (
            <div key={title}>
              <div style={{ fontSize: 11.5, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(139,92,246,0.7)', marginBottom: 16 }}>{title}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {links.map(l => {
                  const linkStyle: React.CSSProperties = { fontSize: 14, color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }
                  const onEnter = (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = '#fff')
                  const onLeave = (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = '#94A3B8')
                  return (
                    <li key={l.label}>
                      {l.external ? (
                        <a href={l.href} target="_blank" rel="noopener noreferrer" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{l.label}</a>
                      ) : (
                        <Link href={l.href} style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{l.label}</Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ padding: '40px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 'clamp(60px, 14vw, 220px)', fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))', userSelect: 'none' }}>
            Kubryx
          </div>
        </div>
        <div style={{ paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 12, lineHeight: 1.6, color: 'rgba(148,163,184,0.7)', display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>© 2026 vsrupeshkumar. All Rights Reserved.</div>
          <p style={{ margin: 0 }}>This platform, including its source code, system architecture, infrastructure design, backend systems, frontend implementation, APIs, databases, UI/UX, production workflows, and all related intellectual property, was independently designed and developed by vsrupeshkumar as Founder, Architect, System Designer, Frontend Developer, Backend Developer, and Production Engineer.</p>
        </div>
      </div>
    </footer>
  )
}

// ─── EXTRAS ──────────────────────────────────────────────────
function CookieBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem('kbx_cookie_ok')) setTimeout(() => setShow(true), 1200)
  }, [])
  if (!show) return null
  return (
    <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 60, maxWidth: 360, background: '#fff', borderRadius: 20, padding: 16, boxShadow: '0 20px 50px -10px rgba(15,23,42,0.25)', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#FCE7F3,#EDE9FE)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>🍪</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0F2E' }}>A quick note about cookies</div>
        <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>We use cookies to improve your experience and remember your wallet preferences.</div>
      </div>
      <button onClick={() => { localStorage.setItem('kbx_cookie_ok', '1'); setShow(false) }} className="btn-gradient" style={{ borderRadius: 999, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0, color: '#fff' }}>
        Okay
      </button>
    </div>
  )
}

function ScrollTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const fn = () => setShow(window.scrollY > 400)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <motion.button
      initial={false}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 12 }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      style={{ position: 'fixed', bottom: 96, right: 100, zIndex: 60, width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1px solid #E2E8F0', cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 10px 24px -8px rgba(15,23,42,0.25)', pointerEvents: show ? 'auto' : 'none' }}
    >
      <ArrowUp size={16} strokeWidth={2.4} color="#0A0F2E" />
    </motion.button>
  )
}

// ─── MAIN EXPORT ─────────────────────────────────────────────
export default function Home() {
  return (
    <div style={{ background: '#fff', color: '#0A0F2E' }}>
      <Navbar />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <StatsBar />
      <Ecosystem />
      <DashboardPreview />
      <FinalCTA />
      <Footer />
      <CookieBanner />
      <ScrollTop />
    </div>
  )
}

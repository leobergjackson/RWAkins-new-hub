// Built by vsrupeshkumar
// RWAkins landing page — cloudy sky-blue / white "Turing Test hackathon" theme.
// Light cloud-sky background + vertical light rays + forest-green accents, with
// the dark-gold Credit Passport card kept as the floating, mouse-tilt centerpiece
// so it pops against the bright sky. CreditPassport3D is intentionally unchanged.
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import {
  ArrowRight, Bot, ShieldCheck, Play, ExternalLink, CheckCircle2,
  Coins, TrendingUp, ScrollText, Vote, Gauge, Sparkles, MessagesSquare,
} from 'lucide-react'
import deployed from '@/lib/rwa-deployed.json'

// Cloud-sky palette (matches the hackathon banner)
const NAVY = '#0A0F2E'
const SLATE = '#475569'
const FOREST = '#2f6b54'
const FOREST_DARK = '#163b2c'
const GREEN = '#4ADE80' // bright green — only used inside the dark gold card
const RED = '#F87171'

const DISPLAY = "'Clash Display', 'Plus Jakarta Sans', sans-serif"
const BODY = "'Satoshi', 'Plus Jakarta Sans', system-ui, sans-serif"
const MONO = "'Fira Code', 'JetBrains Mono', monospace"

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } },
}
const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }

function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: size * 0.3,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #163b2c, #2f6b54 55%, #3f9a73)',
        color: '#fff', fontWeight: 900, fontSize: size * 0.3, letterSpacing: '-0.03em',
        boxShadow: '0 4px 16px -4px rgba(22,59,44,0.45)',
      }}
    >
      RWA
    </span>
  )
}

/* ── Navbar — white glass pill, scroll-aware ── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        background: scrolled ? 'rgba(255,255,255,0.82)' : 'transparent',
        borderBottom: `1px solid ${scrolled ? 'rgba(15,23,42,0.08)' : 'transparent'}`,
        backdropFilter: scrolled ? 'blur(22px) saturate(140%)' : 'none',
        transition: 'background 0.25s, border-color 0.25s',
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: NAVY, textDecoration: 'none' }}>
        <LogoMark />
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19, letterSpacing: '-0.01em' }}>RWAkins</span>
      </Link>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        <Link href="/portfolio" className="cb-navlink-light" style={{ fontFamily: BODY }}>Portfolio</Link>
        <Link href="/credit" className="cb-navlink-light" style={{ fontFamily: BODY }}>Credit</Link>
        <Link href="/lend" className="cb-navlink-light" style={{ fontFamily: BODY }}>Borrow</Link>
        <Link href="/onboarding" className="cb-btn-green" style={{ padding: '10px 20px' }}>
          Launch App <ArrowRight size={15} />
        </Link>
      </nav>
    </header>
  )
}

/* ── Credit Passport 3D card — CSS perspective tilt, no 3D library ──
   DO NOT change: keeps its mouse-tilt + dark-gold look as the centerpiece. ── */
function CreditPassport3D() {
  const cardRef = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -18
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 18
    el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`
    el.style.transition = 'transform 0.08s ease'
  }
  const onLeave = () => {
    const el = cardRef.current
    if (!el) return
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
    el.style.transition = 'transform 0.6s cubic-bezier(0.2,0.8,0.2,1)'
  }

  return (
    <div style={{ width: '100%', maxWidth: 400, margin: '0 auto', height: 240 }} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div
        ref={cardRef}
        style={{
          position: 'relative', width: '100%', height: '100%', borderRadius: 24, padding: 26,
          overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 30px 80px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,197,24,0.06)',
          background:
            'radial-gradient(120% 80% at 20% 0%, rgba(245,197,24,0.35), transparent 60%), radial-gradient(120% 80% at 100% 100%, rgba(200,134,10,0.30), transparent 55%), linear-gradient(135deg, #10141F, #0A0E18)',
        }}
      >
        {/* Spinning conic gold border */}
        <div
          className="cb-spin"
          style={{
            position: 'absolute', inset: -1, borderRadius: 24, opacity: 0.55, pointerEvents: 'none',
            background: 'conic-gradient(from 0deg, rgba(245,197,24,0.8), rgba(200,134,10,0.8), rgba(245,197,24,0), rgba(245,197,24,0.8))',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: 1,
          }}
        />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
                RWAkins
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <span style={{ fontFamily: DISPLAY, fontSize: 60, fontWeight: 700, lineHeight: 0.9, background: 'linear-gradient(180deg, #fff, rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                  812
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>/ 900</span>
              </div>
            </div>
            {/* EMV-style gold chip */}
            <div style={{ width: 40, height: 30, borderRadius: 6, background: 'linear-gradient(135deg, #FFE57A, #C8860A)', boxShadow: 'inset 0 0 6px rgba(0,0,0,0.3)', opacity: 0.9 }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, fontFamily: MONO, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#34D399', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', width: 'fit-content' }}>
                ✓ Low risk · Band 1
              </span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Soulbound · RCRD
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
                Mantle • 5003
              </span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>0x0AB1…d727</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Hero — cloud-sky background (.hero-bg gives clouds + light rays) ── */
function HeroSection() {
  return (
    <section className="hero-bg grain" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '130px 20px 90px', overflow: 'hidden' }}>
      {/* soft green glow behind the card */}
      <div style={{ position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)', width: 540, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,107,84,0.16), transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

      <motion.div variants={stagger} initial="hidden" animate="visible" style={{ position: 'relative', zIndex: 1, maxWidth: 960, width: '100%', textAlign: 'center' }}>
        {/* Badge */}
        <motion.div variants={fadeUp} style={{ marginBottom: 26 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '7px 16px', borderRadius: 999, backdropFilter: 'blur(6px)', border: '1px solid rgba(47,107,84,0.25)', background: 'rgba(255,255,255,0.7)', fontFamily: MONO, fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', color: FOREST_DARK }}>
            <span>✦</span> AI × RWA · Live on Mantle Sepolia
          </span>
        </motion.div>

        {/* Headline — navy with a forest-green accent line */}
        <motion.h1 variants={fadeUp} style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 'clamp(44px, 8vw, 92px)', lineHeight: 0.98, letterSpacing: '-0.03em', margin: '0 0 24px', color: NAVY }}>
          <span style={{ display: 'block' }}>An AI CFO</span>
          <span className="gradient-text" style={{ display: 'block' }}>for real-world assets</span>
          <span style={{ display: 'block' }}>settled on Mantle.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p variants={fadeUp} style={{ fontFamily: BODY, fontSize: 'clamp(16px, 2.2vw, 20px)', color: SLATE, maxWidth: 660, margin: '0 auto 28px', lineHeight: 1.6 }}>
          Describe your goals in plain English. RWAkins rebalances <strong style={{ color: NAVY }}>USDY</strong> and{' '}
          <strong style={{ color: NAVY }}>mETH</strong>, earns you an on-chain credit score, and unlocks
          KYC-gated lending — every decision debated by an AI council and recorded on-chain.
        </motion.p>

        {/* Feature pills */}
        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
          {HERO_PILLS.map(({ Icon, label }) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 15px', borderRadius: 999, fontFamily: BODY, fontSize: 13, fontWeight: 500, color: NAVY, background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(15,23,42,0.08)', backdropFilter: 'blur(6px)', boxShadow: '0 4px 14px -8px rgba(15,23,42,0.2)' }}>
              <Icon size={14} color={FOREST} /> {label}
            </span>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          <Link href="/onboarding" className="cb-btn-green">
            Launch App <ArrowRight size={16} />
          </Link>
          <Link href="/portfolio" className="cb-btn-light-ghost">
            <Play size={15} /> See it live
          </Link>
        </motion.div>

        {/* 3D Credit Passport card — gentle float on the wrapper; the inner card
            keeps its mouse-tilt interaction untouched (do not remove). */}
        <motion.div variants={fadeUp}>
          <motion.div
            animate={{ y: [-9, 9, -9] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          >
            <CreditPassport3D />
          </motion.div>
        </motion.div>

        {/* Network badges */}
        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: 34 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: SLATE }}>Powered by</span>
          {NETWORKS.map(({ label, color }) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, fontFamily: MONO, fontSize: 12, fontWeight: 500, color: NAVY, background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(15,23,42,0.08)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: color, boxShadow: `0 0 7px ${color}` }} />
              {label}
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* white fade into the page below */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, transparent, #ffffff)', pointerEvents: 'none' }} />
    </section>
  )
}

const HERO_PILLS = [
  { Icon: Gauge, label: 'Autonomous rebalancing' },
  { Icon: Sparkles, label: 'Soulbound credit · 300–900' },
  { Icon: ShieldCheck, label: 'KYC-gated lending' },
]

const NETWORKS = [
  { label: 'Mantle Sepolia', color: FOREST },
  { label: 'USDY', color: '#E8A800' },
  { label: 'mETH', color: '#8B5CF6' },
]

/* ── Stats band ── */
const STATS = [
  { v: '7', l: 'contracts live on Mantle' },
  { v: 'USDY + mETH', l: 'dynamic dual-asset yield' },
  { v: '300–900', l: 'soulbound on-chain credit' },
  { v: 'KYC-gated', l: 'compliant RWA lending' },
]

const HOW_IT_WORKS = [
  { Icon: MessagesSquare, title: 'Describe your goals', body: 'Connect your wallet and tell your AI CFO what you want in plain English — "Keep savings above inflation, rotate into mETH when markets look bullish."' },
  { Icon: Bot, title: 'Intent → on-chain rules', body: 'An LLM converts your words into a structured, on-chain-safe wealth policy: risk level, target USDY/mETH split, rebalance thresholds.' },
  { Icon: Gauge, title: 'Continuous monitoring', body: 'The agent watches mETH price action, USDY yield, and ETH volatility on a live loop — looking for breaches of your rules.' },
  { Icon: Vote, title: 'The council debates & votes', body: 'A four-agent council debates each proposed rebalance, votes, and can veto. The mETH ceiling is enforced in code, never delegated to the model.' },
  { Icon: Coins, title: 'Executes on Mantle', body: 'When the council approves, the swap executes on Mantle Sepolia through a real AMM — a verifiable on-chain transaction with real slippage.' },
  { Icon: ScrollText, title: 'Every action, transparent', body: 'Each decision lands in a tamper-evident audit trail: the reasoning, the votes, the assets moved, and a tx hash linked to Mantlescan.' },
]

const COUNCIL = [
  { name: 'Market Analyst', desc: 'Reads price action and yield spreads to judge whether a rebalance improves risk-adjusted return.', color: FOREST },
  { name: 'Risk Guardian', desc: 'Enforces hard caps — mETH can never exceed your on-chain limit. Holds veto power.', color: RED },
  { name: 'Yield Optimizer', desc: 'Pushes capital toward the higher real yield between USDY treasuries and mETH staking.', color: '#16a34a' },
  { name: 'Execution Planner', desc: 'Sequences the swap, checks slippage, and records each move under a verifiable on-chain agent identity.', color: '#8B5CF6' },
]

const SUITE = [
  { href: '/insurance-risk-system', Icon: Gauge, t: 'AI Risk System', d: '5-dimension risk scoring of your live USDY/mETH position, anchored on-chain.' },
  { href: '/credit', Icon: Sparkles, t: 'Credit Passport', d: 'A soulbound (non-transferable) ERC-721 credit score earned from real on-chain behaviour.' },
  { href: '/lend', Icon: Coins, t: 'AI Lending', d: 'Borrow USDY against your RWAs — your credit score sets the LTV, KYC enforced on-chain.' },
  { href: '/compliance', Icon: ShieldCheck, t: 'Compliance + Audit', d: 'On-chain KYC gate, investment mandate, and a tamper-evident audit trail.' },
]

// Real deployed contracts — read straight from lib/rwa-deployed.json (no hardcoding).
const EXPLORER = 'https://sepolia.mantlescan.xyz/address/'
const deployedMap = deployed as unknown as Record<string, string>
const CONTRACTS: { label: string; key: string; tag: string }[] = [
  { label: 'AI CFO Vault', key: 'vault', tag: 'rebalances USDY/mETH' },
  { label: 'AMM (DEX)', key: 'amm', tag: 'x·y=k price discovery' },
  { label: 'USDY', key: 'usdy', tag: 'tokenized treasuries' },
  { label: 'mETH', key: 'meth', tag: 'liquid-staked ETH' },
  { label: 'Compliance / KYC', key: 'compliance', tag: 'on-chain KYC + audit' },
  { label: 'Credit Passport', key: 'creditPassport', tag: 'soulbound ERC-721' },
  { label: 'Lending', key: 'lending', tag: 'credit-gated borrow' },
]
const truncAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--cloud-bg)', backgroundAttachment: 'fixed', color: NAVY, minHeight: '100vh', overflowX: 'hidden', fontFamily: BODY }}>
      <Navbar />
      <HeroSection />

      {/* ── Stats band ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 90px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {STATS.map((s) => (
            <div key={s.l} style={{ padding: '28px 24px', textAlign: 'center', borderRadius: 18, background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 8px 30px -18px rgba(15,23,42,0.18)', backdropFilter: 'blur(8px)' }}>
              <div className="gradient-text" style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.v}</div>
              <div style={{ fontSize: 13, color: SLATE, marginTop: 6 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem / insight ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 90px', textAlign: 'center' }}>
        <p style={{ fontFamily: DISPLAY, fontSize: 'clamp(22px, 3.6vw, 34px)', fontWeight: 600, lineHeight: 1.35, letterSpacing: '-0.02em', margin: 0, color: NAVY }}>
          Most DeFi apps make <span style={{ color: 'rgba(10,15,46,0.4)' }}>you</span> decide when to rebalance.
          RWAkins removes that burden — <span className="gradient-text">the agent does it autonomously,</span> and shows its work the whole way.
        </p>
      </section>

      {/* ── How it works ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 100px' }}>
        <SectionHeader eyebrow="How it works" title="Perceive. Decide. Execute." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16, marginTop: 44 }}>
          {HOW_IT_WORKS.map(({ Icon, title, body }, i) => (
            <motion.div
              key={title}
              className="cb-card-light"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.05 }}
              style={card}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={iconBadge}><Icon size={18} color={FOREST} /></span>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color: 'rgba(10,15,46,0.4)', letterSpacing: '0.1em' }}>STEP {i + 1}</span>
              </div>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, margin: '0 0 8px', color: NAVY }}>{title}</h3>
              <p style={{ fontSize: 14, color: SLATE, lineHeight: 1.6, margin: 0 }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── The council ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 100px' }}>
        <SectionHeader eyebrow="The differentiator" title="Every decision debated by a four-agent council" />
        <p style={{ textAlign: 'center', color: SLATE, maxWidth: 620, margin: '18px auto 0', lineHeight: 1.6 }}>
          No black boxes. The reasoning is visible, the votes are recorded, and the outcomes are verifiable on Mantle.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 44 }}>
          {COUNCIL.map((a) => (
            <div key={a.name} className="cb-card-light" style={card}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: a.color, marginBottom: 14, boxShadow: `0 0 10px ${a.color}66` }} />
              <h3 style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: NAVY }}>{a.name}</h3>
              <p style={{ fontSize: 14, color: SLATE, lineHeight: 1.6, margin: 0 }}>{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The credit suite ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 100px' }}>
        <SectionHeader eyebrow="One on-chain loop" title="An AI × RWA credit economy, end to end" />
        <p style={{ textAlign: 'center', color: SLATE, maxWidth: 660, margin: '18px auto 0', lineHeight: 1.6 }}>
          Earn in the vault, build a soulbound reputation, and borrow against it — every step KYC-gated, risk-scored, and recorded on Mantle.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 44 }}>
          {SUITE.map(({ href, Icon, t, d }) => (
            <Link key={href} href={href} className="cb-card-light" style={{ ...card, textDecoration: 'none', color: NAVY, display: 'block' }}>
              <span style={iconBadge}><Icon size={18} color={FOREST} /></span>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600, margin: '14px 0 8px', color: NAVY }}>{t}</h3>
              <p style={{ fontSize: 13.5, color: SLATE, lineHeight: 1.6, margin: '0 0 12px' }}>{d}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: FOREST }}>
                Open <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Deployed contracts (proof, dynamic from rwa-deployed.json) ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 100px' }}>
        <SectionHeader eyebrow="Live & verifiable" title="Deployed on Mantle Sepolia" />
        <p style={{ textAlign: 'center', color: SLATE, maxWidth: 640, margin: '18px auto 0', lineHeight: 1.6 }}>
          Not a mockup — {CONTRACTS.filter((c) => typeof deployedMap[c.key] === 'string' && deployedMap[c.key].length === 42).length} live smart contracts on Mantle Sepolia
          (chain {String(deployedMap.chainId ?? '5003')}). Every address is real and inspectable on the explorer.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 40 }}>
          {CONTRACTS.filter((c) => typeof deployedMap[c.key] === 'string' && deployedMap[c.key].length === 42).map((c) => (
            <a
              key={c.key}
              href={`${EXPLORER}${deployedMap[c.key]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cb-card-light"
              style={{ ...card, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(47,107,84,0.1)', border: '1px solid rgba(47,107,84,0.25)' }}>
                <CheckCircle2 size={17} color={FOREST} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{c.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: FOREST }}>{truncAddr(deployedMap[c.key])}</div>
                <div style={{ fontSize: 11.5, color: SLATE, marginTop: 2 }}>{c.tag}</div>
              </div>
              <ExternalLink size={15} color={SLATE} />
            </a>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ maxWidth: 780, margin: '0 auto', padding: '0 20px 110px', textAlign: 'center' }}>
        <div style={{ padding: '52px 32px', borderRadius: 24, border: '1px solid rgba(47,107,84,0.2)', background: 'radial-gradient(120% 100% at 50% 0%, rgba(47,107,84,0.08), transparent 60%), rgba(255,255,255,0.7)', boxShadow: '0 20px 60px -28px rgba(15,23,42,0.2)' }}>
          <span style={{ width: 52, height: 52, borderRadius: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(47,107,84,0.12)', border: '1px solid rgba(47,107,84,0.3)', marginBottom: 20 }}>
            <TrendingUp size={26} color={FOREST} />
          </span>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 14px', color: NAVY }}>
            Put your treasury on autopilot
          </h2>
          <p style={{ fontSize: 16, color: SLATE, margin: '0 auto 30px', lineHeight: 1.6, maxWidth: 480 }}>
            Connect a wallet on Mantle Sepolia, set your rules once, and let the council manage the rest.
          </p>
          <Link href="/onboarding" className="cb-btn-green" style={{ padding: '15px 32px', fontSize: 15 }}>
            Launch RWAkins <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(15,23,42,0.08)', padding: '30px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
          <LogoMark size={24} />
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, color: NAVY }}>RWAkins</span>
        </div>
        <p style={{ fontSize: 13, color: SLATE, margin: 0 }}>
          Hackathon prototype on Mantle Sepolia testnet. AI × RWA · Turing Test Hackathon 2026.
        </p>
      </footer>
    </div>
  )
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, fontFamily: MONO, fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.15em', color: FOREST_DARK, background: 'rgba(47,107,84,0.1)', border: '1px solid rgba(47,107,84,0.22)' }}>
          {eyebrow}
        </span>
      </div>
      <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 700, letterSpacing: '-0.025em', margin: 0, color: NAVY }}>{title}</h2>
    </div>
  )
}

const card: React.CSSProperties = {
  padding: 24, borderRadius: 18,
  background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(15,23,42,0.08)',
  boxShadow: '0 16px 48px -20px rgba(47,107,84,0.22), 0 2px 10px -6px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.6)',
  backdropFilter: 'blur(16px) saturate(160%)',
}

const iconBadge: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(47,107,84,0.1)', border: '1px solid rgba(47,107,84,0.22)',
}

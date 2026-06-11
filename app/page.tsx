// Built by vsrupeshkumar
// RWAkins landing page — an AI CFO for real-world asset portfolios.
// Self-contained (own navbar + footer), dark agent aesthetic matching
// /onboarding and /portfolio. All CTAs route into the live app.
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import {
  ArrowRight, Bot, ShieldCheck, Activity, PieChart, MessagesSquare,
  Coins, TrendingUp, ScrollText, Vote, Eye, Gauge,
} from 'lucide-react'

const TEAL = '#2dd4bf'
const PURPLE = '#a78bfa'
const BG = '#080808'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}
const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: size * 0.3,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${TEAL}, ${PURPLE})`,
        color: BG, fontWeight: 900, fontSize: size * 0.32, letterSpacing: '-0.03em',
      }}
    >
      RWA
    </span>
  )
}

function gradientText(text: string) {
  return (
    <span style={{ background: `linear-gradient(90deg, ${TEAL}, ${PURPLE})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
      {text}
    </span>
  )
}

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
        background: scrolled ? 'rgba(8,8,8,0.85)' : 'transparent',
        borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.06)' : 'transparent'}`,
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        transition: 'background 0.25s, border-color 0.25s',
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', textDecoration: 'none' }}>
        <LogoMark />
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em' }}>RWAkins</span>
      </Link>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/onboarding" style={ctaStyle}>
          Launch App <ArrowRight size={16} />
        </Link>
      </nav>
    </header>
  )
}

const ctaStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 18px', borderRadius: 999, fontSize: 14, fontWeight: 700,
  color: BG, textDecoration: 'none',
  background: `linear-gradient(135deg, ${TEAL}, ${PURPLE})`,
}

const ghostStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '12px 22px', borderRadius: 999, fontSize: 15, fontWeight: 600,
  color: '#fff', textDecoration: 'none',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
        color: TEAL, background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)',
      }}
    >
      {children}
    </span>
  )
}

const HOW_IT_WORKS = [
  { Icon: MessagesSquare, title: 'Describe your goals', body: 'Connect your wallet and tell your AI CFO what you want in plain English — "Keep savings above inflation, rotate into mETH when markets look bullish."' },
  { Icon: Bot, title: 'Intent → on-chain rules', body: 'GPT-4o-mini converts your words into a structured, on-chain-safe wealth policy: risk level, target USDY/mETH split, rebalance thresholds.' },
  { Icon: Gauge, title: 'Continuous market monitoring', body: 'The agent watches mETH price action, USDY yield, and ETH volatility on a live loop — looking for breaches of your rules.' },
  { Icon: Vote, title: 'The council debates & votes', body: 'A four-agent council (Market Analyst, Risk Guardian, Yield Optimizer, Compliance) debates each proposed rebalance, votes, and can veto.' },
  { Icon: Coins, title: 'Executes on Mantle', body: 'When the council approves, the swap executes on Mantle Sepolia via the Byreal Skills CLI — a real, verifiable on-chain transaction.' },
  { Icon: ScrollText, title: 'Every action, transparent', body: 'Each decision lands in your activity feed: the reasoning, the votes, the assets moved, and a tx hash linked to the Mantle explorer.' },
]

const COUNCIL = [
  { name: 'Market Analyst', desc: 'Reads price action and yield spreads to judge whether a rebalance improves risk-adjusted return.', color: TEAL },
  { name: 'Risk Guardian', desc: 'Enforces hard caps — mETH can never exceed your on-chain limit. Holds veto power.', color: '#f87171' },
  { name: 'Yield Optimizer', desc: 'Pushes capital toward the higher real yield between USDY treasuries and mETH staking.', color: PURPLE },
  { name: 'Compliance', desc: 'Checks each move against your stated mandate and records it under the ERC-8004 agent identity standard.', color: '#fbbf24' },
]

export default function LandingPage() {
  return (
    <div style={{ background: BG, color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>
      <Navbar />

      {/* ── Hero ───────────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '160px 20px 90px', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}22, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ position: 'relative' }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 24 }}>
            <Pill><Bot size={13} /> AI × RWA · Mantle Sepolia · Turing Test Hackathon 2026</Pill>
          </motion.div>
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(40px, 7vw, 76px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.035em', margin: '0 0 22px' }}>
            An {gradientText('AI CFO')} for your<br />real-world asset portfolio
          </motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: 'clamp(16px, 2.2vw, 20px)', color: 'rgba(255,255,255,0.6)', maxWidth: 640, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Describe your goals in plain English. RWAkins continuously rebalances between{' '}
            <strong style={{ color: '#fff' }}>USDY</strong> (tokenized treasuries) and{' '}
            <strong style={{ color: '#fff' }}>mETH</strong> (liquid-staked ETH) — with every decision debated by a
            transparent AI council and recorded on-chain.
          </motion.p>
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/onboarding" style={{ ...ctaStyle, padding: '14px 28px', fontSize: 16 }}>
              Configure your AI CFO <ArrowRight size={18} />
            </Link>
            <Link href="/activity" style={ghostStyle}>
              See the activity feed
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Problem / insight ──────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 80px', textAlign: 'center' }}>
        <p style={{ fontSize: 'clamp(20px, 3.4vw, 30px)', fontWeight: 700, lineHeight: 1.4, letterSpacing: '-0.02em', margin: 0 }}>
          Most DeFi apps make <span style={{ color: 'rgba(255,255,255,0.45)' }}>you</span> decide when to rebalance.
          RWAkins removes that burden entirely — {gradientText('the agent does it autonomously,')} and shows its work the whole way.
        </p>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section id="how" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 90px' }}>
        <SectionHeader eyebrow="How it works" title="Perceive. Decide. Execute." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 40 }}>
          {HOW_IT_WORKS.map(({ Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.05 }}
              style={card}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={iconBadge}><Icon size={18} color={TEAL} /></span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>STEP {i + 1}</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>{title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── The council ────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 90px' }}>
        <SectionHeader eyebrow="The differentiator" title="Every decision debated by a four-agent council" />
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', maxWidth: 620, margin: '16px auto 0', lineHeight: 1.6 }}>
          No black boxes. The reasoning is visible, the votes are recorded, and the outcomes are verifiable on Mantle.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 40 }}>
          {COUNCIL.map((a) => (
            <div key={a.name} style={card}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: a.color, marginBottom: 14 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{a.name}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature strip ──────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 90px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            { Icon: PieChart, t: 'Live portfolio', d: 'Real on-chain balances, allocation, and yield — updated from Mantle.' },
            { Icon: ShieldCheck, t: 'On-chain risk caps', d: 'Your mETH ceiling is enforced by the vault contract, not a suggestion.' },
            { Icon: Eye, t: 'ERC-8004 identity', d: 'Agent decisions logged under a verifiable on-chain agent identity.' },
            { Icon: Activity, t: 'Verifiable feed', d: 'Every rebalance carries a tx hash linked to the Mantle explorer.' },
          ].map(({ Icon, t, d }) => (
            <div key={t} style={{ ...card, padding: 22 }}>
              <Icon size={22} color={PURPLE} style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>{t}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px 100px', textAlign: 'center' }}>
        <div style={{ ...card, padding: '48px 32px', background: `linear-gradient(180deg, rgba(45,212,191,0.06), rgba(167,139,250,0.04))` }}>
          <TrendingUp size={28} color={TEAL} style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
            Put your treasury on autopilot
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', margin: '0 0 28px', lineHeight: 1.6 }}>
            Connect a wallet on Mantle Sepolia, set your rules once, and let the council manage the rest.
          </p>
          <Link href="/onboarding" style={{ ...ctaStyle, padding: '14px 28px', fontSize: 16 }}>
            Launch RWAkins <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
          <LogoMark size={24} />
          <span style={{ fontWeight: 700 }}>RWAkins</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Hackathon prototype on Mantle Sepolia testnet — not a production financial product. AI × RWA · Turing Test Hackathon 2026.
        </p>
      </footer>
    </div>
  )
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Pill>{eyebrow}</Pill></div>
      <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>{title}</h2>
    </div>
  )
}

const card: React.CSSProperties = {
  padding: 24, borderRadius: 18,
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
}

const iconBadge: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)',
}

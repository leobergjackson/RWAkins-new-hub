// Built by vsrupeshkumar
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import {
  ACTIVITY_30D, ACTIVITY_7D, ACTIVITY_1D, ACTIVITY_ALL, DASH_STATS,
} from '@/lib/dashboard-fallbacks'
import type { ChartPoint } from '@/lib/dashboard-fallbacks'
import ActivityFeed from '@/components/ActivityFeed'
import { useDashboard } from '@/hooks/useDashboard'
import ToolQuickAccess from '@/components/ToolQuickAccess'
import { PriceTicker } from '@/components/ui/PriceTicker'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { WrongNetworkBanner } from '@/components/wallet/WrongNetwork'
import { useKubrykPlatform } from '@/context/KubrykPlatformContext'
import { getCreditTier } from '@/lib/platform/scoring'
import { PlatformModeBadge } from '@/components/ui/PlatformModeBadge'
import LiveCrossChainPulse from '@/components/ui/LiveCrossChainPulse'
import DailyBriefing from '@/components/ui/DailyBriefing'

/* ── Theme — light, landing-page aesthetic ──────────── */
const BG      = '#FAFBFF'
const SIDE    = '#FFFFFF'
const INK     = '#0A0F2E'
const ACCENT  = '#6366f1'
const PINK    = '#ec4899'
const CYAN    = '#06b6d4'
const GREEN   = '#10b981'
const BORDER  = 'rgba(15,23,42,0.08)'
const MONO    = '"Fira Code","JetBrains Mono",monospace'
const MUTED   = 'rgba(15,23,42,0.62)'
const MUTED2  = 'rgba(15,23,42,0.4)'

/* ── Navigation items ───────────────────────────────── */
const NAV = [
  { icon: '◉', label: 'Overview',        href: '/dashboard' },
  { icon: '◈', label: 'Credit Passport', href: '/credit'    },
  { icon: '⬟', label: 'Family Vault',    href: '/legacy'    },
  { icon: '⬡', label: 'Agent Coordinator',      href: '/agents'    },
  { icon: '🔐', label: 'Private Vault',   href: '/vault'     },
  { icon: '◆', label: 'Bill Split',       href: '/split'     },
  { icon: '◎', label: 'AI Lending',      href: '/lend'      },
  { icon: '◇', label: 'Yield Operations Hub',     href: '/treasury'  },
  { icon: '▲', label: 'Stealth Execution Suite',       href: '/shadow'    },
]

type TimeRange = '1D' | '7D' | '30D' | 'All'

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 21) return 'Good evening'
  return 'Good night'
}

function chartDataForRange(range: TimeRange): ChartPoint[] {
  if (range === '1D')  return ACTIVITY_1D
  if (range === '7D')  return ACTIVITY_7D
  if (range === 'All') return ACTIVITY_ALL
  return ACTIVITY_30D
}

/* ── Sidebar ────────────────────────────────────────── */
function DashSidebar({
  mobileOpen, onMobileClose, wallet, onDisconnect, isMobile,
}: {
  mobileOpen: boolean
  onMobileClose: () => void
  wallet: string
  onDisconnect: () => void
  isMobile: boolean
}) {
  const pathname = usePathname()
  const platform = useKubrykPlatform()
  const tier = getCreditTier(platform.creditScore)

  const transform = isMobile
    ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)')
    : 'translateX(0)'

  return (
    <>
      {isMobile && mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 49 }}
        />
      )}
      <aside style={{
        position: isMobile ? 'fixed' : 'relative',
        top: 0, left: 0, bottom: 0,
        width: 250,
        background: SIDE,
        borderRight: `1px solid ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        flexShrink: 0,
        transform,
        transition: 'transform 0.22s ease',
        height: isMobile ? '100vh' : '100%',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '20px 16px 16px',
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${ACCENT}, #8B5CF6)`,
            display: 'grid', placeItems: 'center',
            fontSize: 14, fontWeight: 900, color: '#fff',
          }}>K</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: INK, letterSpacing: '-0.02em' }}>Kubryx</span>
        </div>

        {/* Nav items */}
        <nav style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={isMobile ? onMobileClose : undefined}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? INK : MUTED,
                  background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.08))' : 'transparent',
                  border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.04)'
                  if (!active) (e.currentTarget as HTMLElement).style.color = INK
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  if (!active) (e.currentTarget as HTMLElement).style.color = MUTED
                }}
              >
                <span style={{ width: 18, textAlign: 'center', fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Credit identity mini-card */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{
            background: `linear-gradient(135deg, ${tier.color}12, rgba(99,102,241,0.04))`,
            border: `1px solid ${tier.color}30`,
            borderRadius: 12,
            padding: 12,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: tier.color, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, fontFamily: MONO }}>
              Credit Identity
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: INK, fontFamily: MONO, lineHeight: 1 }}>
                {platform.creditScore}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, color: tier.color,
                background: `${tier.color}20`, borderRadius: 999,
                padding: '2px 7px', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {tier.name}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: MUTED2 }}>Vault</span>
              <span style={{ fontSize: 10, fontWeight: 600, fontFamily: MONO, color: platform.vaultActive ? GREEN : MUTED2 }}>
                {platform.vaultActive ? '● Active' : '○ Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Wallet card */}
        <div style={{ padding: 16 }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.06))',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 12,
            padding: 12,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '0.14em', marginBottom: 6 }}>
              WALLET
            </div>
            <div style={{ fontFamily: MONO, fontSize: 13, color: INK, marginBottom: 4, fontWeight: 700 }}>
              {wallet
                ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
                : '0x9F3C…E3A1'}
            </div>
            <div style={{ fontSize: 11, color: MUTED2, marginBottom: 10 }}>
              QIE • Solana • Stellar • ETH
            </div>
            <button
              onClick={onDisconnect}
              style={{
                background: 'transparent', border: 'none',
                color: MUTED, fontSize: 11, cursor: 'pointer', padding: 0,
                transition: 'color 0.15s',
                fontWeight: 600,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = PINK)}
              onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
            >
              Disconnect
            </button>
          </div>

          {/* Subtle footer glow */}
          <div style={{
            marginTop: 16,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${ACCENT}55, transparent)`,
          }} />
        </div>
      </aside>
    </>
  )
}

/* ── Stat card ──────────────────────────────────────── */
interface StatCardData {
  label: string
  value: string
  sub: string
  bg: string
  border: string
  subColor: string
  icon: string
  accent: string
}

function StatCard({ card }: { card: StatCardData }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        backgroundImage: `linear-gradient(135deg, ${card.bg} 0%, rgba(255,255,255,0.95) 70%)`,
        border: `1px solid ${hov ? card.border : BORDER}`,
        borderRadius: 18,
        padding: '20px 22px',
        transform: hov ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hov ? `0 16px 40px ${card.accent}25, 0 4px 12px rgba(15,23,42,0.06)` : '0 4px 14px rgba(15,23,42,0.05)',
        transition: 'all 0.25s ease',
        cursor: 'default',
        overflow: 'hidden',
      }}
    >
      {/* Glow orb in corner */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: '50%',
        background: card.accent,
        filter: 'blur(50px)',
        opacity: hov ? 0.28 : 0.16,
        transition: 'opacity 0.25s',
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(15,23,42,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {card.label}
        </div>
        <div style={{
          width: 32, height: 32,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${card.accent}, ${card.accent}88)`,
          color: '#fff',
          display: 'grid', placeItems: 'center',
          fontSize: 15,
          fontWeight: 800,
          boxShadow: `0 6px 16px ${card.accent}40`,
        }}>
          {card.icon}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14, position: 'relative' }}>
        <span style={{ fontSize: 36, fontWeight: 900, color: INK, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: '"Inter",system-ui,sans-serif' }}>
          {card.value}
        </span>
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: card.accent, marginTop: 8, position: 'relative' }}>
        {card.sub}
      </div>
    </div>
  )
}

/* ── Protocol Activity (chart + controls) ───────────── */
const TOOLTIP_STYLE = {
  contentStyle: { background: '#fff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.1)' },
  labelStyle: { color: MUTED2 },
  itemStyle: { color: INK },
}

function ProtocolActivity() {
  const [range, setRange] = useState<TimeRange>('30D')
  const [data, setData] = useState<ChartPoint[]>(ACTIVITY_30D)
  const [mounted, setMounted] = useState(false)
  const [fadeKey, setFadeKey] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  function changeRange(r: TimeRange) {
    setRange(r)
    setFadeKey(k => k + 1)
    setData(chartDataForRange(r))
  }

  return (
    <div style={{ margin: '24px', marginTop: 0 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED2 }}>
            Protocol Activity
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 2 }}>
            Last {range === '1D' ? '24 hours' : range === '7D' ? '7 days' : range === '30D' ? '30 days' : 'all time'}
          </div>
        </div>
        {/* Time range buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['1D', '7D', '30D', 'All'] as TimeRange[]).map(r => (
            <button
              key={r}
              onClick={() => changeRange(r)}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                border: `1px solid ${range === r ? ACCENT : BORDER}`,
                background: range === r ? `linear-gradient(135deg, ${ACCENT}, ${PINK})` : '#fff',
                color: range === r ? '#fff' : MUTED,
                fontSize: 12, fontWeight: range === r ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: range === r ? `0 4px 14px ${ACCENT}40` : '0 1px 4px rgba(15,23,42,0.04)',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div key={fadeKey} style={{
        background: '#FFFFFF',
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: '20px 16px 12px',
        marginTop: 12,
        animation: 'fadein 0.3s ease',
        boxShadow: '0 4px 18px rgba(15,23,42,0.05)',
      }}>
        {mounted ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={PINK} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={PINK} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CYAN} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(15,23,42,0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: MUTED2, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: MUTED2, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}`}
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="operations"
                name="Operations"
                stroke={PINK}
                strokeWidth={2}
                fill="url(#pinkGrad)"
                dot={false}
                activeDot={{ r: 4, fill: PINK }}
              />
              <Area
                type="monotone"
                dataKey="transactions"
                name="Transactions"
                stroke={CYAN}
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#cyanGrad)"
                dot={false}
                activeDot={{ r: 4, fill: CYAN }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED2, fontSize: 12 }}>
            Loading chart…
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 24, marginTop: 12, justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: MUTED }}>
            <span style={{ width: 20, height: 2, background: PINK, display: 'inline-block' }} />
            Operations
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: MUTED }}>
            <span style={{ width: 20, height: 2, background: CYAN, display: 'inline-block', borderTop: `2px dashed ${CYAN}` }} />
            Transactions
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Search ─────────────────────────────────────────── */
function SearchBar() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const results = q.trim()
    ? NAV.filter(n => n.label.toLowerCase().includes(q.toLowerCase()))
    : []

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.08)',
        border: `1px solid ${open ? 'rgba(99,102,241,0.5)' : BORDER}`,
        borderRadius: 8, padding: '7px 12px',
        transition: 'border-color 0.15s',
      }}>
        <span style={{ fontSize: 13, color: MUTED2 }}>🔍</span>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => e.key === 'Escape' && setOpen(false)}
          placeholder="search tools"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 13, width: 160,
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: '#0f1430', border: `1px solid ${BORDER}`,
          borderRadius: 8, overflow: 'hidden', zIndex: 100,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}>
          {results.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => { setOpen(false); setQ('') }}
              style={{
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', fontSize: 13, color: MUTED,
                borderBottom: `1px solid rgba(255,255,255,0.04)`,
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
                ;(e.currentTarget as HTMLElement).style.color = '#fff'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = MUTED
              }}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main page ──────────────────────────────────────── */
export default function DashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [wallet, setWallet] = useState('')
  const [greeting] = useState(getGreeting)
  const [liveAgents, setLiveAgents] = useState<number | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  const { stats, loading: dashLoading } = useDashboard()
  const platform = useKubrykPlatform()
  const creditTier = getCreditTier(platform.creditScore)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const tmUrl = process.env.NEXT_PUBLIC_TRUSTMESH_URL
    if (!tmUrl) return
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    fetch(`${tmUrl}/api/v1/stats/global`, { signal: ctrl.signal })
      .then(r => { if (r.ok) return r.json() as Promise<{ totalAgents?: number }>; throw new Error('') })
      .then(d => { if (typeof d.totalAgents === 'number') setLiveAgents(d.totalAgents) })
      .catch(() => {})
      .finally(() => clearTimeout(timer))
    return () => { ctrl.abort(); clearTimeout(timer) }
  }, [])

  // Tick secondsAgo every second so "Last updated X ago" stays current
  useEffect(() => {
    if (!stats) return
    setSecondsAgo(0)
    const tick = setInterval(() => setSecondsAgo(s => s + 1), 1000)
    return () => clearInterval(tick)
  }, [stats])

  const backendsLiveStr = stats
    ? `${stats.backendsLive}/${stats.backendsTotal}`
    : dashLoading ? '…' : '5/6'

  const activeToolsValue = stats
    ? stats.backendsLive.toString()
    : dashLoading ? '…' : DASH_STATS.tools.toString()

  const lastUpdatedSub = stats
    ? secondsAgo < 5 ? 'Just updated' : `Updated ${secondsAgo}s ago`
    : DASH_STATS.uptimeSub

  const statCards: StatCardData[] = [
    { label: 'Active Tools',  value: activeToolsValue,                                               sub: 'backends live',                                          bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.3)',  subColor: '#6366f1', icon: '◈', accent: '#6366f1' },
    { label: 'Chains',        value: DASH_STATS.chains.toString(),                                   sub: DASH_STATS.chainsSub,                                     bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.3)',   subColor: '#06b6d4', icon: '⛓', accent: '#06b6d4' },
    { label: 'Active Agents', value: liveAgents !== null ? liveAgents.toLocaleString() : '—',        sub: liveAgents !== null ? 'via TrustMesh' : 'loading…',       bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.3)',  subColor: '#10b981', icon: '⬡', accent: '#10b981' },
    { label: 'Backends Live', value: backendsLiveStr,                                                sub: lastUpdatedSub,                                           bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.3)',  subColor: '#ec4899', icon: '◎', accent: '#ec4899' },
  ]

  function handleDisconnect() {
    setWallet('')
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      background: BG,
      color: INK,
      fontFamily: '"Inter",system-ui,sans-serif',
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <DashSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        wallet={wallet}
        onDisconnect={handleDisconnect}
        isMobile={isMobile}
      />

      {/* Main panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
        {/* Ambient gradient + floating orbs — light theme, soft pastel auras */}
        <div aria-hidden="true" style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -260, left: -120, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%)', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', top: 180, right: -180, width: 620, height: 620, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.18), transparent 70%)', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', bottom: -220, left: '30%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.15), transparent 70%)', filter: 'blur(70px)' }} />
          {/* Diagonal stripe texture, very soft */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(99,102,241,0.05) 0px, rgba(99,102,241,0.05) 1px, transparent 1px, transparent 14px)',
            maskImage: 'linear-gradient(to bottom, black 20%, transparent 90%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 90%)',
          }} />
        </div>

        {/* Header */}
        <header style={{
          flexShrink: 0,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: `1px solid ${BORDER}`,
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          gap: 12,
        }}>
          {/* Left — mobile hamburger + breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button aria-label="Toggle Menu" onClick={() => setMobileOpen(v => !v)} style={{
                background: 'none', border: `1px solid ${BORDER}`, color: MUTED,
                borderRadius: 8, width: 36, height: 36, display: 'grid', placeItems: 'center',
                cursor: 'pointer', fontSize: 16, flexShrink: 0,
              }}>☰</button>
            )}
            <div style={{ fontSize: 13, color: MUTED, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: ACCENT, fontSize: 14 }}>✦</span>
              <span style={{ fontWeight: 700, color: INK }}>Kubryx</span>
              <span style={{ color: MUTED2 }}>/</span>
              <span style={{ color: MUTED2 }}>Overview</span>
            </div>
          </div>

          {/* Right — search + status + wallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isMobile && <SearchBar />}
            {(() => {
              const isLive = stats ? stats.isLive : true
              const badgeClass = isLive ? 'badge-live' : 'badge-demo'
              const badgeLabel = isMobile
                ? (isLive ? 'Live' : 'Degraded')
                : (isLive ? 'Live Dashboard' : 'Partial Outage')
              return (
                <div className={badgeClass}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLive ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
                  {badgeLabel}
                </div>
              )
            })()}
            <ConnectButton type="auto" size="sm" />
          </div>
        </header>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>

          {/* Hero greeting strip */}
          <section style={{ padding: '28px 24px 8px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: ACCENT,
                textTransform: 'uppercase',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 14, color: PINK }}>✦</span> Financial OS · Multi-chain
              </span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: MUTED2 }} />
              <span style={{ fontSize: 11, fontFamily: MONO, color: MUTED2 }}>
                {creditTier.lendingRate}% APR · {creditTier.vaultLTV}% LTV unlocked
              </span>
            </div>
            <h1 style={{
              fontSize: isMobile ? 28 : 44,
              fontWeight: 900,
              color: INK,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
              margin: 0,
            }}>
              {greeting}, <span style={{
                background: 'linear-gradient(135deg, #3B5BFA, #8B5CF6 55%, #EC4899)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Kubryx</span>.
            </h1>
            <p style={{ fontSize: 14, color: MUTED, margin: '8px 0 0', maxWidth: 580, lineHeight: 1.5 }}>
              {platform.creditScore !== null
                ? `Your ${creditTier.name} tier is live across all 4 chains. Below is your full cross-chain state, refreshed in real time.`
                : 'Connect your wallets to bring your full cross-chain identity online. All 8 tools share one credit score.'}
            </p>
          </section>

          {/* Wrong-network warning (dashboard expects QIE Mainnet) */}
          <WrongNetworkBanner />

          {/* Live market price ticker */}
          <div style={{ padding: '20px 24px 0' }}>
            <PriceTicker />
          </div>

          {/* Stats row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: 12,
            padding: '20px 24px 0',
          }}>
            {statCards.map(card => <StatCard key={card.label} card={card} />)}
          </div>

          {/* Platform Identity — unified cross-module credit signal */}
          <div style={{ padding: '20px 24px 0' }}>
            <div style={{
              position: 'relative',
              background: `linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.85))`,
              border: `1px solid ${creditTier.border}`,
              borderRadius: 18,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
              overflow: 'hidden',
              boxShadow: `0 12px 36px ${creditTier.color}18, 0 4px 12px rgba(15,23,42,0.05)`,
              backdropFilter: 'blur(10px)',
            }}>
              {/* Glow halo behind score */}
              <div aria-hidden style={{
                position: 'absolute',
                top: -60,
                left: -30,
                width: 220,
                height: 220,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${creditTier.color}40, transparent 60%)`,
                filter: 'blur(40px)',
                pointerEvents: 'none',
              }} />

              {/* Score badge with gradient ring */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  background: `conic-gradient(${creditTier.color} ${(platform.creditScore ?? 0) / 1000 * 360}deg, rgba(255,255,255,0.08) 0deg)`,
                  display: 'grid',
                  placeItems: 'center',
                  padding: 3,
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: 'inset 0 2px 6px rgba(15,23,42,0.04)',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: INK, fontFamily: MONO, letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {platform.creditScore !== null ? platform.creditScore : '—'}
                      </div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: creditTier.color, fontFamily: MONO, letterSpacing: '0.14em', marginTop: 2 }}>
                        / 1000
                      </div>
                    </div>
                  </div>
                </div>
                {/* Tier ribbon */}
                <div style={{
                  position: 'absolute',
                  bottom: -6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: creditTier.color,
                  color: '#0a0e27',
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.14em',
                  padding: '2px 10px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  boxShadow: `0 4px 12px ${creditTier.color}50`,
                }}>
                  {creditTier.name.toUpperCase()}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240, position: 'relative' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: MUTED2, textTransform: 'uppercase' }}>
                  Credit Identity · Soulbound on QIE Mainnet
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: INK, lineHeight: 1.3 }}>
                  {creditTier.treasuryTier}
                </div>
              </div>
              <div style={{ width: 1, height: 28, background: BORDER, flexShrink: 0 }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                {[
                  platform.vaultActive      && { icon: '🔐', label: 'Vault',    note: '+85 pts', color: '#A855F7' },
                  platform.stellarPayments  && { icon: '⭐', label: 'Stellar',  note: `${platform.stellarPayments} txns`, color: '#F472B6' },
                  platform.treasuryValue    && { icon: '💰', label: 'Treasury', note: `$${(platform.treasuryValue/1000).toFixed(0)}k`, color: '#00E5CC' },
                  platform.solanaSlot       && { icon: '◎',  label: 'Solana',   note: `slot #${platform.solanaSlot.toLocaleString()}`, color: '#9945FF' },
                ].filter(Boolean).map((s) => {
                  const sig = s as { icon: string; label: string; note: string; color: string }
                  return (
                    <span key={sig.label} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: `${sig.color}12`, border: `1px solid ${sig.color}30`, color: sig.color, fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {sig.icon} {sig.label} · {sig.note}
                    </span>
                  )
                })}
                {platform.creditScore === null && (
                  <span style={{ fontSize: 11, color: MUTED2 }}>Visit Credit Passport to build your on-chain identity</span>
                )}
              </div>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <span style={{ fontSize: 10, color: MUTED2, fontFamily: MONO }}>{creditTier.lendingRate}% APR · {creditTier.vaultLTV}% LTV</span>
                <PlatformModeBadge />
              </div>
            </div>
          </div>

          {/* Backend health cards */}
          {stats && (
            <div style={{ padding: '20px 24px 0' }}>
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED2 }}>
                  {stats.backendsTotal} Backends
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>
                  {stats.backendsLive} live
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: 8 }}>
                {stats.backends.map(b => {
                  const isSlowMs = b.latency !== null && b.latency > 2000
                  const dotColor = !b.isLive ? '#ef4444' : isSlowMs ? '#f59e0b' : '#10b981'
                  return (
                    <div key={b.name} style={{
                      background: '#FFFFFF', border: `1px solid ${BORDER}`,
                      borderRadius: 12, padding: '10px 12px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: `0 0 6px ${dotColor}80` }} />
                      <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                      <span style={{ fontSize: 10, fontFamily: MONO, color: b.isLive ? (isSlowMs ? '#f59e0b' : '#10b981') : '#ef4444' }}>
                        {b.latency !== null ? `${b.latency}ms` : 'down'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Live cross-chain integration pulse */}
          <div style={{ margin: '0 24px 24px' }}>
            <LiveCrossChainPulse theme="light" />
          </div>

          {/* Daily briefing — AI markets pulse */}
          <DailyBriefing />

          {/* Protocol activity chart */}
          <ProtocolActivity />

          {/* Live activity feed */}
          <ActivityFeed stats={stats} />

          {/* Tool quick-access grid */}
          <ToolQuickAccess />
        </div>
      </div>

      {/* Fade-in keyframe (inline) */}
      <style>{`
        @keyframes fadein { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}

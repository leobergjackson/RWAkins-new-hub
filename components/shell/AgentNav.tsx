// Built by vsrupeshkumar
// 3-item navigation for the agent app (onboarding → portfolio → activity).
// Renders a slim left rail on desktop and a bottom tab bar on mobile. Pages that
// include it should add className="agent-shell" to their root so content clears
// the rail/bar (spacing is injected here).
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PieChart, Activity, Bot, Settings, Gauge, Sparkles, Coins, ShieldCheck } from 'lucide-react'

const TEAL = '#2f6b54'
const PURPLE = '#3f9a73'

const ITEMS = [
  { href: '/portfolio', label: 'Portfolio', Icon: PieChart, color: TEAL },
  { href: '/activity', label: 'Activity', Icon: Activity, color: TEAL },
  { href: '/onboarding', label: 'AI CFO', Icon: Bot, color: TEAL },
  { href: '/settings', label: 'Settings', Icon: Settings, color: TEAL },
] as const

const SUITE = [
  { href: '/insurance-risk-system', label: 'Risk', Icon: Gauge, color: PURPLE },
  { href: '/credit', label: 'Credit', Icon: Sparkles, color: PURPLE },
  { href: '/lend', label: 'Borrow', Icon: Coins, color: PURPLE },
  { href: '/compliance', label: 'KYC', Icon: ShieldCheck, color: PURPLE },
] as const

function isActive(pathname: string | null, href: string) {
  return pathname === href || (pathname?.startsWith(href + '/') ?? false)
}

export function AgentNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop left rail */}
      <nav className="kbx-rail" aria-label="Primary">
        {ITEMS.map(({ href, label, Icon, color }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              style={{ ...railItem, color: active ? color : 'var(--rwa-text-muted)', background: active ? `${color}1a` : 'transparent' }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
            </Link>
          )
        })}
        <div style={{ width: 40, height: 1, background: 'var(--rwa-border)', margin: '6px 0' }} />
        {SUITE.map(({ href, label, Icon, color }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              style={{ ...railItem, color: active ? color : 'var(--rwa-text-faint)', background: active ? `${color}1a` : 'transparent' }}
            >
              <Icon size={18} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Mobile bottom tab bar — core 3 + suite shortcut */}
      <nav className="kbx-bottom" aria-label="Primary">
        {ITEMS.map(({ href, label, Icon, color }) => {
          const active = isActive(pathname, href)
          return (
            <Link key={href} href={href} style={{ ...tabItem, color: active ? color : 'var(--rwa-text-muted)' }}>
              <Icon size={20} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
            </Link>
          )
        })}
        {SUITE.map(({ href, label, Icon, color }) => {
          const active = isActive(pathname, href)
          return (
            <Link key={href} href={href} style={{ ...tabItem, color: active ? color : 'var(--rwa-text-faint)' }}>
              <Icon size={18} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
            </Link>
          )
        })}
      </nav>

      <style>{`
        .kbx-rail {
          position: fixed; left: 0; top: 0; bottom: 0; width: 80px; z-index: 40;
          display: none; flex-direction: column; align-items: center; gap: 4px;
          padding: 20px 0;
          background: var(--rwa-rail-bg, rgba(8,8,8,0.95));
          border-right: 1px solid var(--rwa-rail-border, rgba(255,255,255,0.06));
          backdrop-filter: blur(18px) saturate(160%); overflow-y: auto;
          transition: background 0.25s, border-color 0.25s;
        }
        .kbx-bottom {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
          display: flex; justify-content: space-around; align-items: center;
          padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
          background: var(--rwa-rail-bg, rgba(8,8,8,0.95));
          border-top: 1px solid var(--rwa-rail-border, rgba(255,255,255,0.08));
          backdrop-filter: blur(18px) saturate(160%); overflow-x: auto; gap: 2px;
          transition: background 0.25s, border-color 0.25s;
        }
        .agent-shell { padding-bottom: 72px; }
        @media (min-width: 768px) {
          .kbx-rail { display: flex; }
          .kbx-bottom { display: none; }
          .agent-shell { padding-bottom: 0; padding-left: 80px; }
        }
      `}</style>
    </>
  )
}

const railItem: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
  width: 60, padding: '10px 0', borderRadius: 12, textDecoration: 'none',
  transition: 'color 0.15s, background 0.15s',
}

const tabItem: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
  flex: 1, padding: '4px 0', textDecoration: 'none',
}

export default AgentNav

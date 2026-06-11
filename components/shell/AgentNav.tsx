// Built by vsrupeshkumar
// 3-item navigation for the agent app (onboarding → portfolio → activity).
// Renders a slim left rail on desktop and a bottom tab bar on mobile. Pages that
// include it should add className="agent-shell" to their root so content clears
// the rail/bar (spacing is injected here).
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PieChart, Activity, Settings } from 'lucide-react'

const TEAL = '#2dd4bf'

const ITEMS = [
  { href: '/portfolio', label: 'Portfolio', Icon: PieChart },
  { href: '/activity', label: 'Activity', Icon: Activity },
  { href: '/onboarding', label: 'Settings', Icon: Settings },
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
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              style={{ ...railItem, color: active ? TEAL : 'rgba(255,255,255,0.5)', background: active ? 'rgba(45,212,191,0.1)' : 'transparent' }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="kbx-bottom" aria-label="Primary">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link key={href} href={href} style={{ ...tabItem, color: active ? TEAL : 'rgba(255,255,255,0.5)' }}>
              <Icon size={20} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
            </Link>
          )
        })}
      </nav>

      <style>{`
        .kbx-rail {
          position: fixed; left: 0; top: 0; bottom: 0; width: 76px; z-index: 40;
          display: none; flex-direction: column; align-items: center; gap: 8px;
          padding: 20px 0; background: rgba(8,8,8,0.92); border-right: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
        }
        .kbx-bottom {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
          display: flex; justify-content: space-around; align-items: center;
          padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
          background: rgba(8,8,8,0.92); border-top: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
        }
        .agent-shell { padding-bottom: 76px; }
        @media (min-width: 768px) {
          .kbx-rail { display: flex; }
          .kbx-bottom { display: none; }
          .agent-shell { padding-bottom: 0; padding-left: 76px; }
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

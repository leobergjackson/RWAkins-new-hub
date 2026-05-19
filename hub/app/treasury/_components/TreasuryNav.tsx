'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href:'/treasury',           label:'⚡ Dashboard',  exact:true  },
  { href:'/treasury/agents',    label:'🤖 Workforce',  exact:false },
  { href:'/treasury/payroll',   label:'💸 Payroll',    exact:false },
  { href:'/treasury/yield',     label:'📈 Yield',      exact:false },
  { href:'/treasury/analytics', label:'📊 Analytics',  exact:false },
  { href:'/treasury/policy',    label:'🛡 Policy',     exact:false },
  { href:'/treasury/history',   label:'🕒 History',    exact:false },
  { href:'/treasury/marketplace',label:'🏪 Store',     exact:false },
] as const

const TEAL = '#00E5CC'

export default function TreasuryNav() {
  const pathname = usePathname()
  return (
    <nav style={{
      display:'flex', gap:6, padding:'12px 24px',
      borderBottom:'1px solid rgba(0,229,204,0.1)',
      flexWrap:'wrap', background:'rgba(0,0,0,0.5)',
      backdropFilter:'blur(14px)', position:'sticky', top:0, zIndex:40,
      alignItems:'center',
    }}>
      <span style={{ fontSize:12, fontWeight:800, color:TEAL, letterSpacing:'0.1em', marginRight:10, display:'flex', alignItems:'center', gap:5 }}>
        <span style={{ fontSize:15 }}>⚡</span>PALMFLOW AI
      </span>
      <span style={{ fontSize:9, color:'rgba(255,255,255,0.2)', marginRight:6, letterSpacing:'0.05em' }}>Neural OS v4.2.0</span>
      {ITEMS.map(item => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} style={{
            padding:'5px 13px', borderRadius:20, fontSize:11,
            fontWeight: active ? 700 : 400, textDecoration:'none',
            background: active ? `rgba(0,229,204,0.12)` : 'transparent',
            border:`1px solid ${active ? 'rgba(0,229,204,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: active ? TEAL : 'rgba(255,255,255,0.5)',
            transition:'all 0.2s',
          }}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

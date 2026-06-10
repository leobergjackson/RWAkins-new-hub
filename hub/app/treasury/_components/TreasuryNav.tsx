// Built by vsrupeshkumar
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href:'/treasury',                label:'Home',          exact:true  },
  { href:'/treasury/rwa',            label:'🏦 RWA Vault',  exact:false },
  { href:'/treasury/dashboard',      label:'📊 Dashboard',  exact:true  },
  { href:'/treasury/send',           label:'💸 Send',       exact:true  },
  { href:'/treasury/receive',        label:'📥 Receive',    exact:true  },
  { href:'/treasury/swap',           label:'🔄 Swap',       exact:true  },
  { href:'/treasury/transactions',   label:'📋 Txns',       exact:false },
  { href:'/treasury/agents',         label:'🤖 Workforce',  exact:false },
  { href:'/treasury/payroll',        label:'💰 Payroll',    exact:false },
  { href:'/treasury/yield',          label:'📈 Yield',      exact:false },
  { href:'/treasury/analytics',      label:'📉 Analytics',  exact:false },
  { href:'/treasury/pnl',            label:'📊 P&L',        exact:false },
  { href:'/treasury/tax',            label:'🧾 Tax',         exact:false },
  { href:'/treasury/policy',         label:'🛡 Policy',     exact:false },
  { href:'/treasury/history',        label:'🕒 History',    exact:false },
  { href:'/treasury/marketplace',    label:'🏪 Store',      exact:false },
  { href:'/treasury/settings',       label:'⚙️ Settings',  exact:false },
] as const

const BLUE = '#3B82F6'
 
export default function TreasuryNav() {
  const pathname = usePathname()
  return (
    <nav style={{
      display:'flex', gap:4, padding:'10px 20px',
      borderBottom:'1px solid rgba(59,130,246,0.15)',
      flexWrap:'wrap', background:'rgba(248,250,252,0.85)',
      backdropFilter:'blur(14px)', position:'sticky', top:0, zIndex:40,
      alignItems:'center',
    }}>
      <span style={{ fontSize:11, fontWeight:800, color:BLUE, letterSpacing:'0.1em', marginRight:8, display:'flex', alignItems:'center', gap:4 }}>
        <span style={{ fontSize:14 }}>⚡</span>YIELD OPERATIONS HUB
      </span>
      <span style={{ fontSize:9, color:'#94A3B8', marginRight:4, letterSpacing:'0.05em' }}>Neural OS v4.2</span>
      {ITEMS.map(item => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} style={{
            padding:'4px 10px', borderRadius:16, fontSize:10,
            fontWeight: active ? 700 : 400, textDecoration:'none',
            background: active ? `rgba(59,130,246,0.12)` : 'transparent',
            border:`1px solid ${active ? 'rgba(59,130,246,0.35)' : '#E2E8F0'}`,
            color: active ? BLUE : '#64748B',
            transition:'all 0.2s', whiteSpace:'nowrap',
          }}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

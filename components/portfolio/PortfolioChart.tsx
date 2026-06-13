// Built by vsrupeshkumar
'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const USDY_COLOR = '#2f6b54' // brand green
const METH_COLOR = '#3B5BFA' // sky-blue (duotone with the banner)

export interface AllocationSlice {
  name: 'USDY' | 'mETH'
  /** USD value of the slice. */
  value: number
}

function fmtUsd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

interface TooltipPayloadItem {
  name: string
  value: number
  payload: AllocationSlice & { pct: number }
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div
      style={{
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <div style={{ color: p.name === 'USDY' ? USDY_COLOR : METH_COLOR, fontWeight: 700 }}>{p.name}</div>
      <div style={{ color: '#fff' }}>{fmtUsd(p.value)}</div>
      <div style={{ color: 'rgba(255,255,255,0.5)' }}>{p.pct.toFixed(1)}% of portfolio</div>
    </div>
  )
}

/** Donut chart of the USDY / mETH split by USD value. */
export function PortfolioChart({ data }: { data: AllocationSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const withPct = data.map((d) => ({ ...d, pct: (d.value / total) * 100 }))

  return (
    <div style={{ position: 'relative', width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={withPct}
            dataKey="value"
            nameKey="name"
            innerRadius={68}
            outerRadius={100}
            paddingAngle={2}
            stroke="none"
          >
            {withPct.map((d) => (
              <Cell key={d.name} fill={d.name === 'USDY' ? USDY_COLOR : METH_COLOR} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--rwa-text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Total</span>
        <span
          style={{
            fontFamily: "'Clash Display', 'Plus Jakarta Sans', sans-serif",
            fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #2f6b54, #3f9a73)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}
        >
          {fmtUsd(total)}
        </span>
      </div>
    </div>
  )
}

export default PortfolioChart

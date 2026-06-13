// Built by vsrupeshkumar
'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { ActivityPoint } from '@/app/api/activity/route'

function fmtUsd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

interface TooltipPayloadItem { value: number; payload: ActivityPoint }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</div>
      <div style={{ color: '#fff', fontWeight: 700 }}>{fmtUsd(payload[0].value)}</div>
    </div>
  )
}

/** Portfolio value over time (area/line) from the /api/activity series. */
export function PortfolioLineChart({ data }: { data: ActivityPoint[] }) {
  if (!data?.length) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13 }}>
        No performance history yet.
      </div>
    )
  }
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="kubryxValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f6b54" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2f6b54" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.18)" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            tickFormatter={(v: string) => v.slice(5)} // MM-DD
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
            domain={['dataMin', 'dataMax']}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="value" stroke="#2f6b54" strokeWidth={2} fill="url(#kubryxValue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PortfolioLineChart

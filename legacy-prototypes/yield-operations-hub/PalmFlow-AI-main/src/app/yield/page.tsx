// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { type Variants } from 'framer-motion';
import { TrendingUp, Shield, Zap, Info, CheckCircle2, RefreshCw } from 'lucide-react';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 120 } },
};

const strategies = [
  {
    id: 'conservative',
    name: 'Conservative',
    apy: 8.5,
    risk: 'Very Low',
    riskColor: '#10b981',
    desc: 'Capital preservation first. Allocates 70% to stable lending, 30% to low-volatility LPs.',
    protocols: ['Kamino Lending', 'marginfi', 'Solend'],
    color: '#10b981',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    apy: 14.2,
    risk: 'Low',
    riskColor: '#00e5cc',
    desc: 'Optimal risk-return. Diversified across top-performing yield protocols on Arbitrum Sepolia.',
    protocols: ['Raydium LP', 'Kamino', 'Jito LST'],
    color: '#00e5cc',
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    apy: 28.6,
    risk: 'Medium',
    riskColor: '#f59e0b',
    desc: 'Maximum yield. Leveraged positions and concentrated LP exposure for high returns.',
    protocols: ['Drift Protocol', 'marginfi Leverage', 'Orca'],
    color: '#f59e0b',
  },
];

const allocations = [
  { protocol: 'Kamino Lending', pct: 35, apy: 11.2, color: '#00e5cc' },
  { protocol: 'Raydium LP', pct: 28, apy: 18.4, color: '#6366f1' },
  { protocol: 'Jito LST', pct: 20, apy: 8.1, color: '#10b981' },
  { protocol: 'Drift Protocol', pct: 10, apy: 32.6, color: '#f59e0b' },
  { protocol: 'marginfi', pct: 5, apy: 9.8, color: '#ec4899' },
  { protocol: 'Other', pct: 2, apy: 6.0, color: '#6b7280' },
];

export default function YieldPage() {
  const [activeStrategy, setActiveStrategy] = useState('balanced');
  const [autoOptimize, setAutoOptimize] = useState(true);

  const selectedStrategy = strategies.find((s) => s.id === activeStrategy)!;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-[1400px] mx-auto px-4 py-10 space-y-8 pb-32"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 px-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="status-dot-active" />
            <span className="label-xs">Yield Engine v3.1</span>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">AI Yield Optimizer</h1>
          <p className="text-sm text-white/40 font-normal mt-1 max-w-xl">
            Neural algorithms continuously maximize risk-adjusted returns across verified Arbitrum Sepolia yield protocols.
          </p>
        </div>
        {/* Auto-Optimize Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-white/50">Auto-Optimization</span>
          <button
            onClick={() => setAutoOptimize((v) => !v)}
            className="relative w-12 h-6 rounded-full p-1 transition-all"
            style={{
              background: autoOptimize ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${autoOptimize ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <motion.div
              animate={{ x: autoOptimize ? 24 : 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="w-4 h-4 rounded-full"
              style={{
                background: autoOptimize ? '#10b981' : 'rgba(255,255,255,0.2)',
                boxShadow: autoOptimize ? '0 0 10px rgba(16,185,129,0.6)' : 'none',
              }}
            />
          </button>
          {autoOptimize && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-emerald-400 font-medium"
            >
              Active
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Current APY', value: `${selectedStrategy.apy}%`, sub: selectedStrategy.name + ' strategy', color: selectedStrategy.color },
          { label: 'Total Yield Earned', value: '$4,152', sub: 'PUSD lifetime', color: '#00e5cc' },
          { label: 'Risk Score', value: selectedStrategy.risk, sub: 'Neural risk model', color: selectedStrategy.riskColor },
        ].map((s, i) => (
          <motion.div key={i} variants={item} className="neural-card p-5 flex items-center gap-4">
            <div className="w-2 h-10 rounded-full shrink-0" style={{ background: s.color }} />
            <div>
              <div className="label-xs mb-1">{s.label}</div>
              <div className="text-lg font-semibold text-white tracking-tight tabular-nums" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-white/30 mt-0.5">{s.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Strategy Selector */}
      <motion.div variants={item} className="space-y-4">
        <h2 className="text-base font-semibold text-white px-1">Yield Strategy</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {strategies.map((s) => (
            <motion.button
              key={s.id}
              onClick={() => setActiveStrategy(s.id)}
              whileHover={{ y: -4 }}
              className={`p-6 rounded-[2rem] border text-left transition-all relative overflow-hidden ${
                activeStrategy === s.id
                  ? 'bg-indigo-500/10 border-indigo-500/40'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/20'
              }`}
            >
              {activeStrategy === s.id && (
                <motion.div layoutId="active-strategy" className="absolute top-4 right-4">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                </motion.div>
              )}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${s.color}15` }}
              >
                {s.id === 'conservative' && <Shield className="w-5 h-5" style={{ color: s.color }} />}
                {s.id === 'balanced' && <TrendingUp className="w-5 h-5" style={{ color: s.color }} />}
                {s.id === 'aggressive' && <Zap className="w-5 h-5" style={{ color: s.color }} />}
              </div>
              <div className="text-base font-semibold text-white mb-1">{s.name}</div>
              <div className="text-2xl font-bold tabular-nums mb-2" style={{ color: s.color }}>{s.apy}% APY</div>
              <p className="text-xs text-white/35 leading-relaxed mb-4">{s.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {s.protocols.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                    style={{ background: `${s.color}10`, color: s.color, border: `1px solid ${s.color}20` }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Allocation Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <motion.div variants={item} className="neural-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Capital Allocation</h2>
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-white/20" />
              <span className="label-xs">Rebalances every 4h</span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-40">
            {allocations.map((a, i) => (
              <div key={a.protocol} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-white tabular-nums">{a.pct}%</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(a.pct / 35) * 100}%` }}
                  transition={{ delay: i * 0.08, type: 'spring', damping: 20 }}
                  className="w-full rounded-t-lg"
                  style={{ background: a.color, minHeight: '4px' }}
                />
                <span className="text-[9px] text-white/30 text-center leading-tight">{a.protocol.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Allocations Table */}
        <motion.div variants={item} className="neural-card p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Active Allocations</h2>
          <div className="space-y-2">
            {allocations.map((a) => (
              <div
                key={a.protocol}
                className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/[0.02]"
                style={{ border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                  <span className="text-sm text-white/80">{a.protocol}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-xs font-semibold text-white/50 tabular-nums w-8 text-right">{a.pct}%</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: a.color }}>{a.apy}% APY</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Info Panel */}
      <motion.div
        variants={item}
        className="p-6 rounded-[1.5rem] flex items-start gap-5"
        style={{ background: 'rgba(0,229,204,0.04)', border: '1px solid rgba(0,229,204,0.12)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,229,204,0.1)' }}
        >
          <Info className="w-5 h-5 text-accent-cyan" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">Neural Rebalancing Protocol</h4>
          <p className="text-sm text-white/40 leading-relaxed">
            Every 4 hours, the Yield Agent scans on-chain APY data across all supported protocols and rebalances allocations to within 2% of optimal targets. Gas costs are absorbed from yield earnings, so your principal is never touched.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

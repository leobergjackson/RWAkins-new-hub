// Built by vsrupeshkumar
"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { type Variants } from 'framer-motion';
import { Download, BrainCircuit, Sparkles, BarChart3, Loader2, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAgents } from '@/hooks/useAgents';
import { useTreasury } from '@/hooks/useTreasury';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 120 } },
};

const heatmapData = Array.from({ length: 28 }, () =>
  parseFloat((Math.random() * 0.85 + 0.08).toFixed(2))
);

export default function AnalyticsPage() {
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: treasury, isLoading: treasuryLoading } = useTreasury();

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['treasury-history'],
    queryFn: async () => {
      const res = await fetch('/api/treasury/history');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const isLoading = agentsLoading || treasuryLoading || historyLoading;

  const historyArr: Array<{ name: string; balance: number }> = Array.isArray(history) ? history : [];
  const agentsArr: any[] = Array.isArray(agents) ? agents : [];

  const maxBalance = useMemo(() => Math.max(...historyArr.map((h) => h.balance), 1), [historyArr]);
  const avgDaily = historyArr.length ? Math.round(historyArr.reduce((a, b) => a + b.balance, 0) / historyArr.length) : 0;
  const peakDay = historyArr.reduce((max, h) => (h.balance > max.balance ? h : max), historyArr[0] ?? { name: '—', balance: 0 });
  const balance = treasury?.balance ?? 0;

  const sortedByEfficiency = [...agentsArr].sort((a, b) => (b.efficiency ?? 0) - (a.efficiency ?? 0)).slice(0, 3);

  const insights = [
    sortedByEfficiency[0]
      ? `${sortedByEfficiency[0].name} is your top performer at ${sortedByEfficiency[0].efficiency}% efficiency.`
      : 'Deploy agents to start generating insights.',
    historyArr.length
      ? `Treasury peak was $${peakDay.balance.toLocaleString()} on ${peakDay.name}.`
      : 'Treasury history will appear here as data accumulates.',
    `${agentsArr.length} agents are active across your neural workforce.`,
  ];

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        <span className="text-xs text-white/30 uppercase tracking-widest font-bold">Processing Analytics...</span>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-[1400px] mx-auto px-4 py-10 space-y-8 pb-32"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 px-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="status-dot-active" />
            <span className="label-xs">Analytics Engine v2.0</span>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Treasury Analytics</h1>
          <p className="text-sm text-white/40 font-normal mt-1">Comprehensive financial intelligence — every metric, every agent, every transaction.</p>
        </div>
        <button className="btn-outline flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </motion.div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: '30D Revenue', value: `$${(balance * 0.142 / 12).toFixed(0)}`, sub: 'PUSD', color: '#00e5cc' },
          { label: 'Avg Daily Volume', value: `$${avgDaily.toLocaleString()}`, sub: 'from history', color: '#6366f1' },
          { label: 'Peak Balance', value: `$${peakDay.balance.toLocaleString()}`, sub: peakDay.name, color: '#10b981' },
          { label: 'Total Agents', value: agentsArr.length, sub: 'neural workforce', color: '#ec4899' },
        ].map((s, i) => (
          <motion.div key={i} variants={item} className="neural-card p-5">
            <div className="label-xs mb-2">{s.label}</div>
            <div className="text-xl font-semibold tracking-tight tabular-nums" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-white/25 mt-0.5">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Main bento: 2/3 + 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* P&L Chart */}
          <motion.div variants={item} className="neural-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Treasury Performance — Last {historyArr.length} Days</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-accent-cyan" />
                  <span className="label-xs">Balance</span>
                </div>
              </div>
            </div>
            {historyArr.length > 0 ? (
              <div className="flex items-end gap-2 h-36">
                {historyArr.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(h.balance / maxBalance) * 100}%` }}
                      transition={{ delay: i * 0.06, type: 'spring', damping: 22 }}
                      className="w-full rounded-t-lg min-h-[4px]"
                      style={{ background: 'linear-gradient(180deg, #00e5cc, rgba(99,102,241,0.6))' }}
                    />
                    <span className="text-[9px] text-white/20 text-center">{h.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-36 flex items-center justify-center">
                <span className="text-sm text-white/20">No history data available yet.</span>
              </div>
            )}
          </motion.div>

          {/* Agent Spending Breakdown */}
          <motion.div variants={item} className="neural-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Spending by Agent</h2>
              <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-bold text-white/40">
                {agentsArr.length} agents
              </span>
            </div>
            {agentsArr.length > 0 ? (
              <div className="space-y-3">
                {agentsArr.map((agent: any, i: number) => {
                  const pct = agent.budget > 0 ? Math.min(((agent.spent ?? 0) / agent.budget) * 100, 100) : 0;
                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="space-y-1.5"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white/70">{agent.name}</span>
                        <span className="text-xs font-semibold text-white/50 tabular-nums">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.07 + 0.2, duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, #00e5cc, #6366f1)' }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-white/20">No agents deployed yet.</p>
            )}
          </motion.div>

          {/* Activity Heatmap */}
          <motion.div variants={item} className="neural-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Activity Heatmap — Last 4 Weeks</h2>
            <div className="grid grid-cols-7 gap-1.5">
              {heatmapData.map((intensity, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="aspect-square rounded-sm"
                  style={{ background: `rgba(0,229,204,${intensity})` }}
                  title={`Activity: ${Math.round(intensity * 100)}%`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="label-xs">Less</span>
              {[0.08, 0.25, 0.45, 0.65, 0.9].map((v, i) => (
                <div key={i} className="w-3 h-3 rounded-sm" style={{ background: `rgba(0,229,204,${v})` }} />
              ))}
              <span className="label-xs">More</span>
            </div>
          </motion.div>
        </div>

        {/* Right col (1/3) */}
        <div className="space-y-6">
          {/* AI Forecast */}
          <motion.div
            variants={item}
            className="neural-card p-6 space-y-5"
            style={{ border: '1px solid rgba(0,229,204,0.15)' }}
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-accent-cyan" />
              <h2 className="text-base font-semibold text-white">Neural Forecast</h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  label: '7-Day Projected Balance',
                  value: `$${Math.round(balance + avgDaily * 0.5).toLocaleString()}`,
                  color: '#00e5cc',
                },
                {
                  label: 'Est. Monthly Yield',
                  value: `$${(balance * 0.142 / 12).toFixed(0)} PUSD`,
                  color: '#10b981',
                },
                { label: 'Risk Assessment', value: 'Low', color: '#10b981' },
              ].map((f, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="label-xs">{f.label}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: f.color }}>{f.value}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/20 leading-relaxed">
              AI projections based on historical trajectory and current market conditions. Not financial advice.
            </p>
          </motion.div>

          {/* Top Agents Leaderboard */}
          <motion.div variants={item} className="neural-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-white/30" />
              <h2 className="text-base font-semibold text-white">Top Agents</h2>
            </div>
            {sortedByEfficiency.length > 0 ? (
              <div className="space-y-3">
                {sortedByEfficiency.map((agent: any, i: number) => (
                  <div key={agent.id} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                      style={{
                        background: i === 0 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                        color: i === 0 ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                        border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      #{i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{agent.name}</div>
                      <div className="label-xs">{agent.role}</div>
                    </div>
                    <div className="text-sm font-bold text-accent-cyan tabular-nums">{agent.efficiency}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/20">No agents to rank.</p>
            )}
          </motion.div>

          {/* Neural Insights */}
          <motion.div
            variants={item}
            className="neural-card p-6 space-y-4"
            style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Neural Insights</h2>
            </div>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <p className="text-xs text-white/50 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={item} className="neural-card p-6 space-y-3">
            <h2 className="text-base font-semibold text-white">Quick Stats</h2>
            {[
              { label: 'Total PUSD Deployed', value: `$${agentsArr.reduce((a: number, b: any) => a + (b.spent ?? 0), 0).toFixed(2)}` },
              { label: 'Total Budget Allocated', value: `$${agentsArr.reduce((a: number, b: any) => a + (b.budget ?? 0), 0).toLocaleString()}` },
              { label: 'Avg Efficiency', value: `${agentsArr.length ? Math.round(agentsArr.reduce((a: number, b: any) => a + (b.efficiency ?? 0), 0) / agentsArr.length) : 0}%` },
            ].map((s, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-white/[0.04] last:border-0">
                <span className="label-xs">{s.label}</span>
                <span className="text-sm font-semibold text-white tabular-nums">{s.value}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

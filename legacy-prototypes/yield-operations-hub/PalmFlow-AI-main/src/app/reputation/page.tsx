// Built by vsrupeshkumar
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { type Variants } from 'framer-motion';
import { Award, Users, Activity, ShieldCheck, Loader2 } from 'lucide-react';
import { useReputation } from '@/hooks/useReputation';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 120 } },
};

const ratingLegend = [
  { grade: 'AAA', label: '95+', color: '#10b981' },
  { grade: 'AA', label: '85+', color: '#00e5cc' },
  { grade: 'A', label: '70+', color: '#6366f1' },
  { grade: 'B', label: '50+', color: '#f59e0b' },
  { grade: 'C', label: '<50', color: '#ef4444' },
];

const badgeColors: Record<string, string> = {
  'Budget Disciplined': '#10b981',
  'High Volume': '#00e5cc',
  'Yield Generator': '#f59e0b',
};

export default function ReputationPage() {
  const { agents, avgScore, aaaCount, totalTasks, isLoading } = useReputation();

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        <span className="text-xs text-white/30 uppercase tracking-widest font-bold">Loading Reputation Data...</span>
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
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}
            />
            <span className="label-xs">Decentralized Credit Protocol</span>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Reputation Registry</h1>
          <p className="text-sm text-white/40 font-normal mt-1 max-w-xl">
            AI agent credit scores derived from on-chain transaction history, task efficiency, and budget discipline.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Award className="w-4 h-4 text-white/30" />
          <span className="text-sm font-medium text-white/50">{agents.length} agents scored</span>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Network Avg Score', value: `${avgScore}%`, color: '#00e5cc', icon: Activity },
          { label: 'AAA Agents', value: aaaCount, color: '#10b981', icon: ShieldCheck },
          { label: 'Total Transactions', value: totalTasks, color: '#6366f1', icon: Activity },
          { label: 'Protocol Health', value: 'Optimal', color: '#10b981', icon: Award },
        ].map((s, i) => (
          <motion.div key={i} variants={item} className="neural-card p-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <div className="label-xs mb-0.5">{s.label}</div>
              <div className="text-lg font-semibold text-white tabular-nums" style={{ color: s.color }}>{s.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rating Legend */}
      <motion.div variants={item} className="flex items-center gap-2 flex-wrap px-1">
        <span className="label-xs mr-2">Credit Scale:</span>
        {ratingLegend.map((r) => (
          <span
            key={r.grade}
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: `${r.color}15`, color: r.color, border: `1px solid ${r.color}25` }}
          >
            {r.grade} <span className="opacity-60 font-normal text-[10px]">{r.label}</span>
          </span>
        ))}
      </motion.div>

      {/* Agent Credit Cards */}
      {agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent: any, i: number) => (
            <motion.div
              key={agent.id}
              variants={item}
              whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
              className="neural-card p-6 space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white leading-tight">{agent.name}</h3>
                  <p className="label-xs mt-0.5">{agent.role}</p>
                </div>
                <span
                  className="px-3 py-1 rounded-xl text-base font-black"
                  style={{
                    background: `${agent.creditRating.color}15`,
                    color: agent.creditRating.color,
                    border: `1px solid ${agent.creditRating.color}30`,
                  }}
                >
                  {agent.creditRating.grade}
                </span>
              </div>

              {/* Score Ring */}
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 shrink-0">
                  <div
                    className="w-20 h-20 rounded-full"
                    style={{
                      background: `conic-gradient(${agent.creditRating.color} ${agent.trustScore}%, rgba(255,255,255,0.04) 0)`,
                    }}
                  />
                  <div
                    className="absolute inset-[5px] rounded-full flex items-center justify-center"
                    style={{ background: 'rgb(5,5,10)' }}
                  >
                    <span className="text-lg font-bold tabular-nums" style={{ color: agent.creditRating.color }}>
                      {agent.trustScore}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  {[
                    { label: 'Efficiency', value: `${agent.efficiency ?? 0}%` },
                    { label: 'Tasks', value: agent.tasksCount ?? 0 },
                    { label: 'Budget Used', value: `${Math.round(agent.budgetUsed)}%` },
                  ].map((m) => (
                    <div key={m.label} className="flex justify-between">
                      <span className="label-xs">{m.label}</span>
                      <span className="text-xs font-semibold text-white tabular-nums">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust Badges */}
              {agent.badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {agent.badges.map((badge: string) => (
                    <span
                      key={badge}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                      style={{
                        background: `${badgeColors[badge] ?? '#6366f1'}12`,
                        color: badgeColors[badge] ?? '#6366f1',
                        border: `1px solid ${badgeColors[badge] ?? '#6366f1'}20`,
                      }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div variants={item} className="neural-card p-20 flex flex-col items-center justify-center text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-white/[0.02] animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Users className="w-8 h-8 text-white/10" />
            </div>
          </div>
          <p className="text-sm text-white/30 mb-1">No agents registered.</p>
          <p className="text-xs text-white/20">Deploy your first AI workforce member to begin building on-chain credit.</p>
        </motion.div>
      )}
    </motion.div>
  );
}

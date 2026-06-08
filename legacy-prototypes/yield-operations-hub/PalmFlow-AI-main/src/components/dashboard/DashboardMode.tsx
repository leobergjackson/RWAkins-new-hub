// Built by vsrupeshkumar
"use client";

import React from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { AgentCard } from '@/components/dashboard/AgentCard';
import { TreasuryChart } from '@/components/dashboard/TreasuryChart';
import { PortfolioView } from '@/components/dashboard/PortfolioView';
import { useAgents } from '@/hooks/useAgents';
import { useTreasury } from '@/hooks/useTreasury';
import { useInsights } from '@/hooks/useInsights';
import { useSentinel } from '@/hooks/useSentinel';
import {
  Wallet, Activity, BarChart3, Cpu, Plus, Zap,
  ArrowUpRight, Search, Globe, TrendingUp, ShieldCheck, Brain, Loader2
} from 'lucide-react';
import { useState } from 'react';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 120 } },
};

export const DashboardMode = () => {
  const [search, setSearch] = useState('');
  const { data: agents } = useAgents();
  const { data: treasury } = useTreasury();
  const { data: neuralInsights, isLoading: insightsLoading } = useInsights();
  const sentinel = useSentinel();

  const stats = [
    {
      label: 'Total Liquidity',
      value: treasury ? `${treasury.balance.toLocaleString()} PUSD` : '—',
      icon: Wallet,
      color: '#00e5cc',
      trend: '+12.5%',
      trendUp: true,
    },
    {
      label: 'Network Flow',
      value: agents
        ? `$${agents.reduce((a: number, ag: any) => a + (ag.spent || 0), 0).toLocaleString()}`
        : '$0',
      icon: Activity,
      color: '#10b981',
      trend: '+5.2%',
      trendUp: true,
    },
    {
      label: 'Protocol Yield',
      value: treasury ? `$${(treasury.balance * 0.142 / 12).toFixed(0)}` : '$—',
      icon: TrendingUp,
      color: '#6366f1',
      trend: '+8.1%',
      trendUp: true,
    },
    {
      label: 'Active Agents',
      value: agents ? String(agents.length) : '0',
      icon: Cpu,
      color: '#ec4899',
      trend: 'Stable',
      trendUp: null,
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-[1400px] mx-auto px-4 py-10 space-y-8 pb-32"
    >
      {/* Page Header */}
      <motion.header variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-3">
            <span className="status-dot-active" />
            <span className="label-xs">System monitoring active</span>
            <span className="label-xs opacity-40 ml-2">·</span>
            <Globe className="w-3.5 h-3.5 text-white/30" />
            <span className="label-xs">Global sync 12ms</span>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Operational Control</h1>
          <p className="text-sm text-white/40 font-normal mt-1">
            Autonomous treasury & neural workforce management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden xl:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search nodes..."
              className="pl-10 pr-4 py-2.5 rounded-xl text-sm font-normal text-white placeholder:text-white/25 focus:outline-none transition-all w-64"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
          </div>
          <Link href="/launchpad?create=true">
            <button className="btn-primary">
              <Plus className="w-4 h-4" />
              Deploy Agent
            </button>
          </Link>
        </div>
      </motion.header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={i} variants={item} className="neural-card p-6 flex flex-col gap-5 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: `${stat.color}15` }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              {stat.trendUp !== null ? (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}
                >
                  {stat.trend}
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white/30" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {stat.trend}
                </span>
              )}
            </div>
            <div>
              <div className="label-xs mb-1.5">{stat.label}</div>
              <div className="text-xl font-semibold text-white tracking-tight tabular-nums">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Row */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* Chart */}
        <motion.div variants={item} className="lg:col-span-8 neural-card p-5 flex flex-col gap-4 h-[320px] relative overflow-hidden group">
          <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-accent-cyan/10 blur-[80px] pointer-events-none group-hover:bg-accent-cyan/15 transition-all duration-700" />

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-accent-cyan" />
                <h3 className="text-sm font-semibold text-white">Treasury Analytics</h3>
              </div>
              <p className="label-sm">Real-time protocol growth data</p>
            </div>
          </div>
          <div className="flex-1 w-full">
            <TreasuryChart />
          </div>
        </motion.div>

        {/* Activity Feed & Sentinel */}
        <motion.div variants={item} className="lg:col-span-4 flex flex-col gap-4 h-[320px]">
          {/* Sentinel Status */}
          <div className="neural-card p-4 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${sentinel.status?.data?.status === 'locked' ? 'bg-red-500/10' : 'bg-emerald-500/10'} flex items-center justify-center`}>
                  <ShieldCheck className={`w-5 h-5 ${sentinel.status?.data?.status === 'locked' ? 'text-red-500' : 'text-emerald-500'}`} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-widest">Neural Sentinel</div>
                  <div className="text-[10px] text-white/40 mt-0.5">
                    {sentinel.audit.isPending ? 'Audit in progress...' : `Status: ${sentinel.status?.data?.status === 'locked' ? 'EMERGENCY LOCK' : 'SECURE'}`}
                  </div>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${sentinel.status?.data?.status === 'locked' ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                <div className={`w-1 h-1 rounded-full ${sentinel.status?.data?.status === 'locked' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`} />
                <span className={`text-[10px] font-bold ${sentinel.status?.data?.status === 'locked' ? 'text-red-500' : 'text-emerald-500'} uppercase tracking-widest`}>
                  {sentinel.status?.data?.status === 'locked' ? 'LOCKED' : 'ACTIVE'}
                </span>
              </div>
            </div>
            
            {sentinel.status?.data?.status === 'locked' && (
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] text-red-400 leading-relaxed font-medium">
                  {sentinel.status.data.reason}
                </p>
              </div>
            )}

            <button 
              onClick={() => sentinel.audit.mutate()}
              disabled={sentinel.audit.isPending}
              className="w-full py-2 rounded-lg bg-white/[0.03] border border-white/10 text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/[0.05] transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {sentinel.audit.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
              Perform Security Audit
            </button>
          </div>

          {/* Live Activity */}
          <div className="neural-card p-5 flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent-cyan" />
                <h3 className="text-sm font-semibold text-white">Neural Activity</h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 -mr-2 pr-2">
              {(agents?.flatMap((a: any) => a.transactions) || []).slice(0, 5).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((tx: any, i: number) => (
                <div key={i} className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.02] transition-colors group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(0,229,204,0.08)' }}>
                    <Zap className="w-3.5 h-3.5 text-accent-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white/60 mb-0.5">AGENT {tx.agentId?.slice(-4).toUpperCase() || 'CORE'}</div>
                    <div className="text-sm text-white/80 leading-snug">{tx.description}</div>
                    <div className="text-xs text-white/25 mt-1">{new Date(tx.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Institutional Insights Row */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* Workforce Section */}
        <div className="lg:col-span-8 space-y-5">
          <motion.div variants={item} className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">Active Workforce</h2>
              <p className="text-xs text-white/40 mt-0.5">Monitoring {agents?.length || 0} autonomous agents</p>
            </div>
            <Link href="/agents" className="flex items-center gap-1.5 text-sm font-medium text-white/40 hover:text-white transition-colors group">
              View all
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(search
              ? agents?.filter((a: any) => a.name.toLowerCase().includes(search.toLowerCase()))
              : agents?.slice(0, 3)
            )?.map((agent: any) => (
              <AgentCard
                key={agent.id}
                name={agent.name}
                role={agent.role}
                status={agent.status}
                budget={agent.budget.toLocaleString()}
                spent={agent.spent.toLocaleString()}
                tasks={agent.tasksCount}
                efficiency={agent.efficiency}
                pnl={agent.pnl}
                rating={agent.rating}
                agentId={agent.id}
              />
            ))}
          </div>
        </div>

        {/* Portfolio Sidebar */}
        <motion.div variants={item} className="lg:col-span-4 flex flex-col gap-4">
          <div className="neural-card p-6 flex flex-col gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(162,89,255,0.06) 0%, transparent 70%)', margin: '-16px -16px 0 0' }} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Neural Advisor</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                {insightsLoading ? 'Analyzing...' : 'Strategic Sync'}
              </span>
            </div>
            
            <div className="space-y-4">
              {neuralInsights?.insights?.slice(0, 2).map((insight: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-1 rounded-full ${insight.impact === 'positive' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider">{insight.title}</div>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed pl-3">{insight.desc}</p>
                </div>
              ))}
              
              {!insightsLoading && neuralInsights?.strategicAction && (
                <div className="pt-2 mt-2 border-t border-white/5">
                  <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Recommended Action</div>
                  <div className="text-xs text-white font-medium italic">"{neuralInsights.strategicAction}"</div>
                </div>
              )}
              
              {insightsLoading && (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-xs text-white/30 italic">Decrypting neural patterns...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="neural-card p-6 flex-1">
            <PortfolioView />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Built by vsrupeshkumar
"use client";

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { motion } from 'framer-motion';
import { 
  Cpu, 
  Activity, 
  Shield, 
  Zap, 
  Search,
  Filter,
  ArrowRight,
  Database,
  Terminal,
  Wallet,
  Users,
  ShieldCheck,
  ShieldAlert,
  TrendingUp
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export default function AgentsPage() {
  const [orgId] = useState('default-org');
  const { data: agents, isLoading } = trpc.getAgents.useQuery({ orgId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-glow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-glow uppercase">Neural Node Swarm</h1>
            <p className="text-muted-foreground mt-2 text-sm uppercase tracking-widest font-mono">
              Active Monitoring: <span className="text-cyan-glow">{agents?.length || 0} Autonomous Entities</span>
            </p>
          </div>
          <div className="flex gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-cyan-glow transition-colors" size={16} />
              <input 
                placeholder="Search nodes..." 
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-cyan-glow/50 transition-all w-64"
              />
            </div>
            <button className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Active Swarm Grid */}
          <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {agents?.map((agent, i) => (
              <AgentCard key={agent.id} agent={agent} index={i} />
            ))}
          </div>

          {/* Real-time Telemetry Log */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="glass-dark rounded-3xl border-white/5 h-[700px] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
                <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Terminal size={14} className="text-cyan-glow" />
                  Telemetry Log
                </h2>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-glow animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-glow" />
                </div>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto font-mono text-[10px] space-y-4 scrollbar-hide">
                {agents?.map((agent, i) => (
                  <div key={i} className="space-y-1 animate-in fade-in slide-in-from-right-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">[{new Date().toLocaleTimeString()}]</span>
                      <span className="text-cyan-glow font-bold uppercase">{agent.type}</span>
                    </div>
                    <p className="text-white/60 pl-4 border-l border-white/5 leading-relaxed">
                      {agent.lastAction || "Awaiting neural synchronization..."}
                    </p>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-4 opacity-30 italic">
                  <Activity size={10} className="animate-pulse" />
                  <span>Listening for swarm activity...</span>
                </div>
              </div>
            </div>

            <div className="glass p-8 rounded-3xl border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Database size={40} className="text-cyan-glow" />
              </div>
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Global Consensus
              </h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl font-bold font-mono">99.8%</span>
                <span className="text-xs text-emerald-glow">OPTIMIZED</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-6">
                <div className="h-full bg-cyan-glow w-[99.8%] shadow-[0_0_10px_rgba(0,242,255,0.5)]" />
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed italic">
                Swarm nodes are in 100% agreement on the current treasury allocation strategy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function AgentCard({ agent, index }: any) {
  const isHealthy = agent.status !== 'ERROR';
  
  const iconMap: Record<string, any> = {
    TREASURY: Wallet,
    PAYROLL: Users,
    COMPLIANCE: ShieldCheck,
    RISK: ShieldAlert,
    STRATEGY: TrendingUp,
    EXECUTION: Zap,
    MARKET: Activity,
    ORCHESTRATOR: Cpu,
  };

  const Icon = iconMap[agent.type] || Cpu;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="glass group p-8 rounded-[2rem] border-white/10 flex flex-col relative overflow-hidden shadow-xl"
    >
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
        <Icon size={120} />
      </div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
            isHealthy ? "bg-cyan-glow/10 text-cyan-glow border border-cyan-glow/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
          )}>
            <Icon size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{agent.type} NODE</p>
            <h3 className="text-lg font-bold text-white tracking-tight">{agent.name}</h3>
          </div>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold border transition-all",
          agent.status === 'IDLE' ? 'bg-white/5 text-muted-foreground border-white/10' : 
          agent.status === 'ACTIVE' ? 'bg-emerald-glow/10 text-emerald-glow border-emerald-glow/20 shadow-[0_0_15px_rgba(0,255,136,0.2)]' :
          'bg-cyan-glow/10 text-cyan-glow border-cyan-glow/20 animate-pulse'
        )}>
          {agent.status}
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div>
          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Neural Decision</p>
          <p className="text-sm text-white/80 line-clamp-2 leading-relaxed font-light italic">
            "{agent.lastAction || "Scanning organizational parameters for potential optimizations..."}"
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Confidence</p>
            <p className="text-lg font-bold font-mono">98.4%</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Latency</p>
            <p className="text-lg font-bold font-mono">42ms</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between relative z-10 pt-6 border-t border-white/5">
        <span className="text-[10px] text-muted-foreground font-mono uppercase">Node ID: {agent.id.slice(-8)}</span>
        <button className="flex items-center gap-2 text-[10px] font-bold text-cyan-glow hover:translate-x-1 transition-all">
          CONFIGURATION
          <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

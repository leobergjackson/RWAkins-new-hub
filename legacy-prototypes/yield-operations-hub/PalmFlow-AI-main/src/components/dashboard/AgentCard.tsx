// Built by vsrupeshkumar
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Cpu, Activity, Zap, Target, CheckCircle2 } from 'lucide-react';

interface AgentCardProps {
  name: string;
  role: string;
  status: string;
  budget: string;
  spent: string;
  tasks: number;
  efficiency: number;
  pnl?: number;
  rating?: number;
  agentId: string;
}

export function AgentCard({
  name, role, status, budget, spent, efficiency, pnl = 0, rating = 5.0, agentId
}: AgentCardProps) {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isSynced, setIsSynced] = React.useState(false);
  const usagePct =
    (parseFloat(spent.replace(/,/g, '')) / parseFloat(budget.replace(/,/g, ''))) * 100;
  const isActive = status === 'active';

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/agents/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        setIsSynced(true);
        setTimeout(() => setIsSynced(false), 2000);
      }
    } catch (err) {
      console.error('Failed to sync agent:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
      className="neural-card p-6 flex flex-col gap-5 relative overflow-hidden"
    >
      {/* Subtle glow accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,229,204,0.06) 0%, transparent 70%)', margin: '-16px -16px 0 0' }}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center relative"
            style={{ background: 'rgba(0,229,204,0.08)' }}
          >
            <Cpu className="w-5 h-5 text-accent-cyan" />
            <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md bg-black border border-white/10 text-[8px] font-black text-white">
              {rating.toFixed(1)}
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white leading-tight">{name}</h3>
            <span className="label-sm leading-none mt-0.5 block">{role}</span>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
            color: isActive ? '#10b981' : 'rgba(255,255,255,0.3)',
            border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isActive ? '#10b981' : 'rgba(255,255,255,0.3)', boxShadow: isActive ? '0 0 6px rgba(16,185,129,0.5)' : 'none' }}
          />
          {isActive ? 'Active' : 'Idle'}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="p-3.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-white/30" />
              <span className="label-xs">Allocation</span>
            </div>
            {pnl > 0 && (
              <span className="text-[10px] text-emerald-500 font-bold">+{pnl.toFixed(1)}%</span>
            )}
          </div>
          <div className="text-lg font-semibold text-white tabular-nums leading-none">
            {budget}
            <span className="text-xs text-white/30 font-normal ml-1">PUSD</span>
          </div>
        </div>
        <div
          className="p-3.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3 h-3 text-accent-cyan" />
            <span className="label-xs">Efficiency</span>
          </div>
          <div className="text-lg font-semibold tabular-nums leading-none" style={{ color: '#00e5cc' }}>
            {efficiency}%
          </div>
        </div>
      </div>

      {/* Usage Bar */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-white/30" />
            <span className="label-sm">Resource usage</span>
          </div>
          <span className="text-xs font-medium text-white/50 tabular-nums">
            {spent} / {budget}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usagePct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #00e5cc, #6366f1)' }}
          />
        </div>
      </div>

      {/* Action */}
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="w-full py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all flex items-center justify-center gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        onMouseEnter={e => {
          if (!isSyncing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
        }}
        onMouseLeave={e => {
          if (!isSyncing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
        }}
      >
        {isSyncing ? (
          <>
            <Zap className="w-4 h-4 animate-pulse text-accent-cyan" />
            Syncing...
          </>
        ) : isSynced ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400">Synced</span>
          </>
        ) : (
          'Sync Agent'
        )}
      </button>
    </motion.div>
  );
}

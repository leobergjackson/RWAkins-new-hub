// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import { AgentCard } from '@/components/dashboard/AgentCard';
import { Plus, Search, Filter, Loader2, CheckCircle2, ChevronRight, Users, Zap, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgents } from '@/hooks/useAgents';
import { DeployAgentModal } from '@/components/dashboard/DeployAgentModal';

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useAgents();
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cards = document.getElementsByClassName('bento-card');
    for (const card of cards as any) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-white animate-spin opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Users className="w-4 h-4 text-white animate-pulse" />
          </div>
        </div>
        <span className="text-xs text-white/30">Mapping neural matrix...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 pt-10 px-6" onMouseMove={handleMouseMove}>
      <div className="fixed inset-0 noise-bg pointer-events-none opacity-[0.03]" />

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-[200]"
          >
            <div className="px-6 py-3 rounded-2xl bg-black border border-white/10 shadow-2xl flex items-center gap-4 backdrop-blur-2xl">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-white">{notification}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-xs text-white/40">
              Workforce Matrix v4.2
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs text-white/35">Autonomous sync active</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Neural Workforce</h1>
          <p className="text-sm text-white/40 max-w-xl font-normal leading-relaxed">
            Deploy and orchestrate specialized neural identities. 
            Manage high-frequency financial operations with cryptographic certainty.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search matrix..."
              className="pl-12 pr-6 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-white/25 transition-all w-56 placeholder:text-white/20"
            />
          </div>
          <button 
            onClick={() => setIsDeployModalOpen(true)}
            className="btn-primary group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
            Deploy Identity
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {(search
            ? agents?.filter((a: any) => a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase()))
            : agents
          )?.map((agent: any, i: number) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              layout
            >
              <AgentCard 
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
            </motion.div>
          ))}
        </AnimatePresence>
        
        <motion.button 
          layout
          onClick={() => setIsDeployModalOpen(true)}
          className="bento-card border-dashed border-white/10 flex flex-col items-center justify-center gap-8 py-20 group hover:border-white/30 transition-all bg-white/[0.01]"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-500 group-hover:scale-110">
              <Plus className="w-10 h-10" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center animate-pulse">
              <Zap className="w-3 h-3 text-white fill-current" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-sm font-medium text-white">Scale Workforce</div>
            <p className="text-neutral-600 text-xs font-medium max-w-[180px]">Inject a new specialized neural identity into the matrix</p>
          </div>
        </motion.button>
      </div>

      <DeployAgentModal 
        isOpen={isDeployModalOpen} 
        onClose={() => setIsDeployModalOpen(false)} 
      />
    </div>
  );
}

// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePolicies } from '@/hooks/usePolicies';
import { CreatePolicyModal } from '@/components/dashboard/CreatePolicyModal';
import {
  Loader2,
  Plus,
  ShieldCheck,
  Lock,
  AlertTriangle,
  TrendingUp,
  Info,
  CheckCircle2
} from 'lucide-react';

export default function PolicyPage() {
  const { data: policies, isLoading, togglePolicy, isToggling } = usePolicies();
  const [notification, setNotification] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleToggle = (policy: any) => {
    togglePolicy(policy.id);
    const newStatus = policy.isActive ? 'Paused' : 'Active';
    setNotification(`Policy ${policy.name} is now ${newStatus}`);
    setTimeout(() => setNotification(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        <span className="text-xs text-white/30 uppercase tracking-widest font-bold">Decoding Neural Laws...</span>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-7xl mx-auto space-y-12 pb-24 pt-10 px-6">
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
              Neural Laws v4.2
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs text-white/35">Enforcement active</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Neural Guardrails</h1>
          <p className="text-sm text-white/40 max-w-xl font-normal leading-relaxed">
            Configure autonomous financial guardrails. Our policy engine validates every request cryptographically before execution.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create New Law
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Policy Status', value: 'Active', icon: ShieldCheck, color: 'text-emerald-500' },
          { label: 'Rules Encoded', value: policies?.length || '0', icon: Lock, color: 'text-blue-500' },
          { label: 'Violations Blocked', value: '0', icon: AlertTriangle, color: 'text-red-500' }
        ].map((stat, i) => (
          <div key={i} className="bento-card flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <div className="text-xl font-semibold text-white tracking-tight">{stat.value}</div>
              <div className="text-xs text-white/30 uppercase tracking-widest font-bold mt-1">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-white/[0.06] pb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Active Guardrails</h2>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] font-bold text-white/40">{policies?.length}</span>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {policies?.map((policy: any) => (
            <div
              key={policy.id}
              className="bento-card flex flex-col md:flex-row items-center justify-between gap-8 group hover:bg-white/[0.02] transition-all"
            >
              <div className="flex items-center gap-8">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:scale-105 transition-all duration-500">
                  {policy.type === 'spending_limit' && <Lock className="w-6 h-6 text-white" />}
                  {policy.type === 'yield_trigger' && <TrendingUp className="w-6 h-6 text-white" />}
                  {policy.type === 'risk_threshold' && <AlertTriangle className="w-6 h-6 text-white" />}
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white tracking-tight">{policy.name}</h3>
                  <p className="text-sm text-white/30 max-w-md font-normal">{policy.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-10 w-full md:w-auto border-t md:border-t-0 md:border-l border-white/[0.06] pt-6 md:pt-0 md:pl-10">
                <div className="text-right">
                  <div className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-1">Threshold</div>
                  <div className="text-xl font-semibold text-white tracking-tight tabular-nums">
                    {policy.value} <span className="text-xs text-white/30 ml-1">PUSD</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${policy.isActive ? 'text-emerald-500' : 'text-white/10'}`}>
                    {policy.isActive ? 'Active' : 'Paused'}
                  </span>
                  <button 
                    onClick={() => handleToggle(policy)}
                    disabled={isToggling}
                    className="relative w-12 h-6 rounded-full bg-white/[0.05] border border-white/10 p-1 transition-all hover:border-white/20 disabled:opacity-50"
                  >
                    <motion.div 
                      animate={{ x: policy.isActive ? 24 : 0 }}
                      className={`w-4 h-4 rounded-full ${policy.isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-10 bento-card bg-white/[0.01] border-dashed flex items-start gap-8">
        <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0">
          <Info className="w-6 h-6 text-white/20" />
        </div>
        <div className="space-y-3">
          <h4 className="text-base font-semibold text-white tracking-tight">Neural Enforcement Protocol</h4>
          <p className="text-white/30 text-sm leading-relaxed max-w-4xl font-normal">
            Every transaction routed through PalmFlow is cryptographically validated against these laws in real-time. Our Risk Sentinel monitors the mempool to prevent execution if a neural law is violated, ensuring complete autonomous safety.
          </p>
        </div>
      </div>
    </div>

    <CreatePolicyModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

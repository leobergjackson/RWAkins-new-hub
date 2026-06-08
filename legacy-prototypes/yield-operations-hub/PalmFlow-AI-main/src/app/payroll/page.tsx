// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import { StreamingCard } from '@/components/dashboard/StreamingCard';
import { CreateStreamModal } from '@/components/dashboard/CreateStreamModal';
import { Plus, Users, CreditCard, Download } from 'lucide-react';
import { motion } from 'framer-motion';

import { useStreams } from '@/hooks/useStreams';
import { Loader2 } from 'lucide-react';
import { type Variants } from 'framer-motion';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 120 } },
};

export default function PayrollPage() {
  const { data: streams, isLoading, toggleStream } = useStreams();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        <span className="text-xs text-white/30 uppercase tracking-widest font-bold">Establishing Secure Streams...</span>
      </div>
    );
  }

  const totalStreamed = streams?.reduce((acc: number, s: any) => acc + s.totalStreamed, 0) || 0;
  const activeCount = streams?.filter((s: any) => s.status === 'active').length || 0;

  return (
    <>
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
            <span className="label-xs">Streaming payroll active</span>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Streaming Payroll</h1>
          <p className="text-sm text-white/40 font-normal mt-1">Real-time global compensation infrastructure powered by PUSD</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create Stream
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Streamed', value: `$${totalStreamed.toFixed(2)}`, sub: 'PUSD lifetime', color: '#00e5cc' },
          { label: 'Active Streams', value: activeCount, sub: `from ${streams?.length || 0} total`, color: '#6366f1' },
          { label: 'Settlement Speed', value: 'Instant', sub: 'Real-time on-chain', color: '#10b981' },
        ].map((s, i) => (
          <motion.div key={i} variants={item} className="neural-card p-5 flex items-center gap-4">
            <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <div>
              <div className="label-xs mb-1">{s.label}</div>
              <div className="text-lg font-semibold text-white tracking-tight tabular-nums">{s.value}</div>
              <div className="text-xs text-white/30 mt-0.5">{s.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Streams List */}
        <motion.div variants={item} className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Active Streams</h2>
          </div>
          <div className="space-y-3">
            {streams?.map((stream: any, i: number) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <StreamingCard 
                  recipient={stream.recipientName}
                  role={stream.recipientRole}
                  rate={stream.ratePerSecond}
                  totalStreamed={stream.totalStreamed}
                  status={stream.status}
                />
              </motion.div>
            ))}
            {(!streams || streams.length === 0) && (
              <div className="neural-card p-20 flex flex-col items-center justify-center text-center">
                <Users className="w-10 h-10 text-white/10 mb-4" />
                <p className="text-sm text-white/30">No active streams detected. Begin your first neural payroll.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Analytics Sidebar */}
        <motion.div variants={item} className="space-y-4">
          <h2 className="text-base font-semibold text-white">Analytics</h2>

          {/* Budget Utilization */}
          {(() => {
            const totalAllocated = streams?.reduce((acc: number, s: any) => acc + (s.ratePerSecond * 2592000), 0) || 0;
            const pct = totalAllocated > 0 ? Math.min((totalStreamed / totalAllocated) * 100, 100) : 0;
            return (
              <div className="neural-card p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="label-sm">Streams Budget Utilization</span>
                  <span className="text-sm font-medium text-white">{pct.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #00e5cc, #6366f1)' }} />
                </div>
                <div className="flex justify-between text-xs text-white/30">
                  <span>${totalStreamed.toFixed(2)} streamed</span>
                  <span>{streams?.length || 0} active streams</span>
                </div>
              </div>
            );
          })()}

          {/* Info cards */}
          <div className="space-y-3">
            {[
              { icon: Users, label: 'Global Reach', value: 'Neural Network Active', color: '#6366f1' },
              { icon: CreditCard, label: 'Fee Savings', value: '100% (Native PUSD)', color: '#00e5cc' },
            ].map((card, i) => (
              <div key={i} className="neural-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${card.color}15` }}>
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <div>
                  <div className="text-sm font-medium text-white leading-tight">{card.label}</div>
                  <div className="label-sm">{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Download Report */}
          <button
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-white/50 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Download className="w-4 h-4" />
            Download Detailed Report
          </button>
        </motion.div>
      </div>
    </motion.div>
    <CreateStreamModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import { Repeat, Plus, Wallet, Clock, Loader2, Play, Pause, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { type Variants } from 'framer-motion';
import { useStreams } from '@/hooks/useStreams';
import { CreateStreamModal } from '@/components/dashboard/CreateStreamModal';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 120 } },
};

export default function StreamingPage() {
  const { data: streams, isLoading, toggleStream } = useStreams();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        <span className="text-xs text-white/30 uppercase tracking-widest font-bold">Loading Neural Streams...</span>
      </div>
    );
  }

  const totalSettled = streams?.reduce((acc: number, s: any) => acc + (s.totalStreamed ?? 0), 0) ?? 0;
  const activeCount = streams?.filter((s: any) => s.status === 'active').length ?? 0;

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
              <span className="label-xs">Real-time settlement active</span>
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Payroll Streams</h1>
            <p className="text-sm text-white/40 font-normal mt-1">Continuous on-chain PUSD payment flows — per-second global compensation</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create New Stream
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Active Flows', value: activeCount, sub: `of ${streams?.length ?? 0} total`, color: '#00e5cc', icon: Repeat },
            { label: 'Total Settled', value: `$${totalSettled.toFixed(2)}`, sub: 'PUSD lifetime', color: '#6366f1', icon: Wallet },
            { label: 'Global Uptime', value: '24/7', sub: 'Real-time on-chain', color: '#10b981', icon: Clock },
          ].map((s, i) => (
            <motion.div key={i} variants={item} className="neural-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <div className="label-xs mb-1">{s.label}</div>
                <div className="text-lg font-semibold text-white tracking-tight tabular-nums">{s.value}</div>
                <div className="text-xs text-white/30 mt-0.5">{s.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Streams List */}
        <motion.div variants={item} className="space-y-4">
          <h2 className="text-base font-semibold text-white px-1">Active Payroll Streams</h2>

          <div className="space-y-3">
            {streams?.map((stream: any, i: number) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="neural-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold text-white shrink-0"
                    style={{ background: 'rgba(0,229,204,0.1)', border: '1px solid rgba(0,229,204,0.15)' }}
                  >
                    {(stream.recipientName ?? 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{stream.recipientName}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="label-xs">{stream.recipientRole}</span>
                      {stream.walletAddress && (
                        <span className="text-[10px] font-mono text-white/20">
                          {stream.walletAddress.slice(0, 4)}…{stream.walletAddress.slice(-4)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 sm:gap-12">
                  <div className="text-right">
                    <div className="label-xs mb-1">Settled</div>
                    <div className="text-base font-semibold text-accent-cyan tabular-nums">{(stream.totalStreamed ?? 0).toFixed(4)} <span className="text-xs text-white/30">PUSD</span></div>
                  </div>
                  <div className="text-right">
                    <div className="label-xs mb-1">Rate</div>
                    <div className="text-base font-semibold text-white tabular-nums">{stream.ratePerSecond} <span className="text-[10px] text-white/30">PUSD/s</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStream(stream.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {stream.status === 'active' ? <Pause className="w-3.5 h-3.5 text-white/50" /> : <Play className="w-3.5 h-3.5 text-white/50" />}
                    </button>
                    {stream.walletAddress && (
                      <a
                        href={`https://solscan.io/account/${stream.walletAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                        style={{ background: 'rgba(0,229,204,0.06)', border: '1px solid rgba(0,229,204,0.12)' }}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-accent-cyan" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {(!streams || streams.length === 0) && (
              <motion.div variants={item} className="neural-card p-20 flex flex-col items-center justify-center text-center">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-white/[0.02] animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-white/[0.02]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Repeat className="w-8 h-8 text-white/10" />
                  </div>
                </div>
                <p className="text-sm text-white/30 mb-4">No active streams detected.</p>
                <button onClick={() => setShowCreate(true)} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Begin First Stream
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <CreateStreamModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

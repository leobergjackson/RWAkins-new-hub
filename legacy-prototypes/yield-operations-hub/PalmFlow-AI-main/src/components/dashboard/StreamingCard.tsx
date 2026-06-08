// Built by vsrupeshkumar
"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Zap, Globe, ArrowUpRight } from 'lucide-react';

interface StreamingCardProps {
  recipient: string;
  role: string;
  rate: number; // PUSD per second
  totalStreamed: number;
  status: 'active' | 'paused';
}

export function StreamingCard({ recipient, role, rate, totalStreamed: initialTotal, status: initialStatus }: StreamingCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [streamed, setStreamed] = useState(initialTotal);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'active') {
      interval = setInterval(() => {
        setStreamed(prev => prev + rate);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, rate]);

  const isActive = status === 'active';

  return (
    <div
      className="neural-card p-5 relative overflow-hidden group"
    >
      {/* Subtle active glow */}
      {isActive && (
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,229,204,0.06) 0%, transparent 70%)', margin: '-12px -12px 0 0' }}
        />
      )}

      {/* Top row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {recipient.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-medium text-white leading-tight">{recipient}</div>
            <div className="label-sm">{role}</div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
            color: isActive ? '#10b981' : 'rgba(255,255,255,0.3)',
            border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`,
          }}
        >
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          {isActive ? 'Streaming' : 'Paused'}
        </div>
      </div>

      {/* Counter */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap className="w-3 h-3" style={{ color: '#00e5cc' }} />
          <span className="label-xs">Total streamed</span>
        </div>
        <motion.div
          key={Math.floor(streamed * 10)}
          className="text-2xl font-semibold text-white tabular-nums tracking-tight font-mono"
        >
          {streamed.toFixed(4)}
          <span className="text-sm font-sans font-normal ml-1.5" style={{ color: '#00e5cc' }}>PUSD</span>
        </motion.div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="label-xs mb-1">Flow Rate</div>
          <div className="text-sm font-medium text-white">{(rate * 3600).toFixed(2)} <span className="text-white/40 text-xs">PUSD/hr</span></div>
        </div>
        <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="label-xs mb-1">Region</div>
          <div className="text-sm font-medium text-white flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-400" /> Global
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setStatus(isActive ? 'paused' : 'active')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={isActive
            ? { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.07)' }
            : { background: 'rgba(0,229,204,0.1)', color: '#00e5cc', border: '1px solid rgba(0,229,204,0.2)' }}
        >
          {isActive ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Resume</>}
        </button>
        <button
          className="p-2.5 rounded-xl text-white/30 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

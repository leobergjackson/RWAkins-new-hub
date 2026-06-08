// Built by vsrupeshkumar
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Fingerprint, Zap, Lock } from 'lucide-react';

export function ExposureRisk() {
  const metrics = [
    { label: "Wallet Correlation", value: "0.2%", status: "LOW", color: "emerald" },
    { label: "Behavioral Traceability", value: "1.1%", status: "LOW", color: "emerald" },
    { label: "Timing Signatures", value: "4.5%", status: "MID", color: "cyan" },
    { label: "Treasury Leakage", value: "0.0%", status: "NONE", color: "emerald" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Fingerprint size={16} />
          Traceability Analysis
        </h3>
        <span className="text-[10px] font-mono bg-emerald-glow/10 text-emerald-glow px-2 py-0.5 rounded">AUTO-SCAN ACTIVE</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white/5 border border-white/5 p-4 rounded-2xl group hover:border-cyan-glow/30 transition-all">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-white/80">{m.label}</span>
              <span className={`text-[10px] font-bold ${
                m.color === 'emerald' ? 'text-emerald-glow' : 'text-cyan-glow'
              }`}>{m.status}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-lg font-bold font-mono">{m.value}</span>
              <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: m.value }}
                  className={`h-full ${
                    m.color === 'emerald' ? 'bg-emerald-glow' : 'bg-cyan-glow'
                  }`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 glass rounded-2xl border-cyan-glow/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-glow/20 flex items-center justify-center">
            <ShieldAlert size={16} className="text-cyan-glow" />
          </div>
          <span className="text-xs font-bold">Privacy Recommendation</span>
        </div>
        <p className="text-xs text-white/60 leading-relaxed italic">
          "Detected repeating transaction timing patterns. Suggest activating 'Jitter Execution' for the next 24 hours to mask automated treasury flows."
        </p>
      </div>
    </div>
  );
}

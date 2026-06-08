// Built by vsrupeshkumar
"use client";

export const dynamic = 'force-dynamic';

import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ExposureRisk } from '@/components/dashboard/ExposureRisk';
import { ShieldCheck, AlertTriangle, Fingerprint, Activity } from 'lucide-react';

export default function RiskEnginePage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-glow">Operational Exposure Engine</h1>
            <p className="text-muted-foreground mt-1">Real-time analysis of wallet correlation and behavioral traceability.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 glass rounded-xl border-emerald-glow/20">
            <ShieldCheck size={18} className="text-emerald-glow" />
            <span className="text-xs font-bold text-emerald-glow uppercase tracking-widest">System Stealth: 99.8%</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Main Risk Analysis */}
          <div className="col-span-12 lg:col-span-8 glass p-8 rounded-3xl border-white/10">
            <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
              <Fingerprint size={24} className="text-cyan-glow" />
              Advanced Traceability Analysis
            </h2>
            <ExposureRisk />
          </div>

          {/* Vulnerability Feed */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="glass-dark p-6 rounded-3xl border-white/5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-500" />
                Active Risk Alerts
              </h3>
              <div className="space-y-4">
                <AlertItem 
                  severity="MID" 
                  title="Transaction Clustering" 
                  desc="Detected 4 transactions within 2 minutes from associated sub-wallets."
                />
                <AlertItem 
                  severity="LOW" 
                  title="IP Correlation" 
                  desc="Wallet activity detected from a non-obfuscated gateway."
                />
              </div>
            </div>

            <div className="glass p-6 rounded-3xl border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-glow mb-4 flex items-center gap-2">
                <Activity size={16} />
                Stealth Recommendations
              </h3>
              <div className="space-y-3">
                <p className="text-xs text-white/70 leading-relaxed">
                  1. Rotate deposit addresses for next vendor batch.
                </p>
                <p className="text-xs text-white/70 leading-relaxed">
                  2. Enable jitter-delay (30s - 300s) on automated swaps.
                </p>
                <p className="text-xs text-white/70 leading-relaxed">
                  3. Fragment the $1.2M treasury movement into 8 stealth paths.
                </p>
              </div>
              <button className="w-full mt-6 py-3 bg-cyan-glow/20 hover:bg-cyan-glow/30 text-cyan-glow text-xs font-bold rounded-xl transition-all border border-cyan-glow/20">
                Apply All Optimizations
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function AlertItem({ severity, title, desc }: any) {
  return (
    <div className="p-4 bg-white/5 rounded-2xl border-l-2 border-yellow-500/50">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-white/90">{title}</span>
        <span className="text-[10px] font-bold text-yellow-500">{severity}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

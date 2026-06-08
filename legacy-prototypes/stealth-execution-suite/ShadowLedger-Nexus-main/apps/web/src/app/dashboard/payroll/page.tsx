// Built by vsrupeshkumar
"use client";

export const dynamic = 'force-dynamic';

import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { motion } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  Zap, 
  ShieldCheck, 
  Link as LinkIcon,
  Plus,
  Search,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

export default function PayrollPage() {
  const { data: payrolls, isLoading } = trpc.getPayroll.useQuery({ orgId: 'default-org' });
  const { data: overview } = trpc.getOverview.useQuery({ orgId: 'default-org' });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-glow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalVolume = payrolls?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const totalRecipients = payrolls?.reduce((acc, curr) => acc + (curr.recipients?.length || 0), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-glow">Autonomous Payroll</h1>
            <p className="text-muted-foreground mt-1">Global private salary disbursement & contractor settlement.</p>
          </div>
          <button className="px-6 py-3 bg-cyan-glow text-black font-bold rounded-xl neo-glow-cyan flex items-center gap-2 hover:scale-105 transition-all">
            <Plus size={18} />
            Configure New Payroll
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PayrollStat label="Active Recipients" value={totalRecipients.toString()} detail="Across Global Teams" icon={Users} />
          <PayrollStat label="Monthly Volume" value={`$${totalVolume.toLocaleString()}`} detail="+5.2% vs Last Month" icon={Zap} />
          <PayrollStat label="Stealth Level" value={`${overview?.treasury?.exposureScore || 0}%`} detail="Zero Behavioral Clusters" icon={ShieldCheck} />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Active Schedules */}
          <div className="col-span-12 lg:col-span-8 glass-dark rounded-3xl border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Calendar size={18} className="text-cyan-glow" />
                Active Payroll Schedules
              </h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search schedules..." 
                  className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-cyan-glow/50"
                />
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {payrolls?.map((p) => (
                <ScheduleItem 
                  key={p.id}
                  name={p.name} 
                  amount={`$${p.amount.toLocaleString()}`} 
                  date={new Date(p.nextRun).toLocaleDateString()} 
                  recipients={p.recipients?.length || 0}
                  status={p.status}
                />
              ))}
              {(!payrolls || payrolls.length === 0) && (
                <div className="text-center py-12 text-muted-foreground opacity-50">
                  No active payroll schedules found.
                </div>
              )}
            </div>
          </div>

          {/* AI Payroll Insights */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="glass p-6 rounded-3xl border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-glow mb-4 flex items-center gap-2">
                <Cpu size={16} />
                Payroll AI Intelligence
              </h3>
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Disbursement Risk</p>
                  <p className="text-xl font-bold text-emerald-glow">NEGLIGIBLE</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Fee Optimization</p>
                  <p className="text-xl font-bold text-cyan-glow">-$1,240 saved</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-cyan-glow/30 pl-3 py-1">
                  "AI has successfully fragmented the APAC batch into 12 sub-transactions across 6 hours to minimize liquidity impact and cluster visibility."
                </p>
              </div>
            </div>

            <div className="glass-dark p-6 rounded-3xl border-white/5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Stealth Contractor Links</h3>
              <div className="space-y-3">
                <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-between px-4 group transition-all">
                  <div className="flex items-center gap-3">
                    <LinkIcon size={16} className="text-muted-foreground" />
                    <span className="text-sm">Generate Stealth Link</span>
                  </div>
                  <Plus size={14} className="text-muted-foreground group-hover:text-cyan-glow" />
                </button>
                <p className="text-[10px] text-center text-muted-foreground">Used for one-time private settlements.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function PayrollStat({ label, value, detail, icon: Icon }: any) {
  return (
    <div className="glass p-6 rounded-3xl border-white/10">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-cyan-glow/10 flex items-center justify-center">
          <Icon size={20} className="text-cyan-glow" />
        </div>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold font-mono">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}

function ScheduleItem({ name, amount, date, recipients, status }: any) {
  return (
    <div className="group bg-white/5 hover:bg-white/10 p-5 rounded-2xl border border-transparent hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-white/90">{name}</h4>
        <div className={cn(
          "px-2 py-0.5 rounded text-[10px] font-bold",
          status === 'OPTIMIZING' ? 'bg-cyan-glow/10 text-cyan-glow animate-pulse' : 
          status === 'SCHEDULED' ? 'bg-emerald-glow/10 text-emerald-glow' : 'bg-yellow-500/10 text-yellow-500'
        )}>
          {status}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-6 text-muted-foreground">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest mb-1">Total Amount</span>
            <span className="font-mono text-white/80">{amount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest mb-1">Recipients</span>
            <span className="font-mono text-white/80">{recipients}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest mb-1">Next Run</span>
            <span className="font-mono text-white/80">{date}</span>
          </div>
        </div>
        <button className="px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all font-bold">
          Manage
        </button>
      </div>
    </div>
  );
}

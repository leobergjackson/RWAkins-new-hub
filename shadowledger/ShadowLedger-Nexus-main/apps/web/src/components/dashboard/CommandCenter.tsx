// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  ShieldAlert, 
  Zap, 
  TrendingUp, 
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Cpu,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StealthRouteMap } from './StealthRouteMap';
import { trpc } from '@/lib/trpc';
import { useWallet } from '@arbitrum-sepolia/wallet-adapter-react';

export function CommandCenter() {
  const [isShielded, setIsShielded] = useState(true);
  const { publicKey } = useWallet();
  const { data, isLoading } = trpc.getOverview.useQuery({ orgId: 'default-org' });
  const { data: walletBalance } = trpc.getDevnetBalance.useQuery(
    { address: publicKey?.toBase58() || '' },
    { enabled: !!publicKey }
  );
  const aiMutation = trpc.executeAiInstruction.useMutation();
  
  const treasury = data?.treasury;
  const agents = data?.agents || [];
  const transactions = treasury?.transactions || [];
  const safetyAudits = data?.safetyAudits || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-glow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Top Header */}
      <div className="col-span-12 flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-glow">Organizational Dashboard</h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest">System Status: <span className="text-emerald-glow">OPERATIONAL</span></p>
        </div>
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all cursor-pointer glass",
              isShielded ? "border-cyan-glow/30" : "border-white/10"
            )} onClick={() => setIsShielded(!isShielded)}
          >
            <div className={cn("w-2 h-2 rounded-full", isShielded ? "bg-cyan-glow animate-pulse" : "bg-white/20")} />
            <span className={cn("text-[10px] font-bold tracking-tighter", isShielded ? "text-cyan-glow" : "text-muted-foreground")}>
              PRIVACY SHIELD: {isShielded ? "ACTIVE" : "INACTIVE"}
            </span>
          </motion.div>
          <button className="px-6 py-2 bg-white/5 text-white border border-white/10 font-bold rounded-xl hover:bg-white/10 transition-all text-sm">
            Temporal Access
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <StatCard 
            title="Shielded Treasury" 
            value={publicKey ? `${(walletBalance || 0).toFixed(2)} ETH` : treasury ? `${(treasury.balance / 200).toFixed(2)} ETH` : "0.00 ETH"} 
            change={publicKey ? "LIVE WALLET" : "+12.4%"} 
            icon={Wallet} 
            color="cyan" 
          />
          <StatCard 
            title="AI Swarm Status" 
            value={`${agents.length} Nodes`} 
            change="SYNCED" 
            icon={Cpu} 
            color="purple" 
          />
          <StatCard 
            title="Privacy Score" 
            value={`${treasury?.exposureScore || 0}%`} 
            change="EXCELLENT" 
            icon={ShieldAlert} 
            color="emerald" 
          />
        </div>

        {/* Live AI Operations Feed */}
        <div className="glass-dark rounded-3xl p-6 border-white/5 h-[600px] flex flex-col shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Activity size={200} />
          </div>
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Zap size={20} className="text-cyan-glow" />
              On-Chain Activity Feed
            </h2>
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg">
              <button className="px-3 py-1 text-xs font-medium bg-white/10 rounded-md">Real-time</button>
              <button className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-white">Historical</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide relative z-10">
            {treasury?.onChainTxs && treasury.onChainTxs.length > 0 ? (
              treasury.onChainTxs.map((tx: any, idx: number) => (
                <OperationItem 
                  key={idx}
                  agent="Execution Agent" 
                  action="ON-CHAIN SETTLEMENT" 
                  status={tx.success ? "CONFIRMED" : "FAILED"} 
                  time={tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : 'RECENT'} 
                  detail={`SIG: ${tx.signature.slice(0, 12)}... | AMOUNT: ${tx.amount.toFixed(4)} ETH`}
                />
              ))
            ) : (
              transactions.map((tx: any, i: number) => {
                const meta = JSON.parse(tx.metadata || '{}');
                return (
                  <OperationItem 
                    key={tx.id}
                    agent={i % 2 === 0 ? "Treasury Agent" : "Payroll Agent"} 
                    action={tx.type} 
                    status={tx.status} 
                    time="RECENT" 
                    detail={meta.detail || tx.type}
                  />
                );
              })
            )}
            {(!treasury?.onChainTxs || treasury.onChainTxs.length === 0) && transactions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-30">
                <Activity size={48} className="mb-2" />
                <p className="text-sm">Listening for on-chain events...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Intelligence Layer */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <div className="glass rounded-3xl p-8 border-white/10 shadow-2xl">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-cyan-glow" />
            Intelligence Engine
          </h2>
          
          <div className="space-y-8">
            <div>
              <div className="flex justify-between text-xs mb-3">
                <span className="text-muted-foreground uppercase tracking-widest font-bold">Camouflage Effectiveness</span>
                <span className="text-emerald-glow font-mono font-bold">98.4%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-glow w-[98%] shadow-[0_0_10px_rgba(0,255,136,0.5)]" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">Runway</p>
                <p className="text-2xl font-bold font-mono">{treasury?.runway || '0'}m</p>
              </div>
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">Efficiency</p>
                <p className="text-2xl font-bold font-mono">{treasury?.efficiency || '0'}%</p>
              </div>
            </div>

            <div className="bg-cyan-glow/5 border border-cyan-glow/20 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                <Zap size={40} className="text-cyan-glow" />
              </div>
              <h3 className="text-xs font-bold text-cyan-glow uppercase tracking-widest mb-3 flex items-center gap-2">
                AI INSIGHT
              </h3>
              <p className="text-sm text-white/80 leading-relaxed font-light italic">
                "Recommend fragmenting the upcoming payroll batch into 4 randomized time-windows to minimize transaction clustering patterns."
              </p>
              <button 
                onClick={async () => {
                  try {
                    await aiMutation.mutateAsync({
                      orgId: 'default-org',
                      instruction: 'Fragment the upcoming payroll batch into 4 randomized time-windows.'
                    });
                    alert('AI Optimization Command Issued');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                disabled={aiMutation.isLoading}
                className="mt-6 w-full py-3 bg-cyan-glow text-black text-xs font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-glow/20 disabled:opacity-50"
              >
                {aiMutation.isLoading ? 'Processing...' : 'Execute fragmenting'}
              </button>
            </div>
          </div>
        </div>

        {/* AI Agent Nodes Visualization */}
        <div className="glass-dark rounded-3xl p-6 border-white/5 h-[300px] flex flex-col relative overflow-hidden group shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-glow/5 to-purple-glow/5" />
          <h2 className="text-xs font-bold mb-4 relative z-10 text-muted-foreground uppercase tracking-widest">Neural Routing Topology</h2>
          <div className="flex-1 relative z-10">
            <StealthRouteMap />
          </div>
        </div>

        {/* Adversarial Policy Log */}
        <div className="glass rounded-3xl p-6 border-white/10 flex flex-col h-[400px] shadow-2xl">
          <h2 className="text-xs font-bold mb-4 text-emerald-glow uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert size={14} />
            Adversarial Policy Log
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {safetyAudits.map((audit: any) => (
              <SafetyAuditItem key={audit.id} audit={audit} />
            ))}
            {safetyAudits.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-20 italic text-xs">
                Monitoring autonomous decisions...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, color }: any) {
  const colorMap: any = {
    cyan: "text-cyan-glow bg-cyan-glow/10 border-cyan-glow/20",
    purple: "text-purple-glow bg-purple-glow/10 border-purple-glow/20",
    emerald: "text-emerald-glow bg-emerald-glow/10 border-emerald-glow/20",
  };

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      className="glass p-7 rounded-3xl border-white/10 flex flex-col gap-5 shadow-xl"
    >
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", colorMap[color])}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{title}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-3xl font-bold font-mono tracking-tighter">{value}</p>
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", color === 'emerald' ? 'bg-emerald-glow/10 text-emerald-glow' : 'bg-cyan-glow/10 text-cyan-glow')}>
            {change}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function OperationItem({ agent, action, status, time, detail }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group bg-white/5 hover:bg-white/10 p-5 rounded-2xl border border-transparent hover:border-white/10 transition-all cursor-pointer shadow-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-glow/10 flex items-center justify-center border border-cyan-glow/20">
            <Cpu size={14} className="text-cyan-glow" />
          </div>
          <div>
            <p className="text-xs font-bold text-white/90">{agent}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{action}</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{time}</span>
      </div>
      <p className="text-xs text-white/60 mb-4 font-mono truncate">{detail}</p>
      <div className="flex items-center gap-2">
        <div className={cn(
          "px-2.5 py-1 rounded-md text-[10px] font-bold border",
          status === 'CONFIRMED' ? 'bg-emerald-glow/10 text-emerald-glow border-emerald-glow/20' : 'bg-amber-glow/10 text-amber-glow border-amber-glow/20'
        )}>
          {status}
        </div>
        <div className="flex-1 h-[1px] bg-white/5" />
        <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-cyan-glow transition-colors" />
      </div>
    </motion.div>
  );
}

function SafetyAuditItem({ audit }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-emerald-glow/20 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter",
          audit.allowed ? "bg-emerald-glow/10 text-emerald-glow" : "bg-red-500/10 text-red-500"
        )}>
          {audit.allowed ? "Policy Pass" : "Policy Block"}
        </span>
        <span className="text-[9px] font-mono text-muted-foreground">Risk: {(audit.riskScore * 100).toFixed(1)}%</span>
      </div>
      <p className="text-xs font-bold text-white/80 mb-1">{audit.action}</p>
      {audit.reason && <p className="text-[10px] text-red-400 italic mb-2">"{audit.reason}"</p>}
      <div className="flex items-center justify-between mt-3 opacity-60">
        <span className="text-[9px] font-mono uppercase text-muted-foreground">{audit.agentType}</span>
        <span className="text-[9px] font-mono text-muted-foreground">{new Date(audit.createdAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

// Built by vsrupeshkumar
"use client";

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Shield, 
  ExternalLink,
  Plus,
  TrendingUp,
  TrendingDown,
  TrendingDown,
  Lock,
  Loader2
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { useWallet } from '@arbitrum-sepolia/wallet-adapter-react';

export default function TreasuryPage() {
  const { publicKey } = useWallet();
  const { data: overview, isLoading } = trpc.getOverview.useQuery({ orgId: 'default-org' });
  const { data: balance } = trpc.getDevnetBalance.useQuery(
    { address: publicKey?.toBase58() || '' },
    { enabled: !!publicKey }
  );

  const utils = trpc.useUtils();
  const transferMutation = trpc.executeTransfer.useMutation({
    onSuccess: () => {
      utils.getOverview.invalidate();
    }
  });

  const handleStealthTransfer = async () => {
    const amount = 0.5; // Simulated amount
    const recipient = 'ETH_DEST_ABC...';
    try {
      await transferMutation.mutateAsync({
        recipient,
        amount,
        orgId: 'default-org'
      });
      alert(`Stealth Transfer of ${amount} ETH initiated!`);
    } catch (err) {
      console.error(err);
    }
  };

  const treasury = overview?.treasury;
  const transactions = treasury?.transactions || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-glow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-glow uppercase">Shielded Treasury</h1>
            <p className="text-muted-foreground mt-2 text-sm uppercase tracking-widest font-mono">
              Invisible Asset Management & Stealth Settlements
            </p>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-sm hover:bg-white/10 transition-all flex items-center gap-2">
              <Plus size={18} />
              Deposit Assets
            </button>
            <button 
              onClick={handleStealthTransfer}
              disabled={transferMutation.isLoading}
              className="px-6 py-3 bg-cyan-glow text-black font-bold rounded-xl text-sm hover:scale-105 transition-all shadow-lg shadow-cyan-glow/20 flex items-center gap-2 disabled:opacity-50"
            >
              {transferMutation.isLoading ? <Loader2 className="animate-spin" size={18} /> : <ArrowUpRight size={18} />}
              Stealth Transfer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Main Balance Card */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <div className="glass-dark p-10 rounded-[3rem] border-white/5 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-12 opacity-5">
                <Wallet size={200} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-cyan-glow/10 border border-cyan-glow/20 flex items-center justify-center">
                    <Shield size={20} className="text-cyan-glow" />
                  </div>
                  <span className="text-xs font-bold text-cyan-glow uppercase tracking-widest">Autonomous Shield Active</span>
                </div>
                
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest mb-2">Total Managed Liquidity</p>
                <div className="flex items-baseline gap-4 mb-12">
                  <h2 className="text-7xl font-bold tracking-tighter font-mono">
                    {publicKey ? (balance || 0).toFixed(2) : (treasury?.balance / 200).toFixed(2)}
                  </h2>
                  <span className="text-3xl font-bold text-muted-foreground">ETH</span>
                </div>

                <div className="grid grid-cols-3 gap-8 pt-10 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Est. USD Value</p>
                    <p className="text-xl font-bold font-mono">
                      ${(publicKey ? (balance || 0) * 200 : treasury?.balance).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">24h Delta</p>
                    <div className="flex items-center gap-1 text-emerald-glow font-bold font-mono">
                      <TrendingUp size={14} />
                      +4.2%
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Privacy Multiplier</p>
                    <p className="text-xl font-bold font-mono text-cyan-glow">12.4x</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="glass rounded-[2.5rem] border-white/10 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h3 className="font-bold flex items-center gap-2">
                  <RefreshCw size={18} className="text-cyan-glow" />
                  Activity History
                </h3>
                <button className="text-[10px] font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-widest">
                  View On Explorer
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-8 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Operation</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions.map((tx: any, i: number) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              tx.amount < 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-glow/10 text-emerald-glow"
                            )}>
                              {tx.amount < 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{tx.type}</p>
                              <p className="text-[10px] text-muted-foreground font-mono uppercase">ID: {tx.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-2 py-1 rounded-md bg-emerald-glow/10 text-emerald-glow text-[10px] font-bold border border-emerald-glow/20">
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 font-mono font-bold text-sm">
                          {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toLocaleString()}
                        </td>
                        <td className="px-8 py-6 text-[10px] text-muted-foreground font-mono uppercase">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button className="p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 rounded-lg">
                            <ExternalLink size={14} className="text-muted-foreground" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side Intelligence Panel */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="glass p-8 rounded-[2.5rem] border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-glow to-purple-glow" />
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                <Lock size={18} className="text-cyan-glow" />
                Privacy Configuration
              </h3>
              <div className="space-y-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Stealth Mode</span>
                    <span className="text-[10px] font-bold text-cyan-glow">ACTIVE</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-glow w-[100%]" />
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Jitter Delay</span>
                    <span className="text-[10px] font-bold text-cyan-glow">30-300s</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-glow w-[85%]" />
                  </div>
                </div>
                <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-widest">
                  Rotate Stealth Addresses
                </button>
              </div>
            </div>

            <div className="glass-dark p-8 rounded-[2.5rem] border-white/5 shadow-2xl">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-cyan-glow" />
                Asset Distribution
              </h3>
              <div className="space-y-4">
                <AssetItem symbol="ETH" name="Arbitrum Sepolia" percent={85} amount="12,402.91" />
                <AssetItem symbol="USDC" name="USD Coin" percent={10} amount="420,000.00" />
                <AssetItem symbol="BONK" name="Bonk" percent={5} amount="1.2B" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function AssetItem({ symbol, name, percent, amount }: any) {
  return (
    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center font-bold text-[10px]">
            {symbol[0]}
          </div>
          <div>
            <p className="text-xs font-bold">{name}</p>
            <p className="text-[10px] text-muted-foreground">{percent}%</p>
          </div>
        </div>
        <p className="text-sm font-bold font-mono">{amount}</p>
      </div>
      <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
        <div className="h-full bg-white/20" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

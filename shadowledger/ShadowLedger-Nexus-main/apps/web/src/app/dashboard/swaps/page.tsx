// Built by vsrupeshkumar
"use client";

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { motion } from 'framer-motion';
import { 
  RefreshCcw, 
  ArrowDown, 
  Search, 
  Info,
  Shield,
  Zap,
  Lock,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SwapsPage() {
  const [fromAsset, setFromAsset] = useState('ETH');
  const [toAsset, setToAsset] = useState('USDC');
  const [amount, setAmount] = useState('100');
  const [isSuccess, setIsSuccess] = useState(false);

  const swapMutation = trpc.executeSwap.useMutation();

  const handleSwap = async () => {
    try {
      await swapMutation.mutateAsync({
        fromAsset,
        toAsset,
        amount: Number(amount),
        orgId: 'default-org'
      });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-glow uppercase">Private Liquidity Swaps</h1>
            <p className="text-muted-foreground mt-2 text-sm uppercase tracking-widest font-mono">
              MEV-Protected & Stealth Routed Asset Exchange
            </p>
          </div>
          <div className="p-3 bg-emerald-glow/10 border border-emerald-glow/20 rounded-2xl flex items-center gap-3">
            <Shield size={18} className="text-emerald-glow" />
            <span className="text-[10px] font-bold text-emerald-glow uppercase tracking-widest">Cloak Guard: Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Swap Interface */}
          <div className="glass-dark p-10 rounded-[3rem] border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5">
              <RefreshCcw size={150} />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>You Sell</span>
                  <span>Balance: 12,402.91 ETH</span>
                </div>
                <div className="flex items-center justify-between">
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-transparent border-none text-4xl font-bold font-mono focus:outline-none w-1/2"
                  />
                  <button className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/10 hover:bg-black/60 transition-all">
                    <div className="w-6 h-6 rounded-lg bg-cyan-glow/20 flex items-center justify-center text-[10px] font-bold text-cyan-glow">S</div>
                    <span className="font-bold">ETH</span>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="flex justify-center -my-4 relative z-20">
                <button className="p-4 bg-cyan-glow text-black rounded-2xl border-4 border-background hover:scale-110 transition-all shadow-xl">
                  <ArrowDown size={24} />
                </button>
              </div>

              <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>You Receive (Est.)</span>
                  <span>Balance: 42,000.00 USDC</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold font-mono text-white/40">20,000.00</p>
                  <button className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/10 hover:bg-black/60 transition-all">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-500">U</div>
                    <span className="font-bold">USDC</span>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground uppercase tracking-widest">Exchange Rate</span>
                <span className="font-mono">1 ETH ≈ 200 USDC</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground uppercase tracking-widest">Slippage Tolerance</span>
                <span className="text-cyan-glow">0.1% (Auto-Optimized)</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground uppercase tracking-widest">Routing Pattern</span>
                <span className="text-purple-glow">Multi-Path Stealth Fragmentation</span>
              </div>
            </div>

            <button 
              onClick={handleSwap}
              disabled={swapMutation.isLoading}
              className="w-full mt-10 py-5 bg-cyan-glow text-black font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-cyan-glow/20 uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {swapMutation.isLoading ? <Loader2 className="animate-spin" /> : <Lock size={20} />}
              {isSuccess ? "SWAP EXECUTED" : "Execute Protected Swap"}
            </button>
          </div>

          {/* Security Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass p-8 rounded-3xl border-white/10 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Zap size={18} className="text-cyan-glow" />
                Anti-MEV Guard
              </h3>
              <p className="text-xs text-white/60 leading-relaxed font-light italic">
                "Proprietary pre-consensus routing ensures your organizational swaps are invisible to front-running bots and sandwich attacks."
              </p>
            </div>
            <div className="glass p-8 rounded-3xl border-white/10 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <RefreshCcw size={18} className="text-purple-glow" />
                Fragmented Settlement
              </h3>
              <p className="text-xs text-white/60 leading-relaxed font-light italic">
                "Large volume swaps are automatically split across multiple sub-transactions to maintain minimal price impact and maximum privacy."
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Built by vsrupeshkumar
"use client";

import React from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { motion } from 'framer-motion';
import { Wallet, ArrowRight, TrendingUp, CircleDollarSign } from 'lucide-react';

export function PortfolioView() {
  const { data: portfolio, isLoading } = usePortfolio();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
      </div>
    );
  }

  const PUSD_MINT = process.env.NEXT_PUBLIC_PUSD_MINT ?? '';
  const tokens: any[] = portfolio?.tokens ?? [];
  const assets = [
    { symbol: 'ETH', name: 'Arbitrum Sepolia', amount: portfolio?.sol ?? 0, color: '#9945FF' },
    { symbol: 'PUSD', name: 'PalmFlow USD', amount: tokens.find((t) => t.mint === PUSD_MINT)?.amount ?? 0, color: '#00e5cc' },
    ...tokens
      .filter((t) => t.mint !== PUSD_MINT)
      .map((t) => ({
        symbol: typeof t.mint === 'string' && t.mint.length >= 4 ? t.mint.slice(0, 4).toUpperCase() : '???',
        name: 'Unknown Token',
        amount: t.amount ?? 0,
        color: '#6366f1',
      })),
  ].slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-white/30" />
          <h3 className="text-sm font-semibold text-white">Asset Allocation</h3>
        </div>
        <button className="text-[10px] font-bold text-white/30 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1">
          Manage <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {assets.map((asset, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${asset.color}15` }}>
                {asset.symbol === 'ETH' ? (
                  <TrendingUp className="w-4 h-4" style={{ color: asset.color }} />
                ) : (
                  <CircleDollarSign className="w-4 h-4" style={{ color: asset.color }} />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-accent-cyan transition-colors">{asset.symbol}</div>
                <div className="text-[10px] text-white/20 uppercase tracking-widest">{asset.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-medium text-white">{asset.amount.toLocaleString()}</div>
              <div className="text-[10px] text-white/20 uppercase tracking-widest">Active</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Built by vsrupeshkumar
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useAgents } from '@/hooks/useAgents';
import { 
  History, 
  Search, 
  Download, 
  Filter,
  Zap,
  ArrowUpRight,
  Loader2
} from 'lucide-react';

export default function HistoryPage() {
  const { data: agents, isLoading } = useAgents();
  const [search, setSearch] = React.useState('');

  const exportCSV = () => {
    const rows = [['Event', 'Agent', 'Type', 'Amount (PUSD)', 'Date', 'Tx Hash']];
    filtered.forEach((tx: any) => {
      rows.push([
        `"${tx.description?.replace(/"/g, '""') ?? ''}"`,
        tx.agentName ?? '',
        tx.type ?? '',
        tx.amount?.toString() ?? '0',
        new Date(tx.createdAt).toLocaleString(),
        tx.txHash ?? 'Internal',
      ]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palmflow-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allTransactions = agents?.flatMap((a: any) =>
    a.transactions.map((tx: any) => ({ ...tx, agentName: a.name }))
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  const filtered = search
    ? allTransactions.filter((tx: any) =>
        tx.description?.toLowerCase().includes(search.toLowerCase()) ||
        tx.agentName?.toLowerCase().includes(search.toLowerCase()) ||
        tx.type?.toLowerCase().includes(search.toLowerCase())
      )
    : allTransactions;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        <span className="text-xs text-white/30 uppercase tracking-widest font-bold">Synchronizing History...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Protocol Ledger
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Immutable History</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Transaction History</h1>
          <p className="text-sm text-white/40 max-w-xl font-normal leading-relaxed">
            A comprehensive, real-time ledger of every autonomous action and financial transfer executed by the PalmFlow workforce.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white transition-colors"
            title="Export as CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="relative group min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history..."
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-12 py-3 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="neural-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Event</th>
                <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Agent</th>
                <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Blockchain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map((tx: any, i: number) => (
                <tr key={i} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4 text-white/40 group-hover:text-accent-cyan transition-colors" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{tx.description}</div>
                        <div className="text-[10px] text-white/20 mt-1 uppercase tracking-wider">
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm text-white/40">{tx.agentName}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-white/[0.04] text-white/40">
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-mono font-medium text-white">
                      {tx.amount.toLocaleString()} <span className="text-[10px] text-white/30 ml-1">PUSD</span>
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Finalized</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {tx.txHash ? (
                      <a 
                        href={`https://solscan.io/tx/${tx.txHash}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-white/20 hover:text-white transition-colors"
                      >
                        {tx.txHash.slice(0, 4)}...{tx.txHash.slice(-4)}
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-white/10">Internal</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <History className="w-10 h-10 text-white/5 mx-auto mb-4" />
                    <p className="text-sm text-white/20">The protocol ledger is currently empty. Initialize activity to begin tracking.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

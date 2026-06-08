// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Briefcase, Wallet, Repeat, Loader2, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { useStreams } from '@/hooks/useStreams';

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateStreamModal = ({ isOpen, onClose }: CreateStreamModalProps) => {
  const [step, setStep] = useState(1);
  const [recipientName, setRecipientName] = useState('');
  const [recipientRole, setRecipientRole] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [ratePerSecond, setRatePerSecond] = useState('0.001');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const { createStream } = useStreams();

  const perDay = (parseFloat(ratePerSecond) * 86400).toFixed(2);
  const perMonth = (parseFloat(ratePerSecond) * 2592000).toFixed(2);

  const handleCreate = async () => {
    setIsCreating(true);
    setError('');
    try {
      await createStream({
        recipientName: recipientName || 'Unnamed Recipient',
        recipientRole: recipientRole || 'Contributor',
        walletAddress,
        ratePerSecond: parseFloat(ratePerSecond),
      });
      setStep(3);
    } catch (err: any) {
      setError(err?.message || 'Failed to create stream. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setRecipientName('');
    setRecipientRole('');
    setWalletAddress('');
    setRatePerSecond('0.001');
    setError('');
    onClose();
  };

  const canProceed = recipientName.trim() && walletAddress.trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-xl bg-black border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
          >
            <div className="absolute inset-0 noise-bg pointer-events-none opacity-[0.03]" />

            <div className="p-10 relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-white tracking-tight leading-none">Create Stream</h2>
                  <p className="text-white/35 text-xs mt-1">Configure a real-time PUSD payment stream</p>
                </div>
                <button onClick={handleClose} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-neutral-500 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {step === 1 && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-white/40 ml-1">Recipient Name</label>
                      <div className="relative flex items-center">
                        <Users className="absolute left-5 w-4 h-4 text-neutral-600" />
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="e.g. Aria Chen"
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent-indigo/50 transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-white/40 ml-1">Role / Title</label>
                      <div className="relative flex items-center">
                        <Briefcase className="absolute left-5 w-4 h-4 text-neutral-600" />
                        <input
                          type="text"
                          value={recipientRole}
                          onChange={(e) => setRecipientRole(e.target.value)}
                          placeholder="e.g. Lead Engineer"
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent-indigo/50 transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-white/40 ml-1">Wallet Address</label>
                      <div className="relative flex items-center">
                        <Wallet className="absolute left-5 w-4 h-4 text-neutral-600" />
                        <input
                          type="text"
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          placeholder="Arbitrum Sepolia wallet address"
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent-indigo/50 transition-all text-sm font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-white/20 ml-1">Base58-encoded Arbitrum Sepolia public key</p>
                    </div>
                  </div>

                  <button
                    disabled={!canProceed}
                    onClick={() => setStep(2)}
                    className="btn-primary w-full justify-center group"
                  >
                    Configure Rate <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-white/40 ml-1">Rate per Second (PUSD)</label>
                      <div className="relative flex items-center">
                        <Repeat className="absolute left-5 w-4 h-4 text-neutral-600" />
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          value={ratePerSecond}
                          onChange={(e) => setRatePerSecond(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent-indigo/50 transition-all text-base font-semibold tabular-nums"
                        />
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Stream Preview</p>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/50">Per Day</span>
                        <span className="text-sm font-semibold text-white tabular-nums">{isNaN(Number(perDay)) ? '—' : perDay} PUSD</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/50">Per Month</span>
                        <span className="text-sm font-semibold text-accent-cyan tabular-nums">{isNaN(Number(perMonth)) ? '—' : perMonth} PUSD</span>
                      </div>
                    </div>

                    <div className="p-6 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <Info className="w-4 h-4 text-indigo-400" />
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                        Funds stream continuously on-chain using <span className="text-white font-bold">PUSD</span>. You can pause or cancel the stream at any time from the payroll dashboard.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center">Back</button>
                    <button
                      onClick={handleCreate}
                      disabled={isCreating}
                      className="btn-primary flex-[2] justify-center"
                    >
                      {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
                      {isCreating ? 'Initializing Stream...' : 'Activate Stream'}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="text-center py-12 space-y-8">
                  <div className="relative w-32 h-32 mx-auto">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-full h-full rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.2)]"
                    >
                      <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                    </motion.div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 border-2 border-dashed border-emerald-500/30 rounded-full"
                    />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-white tracking-tight leading-none">Stream Initialized</h3>
                    <p className="text-neutral-500 text-sm font-medium leading-relaxed max-w-[300px] mx-auto">
                      Real-time PUSD payroll is now flowing to <span className="text-white font-bold">{recipientName}</span>. Payments begin immediately on-chain.
                    </p>
                  </div>
                  <button onClick={handleClose} className="btn-primary w-full justify-center">
                    Back to Payroll
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Lock, TrendingUp, AlertTriangle, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { usePolicies } from '@/hooks/usePolicies';

interface CreatePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const policyTypes = [
  { id: 'spending_limit', label: 'Spending Limit', icon: Lock, desc: 'Cap PUSD spend per agent or globally.' },
  { id: 'yield_trigger', label: 'Yield Trigger', icon: TrendingUp, desc: 'Auto-invest when balance exceeds threshold.' },
  { id: 'risk_threshold', label: 'Risk Threshold', icon: AlertTriangle, desc: 'Halt activity if risk score is breached.' },
];

export const CreatePolicyModal = ({ isOpen, onClose }: CreatePolicyModalProps) => {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('spending_limit');
  const [value, setValue] = useState('1000');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { createPolicy } = usePolicies();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      await createPolicy({
        name,
        type: selectedType,
        value: parseFloat(value),
        description: description || `${selectedType} policy: ${value} PUSD threshold`,
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to create policy. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedType('spending_limit');
    setValue('1000');
    setDescription('');
    setDone(false);
    setError('');
    onClose();
  };

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
                  <h2 className="text-xl font-semibold text-white tracking-tight leading-none">Create Neural Law</h2>
                  <p className="text-white/35 text-xs mt-1">Encode a financial guardrail for autonomous enforcement</p>
                </div>
                <button onClick={handleClose} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-neutral-500 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!done ? (
                <div className="space-y-7">
                  {/* Policy Name */}
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-white/40 ml-1">Policy Name</label>
                    <div className="relative flex items-center">
                      <Shield className="absolute left-5 w-4 h-4 text-neutral-600" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Global Spend Cap"
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent-indigo/50 transition-all text-sm"
                      />
                    </div>
                  </div>

                  {/* Type Selector */}
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-white/40 ml-1">Policy Type</label>
                    <div className="grid grid-cols-3 gap-3">
                      {policyTypes.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedType(t.id)}
                          className={`p-4 rounded-2xl border text-left transition-all group relative overflow-hidden ${
                            selectedType === t.id
                              ? 'bg-indigo-500/10 border-indigo-500/40'
                              : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-all ${
                            selectedType === t.id ? 'bg-indigo-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.4)]' : 'bg-white/5 text-neutral-600 group-hover:text-white'
                          }`}>
                            <t.icon className="w-4 h-4" />
                          </div>
                          <div className="text-xs font-medium text-white leading-tight">{t.label}</div>
                          <div className="text-[9px] text-neutral-600 mt-1 leading-relaxed">{t.desc}</div>
                          {selectedType === t.id && (
                            <motion.div layoutId="active-policy-type" className="absolute top-3 right-3">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Threshold Value */}
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-white/40 ml-1">Threshold Value</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-5 pr-20 text-white focus:outline-none focus:border-accent-indigo/50 transition-all text-base font-semibold tabular-nums"
                      />
                      <span className="absolute right-5 text-xs text-white/30 font-bold">PUSD</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-white/40 ml-1">Description <span className="text-white/20">(optional)</span></label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe what this law governs..."
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-5 text-white focus:outline-none focus:border-accent-indigo/50 transition-all text-sm resize-none"
                    />
                  </div>

                  {/* Info panel */}
                  <div className="p-5 rounded-[1.5rem] border flex items-start gap-4" style={{ background: 'rgba(0,229,204,0.04)', borderColor: 'rgba(0,229,204,0.12)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,229,204,0.1)' }}>
                      <Info className="w-4 h-4 text-accent-cyan" />
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                      <span className="text-white font-bold">Neural Law Encoding.</span> This guardrail will be cryptographically enforced on every transaction in real-time by the Risk Sentinel engine.
                    </p>
                  </div>

                  {error && (
                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleCreate}
                    disabled={isSubmitting || !name.trim()}
                    className="btn-primary w-full justify-center"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    {isSubmitting ? 'Encoding Law...' : 'Encode Neural Law'}
                  </button>
                </div>
              ) : (
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
                    <h3 className="text-2xl font-semibold text-white tracking-tight leading-none">Law Encoded</h3>
                    <p className="text-neutral-500 text-sm font-medium leading-relaxed max-w-[300px] mx-auto">
                      <span className="text-white font-bold">{name}</span> is now active and enforcing cryptographic guardrails on all autonomous transactions.
                    </p>
                  </div>
                  <button onClick={handleClose} className="btn-primary w-full justify-center">
                    Back to Guardrails
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

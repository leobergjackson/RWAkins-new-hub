// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Zap, Wallet, Shield, Loader2, Sparkles, CheckCircle2, ChevronRight, Target } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface DeployAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const roles = [
  { id: 'product', name: 'Product AI', icon: Cpu, desc: 'Technical roadmaps & specs.' },
  { id: 'marketing', name: 'Marketing AI', icon: Zap, desc: 'Social growth & campaigns.' },
  { id: 'treasury', name: 'Treasury AI', icon: Wallet, desc: 'Yield & capital allocation.' },
  { id: 'security', name: 'Security AI', icon: Shield, desc: 'Risk & financial policies.' },
];

export const DeployAgentModal = ({ isOpen, onClose }: DeployAgentModalProps) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [budget, setBudget] = useState('1000');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  const queryClient = useQueryClient();

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployError('');
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || `${selectedRole} Agent`,
          role: selectedRole,
          budget: budget
        }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        setStep(3);
      } else {
        const data = await res.json();
        setDeployError(data.error || 'Deployment failed. Please try again.');
      }
    } catch (error) {
      setDeployError('Network error. Check your connection and try again.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setName('');
    setSelectedRole('');
    setBudget('1000');
    setDeployError('');
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
                  <h2 className="text-xl font-semibold text-white tracking-tight leading-none">Deploy Agent</h2>
                  <p className="text-white/35 text-xs mt-1">Configure your autonomous neural identity</p>
                </div>
                <button onClick={handleClose} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-neutral-500 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {step === 1 && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`p-6 rounded-[2rem] border text-left transition-all group relative overflow-hidden ${
                          selectedRole === role.id 
                            ? 'bg-indigo-500/10 border-indigo-500/40' 
                            : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-500 ${
                          selectedRole === role.id ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'bg-white/5 text-neutral-600 group-hover:text-white group-hover:scale-110'
                        }`}>
                          <role.icon className="w-6 h-6" />
                        </div>
                        <div className="text-sm font-medium text-white">{role.name}</div>
                        <div className="text-[10px] text-neutral-600 mt-2 font-medium leading-relaxed">{role.desc}</div>
                        {selectedRole === role.id && (
                          <motion.div layoutId="active-role" className="absolute top-4 right-4">
                            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                  <button 
                    disabled={!selectedRole}
                    onClick={() => setStep(2)}
                    className="btn-primary w-full justify-center group"
                  >
                    Configure Identity <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-white/40 ml-1">Agent Name</label>
                      <div className="relative flex items-center">
                        <Target className="absolute left-5 w-4 h-4 text-neutral-600" />
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Atlas Prime"
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent-indigo/50 transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-white/40 ml-1">PUSD Budget</label>
                      <div className="relative flex items-center">
                        <Wallet className="absolute left-5 w-4 h-4 text-neutral-600" />
                        <input 
                          type="number" 
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent-indigo/50 transition-all text-base font-semibold tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-indigo-400 fill-current" />
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                      Initializing this neural identity will generate a <span className="text-white font-bold">unique Arbitrum Sepolia vault</span>. 5% of the allocated budget will be transferred immediately for autonomous operations.
                    </p>
                  </div>

                  {deployError && (
                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                      {deployError}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center">Back</button>
                    <button
                      onClick={handleDeploy}
                      disabled={isDeploying}
                      className="btn-primary flex-[2] justify-center"
                    >
                      {isDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isDeploying ? 'Linking Neural Path...' : 'Confirm Injection'}
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
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-dashed border-emerald-500/30 rounded-full"
                    />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-white tracking-tight leading-none">Agent Deployed</h3>
                    <p className="text-neutral-500 text-sm font-medium leading-relaxed max-w-[300px] mx-auto">
                      Neural identity successfully injected. The autonomous wallet is now live on <span className="text-white font-black uppercase">Arbitrum Sepolia Devnet</span>.
                    </p>
                  </div>
                  <button 
                    onClick={handleClose}
                    className="btn-primary w-full justify-center"
                  >
                    Enter Command Center
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

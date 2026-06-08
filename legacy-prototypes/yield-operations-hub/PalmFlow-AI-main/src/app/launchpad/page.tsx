// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Cpu, 
  Zap, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  BarChart3,
  Target,
  BrainCircuit,
  Plus,
  Loader2
} from 'lucide-react';
import { useIdo } from '@/hooks/useIdo';
import { useTreasury } from '@/hooks/useTreasury';
import { useWallet } from '@arbitrum-sepolia/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function LaunchpadContent() {
  const { projects, invest, createProject } = useIdo();
  const { data: treasury } = useTreasury();
  const { publicKey } = useWallet();
  const searchParams = useSearchParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Form state
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    goalAmount: 1000,
    category: 'DeFi'
  });

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const handleInvest = async (projectId: string, amount: number) => {
    try {
      setNotification('Initializing Neural Investment...');
      await invest.mutateAsync({
        projectId,
        amount,
        walletAddress: publicKey?.toBase58() ?? 'anonymous'
      });
      setNotification('Investment Successful! Project liquidity updated.');
    } catch (err: any) {
      setNotification(`Investment Failed: ${err.message}`);
    } finally {
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setNotification('Deploying Project to Blockchain...');
      await createProject.mutateAsync({
        ...newProject,
        creatorAddress: publicKey?.toBase58() ?? 'anonymous'
      });
      setNotification('Project Launched! Neural Audit initiated.');
      setShowCreateModal(false);
    } catch (err: any) {
      setNotification(`Launch Failed: ${err.message}`);
    } finally {
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 pt-10 px-6">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200]"
          >
            <div className="px-6 py-3 rounded-full bg-neutral-900 border border-white/10 shadow-2xl flex items-center gap-3 backdrop-blur-xl">
              <CheckCircle2 className="w-4 h-4 text-accent-cyan" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">{notification}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Neural Launchpad
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Global Funding Active</span>
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">The Future of AI is Funded Here</h1>
          <p className="text-white/40 max-w-xl text-sm font-normal leading-relaxed">
            Discover and fund the next generation of autonomous AI agents. Every project undergoes a rigorous neural audit before being listed.
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Launch Project
        </button>
      </div>

      {/* Grid of Projects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projects.isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-neutral-600 animate-spin" />
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Synchronizing Ledger...</span>
          </div>
        ) : projects.data?.length === 0 ? (
          <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-3xl">
            <Rocket className="w-8 h-8 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500 text-sm">No active IDOs found. Be the first to launch!</p>
          </div>
        ) : (
          projects.data?.map((project: any) => (
            <div key={project.id} className="bento-card group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                    {project.category}
                  </div>
                  {project.aiScore > 0 && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-widest ${
                      project.aiScore >= 80 ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' : 'border-amber-500/20 text-amber-500 bg-amber-500/5'
                    }`}>
                      <ShieldCheck className="w-3 h-3" /> Audit: {project.aiScore}
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{project.name}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed mb-6 line-clamp-3">
                  {project.description}
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Raised</div>
                      <div className="text-sm font-bold text-white">{project.raisedAmount.toLocaleString()} <span className="text-[10px] text-neutral-500">PUSD</span></div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Goal</div>
                      <div className="text-sm font-bold text-neutral-400">{project.goalAmount.toLocaleString()} <span className="text-[10px] text-neutral-600">PUSD</span></div>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((project.raisedAmount / project.goalAmount) * 100, 100)}%` }}
                      className="h-full bg-accent-cyan shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleInvest(project.id, 100)}
                  disabled={project.status !== 'active'}
                  className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {project.status === 'funded' ? 'Target Reached' : 'Invest 100 PUSD'}
                </button>
                <button 
                  onClick={() => setSelectedProject(project)}
                  className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Audit Transparency Section */}
      <div className="neural-card p-8 bg-neutral-900/20 border-dashed">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center shrink-0">
            <BrainCircuit className="w-8 h-8 text-accent-cyan" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white tracking-tight">Neural Audit Transparency</h2>
            <p className="text-neutral-500 text-sm leading-relaxed max-w-2xl">
              Every project on the Neural Launchpad is automatically audited by our **Risk Sentinel V2**. We analyze the project's logic, financial viability, and security risks to ensure a safe investment ecosystem for the PalmFlow community.
            </p>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[301] p-1"
            >
              <div className="bg-neutral-900 border border-white/10 rounded-3xl p-8 space-y-8 overflow-hidden relative shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Rocket className="w-24 h-24 rotate-45" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Launch Your Intelligence</h2>
                  <p className="text-neutral-500 text-sm font-medium uppercase tracking-widest">Neural Proposal Stage</p>
                </div>

                <form onSubmit={handleCreate} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Project Name</label>
                    <input 
                      required
                      value={newProject.name}
                      onChange={e => setNewProject({...newProject, name: e.target.value})}
                      type="text" 
                      placeholder="e.g. Arb-Master AI"
                      className="w-full bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-cyan transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Description & Goal</label>
                    <textarea 
                      required
                      value={newProject.description}
                      onChange={e => setNewProject({...newProject, description: e.target.value})}
                      placeholder="Explain what your agent will do on Arbitrum Sepolia..."
                      className="w-full bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-cyan transition-all min-h-[120px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Funding Goal (PUSD)</label>
                      <input 
                        required
                        value={newProject.goalAmount}
                        onChange={e => setNewProject({...newProject, goalAmount: parseFloat(e.target.value)})}
                        type="number" 
                        className="w-full bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-cyan transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Category</label>
                      <select 
                        value={newProject.category}
                        onChange={e => setNewProject({...newProject, category: e.target.value})}
                        className="w-full bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-cyan transition-all appearance-none"
                      >
                        <option>DeFi</option>
                        <option>Social</option>
                        <option>Security</option>
                        <option>Infrastructure</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 rounded-xl bg-accent-cyan text-black font-bold text-[10px] uppercase tracking-widest hover:scale-[1.01] transition-all"
                  >
                    Deploy Proposal
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-[301] p-4"
            >
              <div className="bg-neutral-900 border border-white/10 rounded-3xl p-8 space-y-8 overflow-hidden relative shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[9px] font-bold text-neutral-500 uppercase tracking-widest w-fit">
                      {selectedProject.category}
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{selectedProject.name}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedProject(null)}
                    className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                  >
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Project Vision</h4>
                      <p className="text-sm text-neutral-300 leading-relaxed">
                        {selectedProject.description}
                      </p>
                    </div>

                    <div className="space-y-4 p-5 rounded-2xl bg-neutral-950 border border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Funding Progress</span>
                        <span className="text-xs font-bold text-accent-cyan">
                          {Math.round((selectedProject.raisedAmount / selectedProject.goalAmount) * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((selectedProject.raisedAmount / selectedProject.goalAmount) * 100, 100)}%` }}
                          className="h-full bg-accent-cyan"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-neutral-600">
                        <span>{selectedProject.raisedAmount.toLocaleString()} PUSD</span>
                        <span>GOAL: {selectedProject.goalAmount.toLocaleString()} PUSD</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-accent-cyan/[0.03] border border-accent-cyan/10 space-y-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-accent-cyan" />
                        <h4 className="text-[10px] font-bold text-accent-cyan uppercase tracking-widest">Neural Audit Result</h4>
                      </div>
                      
                      {selectedProject.aiScore > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold text-white">{selectedProject.aiScore}</span>
                            <span className="text-xs font-medium text-neutral-500 mb-1">/ 100 Trust Score</span>
                          </div>
                          <p className="text-xs text-neutral-400 leading-relaxed italic">
                            "{selectedProject.aiAudit || "Audit report is being compiled by Risk Sentinel..."}"
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-6 gap-3">
                          <Loader2 className="w-6 h-6 text-neutral-600 animate-spin" />
                          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest text-center">
                            Risk Sentinel analyzing<br/>neural patterns...
                          </span>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => {
                        handleInvest(selectedProject.id, 100);
                        setSelectedProject(null);
                      }}
                      disabled={selectedProject.status !== 'active'}
                      className="w-full py-4 rounded-xl bg-white text-black font-bold text-[10px] uppercase tracking-widest hover:scale-[1.01] transition-all disabled:opacity-30"
                    >
                      Invest 100 PUSD Now
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LaunchpadPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
      </div>
    }>
      <LaunchpadContent />
    </Suspense>
  );
}

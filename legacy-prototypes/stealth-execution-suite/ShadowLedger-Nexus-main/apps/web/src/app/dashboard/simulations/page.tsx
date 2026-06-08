// Built by vsrupeshkumar
"use client";

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Shield, 
  Activity, 
  Zap, 
  Layers,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export default function SimulationsPage() {
  const [amount, setAmount] = useState(1000);
  const [complexity, setComplexity] = useState<'LOW' | 'MID' | 'HIGH'>('MID');
  const [results, setResults] = useState<any>(null);

  const mutation = trpc.runSimulation.useMutation();

  const handleRun = async () => {
    const res = await mutation.mutateAsync({ amount, complexity });
    setResults(res);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-glow">War Room: Stealth Simulation</h1>
            <p className="text-muted-foreground mt-2 text-sm uppercase tracking-widest font-mono">
              Predictive analysis for Cloak SDK routing and liquidity fragmentation.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 glass rounded-xl border-cyan-glow/20">
            <Activity size={18} className="text-cyan-glow animate-pulse" />
            <span className="text-[10px] font-bold text-cyan-glow uppercase tracking-widest">Neural Link: ACTIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Configuration Panel */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="glass-dark p-8 rounded-3xl border-white/5 shadow-2xl">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Layers size={20} className="text-cyan-glow" />
                Parameters
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">
                    Transaction Value (ETH)
                  </label>
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 font-mono text-xl focus:outline-none focus:border-cyan-glow/50 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">
                    Obfuscation Complexity
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['LOW', 'MID', 'HIGH'].map((lvl: any) => (
                      <button
                        key={lvl}
                        onClick={() => setComplexity(lvl)}
                        className={cn(
                          "py-2 rounded-lg text-[10px] font-bold transition-all border",
                          complexity === lvl 
                            ? "bg-cyan-glow text-black border-cyan-glow" 
                            : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                        )}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleRun}
                  disabled={mutation.isLoading}
                  className="w-full py-4 bg-cyan-glow text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-cyan-glow/20"
                >
                  {mutation.isLoading ? <Loader2 className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                  INITIATE SIMULATION
                </button>
              </div>
            </div>

            {results && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-8 rounded-3xl border-white/10 space-y-6"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Exposure Risk</span>
                  <span className={cn(
                    "text-xl font-mono font-bold",
                    results.exposureRisk < 5 ? "text-emerald-glow" : "text-amber-glow"
                  )}>{results.exposureRisk}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-glow transition-all duration-1000" 
                    style={{ width: `${100 - results.exposureRisk}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Efficiency</p>
                    <p className="text-xl font-bold font-mono">{results.efficiency}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Est. Time</p>
                    <p className="text-xl font-bold font-mono">{results.estimatedTime}s</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Visualization Area */}
          <div className="col-span-12 lg:col-span-8">
            <div className="glass-dark rounded-[2.5rem] border-white/5 h-[700px] relative overflow-hidden flex flex-col shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-glow/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="p-8 border-b border-white/5 flex items-center justify-between relative z-10 bg-black/20">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-cyan-glow" />
                  <h3 className="font-bold tracking-tight">Multi-Path Routing Topology</h3>
                </div>
                {results && (
                  <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground">
                    <span>ACTIVE PATHS: {results.paths.length}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>ENCRYPTION: AES-GCM-256</span>
                  </div>
                )}
              </div>

              <div className="flex-1 p-8 relative overflow-y-auto scrollbar-hide">
                <AnimatePresence mode="wait">
                  {results ? (
                    <motion.div 
                      key="results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {results.paths.map((path: any, i: number) => (
                        <motion.div
                          key={path.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-white/5 border border-white/5 p-6 rounded-2xl group hover:border-cyan-glow/30 transition-all cursor-crosshair"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-cyan-glow shadow-[0_0_8px_rgba(0,242,255,0.5)]" />
                              <span className="text-[10px] font-bold uppercase tracking-tighter">Path-{i.toString().padStart(2, '0')}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">{path.latency}ms</span>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-4">
                            {Array.from({ length: path.nodes }).map((_, n) => (
                              <React.Fragment key={n}>
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-cyan-glow/40 transition-colors" />
                                {n < path.nodes - 1 && <div className="h-[1px] w-4 bg-white/5" />}
                              </React.Fragment>
                            ))}
                          </div>

                          <div className="flex items-end justify-between">
                            <div className="space-y-1">
                              <p className="text-[9px] text-muted-foreground uppercase font-bold">Obfuscation</p>
                              <p className="text-lg font-bold font-mono text-cyan-glow">{path.obfuscationLevel}%</p>
                            </div>
                            <Zap size={14} className="text-muted-foreground group-hover:text-cyan-glow transition-colors" />
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center opacity-20"
                    >
                      <Layers size={64} className="mb-6" />
                      <p className="text-xl font-bold tracking-widest text-center uppercase">Awaiting Neural Initialization</p>
                      <p className="text-sm mt-2">Configure parameters and initiate stealth routing simulation.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {results && (
                <div className="p-6 bg-cyan-glow/5 border-t border-cyan-glow/20 m-6 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="text-cyan-glow" />
                    <p className="text-sm font-medium">Simulation validates privacy integrity. Ready for on-chain execution.</p>
                  </div>
                  <button className="px-6 py-2 bg-cyan-glow text-black font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-all">
                    Execute Live
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

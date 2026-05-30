// Built by vsrupeshkumar
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { HolographicCard } from '@/components/ui/HolographicCard';
import { CinematicButton } from '@/components/ui/CinematicButton';
import { Activity, Wallet, Cpu, BarChart3, ArrowUpRight, Zap, Globe, Command, MessageSquare, Lock } from 'lucide-react';

export const DashboardPreview = () => {
  return (
    <section className="relative py-60 px-6 overflow-hidden">
      <div className="container mx-auto">
        <div className="text-center space-y-8 mb-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-accent-blue text-[10px] font-black uppercase tracking-[0.4em]"
          >
            06 — THE OPERATING SYSTEM
          </motion.div>
          <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">THE COMMAND CENTER</h2>
          <p className="text-xl text-neutral-500 font-medium leading-relaxed max-w-3xl mx-auto">
            Experience the future of financial intelligence. A cinematic, AI-powered operating system for the autonomous economy.
          </p>
        </div>

        {/* MOCKUP DASHBOARD */}
        <div className="relative max-w-6xl mx-auto">
          <HolographicCard className="p-0 border-white/20 shadow-[0_0_100px_rgba(0,242,255,0.1)] aspect-video overflow-hidden group">
            {/* Dashboard Mock Content */}
            <div className="absolute inset-0 grid grid-cols-12 h-full bg-black/40">
              {/* Sidebar */}
              <div className="col-span-1 border-r border-white/5 p-6 flex flex-col items-center gap-8 bg-black/20">
                <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue border border-accent-blue/20">
                  <Globe className="w-5 h-5" />
                </div>
                {[Wallet, Cpu, Command, MessageSquare, BarChart3].map((Icon, i) => (
                  <Icon key={i} className="w-5 h-5 text-neutral-600 hover:text-white transition-colors cursor-pointer" />
                ))}
              </div>

              {/* Main Content Mock */}
              <div className="col-span-11 grid grid-cols-12 gap-6 p-8">
                {/* Header Mock */}
                <div className="col-span-12 flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest">Core Hub</h3>
                    <div className="px-3 py-1 rounded-full bg-accent-emerald/10 border border-accent-emerald/30 text-[8px] font-black text-accent-emerald uppercase tracking-widest">System Stable</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-32 h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div 
                        animate={{ width: ["10%", "85%", "40%"] }}
                        transition={{ duration: 10, repeat: Infinity }}
                        className="h-full bg-accent-blue" 
                      />
                    </div>
                  </div>
                </div>

                {/* Grid Widgets */}
                <div className="col-span-8 grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
                    <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Treasury Balance</div>
                    <div className="text-3xl font-black text-white tabular-nums">$4,250,920.00</div>
                    <div className="h-[60px] w-full flex items-end gap-1">
                      {[40, 70, 45, 90, 65, 80, 55, 75, 95].map((h, i) => (
                        <motion.div 
                          key={i}
                          animate={{ height: [`${h}%`, `${Math.random() * 100}%`, `${h}%`] }}
                          transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
                          className="flex-1 bg-accent-blue/30 rounded-t-sm"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
                    <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">AI Yield Optimizing</div>
                    <div className="text-3xl font-black text-accent-emerald tabular-nums">+14.2% APY</div>
                    <div className="space-y-2">
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-[80%] bg-accent-emerald" />
                      </div>
                      <div className="text-[8px] font-black text-neutral-500 uppercase tracking-widest text-right">Target 15.0%</div>
                    </div>
                  </div>
                  <div className="col-span-2 p-6 rounded-3xl bg-white/[0.02] border border-white/10 min-h-[150px] relative overflow-hidden">
                    <div className="absolute inset-0 neural-grid opacity-10" />
                    <div className="relative z-10 space-y-4">
                      <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Active Neural Paths</div>
                      <div className="flex gap-4">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-accent-blue animate-pulse" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Sidebar Mock */}
                <div className="col-span-4 space-y-6">
                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 h-full">
                    <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-6">Autonomous Feed</div>
                    <div className="space-y-4">
                      {[
                        { t: "Treasury Optimized", v: "+$12.4k", c: "accent-blue" },
                        { t: "Yield Injected", v: "0.42 ETH", c: "accent-emerald" },
                        { t: "Risk Scanned", v: "Clean", c: "white" },
                        { t: "Payment Executed", v: "$420.00", c: "accent-purple" },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                          <span className="text-neutral-500">{item.t}</span>
                          <span className={`text-${item.c}`}>{item.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cinematic Blur Overlay for Preview */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-10 text-center space-y-8">
                <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full glass-panel mb-4 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                  <Lock className="w-4 h-4 text-accent-purple" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Neural Core Restricted</span>
                </div>
                <CinematicButton onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  Connect Wallet to Unlock
                </CinematicButton>
              </div>
            </div>
          </HolographicCard>

          {/* Decorative Floating Panels Around Dashboard */}
          <motion.div 
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-10 -right-10 w-40 p-4 rounded-2xl glass-panel border border-accent-blue/30 hidden lg:block"
          >
            <div className="text-[8px] font-black uppercase text-accent-blue mb-2">Network Latency</div>
            <div className="text-lg font-black text-white">12ms</div>
          </motion.div>
          <motion.div 
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute -bottom-10 -left-10 w-48 p-4 rounded-2xl glass-panel border border-accent-purple/30 hidden lg:block"
          >
            <div className="text-[8px] font-black uppercase text-accent-purple mb-2">Agent Confidence</div>
            <div className="text-lg font-black text-white">99.82%</div>
          </motion.div>
        </div>
      </div>
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] bg-accent-blue/5 blur-[200px] rounded-full pointer-events-none" />
    </section>
  );
};


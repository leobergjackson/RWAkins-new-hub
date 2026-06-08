// Built by vsrupeshkumar
"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, ChevronRight, Zap, Lock, Cpu, Globe, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020205] text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,242,255,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay" />
        
        {/* Animated Orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-glow/20 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-purple-glow/15 rounded-full blur-[150px]"
        />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-glow mb-12 backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-glow opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-glow"></span>
          </span>
          Protocol Version 2.0.4 Active
        </motion.div>

        {/* Hero Title */}
        <div className="relative">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl md:text-[120px] font-bold tracking-tighter leading-[0.85] mb-8"
          >
            SHADOW<br />
            <span className="text-glow-cyan text-cyan-glow">LEDGER</span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute -right-8 top-0 md:-right-16 md:top-4 bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl"
          >
            <p className="text-[10px] font-mono text-cyan-glow font-bold uppercase">Nexus Core</p>
          </motion.div>
        </div>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg md:text-2xl text-white/50 max-w-2xl mb-16 font-light leading-relaxed"
        >
          The first <span className="text-white font-medium italic">Autonomous Invisible Financial OS</span> for Web3 organizations. Powered by multi-agent AI and Cloak Stealth Routing.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col md:flex-row gap-6 mb-32"
        >
          <Link 
            href="/dashboard"
            className="group relative px-12 py-5 bg-white text-black font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            <span className="flex items-center gap-3">
              Enter Command Center
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
          <button className="px-12 py-5 glass border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all flex items-center gap-3">
            <Lock size={18} />
            View Whitepaper
          </button>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-24 border-t border-white/5 pt-20 w-full"
        >
          <Stat label="Shielded TVL" value="$4.8B" />
          <Stat label="Privacy Score" value="99.9%" />
          <Stat label="AI Nodes" value="1,240" />
          <Stat label="Active DAOs" value="452" />
        </motion.div>
      </main>

      {/* Footer Branding */}
      <footer className="absolute bottom-8 left-12 relative z-10 flex items-center gap-4 opacity-30 hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <ShieldCheck size={16} />
        </div>
        <p className="text-[10px] font-mono uppercase tracking-widest font-bold">Neural Security Mesh Active</p>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-3xl md:text-5xl font-bold tracking-tighter mb-2">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">{label}</p>
    </div>
  );
}

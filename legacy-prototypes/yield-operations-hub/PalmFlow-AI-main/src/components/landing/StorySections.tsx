// Built by vsrupeshkumar
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { HolographicCard } from '@/components/ui/HolographicCard';
import { BrainCircuit, Layers, Activity, ShieldCheck, Zap } from 'lucide-react';

export const StorySections = () => {
  return (
    <div className="space-y-40 pb-40 px-6">
      {/* SECTION 1 - Vision */}
      <section className="container mx-auto grid lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="text-accent-blue text-[10px] font-black uppercase tracking-[0.4em]"
          >
            01 — THE VISION
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight"
          >
            AUTONOMOUS AI <br />
            <span className="text-gradient">ECONOMIES</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-lg text-neutral-500 font-medium leading-relaxed max-w-xl"
          >
            We are building the future where AI agents manage blockchain operations independently. Self-operating decentralized systems that learn, optimize, and execute financial strategies with cryptographic certainty.
          </motion.p>
        </div>
        <div className="relative">
          <HolographicCard className="p-10">
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: <BrainCircuit />, label: "Autonomous" },
                { icon: <Layers />, label: "Decentralized" },
                { icon: <Activity />, label: "Real-time" },
                { icon: <ShieldCheck />, label: "Secure" },
              ].map((item, i) => (
                <div key={i} className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-accent-blue/30 transition-all group">
                  <div className="text-accent-blue group-hover:scale-110 transition-transform">{item.icon}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{item.label}</div>
                </div>
              ))}
            </div>
          </HolographicCard>
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-accent-blue/5 blur-[100px] rounded-full" />
        </div>
      </section>

      {/* SECTION 2 - Problem */}
      <section className="container mx-auto grid lg:grid-cols-2 gap-20 items-center">
        <div className="lg:order-2 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="text-accent-purple text-[10px] font-black uppercase tracking-[0.4em]"
          >
            02 — THE PROBLEM
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight"
          >
            FRAGMENTED <br />
            <span className="text-gradient">OPERATIONS</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-lg text-neutral-500 font-medium leading-relaxed max-w-xl"
          >
            Current financial systems are fragmented. Manual treasury management is slow and inefficient. Traditional automation lacks the intelligence to adapt to complex blockchain dynamics.
          </motion.p>
        </div>
        <div className="lg:order-1">
          <HolographicCard className="border-red-500/10">
            <div className="space-y-6">
              {[
                { label: "Slow Workflows", value: "84%" },
                { label: "Capital Inefficiency", value: "62%" },
                { label: "Risk Exposure", value: "High" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{stat.label}</span>
                  <span className="text-xs font-black text-white">{stat.value}</span>
                </div>
              ))}
              <div className="h-2 w-full bg-red-500/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  className="h-full bg-red-500" 
                />
              </div>
            </div>
          </HolographicCard>
        </div>
      </section>

      {/* SECTION 3 - Solution */}
      <section className="container mx-auto text-center space-y-16">
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-accent-emerald text-[10px] font-black uppercase tracking-[0.4em]"
          >
            03 — THE ETHUTION
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-none"
          >
            AN AI OPERATING <br />
            <span className="text-gradient">SYSTEM FOR WEB3</span>
          </motion.h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: <Zap />, title: "Instant Execution", desc: "AI agents execute transactions in milliseconds based on real-time data." },
            { icon: <Layers />, title: "Treasury Sync", desc: "Automated capital allocation across multiple protocols and chains." },
            { icon: <ShieldCheck />, title: "Risk Sentinel", desc: "Autonomous monitoring and protection against on-chain vulnerabilities." },
          ].map((feature, i) => (
            <HolographicCard key={i} delay={i * 0.1}>
              <div className="text-accent-blue mb-6">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">{feature.title}</h3>
              <p className="text-sm text-neutral-500 font-medium leading-relaxed">{feature.desc}</p>
            </HolographicCard>
          ))}
        </div>
      </section>
    </div>
  );
};

// Built by vsrupeshkumar
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Lock, Zap, TrendingUp, Cpu } from 'lucide-react';

export const Ecosystem = () => {
  return (
    <section className="py-24 max-w-6xl mx-auto px-6">
      <div className="neural-card p-10 md:p-14 overflow-hidden relative">
        {/* Background accent */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', margin: '-40px -40px 0 0' }}
        />

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="space-y-8">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Globe className="w-3.5 h-3.5 text-accent-indigo" />
                <span className="text-xs font-medium text-accent-indigo">Global Protocol</span>
              </div>
              <h2 className="text-3xl font-semibold text-white tracking-tight mb-4">
                A unified neural network
              </h2>
              <p className="text-sm text-white/45 leading-relaxed">
                The PalmFlow ecosystem connects autonomous agents, liquid treasuries, and global payment
                rails into a single high-fidelity neural fabric that operates 24/7.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Security', desc: 'Protocol-level encryption', icon: Lock, color: '#10b981' },
                { label: 'Speed', desc: 'Sub-second settlement', icon: Zap, color: '#00e5cc' },
                { label: 'Scale', desc: 'Unlimited agent nodes', icon: Cpu, color: '#6366f1' },
                { label: 'Yield', desc: 'Auto-compounding vaults', icon: TrendingUp, color: '#ec4899' },
              ].map((item, i) => (
                <div key={i} className="space-y-1.5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <item.icon className="w-4 h-4 mb-2" style={{ color: item.color }} />
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="label-sm">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right – Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative aspect-square max-w-sm mx-auto"
          >
            <div
              className="w-full h-full rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="absolute inset-0 grid-bg opacity-40" />
              {/* Center glow */}
              <div
                className="w-2/3 h-2/3 rounded-full animate-pulse-glow"
                style={{ background: 'radial-gradient(circle, rgba(0,229,204,0.15) 0%, transparent 70%)' }}
              />
              <Cpu className="w-16 h-16 text-white/10 absolute" />

              {/* Floating nodes */}
              <div className="absolute top-8 left-8 w-3 h-3 rounded-full" style={{ background: '#00e5cc', boxShadow: '0 0 12px rgba(0,229,204,0.7)' }} />
              <div className="absolute bottom-12 right-8 w-2.5 h-2.5 rounded-full" style={{ background: '#6366f1', boxShadow: '0 0 10px rgba(99,102,241,0.7)' }} />
              <div className="absolute top-1/2 right-6 w-2 h-2 rounded-full" style={{ background: '#ec4899', boxShadow: '0 0 8px rgba(236,72,153,0.7)' }} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

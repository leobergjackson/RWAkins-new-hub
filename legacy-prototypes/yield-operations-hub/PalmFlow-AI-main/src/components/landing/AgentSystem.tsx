// Built by vsrupeshkumar
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Shield, Zap } from 'lucide-react';

const agents = [
  {
    name: 'Neural Advisor',
    icon: Brain,
    desc: 'Autonomous financial strategist providing high-fidelity yield optimization and dynamic risk modeling.',
    accent: '#00e5cc',
  },
  {
    name: 'Risk Sentinel',
    icon: Shield,
    desc: 'Real-time threat detection and automated protocol protection for treasury security.',
    accent: '#6366f1',
  },
  {
    name: 'Flow Master',
    icon: Zap,
    desc: 'Optimizes cross-border liquidity and settlement speeds using the Neural-v4 network.',
    accent: '#ec4899',
  },
];

export const AgentSystem = () => {
  return (
    <section className="py-24 max-w-6xl mx-auto px-6">
      {/* Section header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Neural Workforce</h2>
          <p className="text-sm text-white/40 max-w-lg">
            Specialized autonomous nodes designed for precision financial operations and protocol management.
          </p>
        </div>
        <button className="text-sm font-medium text-white/40 hover:text-white transition-colors shrink-0">
          Explore documentation →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {agents.map((agent, i) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
            className="neural-card p-7 flex flex-col gap-6 group"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: `${agent.accent}15` }}
            >
              <agent.icon className="w-6 h-6" style={{ color: agent.accent }} />
            </div>

            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-2">{agent.name}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{agent.desc}</p>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <span className="label-xs" style={{ color: agent.accent, opacity: 1 }}>Protocol Active</span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

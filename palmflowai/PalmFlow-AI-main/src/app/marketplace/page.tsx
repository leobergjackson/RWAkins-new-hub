// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Variants } from 'framer-motion';
import {
  Sparkles, Search, Cpu, ShieldCheck, TrendingUp, Zap, BarChart3, FileCheck,
  Star, ChevronRight, CheckCircle2, Loader2, BrainCircuit, AlertTriangle,
  DollarSign, Cloud, Megaphone, Scale
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 120 } },
};

const agentTemplates = [
  // DeFi
  {
    id: 'arb-hunter', name: 'Arbitrage Hunter', role: 'DeFi Specialist', category: 'DeFi',
    rating: 4.9, price: 'Free', icon: Zap, color: '#00e5cc',
    desc: 'Scans Arbitrum Sepolia DEXs for price discrepancies and executes low-risk atomic trades in real-time.',
    efficiency: 98, complexity: 'High',
  },
  {
    id: 'liquidity-opt', name: 'Liquidity Optimizer', role: 'LP Manager', category: 'DeFi',
    rating: 4.7, price: 'Free', icon: TrendingUp, color: '#00e5cc',
    desc: 'Dynamically allocates treasury between Raydium pools to maximize LP yields while monitoring impermanent loss.',
    efficiency: 96, complexity: 'High',
  },
  {
    id: 'flash-loan', name: 'Flash Loan Executor', role: 'DeFi Arbitrageur', category: 'DeFi',
    rating: 4.6, price: '200 PUSD/mo', icon: DollarSign, color: '#00e5cc',
    desc: 'Executes risk-free flash loan arbitrage across Arbitrum Sepolia DEXs in sub-second windows using atomic transactions.',
    efficiency: 91, complexity: 'Expert',
  },
  // Security
  {
    id: 'sentinel-v1', name: 'Sentinel v1', role: 'Security AI', category: 'Security',
    rating: 5.0, price: 'Free', icon: ShieldCheck, color: '#6366f1',
    desc: 'Real-time threat detection and autonomous emergency treasury locking using behavioral ML models.',
    efficiency: 100, complexity: 'High',
  },
  {
    id: 'fraud-watchdog', name: 'Fraud Watchdog', role: 'Anomaly Detector', category: 'Security',
    rating: 4.9, price: 'Free', icon: AlertTriangle, color: '#6366f1',
    desc: 'Monitors all outgoing payments for anomalous patterns using ML-based behavioral scoring across 200+ signals.',
    efficiency: 99, complexity: 'High',
  },
  // Marketing
  {
    id: 'growth-engine', name: 'Growth Engine', role: 'Marketing AI', category: 'Marketing',
    rating: 4.8, price: '100 PUSD/mo', icon: Megaphone, color: '#ec4899',
    desc: 'Automates social engagement and influencer outreach campaigns to systematically boost treasury value.',
    efficiency: 94, complexity: 'Medium',
  },
  {
    id: 'narrative-ai', name: 'Narrative AI', role: 'Content Strategist', category: 'Marketing',
    rating: 4.5, price: '75 PUSD/mo', icon: Sparkles, color: '#ec4899',
    desc: 'Generates real-time market commentary and publishes to configured social channels at peak engagement times.',
    efficiency: 88, complexity: 'Medium',
  },
  // Analytics
  {
    id: 'treasury-oracle', name: 'Treasury Oracle', role: 'Analytics Engine', category: 'Analytics',
    rating: 4.9, price: '150 PUSD/mo', icon: BarChart3, color: '#f59e0b',
    desc: 'Deep analytics engine that forecasts 30-day cash flow scenarios and detects anomalies in agent spending.',
    efficiency: 97, complexity: 'High',
  },
  {
    id: 'risk-modeler', name: 'Risk Modeler', role: 'Quantitative AI', category: 'Analytics',
    rating: 4.7, price: '200 PUSD/mo', icon: BrainCircuit, color: '#f59e0b',
    desc: 'Runs Monte Carlo simulations on portfolio positions and surfaces tail-risk alerts before they materialize.',
    efficiency: 94, complexity: 'Expert',
  },
  // Compliance
  {
    id: 'audit-trail', name: 'Audit Trail', role: 'Compliance AI', category: 'Compliance',
    rating: 5.0, price: 'Free', icon: FileCheck, color: '#10b981',
    desc: 'Generates cryptographically signed audit reports from on-chain data for regulatory compliance verification.',
    efficiency: 100, complexity: 'Medium',
  },
  {
    id: 'policy-enforcer', name: 'Policy Enforcer', role: 'Guardrail Agent', category: 'Compliance',
    rating: 5.0, price: 'Free', icon: Scale, color: '#10b981',
    desc: 'Validates every autonomous action against your Neural Laws before execution. Zero policy violations guaranteed.',
    efficiency: 100, complexity: 'High',
  },
  // DevOps
  {
    id: 'cloud-cost-ai', name: 'Cloud Cost AI', role: 'DevOps Optimizer', category: 'DevOps',
    rating: 4.6, price: '100 PUSD/mo', icon: Cloud, color: '#8b5cf6',
    desc: 'Continuously monitors and renegotiates cloud infrastructure spend, cutting costs by up to 40% autonomously.',
    efficiency: 89, complexity: 'Medium',
  },
];

const categories = ['All', 'DeFi', 'Security', 'Marketing', 'Analytics', 'Compliance', 'DevOps'];

const complexityColor: Record<string, string> = {
  Medium: '#f59e0b', High: '#f97316', Expert: '#ef4444',
};

export default function MarketplacePage() {
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [hiringIds, setHiringIds] = useState<Set<string>>(new Set());
  const [hiredIds, setHiredIds] = useState<Set<string>>(new Set());

  const filtered = agentTemplates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleHire = async (template: typeof agentTemplates[0]) => {
    if (hiringIds.has(template.id)) return;
    setHiringIds((prev) => new Set(prev).add(template.id));
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: template.name, role: template.role, budget: 500 }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        setHiredIds((prev) => new Set(prev).add(template.id));
        setNotification(`${template.name} deployed successfully! Check Dashboard.`);
        setTimeout(() => {
          setHiredIds((prev) => { const s = new Set(prev); s.delete(template.id); return s; });
        }, 3000);
      } else {
        setNotification(`Failed to deploy ${template.name}. Try again.`);
      }
    } catch {
      setNotification(`Failed to deploy ${template.name}. Re-establishing link...`);
    } finally {
      setHiringIds((prev) => { const s = new Set(prev); s.delete(template.id); return s; });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-[1400px] mx-auto px-4 py-10 space-y-8 pb-32"
    >
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[200]"
          >
            <div className="px-6 py-3 rounded-2xl bg-black border border-white/10 shadow-2xl flex items-center gap-3 backdrop-blur-2xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium text-white">{notification}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 px-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="status-dot-active" />
            <span className="label-xs">Global marketplace live</span>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Neural Store</h1>
          <p className="text-sm text-white/40 font-normal mt-1">Hire specialized pre-trained AI agents to automate every corner of your treasury</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Cpu className="w-4 h-4 text-white/30" />
          <span className="text-sm font-medium text-white/50">{agentTemplates.length} agents available</span>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={item} className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-white/50 transition-colors" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search agents by name, role, or capability..."
          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-12 py-3.5 text-sm text-white focus:outline-none focus:border-white/20 transition-all placeholder-white/20"
        />
      </motion.div>

      {/* Category Pills */}
      <motion.div variants={item} className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat
                ? 'bg-white text-black'
                : 'bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:border-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((template, i) => {
          const isHiring = hiringIds.has(template.id);
          const isHired = hiredIds.has(template.id);
          return (
            <motion.div
              key={template.id}
              variants={item}
              whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
              className="neural-card p-6 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${template.color}15` }}>
                    <template.icon className="w-5 h-5" style={{ color: template.color }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[11px] font-bold text-white/60">{template.rating}</span>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-white mb-0.5">{template.name}</h3>
                <p className="label-xs mb-3">{template.role}</p>
                <p className="text-xs text-white/35 leading-relaxed mb-5">{template.desc}</p>

                <div className="space-y-2 mb-5 pt-4 border-t border-white/[0.05]">
                  <div className="flex justify-between items-center">
                    <span className="label-xs">Efficiency</span>
                    <span className="text-xs font-bold text-emerald-400">{template.efficiency}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="label-xs">Complexity</span>
                    <span className="text-[10px] font-bold" style={{ color: complexityColor[template.complexity] ?? '#fff' }}>{template.complexity}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="label-xs">Pricing</span>
                    <span className="text-xs font-semibold text-accent-cyan">{template.price}</span>
                  </div>
                </div>
              </div>

              <motion.button
                onClick={() => handleHire(template)}
                disabled={isHiring}
                whileHover={!isHiring ? { scale: 1.02 } : {}}
                whileTap={!isHiring ? { scale: 0.98 } : {}}
                className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-all"
                style={
                  isHired
                    ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
                }
              >
                {isHiring ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deploying...</>
                ) : isHired ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Deployed</>
                ) : (
                  <>Hire Now <ChevronRight className="w-3.5 h-3.5" /></>
                )}
              </motion.button>
            </motion.div>
          );
        })}

        {/* Empty state */}
        {filtered.length === 0 && (
          <motion.div
            variants={item}
            className="col-span-full neural-card p-16 flex flex-col items-center justify-center text-center"
          >
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full bg-white/[0.02] animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="w-7 h-7 text-white/10" />
              </div>
            </div>
            <p className="text-sm text-white/30 mb-2">No agents match your search.</p>
            <button onClick={() => { setSearchQuery(''); setActiveCategory('All'); }} className="text-xs text-accent-cyan hover:underline">
              Clear filters
            </button>
          </motion.div>
        )}
      </div>

      {/* Monetize Card */}
      <motion.div variants={item} className="neural-card p-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-xl">
          <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Monetize Your Intelligence</h2>
            <p className="text-white/40 leading-relaxed text-sm mt-1">
              Are you an AI engineer? Upload your pre-trained models and earn PUSD every time a business hires your agent.
            </p>
          </div>
          <button
            onClick={() => setNotification('Agent submission portal opening...')}
            className="btn-primary"
          >
            <Sparkles className="w-4 h-4" />
            Submit Agent
          </button>
        </div>
        <div className="relative w-40 h-40 hidden md:flex items-center justify-center shrink-0">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border border-dashed border-white/10" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-6 rounded-full border border-dashed border-white/5" />
          <BrainCircuit className="w-10 h-10 text-white/10" />
        </div>
      </motion.div>
    </motion.div>
  );
}

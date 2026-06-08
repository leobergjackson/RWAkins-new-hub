// Built by vsrupeshkumar
"use client";

import React from 'react';
import { Hero } from './Hero';
import { AgentSystem } from './AgentSystem';
import { Ecosystem } from './Ecosystem';
import { motion } from 'framer-motion';
import { useWalletModal } from '@arbitrum-sepolia/wallet-adapter-react-ui';
import {
  DollarSign, Layers, GitBranch, ShieldCheck, TrendingUp,
  Users, Zap, Globe, Lock, ArrowRight, Coins, Activity,
  BarChart2, Clock, Cpu, CheckCircle2,
} from 'lucide-react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { delay, duration: 0.5 },
});

/* ─── How It Works ─── */
const HowItWorks = () => (
  <section className="py-24 max-w-6xl mx-auto px-6">
    <motion.div {...fadeUp()} className="text-center mb-16">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
        style={{ background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.15)' }}>
        <Activity className="w-3.5 h-3.5 text-accent-cyan" />
        <span className="text-xs font-medium text-accent-cyan">How It Works</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
        From wallet to autonomous OS<br />in three steps
      </h2>
      <p className="text-sm text-white/40 max-w-lg mx-auto leading-relaxed">
        PalmFlow handles the complexity of on-chain treasury management so you can focus on growing your protocol.
      </p>
    </motion.div>

    <div className="grid md:grid-cols-3 gap-6 relative">
      <div className="hidden md:block absolute top-10 left-[33%] right-[33%] h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,229,204,0.3), transparent)' }} />
      {[
        { step: '01', title: 'Connect Your Wallet', color: '#00e5cc', icon: Lock,
          desc: 'Link any Arbitrum Sepolia wallet — Phantom, Solflare, Backpack. Your keys stay yours; PalmFlow only reads on-chain state.' },
        { step: '02', title: 'Deploy AI Agents', color: '#6366f1', icon: Cpu,
          desc: 'Choose from Neural Advisor, Risk Sentinel, Flow Master, or the full suite. Each agent operates autonomously within your policy rules.' },
        { step: '03', title: 'Watch It Run', color: '#ec4899', icon: BarChart2,
          desc: 'Agents auto-rebalance treasury, stream payroll, execute cross-border payments, and compound yield — 24/7 with full audit logs.' },
      ].map((item, i) => (
        <motion.div key={i} {...fadeUp(i * 0.12)} className="neural-card p-8 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-4xl font-bold tabular-nums" style={{ color: `${item.color}20` }}>{item.step}</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
              <item.icon className="w-5 h-5" style={{ color: item.color }} />
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
            <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

/* ─── Core Features ─── */
const Features = () => (
  <section className="py-24 max-w-6xl mx-auto px-6">
    <motion.div {...fadeUp()} className="text-center mb-16">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <Layers className="w-3.5 h-3.5 text-accent-indigo" />
        <span className="text-xs font-medium text-accent-indigo">Platform Features</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
        Everything your treasury needs.<br />Nothing it doesn't.
      </h2>
    </motion.div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { icon: DollarSign, color: '#00e5cc', title: 'Autonomous Treasury',
          desc: 'AI-driven rebalancing across ETH, USDC, PUSD, and protocol tokens. Set rules, let agents execute.' },
        { icon: Users, color: '#6366f1', title: 'AI Workforce',
          desc: 'Deploy specialized agents for yield, risk, payroll, compliance, and analytics — each with auditable actions.' },
        { icon: Zap, color: '#ec4899', title: 'Streaming Payroll',
          desc: 'Continuous real-time salary streams to contributors worldwide. No more monthly batches or wire delays.' },
        { icon: Globe, color: '#10b981', title: 'Cross-Border Payments',
          desc: 'Sub-second settlement powered by Arbitrum Sepolia and PUSD stablecoin rails. Zero FX friction.' },
        { icon: TrendingUp, color: '#f59e0b', title: 'Yield Optimization',
          desc: 'Auto-compounding vaults scan Arbitrum Sepolia DeFi for the best risk-adjusted yields and rotate positions daily.' },
        { icon: ShieldCheck, color: '#8b5cf6', title: 'Risk Sentinel',
          desc: 'Real-time protocol threat detection. Whitelists, spending caps, and circuit breakers enforced on-chain.' },
        { icon: GitBranch, color: '#00e5cc', title: 'Policy Engine',
          desc: 'Codify treasury rules as smart-policy conditions. Agents refuse any action outside your defined boundaries.' },
        { icon: Coins, color: '#ec4899', title: 'PUSD Stablecoin',
          desc: 'Native USD-pegged stablecoin for all internal operations. Mint, burn, and stream PUSD permissionlessly.' },
        { icon: Clock, color: '#6366f1', title: 'Full Audit Log',
          desc: 'Every agent decision, transaction, and policy trigger is stored immutably and queryable in real time.' },
      ].map((f, i) => (
        <motion.div key={i} {...fadeUp(i * 0.06)} className="neural-card p-6 flex gap-4 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-110"
            style={{ background: `${f.color}12` }}>
            <f.icon className="w-5 h-5" style={{ color: f.color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
            <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

/* ─── PUSD Token ─── */
const PUSDSection = () => (
  <section className="py-24 max-w-6xl mx-auto px-6">
    <div className="neural-card p-10 md:p-14 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,229,204,0.06) 0%, transparent 70%)', margin: '-80px -80px 0 0' }} />
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.15)' }}>
            <Coins className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="text-xs font-medium text-accent-cyan">PUSD — Native Stablecoin</span>
          </div>
          <h2 className="text-3xl font-semibold text-white tracking-tight">
            The money layer of the autonomous economy
          </h2>
          <p className="text-sm text-white/45 leading-relaxed">
            PUSD is a USD-pegged stablecoin issued natively on Arbitrum Sepolia and used as the primary settlement
            currency across the PalmFlow protocol. Every payroll stream, cross-border transfer, and
            yield position is denominated in PUSD — giving your treasury a single stable unit of account.
          </p>
          <div className="space-y-3">
            {[
              'Fully collateralised and auditable on-chain',
              'Permissionless mint & burn via protocol vaults',
              'Instant streaming to any Arbitrum Sepolia wallet',
              'Earns yield automatically when idle in vaults',
            ].map((pt, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
                <span className="text-sm text-white/60">{pt}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center">
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="relative"
          >
            <div className="w-48 h-48 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at 35% 35%, rgba(0,229,204,0.25), rgba(0,229,204,0.04))',
                border: '1px solid rgba(0,229,204,0.2)',
                boxShadow: '0 0 60px rgba(0,229,204,0.12)',
              }}>
              <div className="text-center">
                <div className="text-4xl font-bold text-white tracking-tight">$P</div>
                <div className="text-xs text-accent-cyan mt-1 font-medium">PUSD</div>
              </div>
            </div>
            <div className="absolute -top-3 -right-3 w-4 h-4 rounded-full"
              style={{ background: '#00e5cc', boxShadow: '0 0 14px rgba(0,229,204,0.8)' }} />
            <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full"
              style={{ background: '#6366f1', boxShadow: '0 0 12px rgba(99,102,241,0.8)' }} />
          </motion.div>
        </div>
      </div>
    </div>
  </section>
);

/* ─── Roadmap ─── */
const Roadmap = () => (
  <section className="py-24 max-w-6xl mx-auto px-6">
    <motion.div {...fadeUp()} className="text-center mb-16">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
        style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)' }}>
        <GitBranch className="w-3.5 h-3.5" style={{ color: '#ec4899' }} />
        <span className="text-xs font-medium" style={{ color: '#ec4899' }}>Roadmap</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
        Building the neural economy
      </h2>
    </motion.div>
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-px"
        style={{ background: 'linear-gradient(180deg, rgba(0,229,204,0.4), rgba(99,102,241,0.2), transparent)' }} />
      <div className="space-y-6 pl-16">
        {[
          { phase: 'Phase 1', label: 'Live Now', color: '#00e5cc', done: true,
            items: ['Core treasury OS', 'AI agent workforce', 'Streaming payroll', 'PUSD stablecoin mint', 'Risk Sentinel v1'] },
          { phase: 'Phase 2', label: 'Q3 2026', color: '#6366f1', done: false,
            items: ['Cross-chain bridge (ETH, BNB)', 'Agent marketplace', 'DAO governance module', 'Mobile app (iOS & Android)', 'ZK proof audit trail'] },
          { phase: 'Phase 3', label: 'Q1 2027', color: '#ec4899', done: false,
            items: ['Institutional custody layer', 'Fiat on/off-ramp via licensed partners', 'Multi-sig treasury council', 'Protocol revenue sharing', 'Global compliance toolkit'] },
        ].map((phase, i) => (
          <motion.div key={i} {...fadeUp(i * 0.1)} className="relative">
            <div className="absolute -left-[2.85rem] top-5 w-4 h-4 rounded-full border-2"
              style={{
                background: phase.done ? phase.color : 'rgba(10,12,18,1)',
                borderColor: phase.color,
                boxShadow: phase.done ? `0 0 12px ${phase.color}60` : 'none',
              }} />
            <div className="neural-card p-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-semibold text-white">{phase.phase}</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: `${phase.color}15`, color: phase.color, border: `1px solid ${phase.color}30` }}>
                  {phase.label}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {phase.items.map((item, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: phase.color }} />
                    <span className="text-xs text-white/50">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── Final CTA ─── */
const FinalCTA = () => {
  const { setVisible } = useWalletModal();
  return (
    <section className="py-24 max-w-6xl mx-auto px-6">
      <motion.div {...fadeUp()} className="neural-card p-14 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,229,204,0.07) 0%, transparent 60%)' }} />
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
            Ready to deploy your<br />
            <span className="text-gradient-cyan">autonomous treasury?</span>
          </h2>
          <p className="text-sm text-white/40 max-w-md mx-auto mb-8 leading-relaxed">
            Connect your Arbitrum Sepolia wallet to access the full PalmFlow AI platform — no sign-up, no custody, no compromise.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="btn-primary inline-flex items-center gap-2.5 text-sm px-8 py-3.5"
          >
            Launch PalmFlow AI
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </section>
  );
};

/* ─── Main ─── */
export const LandingPage = () => (
  <div className="relative z-10 pb-16">
    <Hero />
    <HowItWorks />
    <Features />
    <AgentSystem />
    <PUSDSection />
    <Ecosystem />
    <Roadmap />
    <FinalCTA />
    <footer className="max-w-6xl mx-auto px-6 py-12 border-t flex flex-col sm:flex-row items-center justify-between gap-6"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
          <span className="text-black font-bold text-sm">P</span>
        </div>
        <div>
          <span className="text-sm font-semibold text-white">PalmFlow AI</span>
          <span className="text-xs text-white/30 ml-1.5">Neural OS</span>
        </div>
      </div>
      <div className="flex items-center gap-8">
        {['Twitter', 'Discord', 'Docs', 'Security'].map(link => (
          <span key={link} className="text-sm text-white/35 hover:text-white transition-colors cursor-pointer">{link}</span>
        ))}
      </div>
      <p className="text-xs text-white/20">© 2026 PalmFlow AI</p>
    </footer>
  </div>
);

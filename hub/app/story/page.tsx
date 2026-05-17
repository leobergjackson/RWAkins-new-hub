'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ExecutiveWalkthrough from '../components/ExecutiveWalkthrough'
import CommandPalette from '../components/CommandPalette'

interface NarrativeSlide {
  id: string
  title: string
  subtitle: string
  paragraphs: string[]
  metrics: { label: string; value: string }[]
}

export default function StoryPage() {
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0)



  const slides: NarrativeSlide[] = [
    {
      id: 'works',
      title: 'How Kubryx Works',
      subtitle: 'A single operating system coordinating decentralized state transitions.',
      paragraphs: [
        'Corporate finance is severely bottlenecked by multi-chain friction. Individual networks are isolated silos with disparate wallet abstractions, RPC latency profiles, and non-standard contract parameters.',
        'Kubryx resolves this by treating blockchain environments as integrated operational channels of a single unified OS. We absorb active wallet contexts reactively, allowing distinct tools to share synchronized parameters in client memory.',
        'This allows treasury desks, autonomous staking models, and secure vaults to collaborate seamlessly without manual bridging, complex network switches, or custom orchestration code.'
      ],
      metrics: [
        { label: 'Built-in Tools', value: '8 Tools, 1 OS' },
        { label: 'Integration Layer', value: 'Unified Context' }
      ]
    },
    {
      id: 'ai-coord',
      title: 'AI-Assisted Coordination',
      subtitle: 'Where natural language orchestration meets mathematical certainty.',
      paragraphs: [
        'Conventional automation rules are rigid, fragile, and fail to adapt during volatile market conditions. Standard AI agents, conversely, lack cryptographic safety guarantees.',
        'Kubryx blends these paradigms into a high-security coordination layer. Advanced LLM pipelines analyze complex liquidity states and negotiate rates, but every transaction must pass detached Freighter XDR or Phantom Ed25519 signature checks before execution.',
        'This dual-engine model provides corporate operators with intuitive narrative control while guaranteeing absolute cryptographic vault isolation against external exploits or AI hallucinations.'
      ],
      metrics: [
        { label: 'Orchestration Engine', value: 'Autonomous LLM' },
        { label: 'Cryptographic Bound', value: 'Ed25519 Detached' }
      ]
    },
    {
      id: 'auto-infra',
      title: 'Autonomous Infrastructure',
      subtitle: 'Self-healing SLA nodes and dynamic telemetry protection.',
      paragraphs: [
        'Web3 regional nodes are prone to frequent packet dropouts and memory congestion. Kubryx builds systemic resilience directly into our core telemetry layer.',
        'Our custom diagnostics suite monitors RPC response speeds in milliseconds. If a regional node suffers a cold restart or latency spike, a 6-second abort threshold intercepts the query and auto-routes traffic through cache failovers.',
        'This maintains continuous corporate uptime and guarantees a reliable, presentation-safe showcase under simulated latency or node outages.'
      ],
      metrics: [
        { label: 'Nominal Gateway SLA', value: '45ms' },
        { label: 'Resilience Uptime', value: '99.98%' }
      ]
    },
    {
      id: 'cross-chain-intel',
      title: 'Cross-Chain Operational Intelligence',
      subtitle: 'Correlating multi-chain event buses to orchestrate liquid flows.',
      paragraphs: [
        'Staking and lending yields fluctuate continuously across EVM L2 and Soroban environments. Retrospective periodic sweeps lock up critical capital.',
        'Kubryx coordinates an autonomous cross-chain event bus that listens to gas limits and yields. When a staking APY spikes on QIE, the engine dispatches optimized rebalance proposals to corporate stakeholders.',
        'These recommendations are accompanied by detailed event causality chains and confidence estimates, allowing teams to execute complex asset sweeps instantly.'
      ],
      metrics: [
        { label: 'Supported Chains', value: 'QIE, Solana, Stellar, Arbitrum' },
        { label: 'Cross-Chain Bus Uptime', value: '100% Core' }
      ]
    },
    {
      id: 'future-finance',
      title: 'Future of Organizational Finance',
      subtitle: 'Next-generation digital twins and continuous yield streaming.',
      paragraphs: [
        'Modern treasury assets demand continuous operational execution. Kubryx envisions a future where multi-party payroll streams, debt optimization pools, and AI nodes operate autonomously.',
        'To stress-test these scenarios safely, Kubryx integrates an isolated Digital Twin framework. Executives can simulate heavy congestions, key compromise compromises, and RPC cascades to verify automated AI safeties in sandboxed sandboxes.',
        'By combining physical execution with synthetic twin simulations, Kubryx empowers enterprises and DAOs with unprecedented control over digital assets and liquid flows.'
      ],
      metrics: [
        { label: 'Sandbox Simulation profiles', value: '12 Scenarios' },
        { label: 'Investor Showcase Uptime', value: 'Certified' }
      ]
    },
    {
      id: 'sovereign-ops',
      title: 'Operational Sovereignty',
      subtitle: 'A decentralized, independent network governing autonomous digital resources.',
      paragraphs: [
        'Traditional infrastructure relies on centralized third-party hosting, vulnerable to administrative shifts, domain blockages, and single-point routing failures.',
        'Kubryx introduces Operational Sovereignty by establishing a decentralized, self-governing consensus mesh. Nodes continuously verify quorum signatures, validate execution parameters, and maintain an independent operational state.',
        'This ensures that key corporate assets, multi-sig streams, and yield protocols remain fully resilient and sovereign against external network partitionings or centralized outages.'
      ],
      metrics: [
        { label: 'Sovereignty Index', value: '98.4%' },
        { label: 'Consensus Quorum', value: 'Validator Mesh' }
      ]
    },
    {
      id: 'ai-governed',
      title: 'AI-Governed Coordination & Network Policies',
      subtitle: 'Rigorous machine-speed logic gated by ZK policy lineages.',
      paragraphs: [
        'AI agent automation must be bound by clear operational parameters to prevent transaction drifts, liquidity drains, or resource misallocations during extreme volatility.',
        'Our Infrastructure Policy Engine establishes stateful telemetry escalation rules, resource constraint boundaries, and simulation safety sandboxes. These policies are traced dynamically in our governance registry.',
        'Every automated decision leaves a clear, immutable lineage trace, allowing developers and compliance teams to audit AI-agent behavior with absolute logical explainability.'
      ],
      metrics: [
        { label: 'Conflict Detection', value: 'Automated Trackers' },
        { label: 'Policy Registers', value: 'Zero-Knowledge Trace' }
      ]
    },
    {
      id: 'digital-ops',
      title: 'Digital Operational Networks & Future Economies',
      subtitle: 'Simulating decentralized liquidity equilibrium at protocol scale.',
      paragraphs: [
        'As protocol-scale finance scales, multi-chain liquidity must migrate dynamically to counter yield changes, gas spikes, and network congestions.',
        'Kubryx balances these flows through our Autonomous Economic Coordination engine. The engine models dynamic pool flows and calculates coordinate rewards to incentivize healthy liquidity distributions.',
        'By matching machine-speed yield balancing with mathematical equilibrium indexes, we construct a sovereign operational layer capable of serving the next generation of global DAOs and protocols.'
      ],
      metrics: [
        { label: 'Equilibrium Index', value: '94.6%' },
        { label: 'Rewards Pool', value: 'NCRD Incentives' }
      ]
    },
    {
      id: 'infra-coordination',
      title: 'The Infrastructure Coordination Era',
      subtitle: 'Moving past isolated cloud boxes towards synchronized global ledgers.',
      paragraphs: [
        'Static hosting model setups are vulnerable to network fragmentation, DNS blocking, and localized routing outages.',
        'Kubryx heralds a new operational standard by establishing an independent, self-governing consensus mesh. Nodes continuously verify transaction quorums, calibrate latency targets, and maintain localized state databases.',
        'This guarantees absolute permanence and multi-cloud resilience, allowing organizations to run digital twin payroll systems with complete operational isolation.'
      ],
      metrics: [
        { label: 'Coordination Weight', value: 'Validator Mesh' },
        { label: 'Nominal Sync', value: '45ms target' }
      ]
    },
    {
      id: 'ai-native-fabric',
      title: 'AI-Native Operational Fabric',
      subtitle: 'Orchestrating multi-chain state routes with rigorous zero-knowledge policies.',
      paragraphs: [
        'Traditional automation rules are rigid, fragile, and fail to adapt during extreme volatility. LLMs, conversely, lack cryptographic safeguards.',
        'Our Infrastructure Policy Engine resolves this by binding autonomous agent allocations within deterministic boundaries (such as a 50k USDC sweep limit). Every routing recommendation leaves a ZK decision trace in our governance registry.',
        'This allows operators to review machine-speed mitigations with complete logical explainability and absolute defense confidence.'
      ],
      metrics: [
        { label: 'Policy Gating', value: 'ZK Decision Lineage' },
        { label: 'Escalation Rules', value: 'USDC Thresholds' }
      ]
    },
    {
      id: 'beyond-saas',
      title: 'Beyond SaaS Operations',
      subtitle: 'A decentralized, independent network governing autonomous digital resources.',
      paragraphs: [
        'Conventional SaaS dashboards are passive observers, capturing retrospective data without the power to execute self-correcting transactions.',
        'Kubryx balances resources proactively through the Autonomous Economic Coordination engine. The engine models liquidity pools dynamically and adjust reward levels to correct multi-chain yield imbalances.',
        'By matching machine-speed adjustments with mathematical equilibrium scores, we present a resilient operational layer capable of serving global DAOs and protocols.'
      ],
      metrics: [
        { label: 'Ecosystem APY', value: 'Dynamic Rewards' },
        { label: 'Maturity Score', value: '98.4%' }
      ]
    }
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setActiveSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))
      } else if (e.key === 'ArrowLeft') {
        setActiveSlideIndex((prev) => Math.max(0, prev - 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [slides.length])

  const slide = slides[activeSlideIndex]

  return (
    <main className="dashboard-layout" style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px' }}>
      <header style={{ width: '100%', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link className="gold-text" href="/dashboard" style={{ fontSize: 13, textDecoration: 'none' }}>◀ Back to Dashboard</Link>
            <span style={{ color: '#666', fontSize: 12 }}>/</span>
            <span style={{ fontSize: 13, color: '#aaa' }}>Executive Narrative</span>
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📖</span> Executive Storytelling Mode
          </h1>
        </div>
      </header>

      {/* Narrative Card Slide */}
      <section 
        className="card" 
        style={{ 
          padding: '40px 48px', 
          background: 'linear-gradient(180deg, rgba(245,197,24,0.02) 0%, rgba(0,0,0,0) 100%)',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'rgba(245,197,24,0.25)',
          borderRadius: 12,
          minHeight: 380,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 24,
          animation: 'fadeIn 0.4s ease-out'
        }}
      >
        <div>
          <p className="eyebrow" style={{ color: '#F5C518', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>
            Slide {activeSlideIndex + 1} of {slides.length}
          </p>
          <h2 style={{ fontSize: 32, margin: '0 0 4px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {slide.title}
          </h2>
          <h3 style={{ fontSize: 16, margin: '0 0 24px', fontWeight: 500, color: '#F5C518' }}>
            {slide.subtitle}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {slide.paragraphs.map((p, idx) => (
              <p key={idx} style={{ margin: 0, fontSize: 14, color: '#ccc', lineHeight: 1.6, textAlign: 'justify' }}>
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* Dynamic Slide Statistics */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 32 }}>
            {slide.metrics.map((m, idx) => (
              <div key={idx}>
                <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</span>
                <h4 style={{ margin: '2px 0 0', fontSize: 18, color: '#fff', fontWeight: 700 }}>{m.value}</h4>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
              disabled={activeSlideIndex === 0}
              className="btn-outline"
              style={{ padding: '8px 16px', fontSize: 12, opacity: activeSlideIndex === 0 ? 0.3 : 1 }}
            >
              ◀ Previous
            </button>
            <button
              onClick={() => {
                if (activeSlideIndex < slides.length - 1) {
                  setActiveSlideIndex((prev) => prev + 1)
                } else {
                  // End: redirect to dashboard
                  window.location.href = '/dashboard'
                }
              }}
              className="btn-gold"
              style={{ padding: '8px 18px', fontSize: 12 }}
            >
              {activeSlideIndex === slides.length - 1 ? 'Finish Presentation ➔' : 'Next Chapter ▶'}
            </button>
          </div>
        </div>
      </section>

      {/* Slide Navigation Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
        {slides.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setActiveSlideIndex(idx)}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: activeSlideIndex === idx ? '#F5C518' : 'rgba(255,255,255,0.15)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.2s'
            }}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <ExecutiveWalkthrough />
      <CommandPalette />
    </main>
  )
}

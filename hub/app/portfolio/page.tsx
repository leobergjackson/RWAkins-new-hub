// Built by vsrupeshkumar
// SCREEN 2 — Portfolio dashboard: live on-chain position, allocation, yield, and
// the active AI-CFO wealth rules. Standalone route with its own sticky navbar.
// Reads real balances via lib/rwa/vaultClient when the vault is deployed; before
// deployment it renders a clearly-labelled demo position (same convention the
// existing Treasury panel uses).
'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatEther } from 'viem'
import { Wallet, TrendingUp, PieChart as PieIcon, Coins, Sparkles, ArrowRight, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { useWallet } from '@/context/WalletContext'
import { usePrices } from '@/hooks/usePrices'
import { isVaultDeployed, readWalletBalances, readYields } from '@/lib/rwa/vaultClient'
import { loadIntent, summarizeRules, type WealthRules } from '@/lib/intent'
import { StandaloneNavbar } from '@/components/shell/StandaloneNavbar'
import { AgentNav } from '@/components/shell/AgentNav'
import { WalletButton, SwitchToMantleBanner } from '@/components/onboarding/WalletButton'
import { MetricCard } from '@/components/portfolio/MetricCard'
import { RiskBadge } from '@/components/portfolio/RiskBadge'
import { PortfolioChart } from '@/components/portfolio/PortfolioChart'
import { PortfolioLineChart } from '@/components/portfolio/PortfolioLineChart'
import type { ActivityPoint } from '@/app/api/activity/route'

const TEAL = '#2dd4bf'
const PURPLE = '#a78bfa'
const USDY_PRICE = 1.0 // USDY is a ~$1 stable yield token (testnet mock pegged for the demo)
const ETH_FALLBACK = 3200

// Demo position shown before the vault is deployed (token units, 18-dec).
const DEMO = { usdyTokens: 6800, methTokens: 1.15, usdyApyBps: 480, methApyBps: 360 }

const toNum = (b: bigint) => Number(formatEther(b))

export default function PortfolioPage() {
  const { evm } = useWallet()
  const connected = evm.isConnected && !!evm.address
  const { prices } = usePrices(['ethereum'])
  const ethPrice = prices['ethereum']?.usd || ETH_FALLBACK

  const [usdyTokens, setUsdyTokens] = useState(0)
  const [methTokens, setMethTokens] = useState(0)
  const [apy, setApy] = useState({ usdyApyBps: DEMO.usdyApyBps, methApyBps: DEMO.methApyBps })
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(!isVaultDeployed)
  const [rules, setRules] = useState<WealthRules | null>(null)
  const [series, setSeries] = useState<ActivityPoint[]>([])
  const [triggering, setTriggering] = useState(false)
  const [triggerResult, setTriggerResult] = useState<{ ok: boolean; narrative?: string; txHash?: string; err?: string } | null>(null)
  const router = useRouter()

  // Load saved wealth rules for this wallet.
  useEffect(() => {
    setRules(loadIntent(evm.address))
  }, [evm.address])

  // Load on-chain (or demo) position.
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      if (isVaultDeployed && connected && evm.address) {
        try {
          const [bal, yields] = await Promise.all([
            readWalletBalances(evm.address as `0x${string}`),
            readYields(),
          ])
          if (!active) return
          setUsdyTokens(toNum(bal.usdy))
          setMethTokens(toNum(bal.meth))
          setApy(yields)
          setIsDemo(false)
        } catch {
          if (!active) return
          setUsdyTokens(DEMO.usdyTokens)
          setMethTokens(DEMO.methTokens)
          setApy({ usdyApyBps: DEMO.usdyApyBps, methApyBps: DEMO.methApyBps })
          setIsDemo(true)
        }
      } else {
        setUsdyTokens(DEMO.usdyTokens)
        setMethTokens(DEMO.methTokens)
        setApy({ usdyApyBps: DEMO.usdyApyBps, methApyBps: DEMO.methApyBps })
        setIsDemo(true)
      }
      if (active) setLoading(false)
    }
    load()
    return () => { active = false }
  }, [connected, evm.address])

  // Derived USD metrics.
  const m = useMemo(() => {
    const usdyUsd = usdyTokens * USDY_PRICE
    const methUsd = methTokens * ethPrice
    const total = usdyUsd + methUsd
    const usdyFrac = total > 0 ? usdyUsd / total : 0
    const methFrac = total > 0 ? methUsd / total : 0
    const weightedYield = usdyFrac * (apy.usdyApyBps / 100) + methFrac * (apy.methApyBps / 100)
    return { usdyUsd, methUsd, total, usdyFrac, methFrac, weightedYield }
  }, [usdyTokens, methTokens, ethPrice, apy])

  // Performance series anchored to the live total value.
  useEffect(() => {
    if (loading || m.total <= 0) return
    let active = true
    const addr = evm.address || 'anon'
    fetch(`/api/activity?base=${Math.round(m.total)}&address=${addr}`)
      .then((r) => r.json())
      .then((j: { series?: ActivityPoint[] }) => { if (active) setSeries(j.series ?? []) })
      .catch(() => { if (active) setSeries([]) })
    return () => { active = false }
  }, [loading, m.total, evm.address])

  const fmtUsd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const fmtPct = (n: number) => `${n.toFixed(1)}%`

  const triggerRebalance = useCallback(async () => {
    if (!evm.address || triggering) return
    setTriggering(true)
    setTriggerResult(null)
    try {
      const res = await fetch('/api/rebalance/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: evm.address,
          currentMethPct: Math.round(m.methFrac * 100),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setTriggerResult({ ok: false, err: json.error ?? 'Trigger failed' })
      } else {
        setTriggerResult({ ok: true, narrative: json.narrative, txHash: json.txHash })
        // Navigate to activity feed after brief pause so user sees the success state.
        setTimeout(() => router.push('/activity'), 2200)
      }
    } catch {
      setTriggerResult({ ok: false, err: 'Network error — try again.' })
    } finally {
      setTriggering(false)
    }
  }, [evm.address, m.methFrac, triggering, router])

  return (
    <div className="agent-shell" style={{ minHeight: '100vh', background: '#080808', color: '#fff' }}>
      <AgentNav />
      {/* Sticky navbar (shared with /onboarding + /activity) */}
      <StandaloneNavbar subtitle="Portfolio" showBell />

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 20px 80px' }}>
        <div style={{ marginBottom: 16 }}>
          <SwitchToMantleBanner />
        </div>

        {!connected ? (
          <ConnectPrompt />
        ) : (
          <>
            {isDemo && (
              <div
                style={{
                  marginBottom: 20,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  color: '#fbbf24',
                  background: 'rgba(251,191,36,0.08)',
                  border: '1px solid rgba(251,191,36,0.2)',
                }}
              >
                Showing a <strong>demo position</strong>. Deploy the RWA vault to Mantle Sepolia to read your live balances.
              </div>
            )}

            {/* AI CFO Action Panel */}
            <RebalanceTrigger
              loading={loading}
              triggering={triggering}
              result={triggerResult}
              onTrigger={triggerRebalance}
            />

            {/* Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
              <MetricCard
                label="Total Portfolio Value"
                value={fmtUsd(m.total)}
                sub={`USDY $1.00 · mETH ${fmtUsd(ethPrice)}`}
                accent="green"
                icon={<Wallet size={16} />}
                loading={loading}
              />
              <MetricCard
                label="Current Yield Rate"
                value={fmtPct(m.weightedYield)}
                sub="Weighted USDY + mETH APY"
                accent="neutral"
                icon={<TrendingUp size={16} />}
                loading={loading}
              />
              <MetricCard
                label="USDY Allocation"
                value={fmtPct(m.usdyFrac * 100)}
                sub={fmtUsd(m.usdyUsd)}
                accent="teal"
                icon={<Coins size={16} />}
                loading={loading}
              />
              <MetricCard
                label="mETH Allocation"
                value={fmtPct(m.methFrac * 100)}
                sub={fmtUsd(m.methUsd)}
                accent="purple"
                icon={<PieIcon size={16} />}
                loading={loading}
              />
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 16, marginBottom: 24 }} className="portfolio-charts-grid">
              <Panel title="Allocation">
                <PortfolioChart data={[{ name: 'USDY', value: m.usdyUsd }, { name: 'mETH', value: m.methUsd }]} />
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8, fontSize: 12 }}>
                  <Legend color={TEAL} label="USDY" />
                  <Legend color={PURPLE} label="mETH" />
                </div>
              </Panel>
              <Panel title="Performance (30d)">
                <PortfolioLineChart data={series} />
              </Panel>
            </div>

            {/* Active wealth rules */}
            <WealthRulesPanel rules={rules} />
          </>
        )}
      </main>

      <style>{`@media (max-width: 820px){ .portfolio-charts-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

function WealthRulesPanel({ rules }: { rules: WealthRules | null }) {
  return (
    <Panel title="Active Wealth Rules">
      {!rules ? (
        <div style={{ textAlign: 'center', padding: '24px 12px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 16 }}>
            No AI CFO policy set for this wallet yet.
          </p>
          <Link
            href="/onboarding"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, background: TEAL, color: '#080808', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
          >
            <Sparkles size={14} /> Set up your AI CFO <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <RiskBadge level={rules.riskLevel} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{summarizeRules(rules)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <Rule label="Default asset" value={rules.defaultAsset} />
            <Rule label="Target USDY" value={`${(rules.targetUsdyBps / 100).toFixed(0)}%`} />
            <Rule label="Target mETH" value={`${(rules.targetMethBps / 100).toFixed(0)}%`} />
            <Rule label="Rebalancing" value={rules.autoRebalance ? `Auto · ${rules.rebalanceThresholdPct}% drift` : 'Manual'} />
          </div>
          {rules.rawIntent && (
            <p style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
              “{rules.rawIntent}”
            </p>
          )}
          <Link href="/onboarding" style={{ display: 'inline-block', marginTop: 14, fontSize: 12, color: TEAL, textDecoration: 'none' }}>
            Edit policy →
          </Link>
        </div>
      )}
    </Panel>
  )
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{value}</div>
    </div>
  )
}

function ConnectPrompt() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div
        style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)',
        }}
      >
        <Wallet size={24} color={TEAL} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Connect your wallet</h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 22px' }}>
        Connect on Mantle Testnet to see your live RWA portfolio.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <WalletButton />
      </div>
      <p style={{ marginTop: 18, fontSize: 13 }}>
        <Link href="/onboarding" style={{ color: TEAL, textDecoration: 'none' }}>New here? Set up your AI CFO →</Link>
      </p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: 20, borderRadius: 18, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em', margin: '0 0 16px' }}>{title}</h3>
      {children}
    </section>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)' }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} /> {label}
    </span>
  )
}

interface TriggerProps {
  loading: boolean
  triggering: boolean
  result: { ok: boolean; narrative?: string; txHash?: string; err?: string } | null
  onTrigger: () => void
}

function RebalanceTrigger({ loading, triggering, result, onTrigger }: TriggerProps) {
  if (result?.ok) {
    return (
      <div
        style={{
          marginBottom: 20, padding: '16px 20px', borderRadius: 14,
          background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.3)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2dd4bf', fontWeight: 700, fontSize: 14 }}>
          <CheckCircle size={16} /> AI CFO executed rebalance
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{result.narrative}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {result.txHash && (
            <a
              href={`https://sepolia.mantlescan.xyz/tx/${result.txHash}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#2dd4bf', textDecoration: 'none', fontFamily: 'monospace' }}
            >
              {result.txHash.slice(0, 18)}…{result.txHash.slice(-6)} ↗
            </a>
          )}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Redirecting to Activity feed…</span>
        </div>
      </div>
    )
  }

  if (result?.ok === false) {
    return (
      <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertCircle size={15} color="#fbbf24" />
        <span style={{ fontSize: 13, color: '#fbbf24' }}>{result.err}</span>
      </div>
    )
  }

  return (
    <div
      style={{
        marginBottom: 20, padding: '14px 20px', borderRadius: 14,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>AI CFO Agent</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Fetches live market data, evaluates your wealth rules, and executes a rebalance on Mantle.
        </div>
      </div>
      <button
        onClick={onTrigger}
        disabled={loading || triggering}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 10, border: 'none', cursor: loading || triggering ? 'not-allowed' : 'pointer',
          background: loading || triggering ? 'rgba(45,212,191,0.3)' : '#2dd4bf',
          color: '#080808', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap',
          transition: 'opacity 0.15s',
          opacity: loading || triggering ? 0.7 : 1,
        }}
      >
        <Zap size={14} />
        {triggering ? 'AI CFO evaluating…' : 'Run Rebalance'}
      </button>
    </div>
  )
}

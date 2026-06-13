'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Moon, Sun, Bot, Wallet, ExternalLink, ShieldCheck, ChevronRight } from 'lucide-react'
import { useWallet } from '@/context/WalletContext'
import { StandaloneNavbar } from '@/components/shell/StandaloneNavbar'
import { AgentNav } from '@/components/shell/AgentNav'
import { WalletButton } from '@/components/onboarding/WalletButton'

const TEAL = '#2f6b54'
const PURPLE = '#3f9a73'

type Theme = 'dark' | 'light'

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return (localStorage.getItem('rwakins-theme') as Theme) ?? 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('rwakins-theme', theme)
}

export default function SettingsPage() {
  const { evm } = useWallet()
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const t = getStoredTheme()
    setTheme(t)
    applyTheme(t)
  }, [])

  const toggle = (t: Theme) => {
    setTheme(t)
    applyTheme(t)
  }

  const shortAddr = evm.address
    ? `${evm.address.slice(0, 6)}…${evm.address.slice(-4)}`
    : null

  return (
    <div className="agent-shell" style={{ minHeight: '100vh', background: 'var(--rwa-bg)', color: 'var(--rwa-text)', transition: 'background 0.25s, color 0.25s' }}>
      <AgentNav />
      <StandaloneNavbar subtitle="Settings" showBell />

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 80px' }}>
        <header style={{ margin: '6px 0 28px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Settings</h1>
          <p style={{ fontSize: 14, color: 'var(--rwa-text-muted)', margin: 0 }}>
            Appearance, account, and agent preferences.
          </p>
        </header>

        {/* ── Appearance ── */}
        <Section title="Appearance">
          <div style={{ display: 'flex', gap: 10 }}>
            <ThemeButton
              label="Dark"
              icon={<Moon size={16} />}
              active={theme === 'dark'}
              onClick={() => toggle('dark')}
              color={PURPLE}
            />
            <ThemeButton
              label="Light"
              icon={<Sun size={16} />}
              active={theme === 'light'}
              onClick={() => toggle('light')}
              color={TEAL}
            />
          </div>
          <p style={{ fontSize: 13, color: 'var(--rwa-text-muted)', margin: '12px 0 0', lineHeight: 1.5 }}>
            Dark mode is the default agent aesthetic. Light mode applies a high-contrast white surface to all app pages.
          </p>
        </Section>

        {/* ── Account ── */}
        <Section title="Account">
          {evm.isConnected && shortAddr ? (
            <div style={row}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={16} color={TEAL} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{shortAddr}</span>
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: 'rgba(47,107,84,0.1)', border: '1px solid rgba(47,107,84,0.25)', color: TEAL, fontWeight: 700 }}>
                  Mantle Sepolia
                </span>
              </span>
              {evm.address && (
                <a
                  href={`https://sepolia.mantlescan.xyz/address/${evm.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: TEAL, textDecoration: 'none' }}
                >
                  View on explorer <ExternalLink size={13} />
                </a>
              )}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 14, color: 'var(--rwa-text-muted)', margin: '0 0 14px' }}>
                No wallet connected.
              </p>
              <WalletButton />
            </div>
          )}
        </Section>

        {/* ── AI CFO ── */}
        <Section title="AI CFO">
          <Link href="/onboarding" style={{ ...row, textDecoration: 'none', color: 'var(--rwa-text)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 38, height: 38, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(63,154,115,0.1)', border: '1px solid rgba(63,154,115,0.25)' }}>
                <Bot size={18} color={PURPLE} />
              </span>
              <span>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Configure AI CFO</div>
                <div style={{ fontSize: 12, color: 'var(--rwa-text-muted)' }}>Set your wealth goals and rebalancing policy</div>
              </span>
            </span>
            <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
          </Link>

          <Link href="/compliance" style={{ ...row, textDecoration: 'none', color: 'var(--rwa-text)', marginTop: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 38, height: 38, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(47,107,84,0.1)', border: '1px solid rgba(47,107,84,0.25)' }}>
                <ShieldCheck size={18} color={TEAL} />
              </span>
              <span>
                <div style={{ fontSize: 14, fontWeight: 700 }}>KYC & Compliance</div>
                <div style={{ fontSize: 12, color: 'var(--rwa-text-muted)' }}>Verify your identity and investment mandate on-chain</div>
              </span>
            </span>
            <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
          </Link>
        </Section>

        {/* ── About ── */}
        <Section title="About">
          <div style={{ fontSize: 14, color: 'var(--rwa-text-muted)', lineHeight: 1.7 }}>
            <div>RWAkins — AI CFO on Mantle Sepolia</div>
            <div>Turing Test Hackathon 2026 · AI × RWA track</div>
            <div style={{ marginTop: 8 }}>
              <a href="https://sepolia.mantlescan.xyz" target="_blank" rel="noopener noreferrer" style={{ color: TEAL, textDecoration: 'none' }}>
                Mantlescan explorer ↗
              </a>
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass" style={{ marginBottom: 24, padding: 22, borderRadius: 18 }}>
      <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--rwa-text-faint)', margin: '0 0 16px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function ThemeButton({ label, icon, active, onClick, color }: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void; color: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '11px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
        fontSize: 14, fontWeight: 700, transition: 'all 0.15s',
        color: active ? '#080808' : 'var(--rwa-text-muted)',
        background: active ? color : 'var(--rwa-surface)',
        outline: active ? `2px solid ${color}` : '2px solid transparent',
        outlineOffset: 2,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '12px 16px', borderRadius: 12, background: 'var(--rwa-surface-2)',
  border: '1px solid var(--rwa-border)',
}

'use client'
import { LENDORA_ACCENT } from '@/lib/lend-fallbacks'

const A = LENDORA_ACCENT
const BORDER = 'rgba(255,255,255,0.08)'
const MUTED = 'rgba(255,255,255,0.6)'
const MUTED2 = 'rgba(255,255,255,0.35)'
const MONO = '"Fira Code","JetBrains Mono",monospace'

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

export default function LendoraHero({
  walletAddress, onConnectWallet, onBorrow, isLive,
}: {
  walletAddress?: string; onConnectWallet?: () => void; onBorrow?: () => void; isLive?: boolean
}) {
  return (
    <div style={{ background: '#0C0C0C', borderBottom: `1px solid ${BORDER}`, padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: MUTED2, fontFamily: MONO, marginBottom: 14 }}>
        <span>Kubryx</span><span>›</span><span style={{ color: A }}>Lendora</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 480px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${A}25`, border: `1px solid ${A}45`, display: 'grid', placeItems: 'center', fontSize: 20, color: A, fontWeight: 800 }}>⟠</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: 'Georgia, "Playfair Display", serif', letterSpacing: '-0.01em', lineHeight: 1 }}>Lendora</div>
              <div style={{ fontSize: 12, color: MUTED2, marginTop: 4 }}>AI DeFi Loan Negotiation · Arbitrum</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: MUTED, maxWidth: 640, marginTop: 10, marginBottom: 14, lineHeight: 1.6 }}>
            Let AI negotiate your loan terms. Borrow against crypto collateral with zero-knowledge credit proofs. Lend to earn real yield.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Pill color={A} label="AI Negotiation" />
            <Pill color="#06b6d4" label="ZK Credit" />
            <Pill color="#f59e0b" label="Demo Data" />
            <Pill color={isLive ? '#10b981' : '#f59e0b'} label={isLive ? 'Arbitrum Live' : 'Arbitrum Offline'} pulse={!!isLive} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={onConnectWallet} style={{
            padding: '10px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent',
            color: walletAddress ? A : MUTED, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: walletAddress ? MONO : 'inherit',
          }}>{walletAddress ? short(walletAddress) : 'Connect Wallet'}</button>
          <button onClick={onBorrow} style={{
            padding: '10px 16px', borderRadius: 8, background: A, color: '#fff',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}>Borrow Now →</button>
        </div>
      </div>
    </div>
  )
}

function Pill({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, animation: pulse ? 'pl 1.6s ease-out infinite' : 'none' }} />
      {label}
      <style>{`@keyframes pl { 0% { box-shadow: 0 0 0 0 ${color}80 } 70% { box-shadow: 0 0 0 6px ${color}00 } 100% { box-shadow: 0 0 0 0 ${color}00 } }`}</style>
    </span>
  )
}

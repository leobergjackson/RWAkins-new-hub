// Built by vsrupeshkumar
'use client'

import { useState } from 'react'
import { Copy, CheckCheck, LogOut, AlertTriangle } from 'lucide-react'
import { useWallet } from '@/context/WalletContext'
import { ConnectButton } from '@/components/wallet/ConnectButton'

const MANTLE_SEPOLIA_DECIMAL = 5003
const MANTLE_SEPOLIA_HEX = '0x138b'
const TEAL = '#2dd4bf'

function truncate(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`
}

/** Small "Mantle Testnet" chip with a live status dot. */
export function MantleBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        color: TEAL,
        background: 'rgba(45,212,191,0.1)',
        border: '1px solid rgba(45,212,191,0.28)',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: TEAL }} className="animate-pulse" />
      Mantle Testnet
    </span>
  )
}

/**
 * Connect entry point. Reuses the hub's existing ConnectButton for the connect
 * flow, but renders a correct MNT-denominated pill once connected (the shared
 * pill labels the balance "ETH"; on Mantle the gas token is MNT).
 */
export function WalletButton() {
  const { evm, disconnectEVM } = useWallet()
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  if (!evm.isConnected || !evm.address) {
    return <ConnectButton type="evm" size="md" toolColor={TEAL} />
  }

  const copy = async () => {
    await navigator.clipboard.writeText(evm.address!)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="relative" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <MantleBadge />
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(45,212,191,0.25)',
          color: '#fff',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 999, background: '#10b981' }} className="animate-pulse" />
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>{truncate(evm.address)}</span>
        {evm.balance && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            {parseFloat(evm.balance).toFixed(3)} MNT
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-50"
            style={{ width: 280, background: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }}
          >
            <div style={{ padding: 14, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: 13, color: '#fff', wordBreak: 'break-all', fontFamily: 'var(--font-mono, monospace)' }}>{evm.address}</p>
              {evm.balance && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                  Balance: {evm.balance} MNT
                </p>
              )}
            </div>
            <div style={{ padding: 8 }}>
              <button onClick={copy} style={dropdownBtn} className="hover:bg-white/5">
                {copied ? <CheckCheck size={13} color="#10b981" /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy address'}
              </button>
              <button onClick={() => { disconnectEVM(); setOpen(false) }} style={{ ...dropdownBtn, color: '#ef4444' }} className="hover:bg-red-500/8">
                <LogOut size={13} /> Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const dropdownBtn: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 13,
  color: 'rgba(255,255,255,0.7)',
  background: 'transparent',
  cursor: 'pointer',
}

/**
 * Wrong-network banner for the standalone onboarding/portfolio routes (these
 * render outside the hub shell, so the shared WrongNetworkBanner — which is
 * keyed on TOOL_NETWORKS routes — doesn't apply here).
 */
export function SwitchToMantleBanner() {
  const { evm, switchToNetwork } = useWallet()
  const wrong = evm.isConnected && evm.chainId != null && evm.chainId !== MANTLE_SEPOLIA_DECIMAL
  if (!wrong) return null
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 12,
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.22)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={15} color="#f59e0b" />
        <span style={{ fontSize: 13, color: '#f59e0b' }}>
          Wrong network — RWAkins runs on <strong>Mantle Testnet</strong>.
        </span>
      </div>
      <button
        onClick={() => switchToNetwork(MANTLE_SEPOLIA_HEX, 'MANTLE_SEPOLIA')}
        style={{ padding: '6px 12px', borderRadius: 8, background: '#f59e0b', color: '#080808', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}
      >
        Switch to Mantle Testnet
      </button>
    </div>
  )
}

export default WalletButton

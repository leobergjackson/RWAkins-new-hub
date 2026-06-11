// Built by vsrupeshkumar
// Navbar bell that surfaces what the AUTONOMOUS heartbeat did while the user was
// away. Polls /api/notifications for the connected wallet, shows an unread badge,
// and on open lists each action ("Your AI CFO rebalanced your portfolio at 3:47
// AM — rotated 12% into USDY …") with a link to the real Mantle tx when present.
// Opening the panel marks everything read.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, ExternalLink } from 'lucide-react'
import { useWallet } from '@/context/WalletContext'

const TEAL = '#2dd4bf'
const POLL_MS = 30_000

interface AgentNotification {
  id: string
  timestamp: string
  message: string
  txHash: string | null
  read: boolean
}

export function NotificationBell() {
  const { evm } = useWallet()
  const wallet = evm.address
  const [items, setItems] = useState<AgentNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    if (!wallet) { setItems([]); setUnread(0); return }
    try {
      const r = await fetch(`/api/notifications?wallet=${wallet}`)
      const j = (await r.json()) as { notifications?: AgentNotification[]; unread?: number }
      setItems(j.notifications ?? [])
      setUnread(j.unread ?? 0)
    } catch { /* keep prior */ }
  }, [wallet])

  // Initial load + polling so overnight actions show up without a refresh.
  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const toggle = useCallback(async () => {
    const next = !open
    setOpen(next)
    if (next && wallet && unread > 0) {
      setUnread(0)
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet, action: 'markRead' }),
        })
      } catch { /* non-fatal */ }
    }
  }, [open, wallet, unread])

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        aria-label="Notifications"
        onClick={toggle}
        style={{ position: 'relative', color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute', top: -3, right: -4, minWidth: 15, height: 15, padding: '0 4px',
              borderRadius: 999, background: TEAL, color: '#080808', fontSize: 9, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 34, right: 0, width: 340, maxHeight: 420, overflowY: 'auto',
            background: 'rgba(16,16,18,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
            boxShadow: '0 18px 50px rgba(0,0,0,0.55)', zIndex: 50, padding: 8,
          }}
        >
          <div style={{ padding: '8px 10px 10px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
            AI CFO ACTIVITY
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '18px 12px 22px', fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
              No autonomous actions yet. Your CFO will report here when it rebalances on a schedule.
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '10px 12px', borderRadius: 10, marginBottom: 4,
                  background: n.read ? 'transparent' : 'rgba(45,212,191,0.06)',
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.05)' : 'rgba(45,212,191,0.18)'}`,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>{n.message}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    {new Date(n.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {n.txHash && (
                    <a
                      href={`https://sepolia.mantlescan.xyz/tx/${n.txHash}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: TEAL, textDecoration: 'none', fontFamily: 'monospace' }}
                    >
                      {n.txHash.slice(0, 10)}… <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell

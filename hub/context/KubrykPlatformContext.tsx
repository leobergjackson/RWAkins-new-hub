// Built by vsrupeshkumar
// Cross-module platform state — persists across page navigations via sessionStorage.
// Every Kubryx module writes its live data here; other modules read it.
'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type PlatformState = {
  creditScore:      number | null   // 0-1000, from Credit Passport (QIE)
  vaultActive:      boolean | null  // true = active vault on QIE
  vaultOwner:       string | null   // 0x…
  stellarBalance:   number | null   // XLM, from Stellar Testnet
  stellarPayments:  number | null   // total Stellar transactions
  treasuryValue:    number | null   // USD, from PalmFlow
  solanaSlot:       number | null   // live block, from TrustMesh
}

type PlatformActions = {
  setCredit:     (score: number) => void
  setVault:      (active: boolean, owner?: string) => void
  setStellar:    (balance: number, payments: number) => void
  setTreasury:   (value: number) => void
  setSolanaSlot: (slot: number) => void
}

type PlatformCtxValue = PlatformState & PlatformActions

const Ctx = createContext<PlatformCtxValue | null>(null)

const KEY = 'kubryx_platform_v1'

function load(): Partial<PlatformState> {
  if (typeof window === 'undefined') return {}
  try { const r = sessionStorage.getItem(KEY); return r ? JSON.parse(r) : {} } catch { return {} }
}
function save(s: PlatformState) {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(KEY, JSON.stringify(s)) } catch {}
}

export function KubrykPlatformProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlatformState>(() => ({
    creditScore: null, vaultActive: null, vaultOwner: null,
    stellarBalance: null, stellarPayments: null, treasuryValue: null, solanaSlot: null,
    ...load(),
  }))

  const patch = useCallback((p: Partial<PlatformState>) => {
    setState(prev => { const next = { ...prev, ...p }; save(next); return next })
  }, [])

  const setCredit     = useCallback((score: number)                       => patch({ creditScore: score }), [patch])
  const setVault      = useCallback((active: boolean, owner?: string)     => patch({ vaultActive: active, vaultOwner: owner ?? null }), [patch])
  const setStellar    = useCallback((balance: number, payments: number)   => patch({ stellarBalance: balance, stellarPayments: payments }), [patch])
  const setTreasury   = useCallback((value: number)                       => patch({ treasuryValue: value }), [patch])
  const setSolanaSlot = useCallback((slot: number)                        => patch({ solanaSlot: slot }), [patch])

  return (
    <Ctx.Provider value={{ ...state, setCredit, setVault, setStellar, setTreasury, setSolanaSlot }}>
      {children}
    </Ctx.Provider>
  )
}

export function useKubrykPlatform() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useKubrykPlatform must be used within KubrykPlatformProvider')
  return ctx
}

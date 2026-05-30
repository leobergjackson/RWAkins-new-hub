// Built by vsrupeshkumar
// User chain preference — a global default chain plus optional per-tool overrides.
// Persisted to localStorage so the choice survives navigation and reloads, mirroring
// the pattern used by KubrykPlatformContext.
//
// Resolution order for any tool:
//   per-tool override (if the user set one)  →  global default chain
//
// Tools call useChainPreference().resolveChain(toolId) to get the chain the user
// wants that tool to operate on. Generic, chain-agnostic reads (balance / block /
// price) follow this; chain-bound tool logic can read it to decide whether it is on
// its native chain.
'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { NETWORKS, type NetworkKey } from '@/lib/networks'

const DEFAULT_GLOBAL_CHAIN: NetworkKey = 'QIE'

type StoredPrefs = {
  global: NetworkKey
  overrides: Record<string, NetworkKey>  // toolId -> chain
}

type ChainPreferenceValue = {
  /** The platform-wide default chain. */
  globalChain: NetworkKey
  /** Set the platform-wide default chain. */
  setGlobalChain: (key: NetworkKey) => void
  /** Per-tool overrides, keyed by toolId. */
  overrides: Record<string, NetworkKey>
  /** Set (or clear, with null) a tool's chain override. */
  setToolChain: (toolId: string, key: NetworkKey | null) => void
  /** Resolve the effective chain for a tool: its override, else the global default. */
  resolveChain: (toolId?: string) => NetworkKey
  /** True when the tool is using its own override rather than the global default. */
  hasOverride: (toolId: string) => boolean
}

const Ctx = createContext<ChainPreferenceValue | null>(null)

const KEY = 'kubryx_chain_prefs'

function isValidKey(k: unknown): k is NetworkKey {
  return typeof k === 'string' && k in NETWORKS
}

function load(): StoredPrefs {
  const fallback: StoredPrefs = { global: DEFAULT_GLOBAL_CHAIN, overrides: {} }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<StoredPrefs>
    const global = isValidKey(parsed.global) ? parsed.global : DEFAULT_GLOBAL_CHAIN
    const overrides: Record<string, NetworkKey> = {}
    if (parsed.overrides && typeof parsed.overrides === 'object') {
      for (const [tool, key] of Object.entries(parsed.overrides)) {
        if (isValidKey(key)) overrides[tool] = key
      }
    }
    return { global, overrides }
  } catch {
    return fallback
  }
}

function save(prefs: StoredPrefs) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* noop */ }
}

export function ChainPreferenceProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<StoredPrefs>(() => load())

  const setGlobalChain = useCallback((key: NetworkKey) => {
    setPrefs(prev => {
      const next = { ...prev, global: key }
      save(next)
      return next
    })
  }, [])

  const setToolChain = useCallback((toolId: string, key: NetworkKey | null) => {
    setPrefs(prev => {
      const overrides = { ...prev.overrides }
      if (key === null) delete overrides[toolId]
      else overrides[toolId] = key
      const next = { ...prev, overrides }
      save(next)
      return next
    })
  }, [])

  const resolveChain = useCallback(
    (toolId?: string): NetworkKey => {
      if (toolId && prefs.overrides[toolId]) return prefs.overrides[toolId]
      return prefs.global
    },
    [prefs],
  )

  const hasOverride = useCallback(
    (toolId: string) => Boolean(prefs.overrides[toolId]),
    [prefs.overrides],
  )

  const value = useMemo<ChainPreferenceValue>(
    () => ({
      globalChain: prefs.global,
      setGlobalChain,
      overrides: prefs.overrides,
      setToolChain,
      resolveChain,
      hasOverride,
    }),
    [prefs.global, prefs.overrides, setGlobalChain, setToolChain, resolveChain, hasOverride],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useChainPreference(): ChainPreferenceValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useChainPreference must be used within ChainPreferenceProvider')
  return ctx
}

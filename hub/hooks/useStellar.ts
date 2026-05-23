// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { fetchStellarAccountStats, type StellarStats } from '@/lib/api/stellar'

const PUBLIC_KEY = process.env.NEXT_PUBLIC_STELLAR_PUBLIC_KEY || ''

const FALLBACK: StellarStats = {
  balance: '0',
  totalTransactions: 0,
  recentPayments: [],
  isLive: false,
}

export function useStellar() {
  const [stats, setStats] = useState<StellarStats>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!PUBLIC_KEY) {
      setLoading(false)
      return
    }
    let active = true

    async function load() {
      try {
        const s = await fetchStellarAccountStats(PUBLIC_KEY)
        if (!active) return
        setStats(s)
        setError(null)
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Failed to load Stellar data')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 30_000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return { stats, loading, error, isLive: stats.isLive }
}

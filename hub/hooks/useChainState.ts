// Built by vsrupeshkumar
// Generic, chain-agnostic live state for whichever chain the user has selected
// (per-tool override, else the global default). This is the hook that makes the
// chain switcher actually *do* something: balance/block/native-price reads follow
// the user's choice on any tool that uses it.
'use client'

import { useEffect, useRef, useState } from 'react'
import { NETWORKS, NETWORK_KEY_TO_RPC_CHAIN, type NetworkKey } from '@/lib/networks'
import { useChainPreference } from '@/context/ChainPreferenceContext'
import { getRPCBlockState } from '@/lib/blockchain-connector'
import { fetchPrices, type PriceMap } from '@/lib/api/coingecko'
import type { ChainType } from '@/lib/api/client'

export type ChainState = {
  chainKey: NetworkKey
  chainName: string
  shortName: string
  color: string
  symbol: string
  type: string
  /** Latest block height (EVM) or slot (Solana) / ledger (Stellar). 0 while loading. */
  blockNumber: number
  /** Native asset USD price, or null when there is no CoinGecko listing (e.g. QIE). */
  nativePrice: number | null
  /** RPC round-trip latency in ms. */
  latency: number
  healthy: boolean
  loading: boolean
}

/**
 * @param toolId  pass a tool id to honour its per-tool override; omit to follow the global default.
 * @param refreshMs  poll interval (default 15s).
 */
export function useChainState(toolId?: string, refreshMs = 15_000): ChainState {
  const { resolveChain } = useChainPreference()
  const chainKey = resolveChain(toolId)
  const net = NETWORKS[chainKey]

  const [state, setState] = useState<Omit<ChainState, 'chainKey' | 'chainName' | 'shortName' | 'color' | 'symbol' | 'type'>>({
    blockNumber: 0, nativePrice: null, latency: 0, healthy: true, loading: true,
  })
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    const rpcChain = NETWORK_KEY_TO_RPC_CHAIN[chainKey] as ChainType | undefined
    const coingeckoId = net.coingeckoId

    async function load() {
      const [block, priceMap] = await Promise.allSettled([
        rpcChain ? getRPCBlockState(rpcChain) : Promise.resolve(null),
        coingeckoId ? fetchPrices([coingeckoId]) : Promise.resolve({} as PriceMap),
      ])

      if (!activeRef.current) return

      const blockState = block.status === 'fulfilled' ? block.value : null
      const nativePrice =
        priceMap.status === 'fulfilled' && coingeckoId && priceMap.value[coingeckoId]
          ? priceMap.value[coingeckoId].usd
          : null

      setState({
        blockNumber: blockState?.blockNumber ?? 0,
        nativePrice,
        latency: blockState?.avgLatency ?? 0,
        healthy: blockState ? blockState.avgLatency < 2000 : true,
        loading: false,
      })
    }

    setState(prev => ({ ...prev, loading: true }))
    load()
    const id = setInterval(load, refreshMs)
    return () => {
      activeRef.current = false
      clearInterval(id)
    }
    // re-subscribe whenever the resolved chain changes
  }, [chainKey, net.coingeckoId, refreshMs])

  return {
    chainKey,
    chainName: net.name,
    shortName: net.shortName,
    color: net.color,
    symbol: net.currency.symbol,
    type: net.type,
    ...state,
  }
}

// Built by vsrupeshkumar
// Mantle Explorer-backed Mantle Sepolia transaction history.
// Server-side only so ARBISCAN_API_KEY never leaks to the browser.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FETCH_TIMEOUT_MS = 9_000

type MantleTx = {
  hash: string
  blockNumber: string
  timeStamp: string
  from: string
  to: string
  value: string                // wei
  gasUsed: string
  gasPrice: string
  isError: '0' | '1'
  functionName?: string
  methodId?: string
  txreceipt_status?: '0' | '1'
}

export type ArbTxRow = {
  hash: string
  block: number
  timestamp: number            // unix seconds
  from: string
  to: string
  valueEth: number
  feeEth: number
  direction: 'in' | 'out' | 'self'
  status: 'success' | 'failed'
  method: string               // human-friendly function name
  explorerUrl: string
}

export type ArbTxResponse = {
  address: string
  count: number
  txs: ArbTxRow[]
  generatedAt: string
}

const ZERO  = BigInt(0)
const TEN18 = BigInt(10) ** BigInt(18)

function wei(s: string): bigint {
  try { return BigInt(s) } catch { return ZERO }
}

function asEth(v: bigint): number {
  // 18 decimals — keep 6dp for display
  const whole = v / TEN18
  const frac  = v % TEN18
  const fracStr = frac.toString().padStart(18, '0').slice(0, 6)
  return Number(`${whole}.${fracStr}`)
}

function prettyMethod(tx: MantleTx): string {
  if (tx.functionName) {
    // "transfer(address to, uint256 amount)" → "transfer"
    return tx.functionName.split('(')[0]
  }
  if (tx.methodId && tx.methodId !== '0x') return tx.methodId
  if (!tx.to || tx.to === '') return 'Contract Deploy'
  return 'Transfer'
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const address = url.searchParams.get('address')?.toLowerCase()
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 10)))

  if (!address || !/^0x[a-f0-9]{40}$/i.test(address)) {
    return NextResponse.json({ error: 'invalid address' }, { status: 400 })
  }

  // Mantle Sepolia Explorer uses Blockscout, no strict API key required for basic rate limits.
  const v2 = `https://explorer.sepolia.mantle.xyz/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc`
  const v1 = v2

  async function tryEndpoint(url: string): Promise<{ rows: MantleTx[] | null; err?: string }> {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store', headers: { Accept: 'application/json' } })
      if (!res.ok) return { rows: null, err: `HTTP ${res.status}` }
      const json = await res.json() as { status: string; message: string; result: MantleTx[] | string }
      // status '1' = OK with data; status '0' + message 'No transactions found' = OK empty.
      if (json.status === '1' && Array.isArray(json.result)) return { rows: json.result }
      if (json.status === '0' && json.message === 'No transactions found') return { rows: [] }
      // Surface the real reason — Mantle Explorer puts the actual error in `result`, not `message`.
      const detail = typeof json.result === 'string' && json.result ? json.result : json.message
      return { rows: null, err: detail }
    } catch (e) {
      return { rows: null, err: e instanceof Error ? e.message : 'network' }
    } finally {
      clearTimeout(t)
    }
  }

  try {
    let result = await tryEndpoint(v2)
    if (result.rows === null) {
      const v2err = result.err
      result = await tryEndpoint(v1)
      if (result.rows === null) {
        return NextResponse.json({ error: `Mantle Explorer v2: ${v2err} · v1: ${result.err}` }, { status: 502 })
      }
    }
    const rows = result.rows ?? []
    const txs: ArbTxRow[] = rows.map(tx => {
      const value = wei(tx.value)
      const fee = wei(tx.gasUsed) * wei(tx.gasPrice)
      const dir: ArbTxRow['direction'] =
        tx.from.toLowerCase() === address && tx.to.toLowerCase() === address ? 'self' :
        tx.from.toLowerCase() === address ? 'out' : 'in'
      return {
        hash: tx.hash,
        block: Number(tx.blockNumber),
        timestamp: Number(tx.timeStamp),
        from: tx.from,
        to: tx.to,
        valueEth: asEth(value),
        feeEth: asEth(fee),
        direction: dir,
        status: tx.isError === '1' || tx.txreceipt_status === '0' ? 'failed' : 'success',
        method: prettyMethod(tx),
        explorerUrl: `https://explorer.sepolia.mantle.xyz/tx/${tx.hash}`,
      }
    })

    const payload: ArbTxResponse = {
      address,
      count: txs.length,
      txs,
      generatedAt: new Date().toISOString(),
    }
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'network' }, { status: 504 })
  }
}

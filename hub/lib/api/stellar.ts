// Built by vsrupeshkumar
// Public-key-only Stellar Horizon client — no secret key used anywhere.
// Add NEXT_PUBLIC_STELLAR_PUBLIC_KEY and NEXT_PUBLIC_STELLAR_HORIZON_URL
// to Vercel environment variables for production.

const HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'

export interface StellarAccount {
  balance: string
  sequence: string
  subentryCount: number
}

export interface StellarTransaction {
  id: string
  hash: string
  createdAt: string
  successful: boolean
  ledger: number
}

export interface StellarPayment {
  id: string
  type: string
  createdAt: string
  amount: string
  assetType: string
  from: string
  to: string
  transactionHash: string
}

export interface StellarStats {
  balance: string
  totalTransactions: number
  recentPayments: StellarPayment[]
  isLive: boolean
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export async function fetchStellarAccount(publicKey: string): Promise<StellarAccount> {
  const res = await fetchWithTimeout(`${HORIZON_URL}/accounts/${publicKey}`)
  if (!res.ok) throw new Error(`Horizon ${res.status}`)
  const data = await res.json()
  const native = (data.balances ?? []).find(
    (b: Record<string, string>) => b.asset_type === 'native'
  )
  return {
    balance: native?.balance ?? '0',
    sequence: data.sequence ?? '0',
    subentryCount: data.subentry_count ?? 0,
  }
}

export async function fetchStellarTransactions(
  publicKey: string,
  limit = 10
): Promise<StellarTransaction[]> {
  const res = await fetchWithTimeout(
    `${HORIZON_URL}/accounts/${publicKey}/transactions?limit=${limit}&order=desc`
  )
  if (!res.ok) throw new Error(`Horizon ${res.status}`)
  const data = await res.json()
  return ((data._embedded?.records ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    hash: r.hash as string,
    createdAt: r.created_at as string,
    successful: r.successful as boolean,
    ledger: r.ledger as number,
  }))
}

export async function fetchStellarPayments(
  publicKey: string,
  limit = 10
): Promise<StellarPayment[]> {
  const res = await fetchWithTimeout(
    `${HORIZON_URL}/accounts/${publicKey}/payments?limit=${limit}&order=desc`
  )
  if (!res.ok) throw new Error(`Horizon ${res.status}`)
  const data = await res.json()
  return ((data._embedded?.records ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    type: r.type as string,
    createdAt: r.created_at as string,
    amount: ((r.amount ?? r.starting_balance ?? '0') as string),
    assetType:
      r.asset_type === 'native'
        ? 'XLM'
        : ((r.asset_code ?? r.asset_type ?? 'Unknown') as string),
    from: (r.from ?? r.funder ?? r.source_account ?? '') as string,
    to: (r.to ?? r.account ?? publicKey) as string,
    transactionHash: r.transaction_hash as string,
  }))
}

export async function fetchStellarAccountStats(publicKey: string): Promise<StellarStats> {
  try {
    const [account, payments] = await Promise.all([
      fetchStellarAccount(publicKey),
      fetchStellarPayments(publicKey, 10),
    ])
    return {
      balance: account.balance,
      totalTransactions: payments.length,
      recentPayments: payments,
      isLive: true,
    }
  } catch {
    return {
      balance: '0',
      totalTransactions: 0,
      recentPayments: [],
      isLive: false,
    }
  }
}

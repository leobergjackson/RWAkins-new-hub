'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadWallet, persistWallet } from '@/lib/wallet-utils'
import { toast } from '@/lib/toast'
import LendoraHero from '@/components/lend/LendoraHero'
import LendoraTabBar, { type LendTabId } from '@/components/lend/LendoraTabBar'
import LendDashboard from '@/components/lend/LendDashboard'
import LoanPortfolio from '@/components/lend/LoanPortfolio'
import BorrowForm from '@/components/lend/BorrowForm'
import LendForm from '@/components/lend/LendForm'
import LendMarkets from '@/components/lend/LendMarkets'

type EthereumProvider = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }
declare global { interface Window { ethereum?: EthereumProvider } }

const apiBase = process.env.NEXT_PUBLIC_LENDORA_URL || process.env.NEXT_PUBLIC_LENDORA_API || ''
const VALID: LendTabId[] = ['dashboard', 'loans', 'borrow', 'lend', 'markets']

function LendInner() {
  const router = useRouter()
  const params = useSearchParams()
  const initial = (params.get('tab') as LendTabId) || 'dashboard'
  const [tab, setTab] = useState<LendTabId>(VALID.includes(initial) ? initial : 'dashboard')
  const [wallet, setWallet] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [prefillAsset, setPrefillAsset] = useState<string | undefined>(undefined)

  useEffect(() => {
    setWallet(loadWallet('evm') || '')
    if (!apiBase) return
    fetch(`${apiBase}/health`).then(r => r.ok && r.json()).then(d => setIsLive(d?.status === 'ok')).catch(() => {})
  }, [])

  useEffect(() => {
    router.replace(tab === 'dashboard' ? '/lend' : `/lend?tab=${tab}`, { scroll: false })
  }, [tab, router])

  async function connect() {
    if (!window.ethereum) { toast.error('MetaMask not detected'); return }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
      const addr = accounts[0] || ''
      setWallet(addr); persistWallet('evm', addr); toast.success('MetaMask connected')
    } catch { toast.error('Connection cancelled') }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: '"Inter",system-ui,sans-serif' }}>
      <LendoraHero
        walletAddress={wallet}
        onConnectWallet={connect}
        onBorrow={() => setTab('borrow')}
        isLive={isLive}
      />
      <LendoraTabBar active={tab} onChange={setTab} />
      <div>
        {tab === 'dashboard' && <LendDashboard onGoToBorrow={() => setTab('borrow')} onGoToLoans={() => setTab('loans')} />}
        {tab === 'loans'     && <LoanPortfolio />}
        {tab === 'borrow'    && <BorrowForm walletAddress={wallet} />}
        {tab === 'lend'      && <LendForm walletAddress={wallet} prefillAsset={prefillAsset} />}
        {tab === 'markets'   && <LendMarkets onSupply={(a) => { setPrefillAsset(a); setTab('lend') }} onBorrow={() => setTab('borrow')} />}
      </div>
    </div>
  )
}

export default function LendPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080808' }} />}>
      <LendInner />
    </Suspense>
  )
}

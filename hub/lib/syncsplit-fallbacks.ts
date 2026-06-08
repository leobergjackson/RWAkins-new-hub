// Built by vsrupeshkumar
export type SSBill = {
  id: string
  title: string
  totalAmount: number
  currency: string
  participants: SSParticipant[]
  createdAt: string
  dueDate: string | null
  status: 'pending' | 'partial' | 'settled'
  txHash: string | null
  memo: string | null
}

export type SSParticipant = {
  address: string
  shareAmount: number
  paid: boolean
  paidAt: string | null
}

export type SSStats = {
  totalBills: number
  totalSettled: number
  totalPending: number
  volumeXLM: number
  volumeUSD: number
}

export const SS_FALLBACK_BILLS: SSBill[] = [
  {
    id: 'ss-demo-1',
    title: 'Team Dinner — Stellarcon 2025',
    totalAmount: 240,
    currency: 'MNT',
    status: 'partial',
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    dueDate: new Date(Date.now() + 86_400_000 * 3).toISOString(),
    txHash: 'aab3e1f7c2d8...soroban',
    memo: 'Remember to tip!',
    participants: [
      { address: 'GABC...1111', shareAmount: 80, paid: true,  paidAt: new Date(Date.now() - 1_800_000).toISOString() },
      { address: 'GDEF...2222', shareAmount: 80, paid: false, paidAt: null },
      { address: 'GHIJ...3333', shareAmount: 80, paid: false, paidAt: null },
    ],
  },
  {
    id: 'ss-demo-2',
    title: 'Office Supplies — April',
    totalAmount: 150,
    currency: 'MNT',
    status: 'settled',
    createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    dueDate: null,
    txHash: 'cc77d9a4b1e2...soroban',
    memo: null,
    participants: [
      { address: 'GABC...1111', shareAmount: 50, paid: true, paidAt: new Date(Date.now() - 6 * 86_400_000).toISOString() },
      { address: 'GKLM...4444', shareAmount: 50, paid: true, paidAt: new Date(Date.now() - 6 * 86_400_000).toISOString() },
      { address: 'GNOP...5555', shareAmount: 50, paid: true, paidAt: new Date(Date.now() - 5 * 86_400_000).toISOString() },
    ],
  },
  {
    id: 'ss-demo-3',
    title: 'Hackathon Venue — Q2',
    totalAmount: 500,
    currency: 'MNT',
    status: 'pending',
    createdAt: new Date(Date.now() - 1_800_000).toISOString(),
    dueDate: new Date(Date.now() + 86_400_000 * 7).toISOString(),
    txHash: null,
    memo: 'Deposit required',
    participants: [
      { address: 'GABC...1111', shareAmount: 125, paid: false, paidAt: null },
      { address: 'GDEF...2222', shareAmount: 125, paid: false, paidAt: null },
      { address: 'GHIJ...3333', shareAmount: 125, paid: false, paidAt: null },
      { address: 'GKLM...4444', shareAmount: 125, paid: false, paidAt: null },
    ],
  },
]

export const SS_FALLBACK_STATS: SSStats = {
  totalBills: 14,
  totalSettled: 9,
  totalPending: 5,
  volumeXLM: 3_480,
  volumeUSD: 522,
}

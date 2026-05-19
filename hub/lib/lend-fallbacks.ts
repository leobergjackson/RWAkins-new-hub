export const LENDORA_ACCENT = '#f59e0b'

export const FALLBACK_LEND_STATS = [
  { label: 'Total Borrows', value: '$180M', change: '+8.1%',  kind: 'up' as const },
  { label: 'Total Supply',  value: '$284M', change: '+14.2%', kind: 'up' as const },
  { label: 'Avg Borrow',    value: '6.2%',  change: '-0.3%',  kind: 'down' as const },
  { label: 'Avg Supply APY',value: '9.4%',  change: '+0.8%',  kind: 'up' as const },
]

export const FALLBACK_MY_POSITIONS = {
  borrowed: '$12,400', supplied: '$28,000', netAPY: '7.8%', healthFactor: 2.84,
  collateral: [
    { asset: 'ETH', amount: 4.8, value: 10963, ltv: 48 },
    { asset: 'BTC', amount: 0.4, value: 17136, ltv: 24 },
  ],
  creditScore: 847,
}

export const FALLBACK_LOANS = [
  { id: 'LN-1041', asset: 'USDC',   amount: '$8,400',  apr: '4.2%', health: 2.84, due: 'Feb 15', aiNegotiated: true,
    collateral: '4.8 ETH', ltv: 48, liqPrice: '$1,840', currentPrice: '$2,284',
    zkProof: 'zk#8a2b...12cd', tx: '0x3f...9b1c' },
  { id: 'LN-1038', asset: 'ETH',    amount: '1.2 ETH', apr: '3.8%', health: 3.12, due: 'Mar 01', aiNegotiated: true,
    collateral: '4.8 ETH', ltv: 32, liqPrice: '$1,520', currentPrice: '$2,284',
    zkProof: 'zk#7c1d...44ee', tx: '0x9c...8a2b' },
]

export const FALLBACK_SUPPLY = [
  { pool: 'POOL-A', asset: 'USDC', supplied: '$20,000', apy: '9.4%', earned: '$184',     started: 'Jan 01' },
  { pool: 'POOL-B', asset: 'ETH',  supplied: '3.5 ETH', apy: '8.2%', earned: '0.14 ETH', started: 'Jan 05' },
]

export const FALLBACK_MARKETS = [
  { asset: 'ETH',  supply: '$142M', borrowed: '$58M', sAPY: '8.2%', bAPR: '6.1%', util: 41 },
  { asset: 'BTC',  supply: '$84M',  borrowed: '$28M', sAPY: '7.8%', bAPR: '5.8%', util: 33 },
  { asset: 'USDC', supply: '$84M',  borrowed: '$58M', sAPY: '9.4%', bAPR: '7.2%', util: 69 },
  { asset: 'USDT', supply: '$38M',  borrowed: '$24M', sAPY: '9.1%', bAPR: '6.8%', util: 63 },
  { asset: 'DAI',  supply: '$28M',  borrowed: '$12M', sAPY: '8.8%', bAPR: '6.4%', util: 43 },
]

export const FALLBACK_RATE_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  date: `Day ${i + 1}`,
  supplyAPY: +(8.5 + Math.sin(i / 5) * 1.2).toFixed(2),
  borrowAPR: +(6.0 + Math.sin(i / 5) * 0.8).toFixed(2),
}))

export const FALLBACK_AI_ACTIVITY = [
  { detail: 'Negotiated 4.2% APR (market: 6.8%) · Saved $284/yr', time: '2m ago' },
  { detail: 'Extended loan term by 30 days · 0x9c...44ab',         time: '8m ago' },
  { detail: 'Unlocked Tier 2 rate (score: 847)',                   time: '15m ago' },
  { detail: 'Collateral rebalance: -0.4 ETH, +180 SOL',            time: '1h ago' },
  { detail: 'ZK proof submitted for credit upgrade',               time: '2h ago' },
]

export const FALLBACK_SUPPLY_POOLS = [
  { asset: 'USDC', apy: '9.4%', tvl: '$84M', util: 84 },
  { asset: 'ETH',  apy: '8.2%', tvl: '$42M', util: 71 },
  { asset: 'USDT', apy: '9.1%', tvl: '$38M', util: 79 },
  { asset: 'DAI',  apy: '8.8%', tvl: '$28M', util: 64 },
]

export const AI_SUGGESTIONS = [
  'Why is my rate 4.2%?',
  'Can you get a lower rate?',
  'What if I add more collateral?',
  'How does ZK credit scoring work?',
]

export function getStaticAIResponse(q: string): string {
  const s = q.toLowerCase()
  if (s.includes('rate') && s.includes('why')) return 'Your ZK credit score of 847 places you in Tier 2 pricing (−1.5% off market rate). Combined with your healthy 248% collateral ratio, I locked in 4.2% APR vs market 6.8%.'
  if (s.includes('lower') || s.includes('better')) return "I've already applied the maximum discount for your tier. To access Tier 1 rates (3.1% APR), you'd need a credit score above 900. Staking LEND or maintaining perfect repayments will move you up."
  if (s.includes('collateral')) return 'Adding 1 more ETH ($2,284) would lower your LTV from 48% to 36%, potentially unlocking an additional 0.5% rate reduction. Want me to recalculate with that collateral?'
  if (s.includes('zk') || s.includes('credit')) return 'Your ZK credit proof is a zero-knowledge attestation of your on-chain credit score. It proves you scored 847 without revealing your wallet history. Verified by NeuroCredit, valid for 30 days.'
  return "Based on your current position, my recommendation is to keep collateral ratio above 200% to lock in Tier 2 pricing. What aspect of your loan should I optimize?"
}

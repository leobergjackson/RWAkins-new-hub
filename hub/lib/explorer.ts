export type ExplorerChain = 'qie' | 'solana' | 'stellar' | 'arbitrum'

const BASES: Record<ExplorerChain, string> = {
  qie: 'https://mainnet.qie.digital',
  solana: 'https://explorer.solana.com',
  stellar: 'https://stellar.expert/explorer/testnet',
  arbitrum: 'https://arbiscan.io',
}

export function getExplorerUrl(chain: ExplorerChain, type: 'address' | 'tx', value: string): string {
  const base = BASES[chain]
  if (chain === 'solana') {
    const segment = type === 'tx' ? 'tx' : 'address'
    return `${base}/${segment}/${value}?cluster=devnet`
  }
  if (chain === 'stellar') {
    const segment = type === 'tx' ? 'tx' : 'account'
    return `${base}/${segment}/${value}`
  }
  const segment = type === 'tx' ? 'tx' : 'address'
  return `${base}/${segment}/${value}`
}

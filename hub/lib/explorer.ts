// Built by vsrupeshkumar
export type ExplorerChain = 'mantle' | 'qie' | 'solana' | 'stellar'

const BASES: Record<ExplorerChain, string> = {
  mantle: 'https://explorer.sepolia.mantle.xyz',
  qie: 'https://explorer.sepolia.mantle.xyz',
  solana: 'https://explorer.sepolia.mantle.xyz',
  stellar: 'https://explorer.sepolia.mantle.xyz',
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

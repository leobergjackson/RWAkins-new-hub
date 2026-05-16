export const QIE_MAINNET = {
  chainId: '0x7C6',
  chainName: 'QIE Mainnet',
  rpcUrls: ['https://rpc.qie.digital'],
  nativeCurrency: { name: 'QIE', symbol: 'QIE', decimals: 18 },
  blockExplorerUrls: ['https://mainnet.qie.digital'],
}

export const WALLET_INSTALL_LINKS = {
  metamask: 'https://metamask.io/download/',
  phantom: 'https://phantom.app/',
  freighter: 'https://www.freighter.app/',
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return ''
  if (address.length <= chars * 2 + 2) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export async function switchToQIE(): Promise<void> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask is not installed.')
  }
  const eth = (window as any).ethereum
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: QIE_MAINNET.chainId }] })
  } catch (err: any) {
    if (err?.code === 4902) {
      await eth.request({ method: 'wallet_addEthereumChain', params: [QIE_MAINNET] })
    } else {
      throw err
    }
  }
}

export function isPhantomInstalled(): boolean {
  return typeof window !== 'undefined' && !!(window as any)?.solana?.isPhantom
}

export function isFreighterInstalled(): boolean {
  return typeof window !== 'undefined' && typeof (window as any)?.freighter !== 'undefined'
}

export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && typeof (window as any)?.ethereum !== 'undefined'
}

export function timeAgo(input: string | Date | undefined): string {
  if (!input) return 'recent'
  const t = typeof input === 'string' ? new Date(input).getTime() : input.getTime()
  if (Number.isNaN(t)) return 'recent'
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// Built by vsrupeshkumar
import { getExplorerUrl } from '@/lib/explorer'

// RWAkins targets Mantle Sepolia. The explorer module consolidates every chain key
// onto the Mantle Sepolia explorer, so all links resolve to explorer.sepolia.mantle.xyz.
describe('explorer.ts', () => {
  it('generates Mantle tx URL', () => {
    const url = getExplorerUrl('mantle', 'tx', '0xdef456')
    expect(url).toBe('https://explorer.sepolia.mantle.xyz/tx/0xdef456')
  })

  it('generates Mantle address URL', () => {
    const url = getExplorerUrl('mantle', 'address', '0xabc123')
    expect(url).toBe('https://explorer.sepolia.mantle.xyz/address/0xabc123')
  })

  it('legacy chain keys still resolve to the Mantle explorer host', () => {
    expect(getExplorerUrl('qie', 'tx', '0xabc123')).toContain('explorer.sepolia.mantle.xyz')
    expect(getExplorerUrl('solana', 'tx', 'sig123')).toContain('explorer.sepolia.mantle.xyz')
    expect(getExplorerUrl('stellar', 'tx', 'txhash123')).toContain('explorer.sepolia.mantle.xyz')
  })
})

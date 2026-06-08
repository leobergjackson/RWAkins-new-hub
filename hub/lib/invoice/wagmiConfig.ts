import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { defineChain } from 'viem';

// Mantle Sepolia testnet (chain 5003) — the single chain Kubryx targets for
// The Turing Test Hackathon 2026. Gas token is MNT (not ETH).
export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia.mantle.xyz'] } },
  blockExplorers: { default: { name: 'Mantlescan', url: 'https://sepolia.mantlescan.xyz' } },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: 'Kubryx Invoice',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '1c33f21132b492329813589b910e5bd6',
  chains: [mantleSepolia],
  transports: {
    [mantleSepolia.id]: http(
      process.env.NEXT_PUBLIC_MANTLE_SEPOLIA_RPC_URL ?? 'https://rpc.sepolia.mantle.xyz'
    ),
  },
  ssr: true,
});

export const MANTLE_SEPOLIA_CHAIN_ID = 5003;
/** @deprecated Renamed during the Mantle migration. Kept so existing imports keep
 *  compiling; it now points at Mantle Sepolia (5003), not Mantle. */
export const ARBITRUM_SEPOLIA_CHAIN_ID = MANTLE_SEPOLIA_CHAIN_ID;

// Token + invoice contract addresses come from env. Fallbacks are intentionally the
// zero address (not a stale Mantle address) so a misconfig fails loudly on Mantle.
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;

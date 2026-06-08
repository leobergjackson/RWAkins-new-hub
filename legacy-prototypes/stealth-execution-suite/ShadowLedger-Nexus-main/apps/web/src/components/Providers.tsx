// Built by vsrupeshkumar
'use client';

import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '@/lib/trpc';
import superjson from 'superjson';
import { ConnectionProvider, WalletProvider } from '@arbitrum-sepolia/wallet-adapter-react';
import { WalletAdapterNetwork } from '@arbitrum-sepolia/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@arbitrum-sepolia/wallet-adapter-wallets';
import { WalletModalProvider } from '@arbitrum-sepolia/wallet-adapter-react-ui';
import { clusterApiUrl } from '@arbitrum-sepolia/web3.js';

// Default styles that can be overridden by your app
require('@arbitrum-sepolia/wallet-adapter-react-ui/styles.css');

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), []);
  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: '/trpc',
          }),
        ],
        transformer: superjson,
      }),
    []
  );

  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {children}
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

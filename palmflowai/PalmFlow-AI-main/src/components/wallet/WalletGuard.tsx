// Built by vsrupeshkumar
"use client";

import { useEffect, useRef } from 'react';
import { useWallet } from '@arbitrum-sepolia/wallet-adapter-react';
import { useRouter, usePathname } from 'next/navigation';

export const WalletGuard = () => {
  const { connected } = useWallet();
  const router = useRouter();
  const pathname = usePathname();
  const prevConnected = useRef(connected);

  useEffect(() => {
    const wasConnected = prevConnected.current;
    prevConnected.current = connected;

    // Disconnected while on a protected page → back to landing
    if (wasConnected && !connected && pathname !== '/') {
      router.push('/');
    }
  }, [connected, pathname, router]);

  return null;
};

// Built by vsrupeshkumar
"use client";

import React, { useEffect } from 'react';
import { useWallet } from '@arbitrum-sepolia/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/landing/LandingPage';

export default function Home() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected && publicKey) {
      router.push('/dashboard');
    }
  }, [connected, publicKey, router]);

  return (
    <div className="relative min-h-screen">
      <LandingPage />
    </div>
  );
}

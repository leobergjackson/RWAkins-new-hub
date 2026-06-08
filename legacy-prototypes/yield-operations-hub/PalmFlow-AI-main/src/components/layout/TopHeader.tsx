// Built by vsrupeshkumar
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@arbitrum-sepolia/wallet-adapter-react-ui';
import { Zap } from 'lucide-react';

export const TopHeader = () => {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-16 px-8 flex items-center justify-between neural-glass">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center transition-all group-hover:shadow-[0_0_16px_rgba(255,255,255,0.25)]">
          <Zap className="w-4 h-4 text-black fill-current" />
        </div>
        <div>
          <span className="text-sm font-semibold text-white tracking-tight">PalmFlow</span>
          <span className="text-xs text-white/30 ml-1.5 font-normal tracking-normal">AI</span>
        </div>
      </Link>

      {/* Right */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <span className="status-dot-active" />
          <span className="label-xs">Network Active</span>
        </div>
        <div className="wallet-adapter-wrap">
          {mounted && (
            <WalletMultiButton className="!bg-white !text-black !text-xs !font-semibold !h-9 !px-5 !rounded-xl !normal-case !tracking-tight hover:!shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all" />
          )}
        </div>
      </div>
    </header>
  );
};

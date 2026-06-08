// Built by vsrupeshkumar
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@arbitrum-sepolia/wallet-adapter-react';
import { WalletMultiButton } from '@arbitrum-sepolia/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, LayoutDashboard, Users, ShoppingCart, Shield, MessageSquare, Cpu, TrendingUp, BarChart3 } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Agents', href: '/agents', icon: Users },
  { name: 'Market', href: '/marketplace', icon: ShoppingCart },
  { name: 'Policy', href: '/policy', icon: Shield },
  { name: 'Yield', href: '/yield', icon: TrendingUp },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export const Navbar = () => {
  const { connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'py-4' : 'py-8'}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className={`flex items-center justify-between px-8 h-20 rounded-[2.5rem] transition-all duration-500 ${scrolled ? 'bg-black/40 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'bg-transparent'}`}>
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)] relative overflow-hidden">
              <Zap className="w-6 h-6 text-black fill-current relative z-10" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-tr from-accent-blue/20 via-transparent to-accent-purple/20"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-white uppercase leading-none italic">PalmFlow</span>
              <span className="text-[8px] font-black tracking-[0.4em] text-accent-blue uppercase leading-none mt-1">Neural Core</span>
            </div>
          </Link>

          <AnimatePresence>
            {connected && publicKey && (
              <motion.nav 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="hidden lg:flex items-center gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/5"
              >
                {navItems.map((item) => (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-white hover:bg-white/[0.05] transition-all"
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.name}
                  </Link>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-8">
            <div className="hidden xl:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">v4.2.0 Stable</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-neutral-600" />
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">H100 Node</span>
              </div>
            </div>
            
            <div className="wallet-adapter-wrap">
              {mounted && (
                <WalletMultiButton className="!btn-cinematic !btn-cinematic-primary !h-12 !px-8 !text-[10px] !font-black !uppercase !tracking-[0.2em] shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-all" />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

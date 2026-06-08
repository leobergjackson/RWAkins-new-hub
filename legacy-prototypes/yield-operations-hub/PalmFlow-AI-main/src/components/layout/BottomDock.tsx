// Built by vsrupeshkumar
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, MessageSquare, Users, ShoppingCart, Shield,
  History, CreditCard, Rocket, TrendingUp, Award, BarChart3, Cpu
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Chat',      href: '/chat',      icon: MessageSquare },
  { name: 'Workforce', href: '/agents',    icon: Users },
  { name: 'Market',    href: '/marketplace', icon: ShoppingCart },
  { name: 'Launchpad', href: '/launchpad', icon: Rocket },
  { name: 'Payroll',   href: '/payroll',   icon: CreditCard },
  { name: 'Laws',      href: '/policy',    icon: Shield },
  { name: 'Ledger',    href: '/history',   icon: History },
  { name: 'Yield',     href: '/yield',     icon: TrendingUp },
  { name: 'Repute',    href: '/reputation',icon: Award },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export const BottomDock = () => {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  if (pathname === '/') return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 130, delay: 0.1 }}
        className="flex items-center gap-1 px-3 py-2.5 rounded-2xl"
        style={{
          background: 'rgba(6, 8, 12, 0.92)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(48px)',
          WebkitBackdropFilter: 'blur(48px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => setHovered(item.name)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Tooltip */}
                <AnimatePresence>
                  {hovered === item.name && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.94 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white whitespace-nowrap pointer-events-none"
                      style={{
                        background: 'rgba(20,22,30,0.95)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      }}
                    >
                      {item.name}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[rgba(20,22,30,0.95)]" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <Link href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="relative flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-colors duration-200"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="dock-bg"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.09)' }}
                        transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
                      />
                    )}
                    <item.icon
                      className="w-[17px] h-[17px] relative z-10 transition-all duration-200"
                      style={{
                        color: isActive ? '#fff' : hovered === item.name ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.28)',
                      }}
                    />
                    {isActive && (
                      <motion.div
                        layoutId="dock-dot"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ background: 'var(--accent-cyan)' }}
                        transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
                      />
                    )}
                  </motion.div>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Separator + Neural OS badge */}
        <div className="flex items-center gap-2.5 pl-2.5 ml-1 border-l border-white/[0.05]">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-semibold text-white/40 leading-none">Neural OS</span>
            <span className="text-[8px] text-white/20 leading-none mt-0.5">v4.2.0</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.05] flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-pointer group">
            <Cpu className="w-3.5 h-3.5 text-white/25 group-hover:text-[color:var(--accent-cyan)] transition-colors" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

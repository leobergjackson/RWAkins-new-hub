// Built by vsrupeshkumar
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WalletMultiButton } from '@arbitrum-sepolia/wallet-adapter-react-ui';
import { 
  LayoutDashboard, 
  Wallet, 
  Users, 
  Cpu, 
  ShieldCheck, 
  BarChart3, 
  RefreshCcw, 
  Settings,
  Activity
} from 'lucide-react';

const navItems = [
  { name: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Treasury', icon: Wallet, href: '/dashboard/treasury' },
  { name: 'Payroll', icon: Users, href: '/dashboard/payroll' },
  { name: 'AI Agents', icon: Cpu, href: '/dashboard/agents' },
  { name: 'Risk Engine', icon: ShieldCheck, href: '/dashboard/risk' },
  { name: 'Simulations', icon: BarChart3, href: '/dashboard/simulations' },
  { name: 'Private Swaps', icon: RefreshCcw, href: '/dashboard/swaps' },
  { name: 'Analytics', icon: Activity, href: '/dashboard/analytics' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-6 top-1/2 -translate-y-1/2 w-20 flex flex-col items-center py-8 glass rounded-3xl z-50 transition-all duration-300 hover:w-64 group">
      <div className="mb-12">
        <div className="w-10 h-10 rounded-xl bg-cyan-glow neo-glow-cyan flex items-center justify-center">
          <ShieldCheck className="text-black" size={24} />
        </div>
      </div>
      
      <nav className="flex flex-col gap-6 w-full px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group-hover:px-4",
                isActive 
                  ? "bg-cyan-glow/10 text-cyan-glow" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={24} className="shrink-0" />
              <span className="hidden group-hover:block whitespace-nowrap font-medium text-sm">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8 border-t border-white/5 w-full px-4">
        <button className="flex items-center gap-4 p-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-white transition-all w-full group-hover:px-4 mb-4">
          <Settings size={24} className="shrink-0" />
          <span className="hidden group-hover:block text-sm font-medium">Settings</span>
        </button>
        <div className="hidden group-hover:block">
          <WalletMultiButton className="!bg-cyan-glow !text-black !font-bold !rounded-xl !w-full !justify-center !h-12 !transition-all hover:!scale-[1.02] !text-sm" />
        </div>
      </div>
    </aside>
  );
}

'use client';

import { useState, useEffect } from 'react';
import DashboardPage from '@/app/dashboard/page';
import { LayoutDashboard, Wrench } from 'lucide-react';

export default function ExtensionSPA() {
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden font-sans">
      {/* Chrome Extension Nav Bar */}
      <nav className="flex items-center gap-2 p-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <a
          href="#dashboard"
          onClick={(e) => { e.preventDefault(); window.location.hash = 'dashboard'; }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
        >
          <LayoutDashboard size={14} /> Dashboard
        </a>
        <a
          href="#tools"
          onClick={(e) => { e.preventDefault(); window.location.hash = 'tools'; }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'tools' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
        >
          <Wrench size={14} /> Tools
        </a>
      </nav>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 relative">
        <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none', minHeight: '100%' }}>
           <DashboardPage />
        </div>
        <div style={{ display: activeTab === 'tools' ? 'block' : 'none' }} className="p-8">
           <h3 className="text-lg font-bold text-slate-900 mb-2">Other Tools</h3>
           <p className="text-slate-500 text-sm">Credit Passport, Family Vault, AI Lending, Agent Council — accessible from the main dashboard.</p>
        </div>
      </div>
    </div>
  );
}

// Built by vsrupeshkumar
import React from 'react';
import { Sidebar } from './Sidebar';
import { Copilot } from './Copilot';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-cyan-glow/30">
      <Sidebar />
      <main className="pl-32 pr-8 py-8 min-h-screen relative">
        {/* Background Ambient Glows */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-cyan-glow/5 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-glow/5 rounded-full blur-[150px] pointer-events-none -z-10" />
        
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <Copilot />
    </div>
  );
}

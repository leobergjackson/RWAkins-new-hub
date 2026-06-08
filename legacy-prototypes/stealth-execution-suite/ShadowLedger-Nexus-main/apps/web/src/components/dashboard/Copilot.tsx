// Built by vsrupeshkumar
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Sparkles, X, Loader2, Cpu } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { socket } from '@/lib/socket';

export function Copilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: 'Stealth Executive Suite Copilot initialized. How can I assist with your invisible operations today?' }
  ]);
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const executeMutation = trpc.executeAiInstruction.useMutation();

  useEffect(() => {
    socket.connect();
    socket.emit('subscribe_logs', 'default-org');

    socket.on('agent_log', (log) => {
      setLiveLogs(prev => [log, ...prev].slice(0, 50));
      if (log.agent !== 'ORCHESTRATOR') {
        // Optionally add to chat if it's a significant update
      }
    });

    return () => {
      socket.off('agent_log');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || executeMutation.isLoading) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    try {
      const response = await executeMutation.mutateAsync({ 
        orgId: 'default-org', 
        instruction: userMsg.content 
      });

      if (response.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Orchestration complete: ${response.primaryAction}`,
          details: response
        }]);
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message || 'Orchestrator failed.'}` 
      }]);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-4">
      {/* Live Agent Logs Bubble */}
      <AnimatePresence>
        {isOpen && liveLogs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="mb-2 w-80 glass-dark p-4 rounded-2xl border border-cyan-glow/20 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
              <div className="w-2 h-2 rounded-full bg-cyan-glow animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest text-cyan-glow">LIVE AGENT TELEMETRY</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
              {liveLogs.map((log, i) => (
                <div key={i} className="flex gap-2 text-[10px] animate-in fade-in slide-in-from-right-2">
                  <span className="text-cyan-glow font-bold shrink-0">[{log.agent}]</span>
                  <span className="text-white/70">{log.message}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-96 glass-dark rounded-3xl border-white/10 overflow-hidden shadow-2xl flex flex-col h-[600px]"
          >
            <div className="p-4 bg-cyan-glow/10 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-glow" />
                <span className="font-bold text-sm tracking-tight">AI COMMAND ORCHESTRATOR</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m: any, i: number) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-cyan-glow text-black font-medium shadow-lg shadow-cyan-glow/20' 
                      : 'bg-white/5 text-white/90 border border-white/5'
                  }`}>
                    {m.content}
                  </div>
                  {m.details && (
                    <div className="mt-2 space-y-2 w-[95%]">
                      <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Risk Assessment</span>
                          <span className="text-[10px] text-emerald-glow font-mono">CONFIDENCE: {m.details.agentExecutions[0]?.confidence}%</span>
                        </div>
                        <p className="text-[11px] text-white/70 italic">"{m.details.riskAssessment}"</p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-1">
                        {m.details.agentExecutions.map((exec: any, idx: number) => (
                          <div key={idx} className="bg-white/5 p-2 rounded-lg border border-white/5 flex items-center gap-3">
                            <Cpu size={12} className="text-cyan-glow" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-white/90 uppercase">{exec.agentType}</p>
                              <p className="text-[9px] text-muted-foreground truncate">{exec.decision}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-white/5">
              <div className="relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Issue organizational command..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-cyan-glow/50 transition-all placeholder:text-white/20"
                />
                <button 
                  onClick={handleSend}
                  disabled={executeMutation.isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-cyan-glow hover:bg-cyan-glow/10 rounded-lg transition-all disabled:opacity-50"
                >
                  {executeMutation.isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-2xl bg-cyan-glow text-black neo-glow-cyan flex items-center justify-center hover:scale-110 transition-all active:scale-95 shadow-2xl"
      >
        <MessageSquare size={28} />
      </button>
    </div>
  );
}

// Built by vsrupeshkumar
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Send, X, Command as CommandIcon, Loader2 } from 'lucide-react';

export const CommandBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    const currentInput = input;
    setInput('');

    try {
      const res = await fetch('/api/command/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentInput }),
      });
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.message || 'Workflow initiated successfully.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Neural link failed. Please try again.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="w-full max-w-2xl glass-panel rounded-[2.5rem] overflow-hidden border-white/10 shadow-[0_0_100px_-20px_rgba(0,242,255,0.2)]"
            >
              <div className="p-6 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                    <Terminal className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Neural Link</span>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Secure AI Interface</div>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 max-h-[45vh] overflow-y-auto space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-brand-primary/5 flex items-center justify-center mx-auto border border-brand-primary/10 animate-pulse">
                      <CommandIcon className="w-8 h-8 text-brand-primary/40" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-slate-400 text-sm font-bold tracking-tight">Connect your consciousness to the Treasury...</div>
                      <div className="text-[10px] text-slate-700 font-black uppercase tracking-[0.2em]">Ready for multi-agent orchestration</div>
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] px-6 py-4 rounded-[1.5rem] text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-white text-neural-dark font-bold shadow-xl' 
                        : 'bg-white/[0.03] border border-white/10 text-slate-300'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-brand-primary/5 border border-brand-primary/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />
                      <span className="text-[10px] text-brand-primary font-black uppercase tracking-[0.2em]">Syncing Neural Paths...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white/[0.03] border-t border-white/5 flex items-center gap-4">
                <input 
                  autoFocus
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Initiate financial workflow..."
                  className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-slate-600 text-sm font-medium"
                />
                <button 
                  onClick={handleSend}
                  disabled={isProcessing}
                  className="w-12 h-12 rounded-xl bg-brand-primary text-neural-dark flex items-center justify-center hover:scale-110 hover:neural-glow transition-all duration-300 disabled:opacity-50 active:scale-95 shadow-lg shadow-brand-primary/20"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-10 right-10 z-[90] w-16 h-16 rounded-2xl glass-panel flex items-center justify-center text-brand-primary border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] group overflow-hidden"
      >
        <div className="absolute inset-0 bg-brand-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CommandIcon className="w-7 h-7 relative z-10 group-hover:rotate-12 transition-transform duration-500" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary rounded-full animate-ping opacity-30" />
      </motion.button>
    </>
  );
};

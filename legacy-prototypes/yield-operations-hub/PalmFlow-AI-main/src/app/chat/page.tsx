// Built by vsrupeshkumar
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, Zap, Loader2, Bot,
  TrendingUp, Users, DollarSign, Activity
} from 'lucide-react';

type Message = { role: 'user' | 'ai'; content: string; ts: Date };

const suggestions = [
  { icon: DollarSign, label: 'What is the current treasury balance?' },
  { icon: Users,      label: 'How many agents are active right now?' },
  { icon: TrendingUp, label: 'Show me the latest PnL across all agents' },
  { icon: Activity,   label: 'What are the recent transactions?' },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || isProcessing) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, ts: new Date() }]);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/command/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: msg }),
      });
      const data = await res.json();
      const reply = res.ok
        ? (data.message || 'Command processed.')
        : 'Neural core error — please try again.';
      setMessages(prev => [...prev, { role: 'ai', content: reply, ts: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Neural path disrupted. Re-establishing link...', ts: new Date() }]);
    } finally {
      setIsProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    /* Fixed between TopHeader (64px) and BottomDock (~84px from bottom) */
    <div className="fixed inset-x-0 top-16 bottom-[100px] flex flex-col max-w-3xl mx-auto px-6">

      {/* ── Empty state ── */}
      <AnimatePresence>
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.35 }}
            className="flex-1 flex flex-col items-center justify-center gap-10 px-4"
          >
            {/* Icon */}
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                  <Sparkles className="w-8 h-8 text-black fill-current" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-2xl bg-white/20 blur-xl -z-10"
                />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-white tracking-tight">PalmFlow Core</h2>
                <p className="text-sm text-white/35 mt-1.5 font-normal">Ask anything about your autonomous treasury</p>
              </div>
            </div>

            {/* Suggestion chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => send(s.label)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all duration-200 group"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  }}
                >
                  <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0 group-hover:bg-white/[0.09] transition-colors">
                    <s.icon className="w-4 h-4 text-white/50 group-hover:text-white/70 transition-colors" />
                  </div>
                  <span className="text-[13px] font-medium text-white/50 group-hover:text-white/75 transition-colors leading-snug">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Message list ── */}
      {!isEmpty && (
        <div className="flex-1 overflow-y-auto py-8 px-2 space-y-6 custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_16px_rgba(255,255,255,0.12)]">
                    <Bot className="w-4 h-4 text-black" />
                  </div>
                )}

                <div className={`max-w-[78%] flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed font-normal ${
                      msg.role === 'user'
                        ? 'text-white rounded-br-sm'
                        : 'text-white/85 rounded-bl-sm'
                    }`}
                    style={
                      msg.role === 'user'
                        ? {
                            background: 'rgba(99,102,241,0.85)',
                            border: '1px solid rgba(99,102,241,0.6)',
                            boxShadow: '0 4px 24px rgba(99,102,241,0.2)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.07)',
                          }
                    }
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-white/20 px-1">
                    {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-white/50" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="flex gap-3 justify-start"
              >
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,255,255,0.12)]">
                  <Loader2 className="w-4 h-4 text-black animate-spin" />
                </div>
                <div
                  className="px-5 py-4 rounded-2xl rounded-bl-sm flex items-center gap-2"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {[0, 0.18, 0.36].map((delay, i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay, ease: 'easeInOut' }}
                      className="w-1.5 h-1.5 rounded-full bg-white/30"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="pt-3 pb-2">
        <div
          className="flex items-end gap-3 px-4 py-3 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocusCapture={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(255,255,255,0.04)';
          }}
          onBlurCapture={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.09)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0)';
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
            }}
            onKeyDown={handleKey}
            placeholder="Ask anything about your treasury…"
            disabled={isProcessing}
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/25 font-normal resize-none outline-none leading-relaxed py-1 min-h-[26px] max-h-[140px] overflow-y-auto custom-scrollbar disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isProcessing}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-25"
            style={{ background: 'rgba(255,255,255,0.9)' }}
            onMouseEnter={e => {
              if (!isProcessing && input.trim()) {
                (e.currentTarget as HTMLElement).style.background = '#fff';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(255,255,255,0.25)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.9)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <Send className="w-4 h-4 text-black" />
          </button>
        </div>
        <p className="text-center text-[10px] text-white/15 mt-2.5 font-normal">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

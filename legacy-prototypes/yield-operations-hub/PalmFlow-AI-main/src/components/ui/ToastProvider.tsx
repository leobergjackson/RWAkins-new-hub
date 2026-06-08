// Built by vsrupeshkumar
"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, type }],
    })),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const useToast = () => {
  const addToast = useToastStore((s) => s.addToast);
  return { addToast };
};

const iconMap = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  error: <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
  info: <Info className="w-4 h-4 text-accent-cyan shrink-0" />,
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 180 }}
      className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
      style={{
        background: 'rgba(5,5,10,0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        minWidth: '260px',
        maxWidth: '380px',
      }}
    >
      {iconMap[toast.type]}
      <span className="text-sm font-medium text-white flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-white/20 hover:text-white/60 transition-colors shrink-0 ml-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export function ToastProvider() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed top-24 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

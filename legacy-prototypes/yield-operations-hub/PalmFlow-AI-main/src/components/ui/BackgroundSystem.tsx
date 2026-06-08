// Built by vsrupeshkumar
"use client";

import React from 'react';
import { motion } from 'framer-motion';

export const BackgroundSystem = () => {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden" style={{ background: '#080a0f' }}>
      {/* Grid */}
      <div className="absolute inset-0 grid-bg opacity-100" />

      {/* Glow 1 — top left */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-20%] left-[-10%] w-[65%] h-[65%] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,229,204,0.08) 0%, transparent 70%)' }}
      />

      {/* Glow 2 — bottom right */}
      <motion.div
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-20%] right-[-10%] w-[65%] h-[65%] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }}
      />

      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(8,10,15,0.85) 100%)' }} />
    </div>

  );
};


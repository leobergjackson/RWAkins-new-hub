// Built by vsrupeshkumar
"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface HolographicCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const HolographicCard = ({ children, className = "", delay = 0 }: HolographicCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`holographic-card p-8 group ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-50" />
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Interactive Border Glow */}
      <div className="absolute inset-px rounded-[2.5rem] bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </motion.div>
  );
};

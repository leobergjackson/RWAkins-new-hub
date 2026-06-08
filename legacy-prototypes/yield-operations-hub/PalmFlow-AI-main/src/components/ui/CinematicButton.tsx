// Built by vsrupeshkumar
"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface CinematicButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline';
  className?: string;
}

export const CinematicButton = ({ children, onClick, variant = 'primary', className = "" }: CinematicButtonProps) => {
  const baseStyles = "btn-cinematic";
  const variantStyles = variant === 'primary' ? "btn-cinematic-primary" : "btn-cinematic-outline";

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      {variant === 'primary' && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-accent-blue/20 via-white/5 to-accent-purple/20 opacity-0 hover:opacity-100 transition-opacity"
          initial={false}
        />
      )}
    </motion.button>
  );
};

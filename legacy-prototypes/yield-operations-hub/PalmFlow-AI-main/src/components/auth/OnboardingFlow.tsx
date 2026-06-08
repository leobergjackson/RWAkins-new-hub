// Built by vsrupeshkumar
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Zap, Shield, Sparkles } from 'lucide-react';

export const OnboardingFlow = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step < 3) {
        setStep(step + 1);
      } else {
        onComplete();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [step, onComplete]);

  const steps = [
    { icon: Zap, text: "Establishing Neural Link..." },
    { icon: Shield, text: "Decrypting Operating System..." },
    { icon: Sparkles, text: "Synchronizing AI Agents..." },
    { icon: Loader2, text: "Finalizing Workspace..." },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6"
    >
      <div className="absolute inset-0 noise-bg opacity-[0.03]" />
      
      <div className="relative z-10 flex flex-col items-center gap-10">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center text-black shadow-[0_0_50px_rgba(255,255,255,0.3)]"
        >
          {React.createElement(steps[step].icon, { 
            className: `w-10 h-10 ${step === 3 ? 'animate-spin' : ''}` 
          })}
        </motion.div>
        
        <div className="text-center space-y-4">
          <motion.h2
            key={steps[step].text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black text-white uppercase tracking-tighter"
          >
            {steps[step].text}
          </motion.h2>
          <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: `${(step + 1) * 25}%` }}
              className="h-full bg-white shadow-[0_0_10px_white]"
            />
          </div>
        </div>
      </div>
      
      {/* Background Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-accent-blue/10 blur-[150px] rounded-full" />
    </motion.div>
  );
};

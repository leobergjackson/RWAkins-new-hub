'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X } from 'lucide-react'

interface FeatureOverviewPanelProps {
  title: string
  whatItIs: string
  whyUseIt: string
  whyEfficient: string
  whyBest: string
  themeColor?: string
}

export default function FeatureOverviewPanel({
  title,
  whatItIs,
  whyUseIt,
  whyEfficient,
  whyBest,
  themeColor = '#F5A623'
}: FeatureOverviewPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="feature-overview-btn"
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: 9999,
          background: themeColor,
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 32px ${themeColor}60`,
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
        title="View Technical Overview"
      >
        <Info size={28} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              bottom: '20px',
              width: '400px',
              maxWidth: 'calc(100vw - 40px)',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              borderRadius: '24px',
              boxShadow: `0 20px 60px rgba(0,0,0,0.1), 0 0 0 1px ${themeColor}30`,
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <div style={{
              padding: '24px',
              borderBottom: `1px solid ${themeColor}20`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: themeColor, marginBottom: '4px' }}>
                  Technical Architecture
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1A1025', margin: 0, fontFamily: "'Syne', sans-serif" }}>
                  {title}
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(0,0,0,0.4)',
                  padding: '4px',
                  display: 'flex'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <Section title="What it is for" icon="◈" content={whatItIs} color={themeColor} />
              <Section title="Why users use it" icon="⚡" content={whyUseIt} color={themeColor} />
              <Section title="Why it is efficient" icon="⚡" content={whyEfficient} color={themeColor} />
              <Section title="Why it is the best" icon="✦" content={whyBest} color={themeColor} />
            </div>
            
            <div style={{ padding: '16px 24px', background: `${themeColor}10`, fontSize: '12px', color: `${themeColor}`, fontWeight: 600, textAlign: 'center' }}>
              Kubryx OS Hackathon Submission
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Section({ title, icon, content, color }: { title: string, icon: string, content: string, color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ color }}>{icon}</span>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1A1025', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ 
        fontSize: '14px', 
        lineHeight: 1.6, 
        color: 'rgba(26, 16, 37, 0.75)',
      }} dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  )
}

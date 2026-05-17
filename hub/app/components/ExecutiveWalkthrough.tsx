'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCrossToolIntelligence, updateIntelligenceState, SHOWCASE_FLOW } from '../../lib/cross-tool-intelligence'

export default function ExecutiveWalkthrough() {
  const router = useRouter()
  const { demoActive, demoStep } = useCrossToolIntelligence()
  const [autoAdvance, setAutoAdvance] = useState(false)

  // Auto-advance step every 10 seconds when enabled
  useEffect(() => {
    if (!demoActive || !autoAdvance) return
    const interval = setInterval(() => {
      handleNext()
    }, 10000)
    return () => clearInterval(interval)
  }, [demoActive, demoStep, autoAdvance])

  // Support Arrow keys and Escape key controls
  useEffect(() => {
    if (!demoActive) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        handleExit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [demoActive, demoStep])

  function handleStart() {
    updateIntelligenceState(() => ({ demoActive: true, demoStep: 0 }))
    router.push(SHOWCASE_FLOW[0].route)
  }

  function handleExit() {
    updateIntelligenceState(() => ({ demoActive: false }))
    setAutoAdvance(false)
  }

  function handleNext() {
    if (demoStep < SHOWCASE_FLOW.length - 1) {
      const nextIndex = demoStep + 1
      updateIntelligenceState(() => ({ demoStep: nextIndex }))
      router.push(SHOWCASE_FLOW[nextIndex].route)
    } else {
      handleExit()
    }
  }

  function handlePrev() {
    if (demoStep > 0) {
      const prevIndex = demoStep - 1
      updateIntelligenceState(() => ({ demoStep: prevIndex }))
      router.push(SHOWCASE_FLOW[prevIndex].route)
    }
  }

  if (!demoActive) {
    return (
      <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 9999 }}>
        <button
          onClick={handleStart}
          className="btn-gold"
          aria-label="Start Executive Walkthrough Showcase"
          style={{
            padding: '8px 16px',
            fontSize: 12,
            background: 'linear-gradient(135deg, #F5C518, #E2B20F)',
            color: '#000',
            fontWeight: 700,
            border: 'none',
            borderRadius: 20,
            boxShadow: '0 4px 15px rgba(245, 197, 24, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>🏆</span> Executive Demo Mode
        </button>
      </div>
    )
  }

  const step = SHOWCASE_FLOW[demoStep]

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 99997,
        background: '#070707',
        borderBottom: '2px solid #F5C518',
        boxShadow: '0 4px 20px rgba(0,0,0,0.9), 0 0 10px rgba(245,197,24,0.1)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        animation: 'slideDown 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 280 }}>
        <span 
          style={{ 
            fontSize: 11, 
            background: '#F5C518', 
            color: '#000', 
            padding: '4px 10px', 
            borderRadius: 4, 
            fontWeight: 800, 
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}
        >
          Executive Demo ({demoStep + 1}/6)
        </span>
        <div>
          <h4 style={{ margin: 0, fontSize: 14, color: '#fff', fontWeight: 700 }}>
            {step.title}
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ccc', lineHeight: 1.3 }}>
            {step.instructions}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#888', fontStyle: 'italic', maxWidth: 220, display: 'inline-block' }}>
          {step.tip}
        </span>
        
        <button
          onClick={() => setAutoAdvance(!autoAdvance)}
          className="btn-outline"
          style={{
            padding: '6px 12px',
            fontSize: 11,
            borderColor: autoAdvance ? '#F5C518' : 'rgba(255,255,255,0.15)',
            color: autoAdvance ? '#F5C518' : '#aaa',
            background: autoAdvance ? 'rgba(245,197,24,0.05)' : '#000'
          }}
        >
          {autoAdvance ? '⏱ Auto: ON (10s)' : '⏱ Auto-Advance'}
        </button>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handlePrev}
            disabled={demoStep === 0}
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: 11, opacity: demoStep === 0 ? 0.3 : 1 }}
          >
            ◀ Back
          </button>
          
          <button
            onClick={handleNext}
            className="btn-gold"
            style={{ 
              padding: '6px 14px', 
              fontSize: 11, 
              background: '#F5C518', 
              color: '#000',
              fontWeight: 600,
              border: 'none',
              borderRadius: 4
            }}
          >
            {demoStep === SHOWCASE_FLOW.length - 1 ? 'Exit Tour' : 'Next Step ▶'}
          </button>

          <button
            onClick={handleExit}
            style={{
              background: 'none',
              border: 'none',
              color: '#EF4444',
              fontSize: 11,
              cursor: 'pointer',
              marginLeft: 8,
              padding: 4
            }}
            aria-label="Close presentation showcase"
          >
            Cancel
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        /* Make space for the top demo bar if active */
        body {
          padding-top: ${demoActive ? '65px' : '0px'} !important;
          transition: padding-top 0.3s ease;
        }
      `}</style>
    </div>
  )
}

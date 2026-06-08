'use client';

import { useEffect, useRef } from 'react';
import { Shield, TrendingUp, Split, Zap, Lock, Bot, Heart, EyeOff, X, ArrowRight } from 'lucide-react';
import { EcoTool } from '@/lib/invoice/ecosystemTools';
import Link from 'next/link';

const ICON_MAP: Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Shield, TrendingUp, Split, Zap, Lock, Bot, Heart, EyeOff,
};

interface Props {
  tool: EcoTool | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoiceEcosystemPanel({ tool, isOpen, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const IconComp = tool ? ICON_MAP[tool.icon] : null;

  return (
    <>
      {/* Dim backdrop */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 38,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
          onClick={onClose}
        />
      )}

      {/* ── Desktop panel ── */}
      <div
        ref={panelRef}
        className="hidden md:flex"
        style={{
          position: 'fixed',
          top: 16, right: 16, bottom: 16,
          width: 310,
          zIndex: 45,
          flexDirection: 'column',
          background: '#111',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          transform: isOpen ? 'translateX(0) scale(1)' : 'translateX(20px) scale(0.96)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {tool && <PanelBody tool={tool} onClose={onClose} IconComp={IconComp} />}
      </div>

      {/* ── Mobile: slides up ── */}
      <div
        className="flex md:hidden"
        style={{
          position: 'fixed',
          bottom: 56, left: 8, right: 8,
          zIndex: 45,
          flexDirection: 'column',
          background: '#111',
          borderRadius: '14px 14px 10px 10px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.5)',
          maxHeight: '62vh',
          transform: isOpen ? 'translateY(0)' : 'translateY(calc(100% + 64px))',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.28s cubic-bezier(0.34,1.2,0.64,1), opacity 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {tool && <PanelBody tool={tool} onClose={onClose} IconComp={IconComp} />}
      </div>
    </>
  );
}

function PanelBody({
  tool,
  onClose,
  IconComp,
}: {
  tool: EcoTool;
  onClose: () => void;
  IconComp: React.FC<{ size?: number; color?: string; strokeWidth?: number }> | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '14px 14px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: `${tool.color}18`,
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              {IconComp && <IconComp size={17} color={tool.color} strokeWidth={2} />}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                {tool.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                {tool.tagline}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'rgba(255,255,255,0.06)',
              border: 'none', display: 'grid', placeItems: 'center',
              cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'}
            onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}
          >
            <X size={12} strokeWidth={2.5} color="rgba(255,255,255,0.5)" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Title + description */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            {tool.previewTitle}
          </h3>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            {tool.previewDesc}
          </p>
        </div>

        {/* Stats chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          {tool.stats.map(stat => (
            <div key={stat.label} style={{
              flex: 1, background: `${tool.color}0f`,
              borderRadius: 8, padding: '7px 5px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: tool.color, marginBottom: 2 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Connects line */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 12px',
          background: `${tool.color}0a`,
          borderRadius: 9,
          borderLeft: `2px solid ${tool.color}`,
        }}>
          <ArrowRight size={12} color={tool.color} strokeWidth={2.5} style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: tool.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
              Connects to invoices
            </div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.45 }}>
              {tool.connects}
            </p>
          </div>
        </div>
      </div>

      {/* Footer — internal navigation */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <Link
          href={tool.href}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', padding: '10px 0', borderRadius: 9,
            background: tool.color, color: '#000',
            fontWeight: 700, fontSize: 13, textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
          onMouseOver={e => (e.currentTarget as HTMLElement).style.opacity = '0.88'}
          onMouseOut={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        >
          Open {tool.name}
          <ArrowRight size={13} strokeWidth={2.5} />
        </Link>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: '8px 0 0', letterSpacing: '0.04em' }}>
          Lives inside Kubryx · same app
        </p>
      </div>
    </div>
  );
}

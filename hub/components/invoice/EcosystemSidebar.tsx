'use client';

import { useEffect, useState } from 'react';
import { Shield, TrendingUp, Split, Zap, Lock, Bot, Heart, EyeOff } from 'lucide-react';
import { ECO_TOOLS } from '@/lib/invoice/ecosystemTools';

const ICON_MAP: Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Shield, TrendingUp, Split, Zap, Lock, Bot, Heart, EyeOff,
};

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function InvoiceEcosystemSidebar({ selectedId, onSelect }: Props) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <>
      {/* ── Desktop: slim left bar ── */}
      <aside
        className="hidden md:flex"
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 52,
          zIndex: 40,
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgba(8,8,8,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        {/* Kubryx K logo */}
        <a
          href="/"
          title="Kubryx"
          style={{ display: 'block', marginBottom: 10, textDecoration: 'none' }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #3B5BFA, #8B5CF6)',
            display: 'grid', placeItems: 'center',
            fontSize: 13, fontWeight: 900, color: '#fff',
          }}>
            K
          </div>
        </a>

        {/* Divider */}
        <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 8 }} />

        {/* Tool icons */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 2,
          width: '100%', padding: '0 6px',
        }}>
          {ECO_TOOLS.map(tool => {
            const IconComp = ICON_MAP[tool.icon];
            const isActive = selectedId === tool.id;
            return (
              <div key={tool.id} style={{ position: 'relative', width: '100%' }}>
                <button
                  onClick={() => onSelect(tool.id)}
                  onMouseEnter={() => setTooltip(tool.id)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    width: '100%', height: 38,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8,
                    background: isActive ? `${tool.color}20` : 'transparent',
                    border: 'none', cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseOut={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {IconComp && (
                    <IconComp
                      size={16}
                      color={isActive ? tool.color : 'rgba(255,255,255,0.4)'}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                  )}
                  {/* Active left bar */}
                  {isActive && (
                    <span style={{
                      position: 'absolute', left: 0, top: '20%', bottom: '20%',
                      width: 2, borderRadius: 2, background: tool.color,
                    }} />
                  )}
                  {/* Color dot */}
                  <span style={{
                    position: 'absolute', top: 5, right: 5,
                    width: 4, height: 4, borderRadius: '50%',
                    background: tool.color, opacity: isActive ? 1 : 0.5,
                  }} />
                </button>

                {/* Tooltip */}
                {tooltip === tool.id && (
                  <div style={{
                    position: 'absolute',
                    left: 'calc(100% + 10px)', top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 11, fontWeight: 600,
                    padding: '5px 10px', borderRadius: 6,
                    whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 60,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}>
                    {tool.name}
                    <span style={{
                      position: 'absolute', right: '100%', top: '50%',
                      transform: 'translateY(-50%)',
                      borderTop: '4px solid transparent',
                      borderBottom: '4px solid transparent',
                      borderRight: '5px solid #1a1a1a',
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Mobile: bottom bar ── */}
      <div
        className="flex md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 56,
          zIndex: 40,
          background: 'rgba(8,8,8,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          alignItems: 'center', justifyContent: 'space-around',
          padding: '0 4px',
        }}
      >
        {ECO_TOOLS.map(tool => {
          const IconComp = ICON_MAP[tool.icon];
          const isActive = selectedId === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onSelect(tool.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', width: 36, height: 44, borderRadius: 8,
                background: isActive ? `${tool.color}20` : 'transparent',
                border: 'none', cursor: 'pointer',
              }}
            >
              {IconComp && (
                <IconComp size={16}
                  color={isActive ? tool.color : 'rgba(255,255,255,0.35)'}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              )}
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 4, height: 4, borderRadius: '50%',
                background: tool.color, opacity: 0.7,
              }} />
            </button>
          );
        })}
      </div>
    </>
  );
}

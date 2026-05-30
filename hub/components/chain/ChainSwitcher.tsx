// Built by vsrupeshkumar
// Reusable chain selector backed by ChainPreferenceContext.
//
//   <ChainSwitcher />                       → controls the global default chain
//   <ChainSwitcher toolId="lend" />         → controls a per-tool override, with a
//                                             "Use default" option that clears it
//
// Lists every selectable chain from the central networks catalog, so adding a chain
// there automatically surfaces it here.
'use client'

import { useEffect, useRef, useState } from 'react'
import { getSelectableChains, NETWORKS, type NetworkKey } from '@/lib/networks'
import { useChainPreference } from '@/context/ChainPreferenceContext'

type Theme = 'light' | 'dark'

interface Props {
  /** When set, this switcher controls a per-tool override instead of the global default. */
  toolId?: string
  theme?: Theme
  /** Compact pill (icon + short name only). */
  compact?: boolean
}

const MONO = '"Fira Code","JetBrains Mono",monospace'

function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0,
    }} />
  )
}

export default function ChainSwitcher({ toolId, theme = 'dark', compact = false }: Props) {
  const { globalChain, setGlobalChain, resolveChain, setToolChain, hasOverride } = useChainPreference()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isLight = theme === 'light'
  const isTool = Boolean(toolId)
  const activeKey: NetworkKey = isTool ? resolveChain(toolId) : globalChain
  const active = NETWORKS[activeKey]
  const usingOverride = isTool && hasOverride(toolId!)

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const select = (key: NetworkKey) => {
    if (isTool) setToolChain(toolId!, key)
    else setGlobalChain(key)
    setOpen(false)
  }

  const clearOverride = () => {
    if (isTool) setToolChain(toolId!, null)
    setOpen(false)
  }

  const bg = isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)'
  const border = isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.1)'
  const textCol = isLight ? '#0A0F2E' : '#fff'
  const subCol = isLight ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.45)'
  const menuBg = isLight ? '#FFFFFF' : '#0C0C0C'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title={isTool ? `Chain for this tool — ${active.name}` : `Default chain — ${active.name}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: compact ? '5px 9px' : '6px 11px',
          borderRadius: 9,
          border: `1px solid ${usingOverride ? active.color + '66' : border}`,
          background: bg,
          color: textCol,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        <Dot color={active.color} />
        <span style={{ whiteSpace: 'nowrap' }}>{active.shortName}</span>
        {!compact && usingOverride && (
          <span style={{ fontSize: 9, color: active.color, fontWeight: 700, letterSpacing: '0.06em' }}>•</span>
        )}
        <span style={{ fontSize: 9, color: subCol, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          minWidth: 224, zIndex: 200,
          background: menuBg, border: `1px solid ${border}`,
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 20px 44px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            padding: '9px 13px', borderBottom: `1px solid ${border}`,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
            color: subCol, textTransform: 'uppercase',
          }}>
            {isTool ? 'Chain for this tool' : 'Default chain'}
          </div>

          {isTool && (
            <button
              onClick={clearOverride}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 13px', background: 'transparent', border: 'none',
                borderBottom: `1px solid ${border}`,
                cursor: 'pointer', textAlign: 'left',
                color: !usingOverride ? active.color : textCol,
                fontSize: 12, fontWeight: 600,
              }}
            >
              <span style={{ width: 8 }}>{!usingOverride ? '✓' : ''}</span>
              Use default ({NETWORKS[globalChain].shortName})
            </button>
          )}

          {getSelectableChains().map(c => {
            const selected = c.key === activeKey && (!isTool || usingOverride)
            return (
              <button
                key={c.key}
                onClick={() => select(c.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 13px', background: selected ? `${c.color}14` : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  color: textCol,
                }}
                onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Dot color={c.color} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, display: 'block' }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: subCol, fontFamily: MONO }}>
                    {c.currency.symbol} · {c.type.toUpperCase()}
                  </span>
                </span>
                {selected && <span style={{ color: c.color, fontSize: 12 }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Built by vsrupeshkumar
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, X, Menu } from 'lucide-react'

const NAV_LINKS = ['Platform', 'Tools', 'Chains', 'Company']

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <header style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        top: scrolled ? 14 : 22,
        width: 'min(960px, calc(100% - 24px))',
        zIndex: 80,
        transition: 'top 0.3s ease',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          borderRadius: 999,
          padding: '8px 8px 8px 16px',
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(22px) saturate(140%)',
          WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: scrolled
            ? '0 12px 40px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.6)'
            : '0 4px 18px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
          transition: 'box-shadow 0.3s ease',
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{
              width: 32, height: 32, borderRadius: 10, overflow: 'hidden',
              background: 'linear-gradient(135deg, #3B5BFA, #8B5CF6 55%, #EC4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 900, color: '#fff', position: 'relative',
            }}>
              <span style={{
                position: 'absolute', inset: 0, opacity: 0.6,
                background: 'radial-gradient(60% 60% at 30% 25%, rgba(255,255,255,0.5) 0%, transparent 60%)',
              }} />
              <span style={{ position: 'relative' }}>K</span>
            </span>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#0A0F2E', letterSpacing: '-0.02em' }}>
              Kubryx
            </span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hidden md:flex">
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{
                fontSize: 14, fontWeight: 500, color: '#475569',
                textDecoration: 'none', transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#3B5BFA')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              >{l}</a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="hidden md:flex">
            <Link href="#tools" className="btn-ghost" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              borderRadius: 999, padding: '8px 18px', fontSize: 14,
              fontWeight: 600, textDecoration: 'none',
            }}>
              Explore Tools <ArrowRight size={15} strokeWidth={2.2} />
            </Link>
            <Link href="/invoice" className="btn-gradient" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              borderRadius: 999, padding: '8px 18px', fontSize: 14,
              fontWeight: 600, textDecoration: 'none', color: '#fff',
            }}>
              Launch App <ArrowRight size={15} strokeWidth={2.2} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(v => !v)}
            style={{
              display: 'none', padding: 8, borderRadius: 999,
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
            className="md:hidden"
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 70,
          background: 'rgba(10,15,46,0.5)', backdropFilter: 'blur(8px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s',
        }}
        className="md:hidden"
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 80, left: 12, right: 12,
            background: '#fff', borderRadius: 24, padding: 24,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}
        >
          {NAV_LINKS.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`}
               onClick={() => setOpen(false)}
               style={{
                 display: 'block', padding: '12px 8px',
                 fontSize: 18, fontWeight: 600, color: '#0A0F2E',
                 textDecoration: 'none',
                 borderBottom: '1px solid #F1F5F9',
               }}>
              {l}
            </a>
          ))}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href="#tools" onClick={() => setOpen(false)} className="btn-ghost" style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6,
              borderRadius: 999, padding: '12px 20px', fontSize: 15, fontWeight: 600, textDecoration: 'none',
            }}>
              Explore Tools
            </Link>
            <Link href="/invoice" onClick={() => setOpen(false)} className="btn-gradient" style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6,
              borderRadius: 999, padding: '12px 20px', fontSize: 15, fontWeight: 600,
              textDecoration: 'none', color: '#fff',
            }}>
              Launch App
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

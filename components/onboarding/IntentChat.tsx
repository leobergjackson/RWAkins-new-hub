// Built by vsrupeshkumar
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Sparkles, Check, Loader2 } from 'lucide-react'
import { useWallet } from '@/context/WalletContext'
import { parseIntent, summarizeRules, saveIntentLocal, type WealthRules } from '@/lib/intent'

const TEAL = '#2dd4bf'
const PURPLE = '#a78bfa'

type Phase = 'idle' | 'thinking' | 'answered' | 'saving'

/**
 * Plain-English intent capture for the AI CFO. Sends the goal to the hub's
 * existing /api/ai route (non-streaming → revealed with a typewriter so it reads
 * like a live agent), shows the parsed allocation policy, then persists it via
 * /api/saveIntent on confirm and routes to the portfolio dashboard.
 */
export function IntentChat() {
  const router = useRouter()
  const { evm } = useWallet()
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [answer, setAnswer] = useState('') // revealed (typewriter) text
  const [rules, setRules] = useState<WealthRules | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fullRef = useRef('')

  // Typewriter reveal of the assistant answer.
  useEffect(() => {
    if (phase !== 'answered') return
    const full = fullRef.current
    let i = 0
    setAnswer('')
    const id = setInterval(() => {
      i += 2
      setAnswer(full.slice(0, i))
      if (i >= full.length) clearInterval(id)
    }, 12)
    return () => clearInterval(id)
  }, [phase])

  async function send() {
    const goal = input.trim()
    if (!goal || phase === 'thinking' || phase === 'saving') return
    setError(null)
    setPhase('thinking')

    // Parse locally first so the policy + confirmation work even with no AI key.
    const parsed = parseIntent(goal)
    setRules(parsed)
    const methPct = Math.round(parsed.targetMethBps / 100)
    // Quote the user's OWN mETH target as the cap; only call out the vault's 70%
    // hard ceiling when their target actually reaches it.
    const capNote =
      methPct >= 70
        ? 'so the mETH share stays at the vault\'s 70% hard cap'
        : `so the mETH share stays at your ${methPct}% target`
    const deterministic = `Got it. I've set your AI CFO to ${summarizeRules(parsed)}. Every rebalance is enforced on-chain by the vault, ${capNote}.`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:
            `A user described their treasury goals: "${goal}". ` +
            `I parsed this to ${summarizeRules(parsed)}. ` +
            `In 1-2 sentences, confirm this allocation policy back to them warmly. ` +
            `Reference their own ${methPct}% mETH target as the limit you'll respect` +
            `${methPct >= 70 ? ', which is also the vault\'s 70% hard cap' : ' (do not mention a 70% cap — their target is lower)'}.`,
        }),
      })
      if (res.ok) {
        const json = (await res.json()) as { text?: string }
        fullRef.current = json.text?.trim() || deterministic
      } else {
        // AI disabled/unreachable → deterministic confirmation (graceful).
        fullRef.current = deterministic
      }
    } catch {
      fullRef.current = deterministic
    }
    setPhase('answered')
  }

  async function confirm() {
    if (!rules || !evm.address) return
    setPhase('saving')
    setError(null)
    try {
      const res = await fetch('/api/saveIntent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: evm.address, rawIntent: rules.rawIntent }),
      })
      const json = (await res.json()) as { ok?: boolean; rules?: WealthRules; error?: string }
      const finalRules = json.ok && json.rules ? json.rules : rules
      saveIntentLocal(evm.address, finalRules)
      router.push('/portfolio')
    } catch {
      // Network failure shouldn't strand the user — persist locally and continue.
      saveIntentLocal(evm.address, rules)
      router.push('/portfolio')
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Parsed answer / agent reply */}
      {phase !== 'idle' && (
        <div
          style={{
            marginBottom: 16,
            padding: 18,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Sparkles size={15} color={TEAL} />
            <span style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: '0.04em' }}>RWAKINS AI CFO</span>
          </div>

          {phase === 'thinking' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              <Loader2 size={15} className="animate-spin" /> Analyzing your goals…
            </div>
          ) : (
            <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
              {answer}
              {answer.length < fullRef.current.length && <span style={{ opacity: 0.5 }}>▋</span>}
            </p>
          )}

          {/* Parsed allocation preview */}
          {rules && phase !== 'thinking' && (
            <div style={{ marginTop: 16 }}>
              <AllocBar usdyBps={rules.targetUsdyBps} methBps={rules.targetMethBps} />
              {phase === 'answered' && (
                <button onClick={confirm} style={confirmBtn}>
                  <Check size={15} /> Confirm and activate agent
                </button>
              )}
              {phase === 'saving' && (
                <button disabled style={{ ...confirmBtn, opacity: 0.7 }}>
                  <Loader2 size={15} className="animate-spin" /> Activating…
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{error}</p>}

      {/* Input */}
      <div
        style={{
          position: 'relative',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: 14,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
          placeholder="Describe your financial goals in plain English…  e.g. “Grow my treasury but stay fairly safe — keep most in stable USDY yield.”"
          rows={3}
          disabled={phase === 'thinking' || phase === 'saving'}
          style={{
            width: '100%',
            resize: 'none',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: 15,
            lineHeight: 1.6,
            fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>⌘/Ctrl + Enter to send</span>
          <button
            onClick={send}
            disabled={!input.trim() || phase === 'thinking' || phase === 'saving'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              color: '#080808',
              background: input.trim() ? `linear-gradient(90deg, ${TEAL}, ${PURPLE})` : 'rgba(255,255,255,0.12)',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Send <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function AllocBar({ usdyBps, methBps }: { usdyBps: number; methBps: number }) {
  const usdyPct = usdyBps / 100
  const methPct = methBps / 100
  return (
    <div>
      <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ width: `${usdyPct}%`, background: TEAL }} />
        <div style={{ width: `${methPct}%`, background: PURPLE }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
        <span style={{ color: TEAL }}>● USDY {usdyPct.toFixed(0)}%</span>
        <span style={{ color: PURPLE }}>mETH {methPct.toFixed(0)}% ●</span>
      </div>
    </div>
  )
}

const confirmBtn: React.CSSProperties = {
  marginTop: 16,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 18px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  color: '#080808',
  background: '#2dd4bf',
  cursor: 'pointer',
}

export default IntentChat

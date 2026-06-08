// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchSettings, updateSettings, fetchWallets } from '@/lib/palmflow-api'
import type { PFSettings, PFWallet } from '@/lib/palmflow-api'

const TEAL = '#00E5CC'
const BG = '#080810'
const CARD = 'rgba(255,255,255,0.03)'
const BDR = 'rgba(255,255,255,0.07)'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const TABS = ['Account', 'Payment', 'Security', 'Notifications', 'Advanced'] as const
type Tab = typeof TABS[number]

const NETWORKS = ['Mantle', 'Ethereum', 'Polygon', 'Base', 'Optimism']
const ASSETS   = ['USDC', 'MNT', 'ETH', 'USDC', 'USDT', 'DAI']

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)}
      style={{ width:44, height:24, borderRadius:12, background:value?'rgba(0,229,204,0.25)':'rgba(255,255,255,0.08)', border:`1px solid ${value?TEAL:BDR}`, cursor:'pointer', position:'relative', transition:'all 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, left:value?22:3, width:16, height:16, borderRadius:'50%', background:value?TEAL:'#555', transition:'left 0.2s' }} />
    </div>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:`1px solid rgba(255,255,255,0.04)`, gap:16, flexWrap:'wrap' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>{label}</div>
        {desc && <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3 }}>{desc}</div>}
      </div>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = { padding:'8px 12px', borderRadius:8, border:`1px solid ${BDR}`, background:'rgba(255,255,255,0.04)', color:'#fff', fontSize:13, outline:'none', minWidth:180 }
const sel: React.CSSProperties = { ...inp, background:'#0e0e1a', cursor:'pointer' }

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Account')
  const [settings, setSettings] = useState<PFSettings | null>(null)
  const [wallets, setWallets] = useState<PFWallet[]>([])
  const [saving, setSaving] = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    Promise.all([fetchSettings(), fetchWallets()]).then(([s, w]) => { setSettings(s); setWallets(w) })
  }, [])

  function upd<K extends keyof PFSettings>(k: K, v: PFSettings[K]) {
    setSettings(p => p ? { ...p, [k]: v } : p)
  }

  async function save() {
    if (!settings) return
    setSaving(true)
    await updateSettings(settings)
    toast.success('Settings saved')
    setSaving(false)
  }

  if (!settings) return <div style={{ background:BG, minHeight:'100vh', color:'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>Loading settings...</div>

  return (
    <div style={{ background:BG, minHeight:'100vh', padding:'24px', color:'#fff', fontFamily:'"Inter",system-ui,sans-serif' }}>

      <div style={{ maxWidth:800, margin:'0 auto' }}>

        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:11, color:TEAL, fontFamily:MONO, letterSpacing:'0.1em', marginBottom:4 }}>YIELD OPERATIONS HUB / SETTINGS</div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Settings</h1>
          <p style={{ margin:'6px 0 0', fontSize:13, color:'rgba(255,255,255,0.4)' }}>Configure your Yield Operations Hub preferences and security</p>
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:4, marginBottom:24, background:'rgba(255,255,255,0.02)', borderRadius:10, padding:4, flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ flex:1, minWidth:80, padding:'8px 14px', borderRadius:7, border:'none', background:activeTab===t?'rgba(0,229,204,0.12)':'transparent', color:activeTab===t?TEAL:'rgba(255,255,255,0.45)', fontSize:12, fontWeight:activeTab===t?700:400, cursor:'pointer', transition:'all 0.15s' }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:14, padding:'24px 28px', marginBottom:20 }}>

          {/* ── ACCOUNT ─────────────────────────────────────── */}
          {activeTab === 'Account' && <>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:TEAL }}>Profile</div>
            <Row label="Display Name">
              <input value={settings.displayName} onChange={e => upd('displayName', e.target.value)} style={inp} />
            </Row>
            <Row label="Email Address">
              <input type="email" value={settings.email} onChange={e => upd('email', e.target.value)} style={inp} />
            </Row>
            <Row label="Preferred Network" desc="Default network for transactions">
              <select value={settings.preferredNetwork} onChange={e => upd('preferredNetwork', e.target.value)} style={sel}>
                {NETWORKS.map(n => <option key={n}>{n}</option>)}
              </select>
            </Row>

            <div style={{ fontSize:14, fontWeight:600, marginTop:24, marginBottom:16, color:TEAL }}>Connected Wallets</div>
            {wallets.map(w => (
              <div key={w.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:`1px solid rgba(255,255,255,0.04)`, flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{w.label}</div>
                  <div style={{ fontSize:10, color:TEAL, marginTop:2 }}>{w.network}</div>
                  <div style={{ fontSize:10, fontFamily:MONO, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{w.address}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:2 }}>{w.balance} {w.symbol} · ${w.usdValue.toLocaleString()}</div>
                </div>
                <button style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.06)', color:'#FCA5A5', fontSize:11, cursor:'pointer' }}>
                  Disconnect
                </button>
              </div>
            ))}
            <button onClick={() => toast.info('Connect wallet via the Phantom/MetaMask prompt')}
              style={{ marginTop:12, padding:'9px 18px', borderRadius:8, border:`1px solid rgba(0,229,204,0.3)`, background:'rgba(0,229,204,0.06)', color:TEAL, fontSize:12, cursor:'pointer' }}>
              + Add Wallet
            </button>
          </>}

          {/* ── PAYMENT ─────────────────────────────────────── */}
          {activeTab === 'Payment' && <>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:TEAL }}>Payment Defaults</div>
            <Row label="Default Asset" desc="Token used by default when sending">
              <select value={settings.defaultAsset} onChange={e => upd('defaultAsset', e.target.value)} style={sel}>
                {ASSETS.map(a => <option key={a}>{a}</option>)}
              </select>
            </Row>
            <Row label="Default Network">
              <select value={settings.preferredNetwork} onChange={e => upd('preferredNetwork', e.target.value)} style={sel}>
                {NETWORKS.map(n => <option key={n}>{n}</option>)}
              </select>
            </Row>

            <div style={{ fontSize:14, fontWeight:600, marginTop:24, marginBottom:16, color:TEAL }}>Payment Limits</div>
            <Row label="Enable Payment Limits" desc="Prevents accidental large transfers">
              <Toggle value={settings.paymentLimitsEnabled} onChange={v => upd('paymentLimitsEnabled', v)} />
            </Row>
            {settings.paymentLimitsEnabled && <>
              <Row label="Daily Limit (USDC)">
                <input type="number" value={settings.dailyLimit} onChange={e => upd('dailyLimit', Number(e.target.value))} style={inp} />
              </Row>
              <Row label="Single Transaction Limit (USDC)">
                <input type="number" value={settings.singleLimit} onChange={e => upd('singleLimit', Number(e.target.value))} style={inp} />
              </Row>
            </>}

            <div style={{ fontSize:14, fontWeight:600, marginTop:24, marginBottom:16, color:TEAL }}>Recurring Payments</div>
            <div style={{ padding:'16px', background:'rgba(255,255,255,0.02)', borderRadius:10, fontSize:12, color:'rgba(255,255,255,0.4)' }}>
              No recurring payments configured.{' '}
              <a href="/treasury/payroll" style={{ color:TEAL, textDecoration:'none' }}>Set up payroll streams →</a>
            </div>
          </>}

          {/* ── SECURITY ────────────────────────────────────── */}
          {activeTab === 'Security' && <>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:TEAL }}>Two-Factor Authentication</div>
            <Row label="2FA Status" desc="TOTP-based two-factor authentication">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:11, color:settings.twoFactorEnabled?'#22C55E':'#F59E0B' }}>
                  {settings.twoFactorEnabled ? '✓ Enabled' : '⚠ Disabled'}
                </span>
                <button onClick={() => { upd('twoFactorEnabled', !settings.twoFactorEnabled); toast.success(settings.twoFactorEnabled?'2FA disabled':'2FA setup initiated') }}
                  style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${settings.twoFactorEnabled?'rgba(239,68,68,0.3)':'rgba(34,197,94,0.3)'}`, background:settings.twoFactorEnabled?'rgba(239,68,68,0.06)':'rgba(34,197,94,0.06)', color:settings.twoFactorEnabled?'#FCA5A5':'#22C55E', fontSize:11, cursor:'pointer' }}>
                  {settings.twoFactorEnabled ? 'Disable' : 'Enable 2FA'}
                </button>
              </div>
            </Row>

            <div style={{ fontSize:14, fontWeight:600, marginTop:24, marginBottom:16, color:TEAL }}>Transaction Security</div>
            <Row label="Auto-Sign Transactions" desc="Sign without manual confirmation (use with care)">
              <Toggle value={settings.autoSign} onChange={v => upd('autoSign', v)} />
            </Row>
            <Row label="Confirmation Timeout">
              <select value={settings.confirmTimeout} onChange={e => upd('confirmTimeout', e.target.value)} style={sel}>
                {['30s','1m','5m','10m'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Row>
            <Row label="Require Confirmation for Large Txns" desc="Extra step for transactions over limit">
              <Toggle value={settings.paymentLimitsEnabled} onChange={v => upd('paymentLimitsEnabled', v)} />
            </Row>

            <div style={{ fontSize:14, fontWeight:600, marginTop:24, marginBottom:16, color:TEAL }}>Session Management</div>
            <div style={{ padding:'14px', background:'rgba(255,255,255,0.02)', borderRadius:10, marginBottom:10, fontSize:12 }}>
              <div style={{ color:'#22C55E', marginBottom:4 }}>● Current Session (This device)</div>
              <div style={{ color:'rgba(255,255,255,0.4)' }}>Last active: Just now · Browser · {typeof window !== 'undefined' ? navigator.platform : 'Unknown'}</div>
            </div>
            <button onClick={() => toast.success('All other sessions logged out')}
              style={{ padding:'8px 16px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.06)', color:'#FCA5A5', fontSize:11, cursor:'pointer' }}>
              Logout All Other Sessions
            </button>
          </>}

          {/* ── NOTIFICATIONS ────────────────────────────────── */}
          {activeTab === 'Notifications' && <>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:TEAL }}>In-App Notifications</div>
            {([
              { key:'notifyPaymentSent'     as const, label:'Payment Sent',                 desc:'When you send funds to any address' },
              { key:'notifyPaymentReceived' as const, label:'Payment Received',             desc:'When funds arrive in your wallet' },
              { key:'notifyPaymentFailed'   as const, label:'Payment Failed',               desc:'When a transaction fails or errors' },
              { key:'notifyLargeTransaction'as const, label:'Large Transaction Alert',      desc:'When transaction exceeds your daily limit' },
            ]).map(n => (
              <Row key={n.key} label={n.label} desc={n.desc}>
                <Toggle value={settings[n.key]} onChange={v => upd(n.key, v)} />
              </Row>
            ))}

            <div style={{ fontSize:14, fontWeight:600, marginTop:24, marginBottom:16, color:TEAL }}>Email Notifications</div>
            <Row label="Email Address">
              <input type="email" value={settings.email} onChange={e => upd('email', e.target.value)} style={inp} />
            </Row>
            <Row label="Digest Frequency">
              <select style={sel}>
                <option>Instant</option><option>Daily</option><option>Weekly</option>
              </select>
            </Row>

            <div style={{ fontSize:14, fontWeight:600, marginTop:24, marginBottom:16, color:TEAL }}>Webhooks</div>
            <div style={{ marginBottom:10 }}>
              <input placeholder="https://your-app.com/webhook" style={{ ...inp, width:'100%', boxSizing:'border-box' as any }} />
            </div>
            <button onClick={() => toast.success('Webhook test sent')}
              style={{ padding:'7px 16px', borderRadius:8, border:`1px solid ${BDR}`, background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.5)', fontSize:11, cursor:'pointer' }}>
              Test Webhook
            </button>
          </>}

          {/* ── ADVANCED ─────────────────────────────────────── */}
          {activeTab === 'Advanced' && <>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:TEAL }}>AI Agent Configuration</div>
            <Row label="AI Payment Routing" desc="Let AI agents optimize transaction routes">
              <Toggle value={settings.aiRoutingEnabled} onChange={v => upd('aiRoutingEnabled', v)} />
            </Row>
            <Row label="AI Optimization Preference">
              <select value={settings.aiOptimization} onChange={e => upd('aiOptimization', e.target.value)} style={sel}>
                {['balanced','minimize-gas','minimize-time','maximum-privacy'].map(v => <option key={v} value={v} style={{ textTransform:'capitalize' }}>{v}</option>)}
              </select>
            </Row>
            <Row label="Autonomous Agent Control" desc="Agents execute payments without confirmation (use with care)">
              <Toggle value={settings.autonomousAgents} onChange={v => upd('autonomousAgents', v)} />
            </Row>

            <div style={{ fontSize:14, fontWeight:600, marginTop:24, marginBottom:16, color:TEAL }}>Privacy & Stealth</div>
            <Row label="Stealth Mode" desc="Obfuscates transaction amounts on block explorers">
              <Toggle value={settings.stealthMode} onChange={v => upd('stealthMode', v)} />
            </Row>
            <Row label="Privacy Pool" desc="Routes through privacy DEX (increases cost ~15%)">
              <Toggle value={settings.privacyPool} onChange={v => upd('privacyPool', v)} />
            </Row>

            <div style={{ fontSize:14, fontWeight:600, marginTop:24, marginBottom:16, color:TEAL }}>API & Developer</div>
            <Row label="API Key">
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontFamily:MONO, fontSize:11, color:'rgba(255,255,255,0.4)' }}>
                  {apiKeyVisible ? 'pf_live_sk_9x2mK7vR...8nQj' : '••••••••••••••••••••'}
                </span>
                <button onClick={() => setApiKeyVisible(p=>!p)} style={{ padding:'3px 8px', borderRadius:6, border:`1px solid ${BDR}`, background:'transparent', color:'rgba(255,255,255,0.4)', fontSize:10, cursor:'pointer' }}>
                  {apiKeyVisible ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => { navigator.clipboard.writeText('pf_live_sk_9x2mK7vR8nQj'); toast.success('API key copied') }}
                  style={{ padding:'3px 8px', borderRadius:6, border:`1px solid ${BDR}`, background:'transparent', color:'rgba(255,255,255,0.4)', fontSize:10, cursor:'pointer' }}>
                  Copy
                </button>
              </div>
            </Row>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Rate limit: 1,000 requests/hour</div>

            <div style={{ fontSize:14, fontWeight:600, marginTop:24, marginBottom:16, color:'#EF4444' }}>Danger Zone</div>
            <div style={{ padding:'16px', background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10 }}>
              <div style={{ fontSize:13, marginBottom:10 }}>Delete Account</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:12 }}>This action is irreversible. All data will be permanently deleted.</div>
              <input placeholder='Type "DELETE" to confirm' value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                style={{ ...inp, marginBottom:10, width:'100%', boxSizing:'border-box' as any }} />
              <button disabled={deleteConfirm !== 'DELETE'} onClick={() => toast.error('Account deletion initiated (demo — no action taken)')}
                style={{ padding:'8px 16px', borderRadius:8, border:'1px solid rgba(239,68,68,0.4)', background:deleteConfirm==='DELETE'?'rgba(239,68,68,0.15)':'rgba(239,68,68,0.04)', color:deleteConfirm==='DELETE'?'#EF4444':'rgba(239,68,68,0.3)', fontSize:12, cursor:deleteConfirm==='DELETE'?'pointer':'default' }}>
                Delete Account
              </button>
            </div>
          </>}
        </div>

        {/* Save / Cancel */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={() => { fetchSettings().then(setSettings); toast.info('Changes reverted') }}
            style={{ padding:'10px 20px', borderRadius:8, border:`1px solid ${BDR}`, background:'transparent', color:'rgba(255,255,255,0.4)', fontSize:13, cursor:'pointer' }}>
            Reset
          </button>
          <button onClick={save} disabled={saving}
            style={{ padding:'10px 24px', borderRadius:8, border:`1px solid ${TEAL}`, background:'rgba(0,229,204,0.12)', color:TEAL, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            {saving ? 'Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

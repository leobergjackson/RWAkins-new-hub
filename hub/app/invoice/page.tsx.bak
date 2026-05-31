'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { encodeInvoice } from '@/lib/invoice/invoiceCodec';
import { saveInvoice } from '@/lib/invoice/invoiceStore';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { ArrowRight, FileText, Zap, CheckCircle2, Copy, ExternalLink } from 'lucide-react';

const SAMPLE_INVOICE = `Invoice #2024-089
Date: May 28, 2026
Due: June 28, 2026

From: Carlos Mendoza (carlos@freelancedev.mx)
To: Startup Inc

Services Rendered:
- Full-stack web development (React + Node.js) - 40 hours @ $50/hr
- API integration and testing - 10 hours @ $50/hr
- Deployment and DevOps setup - 5 hours @ $50/hr

Subtotal: $2,750.00 USD
Tax (0%): $0.00
Total Due: $2,750.00 USD

Payment terms: Net 30
Please pay in USDC to the provided wallet address.`;

const MONO = '"Fira Code","JetBrains Mono",monospace';

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export default function InvoicePage() {
  const [invoiceText, setInvoiceText] = useState('');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fieldsFilledCount, setFieldsFilledCount] = useState(0);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [description, setDescription] = useState('');
  const [amountUSD, setAmountUSD] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [freelancerWallet, setFreelancerWallet] = useState('');

  const [generatedURL, setGeneratedURL] = useState('');
  const [copied, setCopied] = useState(false);

  const { address, isConnected } = useAccount();

  const loadSample = useCallback(() => {
    setInvoiceText(SAMPLE_INVOICE);
    setParseError(null);
    setFieldsFilledCount(0);
  }, []);

  const handleParse = useCallback(async () => {
    if (!invoiceText.trim()) return;
    setParseLoading(true);
    setParseError(null);
    setFieldsFilledCount(0);

    try {
      const res = await fetch('/api/invoice/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceText }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Unknown error');
      }

      const data = await res.json();
      let filled = 0;

      if (data.clientName) { setClientName(data.clientName); filled++; }
      if (data.clientEmail) { setClientEmail(data.clientEmail); filled++; }
      if (data.description) { setDescription(data.description); filled++; }
      if (data.amountUSD) { setAmountUSD(String(data.amountUSD)); filled++; }
      if (data.dueDate) { setDueDate(data.dueDate); filled++; }

      setFieldsFilledCount(filled);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'AI parsing failed — fill fields manually');
    } finally {
      setParseLoading(false);
    }
  }, [invoiceText]);

  const useConnectedWallet = useCallback(() => {
    if (address) setFreelancerWallet(address);
  }, [address]);

  const amountUSDC6 = amountUSD
    ? BigInt(Math.round(parseFloat(amountUSD) * 1_000_000)).toString()
    : '0';

  const handleGenerate = useCallback(() => {
    if (!description || !amountUSD || !isValidAddress(freelancerWallet)) return;

    const id = uuidv4();
    const payload = {
      id,
      to: freelancerWallet,
      amount: amountUSDC6,
      amountDisplay: `$${parseFloat(amountUSD).toFixed(2)}`,
      desc: description.slice(0, 80),
      client: clientName || 'Client',
      due: dueDate || '',
    };

    const encoded = encodeInvoice(payload);
    const url = `${window.location.origin}/invoice/pay?d=${encoded}`;

    saveInvoice({
      id,
      clientName: clientName || '',
      clientEmail: clientEmail || '',
      description,
      amountUSD: parseFloat(amountUSD),
      amountUSDC: amountUSDC6,
      dueDate,
      freelancerAddress: freelancerWallet,
      status: 'pending',
      createdAt: new Date().toISOString(),
      paymentURL: url,
    });

    setGeneratedURL(url);
  }, [description, amountUSD, freelancerWallet, amountUSDC6, clientName, clientEmail, dueDate]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(generatedURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedURL]);

  const canGenerate =
    description.trim().length > 0 &&
    parseFloat(amountUSD) > 0 &&
    isValidAddress(freelancerWallet);

  return (
    <div style={{
      minHeight: 'calc(100vh - 56px)',
      background: 'radial-gradient(60% 55% at 70% 40%, rgba(252,231,243,0.6) 0%, transparent 60%), radial-gradient(50% 50% at 25% 60%, rgba(237,233,254,0.6) 0%, transparent 60%), linear-gradient(180deg, #F8FAFC 0%, #F1F5FF 100%)',
      color: '#0A0F2E',
    }}>

      {/* Header */}
      <div style={{
        padding: '20px 32px',
        borderBottom: '1px solid rgba(10,15,46,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #3B5BFA, #8B5CF6)',
              display: 'grid', placeItems: 'center',
            }}>
              <FileText size={16} color="#fff" />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0A0F2E', letterSpacing: '-0.02em', margin: 0 }}>
              Invoice
            </h1>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              padding: '2px 8px', borderRadius: 999,
              background: 'rgba(59,91,250,0.08)', color: '#3B5BFA',
              border: '1px solid rgba(59,91,250,0.2)',
            }}>LIVE · ARBITRUM SEPOLIA</span>
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            AI-parsed USDC invoicing · Get paid in seconds
          </p>
        </div>
        <ConnectButton showBalance={false} />
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'flex', flexDirection: 'row', minHeight: 'calc(100vh - 120px)' }}>

        {/* LEFT — Input */}
        <div style={{
          flex: 1, overflowY: 'auto',
          borderRight: '1px solid rgba(10,15,46,0.08)',
          padding: '32px',
          maxWidth: 560,
        }}>

          {/* Paste area */}
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontFamily: MONO, fontSize: 10, color: '#3B5BFA', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
              Invoice Text
            </label>
            <button
              onClick={loadSample}
              style={{
                fontFamily: MONO, fontSize: 10, color: '#64748B',
                background: 'none', border: '1px solid rgba(10,15,46,0.12)',
                borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                letterSpacing: '0.08em',
              }}
            >
              Use Sample Invoice
            </button>
          </div>
          <textarea
            style={{
              width: '100%', minHeight: 180,
              background: '#fff', border: '1px solid rgba(10,15,46,0.1)',
              borderRadius: 12, padding: 16,
              fontFamily: MONO, fontSize: 12, color: '#0A0F2E', lineHeight: 1.6,
              outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              boxShadow: '0 2px 8px rgba(10,15,46,0.04)',
            }}
            placeholder="Paste any invoice — text from a PDF, email, or message..."
            value={invoiceText}
            onChange={e => setInvoiceText(e.target.value)}
          />

          <button
            onClick={handleParse}
            disabled={parseLoading || !invoiceText.trim()}
            style={{
              width: '100%', height: 48, marginTop: 12,
              borderRadius: 999, fontWeight: 700, fontSize: 14,
              cursor: parseLoading || !invoiceText.trim() ? 'not-allowed' : 'pointer',
              background: parseLoading
                ? 'rgba(59,91,250,0.06)'
                : !invoiceText.trim()
                  ? '#F1F5F9'
                  : 'linear-gradient(135deg, #3B5BFA, #8B5CF6)',
              color: parseLoading ? '#3B5BFA' : !invoiceText.trim() ? 'rgba(10,15,46,0.3)' : '#fff',
              fontFamily: MONO, letterSpacing: '0.05em',
              border: parseLoading ? '1px solid rgba(59,91,250,0.2)' : 'none',
              boxShadow: !parseLoading && invoiceText.trim() ? '0 8px 24px rgba(59,91,250,0.3)' : 'none',
            } as React.CSSProperties}
          >
            {parseLoading ? 'Analyzing with Groq AI···' : 'Parse with AI'}
          </button>

          {parseError && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', fontFamily: MONO, fontSize: 11, color: '#dc2626' }}>
              {parseError}
            </div>
          )}

          {fieldsFilledCount > 0 && (
            <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', fontFamily: MONO, fontSize: 10, color: '#059669', letterSpacing: '0.1em' }}>
              AI FILLED {fieldsFilledCount} FIELDS · REVIEW BEFORE CONTINUING
            </div>
          )}

          {/* Form fields */}
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { label: 'Client Name', value: clientName, setter: setClientName, type: 'text' },
              { label: 'Client Email', value: clientEmail, setter: setClientEmail, type: 'email' },
              { label: 'Service Description', value: description, setter: setDescription, type: 'text' },
              { label: 'Amount (USD)', value: amountUSD, setter: setAmountUSD, type: 'number' },
              { label: 'Payment Due Date', value: dueDate, setter: setDueDate, type: 'date' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: 'block', fontFamily: MONO, fontSize: 10, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.setter(e.target.value)}
                  style={{
                    width: '100%', background: '#fff',
                    border: '1px solid rgba(10,15,46,0.1)',
                    borderRadius: 10, padding: '10px 14px',
                    color: '#0A0F2E', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    boxShadow: '0 2px 6px rgba(10,15,46,0.04)',
                  }}
                />
              </div>
            ))}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontFamily: MONO, fontSize: 10, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Your Wallet on Arbitrum
                </label>
                {isConnected && (
                  <button
                    onClick={useConnectedWallet}
                    style={{ fontFamily: MONO, fontSize: 10, color: '#3B5BFA', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Use connected wallet
                  </button>
                )}
              </div>
              <input
                type="text"
                value={freelancerWallet}
                onChange={e => setFreelancerWallet(e.target.value)}
                placeholder="0x..."
                style={{
                  width: '100%', background: '#fff',
                  border: `1px solid ${isValidAddress(freelancerWallet) ? 'rgba(59,91,250,0.4)' : 'rgba(10,15,46,0.1)'}`,
                  borderRadius: 10, padding: '10px 14px',
                  color: '#0A0F2E', fontFamily: MONO, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  boxShadow: '0 2px 6px rgba(10,15,46,0.04)',
                }}
              />
              <p style={{ fontFamily: MONO, fontSize: 10, color: '#94A3B8', marginTop: 6, letterSpacing: '0.05em' }}>
                CLIENT PAYS DIRECTLY TO THIS ADDRESS · RUPHEX NEVER HOLDS CUSTODY
              </p>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              width: '100%', height: 56, marginTop: 32,
              borderRadius: 999, fontWeight: 700, fontSize: 15,
              cursor: canGenerate ? 'pointer' : 'not-allowed',
              background: canGenerate ? 'linear-gradient(135deg, #3B5BFA, #8B5CF6 55%, #EC4899)' : '#F1F5F9',
              color: canGenerate ? '#fff' : 'rgba(10,15,46,0.3)',
              border: canGenerate ? 'none' : '1px solid rgba(10,15,46,0.08)',
              boxShadow: canGenerate ? '0 10px 30px rgba(59,91,250,0.35)' : 'none',
            } as React.CSSProperties}
          >
            {canGenerate ? 'Generate Payment Link →' : 'Fill required fields'}
          </button>

          {/* Generated link */}
          {generatedURL && (
            <div style={{
              marginTop: 24, padding: 20,
              background: 'rgba(59,91,250,0.04)', border: '1px solid rgba(59,91,250,0.15)',
              borderRadius: 16,
            }}>
              <div style={{
                fontFamily: MONO, fontSize: 12, color: '#3B5BFA',
                wordBreak: 'break-all', marginBottom: 16,
                padding: '12px 14px', background: '#EEF2FF', borderRadius: 10,
              }}>
                {generatedURL}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    flex: 1, height: 44, borderRadius: 999, fontWeight: 700, fontSize: 13,
                    background: 'linear-gradient(135deg, #3B5BFA, #8B5CF6)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 6px 20px rgba(59,91,250,0.3)',
                  }}
                >
                  <Copy size={14} />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <a
                  href={generatedURL}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1, height: 44, borderRadius: 999, fontWeight: 600, fontSize: 13,
                    border: '1px solid rgba(10,15,46,0.15)', color: '#0A0F2E',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    textDecoration: 'none', background: '#fff',
                  }}
                >
                  <ExternalLink size={14} />
                  Open Link
                </a>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Preview */}
        <div style={{ flex: 1, padding: '32px', background: 'rgba(248,250,252,0.6)', overflowY: 'auto' }}>

          {/* Preview header */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: MONO, fontSize: 10, color: '#3B5BFA', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              Payment Preview
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
              What your client will see
            </p>
          </div>

          {/* Preview CARD — intentionally dark to show client payment experience */}
          <div style={{
            background: '#0D1017', borderRadius: 24, padding: 36,
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 60px rgba(10,15,46,0.2)',
          }}>
            <p style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              Payment Request
            </p>
            <p style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
              INV-{generatedURL ? generatedURL.slice(-8).toUpperCase() : 'XXXXXXXX'}
            </p>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                ${parseFloat(amountUSD || '0').toFixed(2)}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: '#C8FF00', marginTop: 8 }}>
                USDC · ARBITRUM SEPOLIA
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {[
                ['TO', isValidAddress(freelancerWallet) ? `${freelancerWallet.slice(0, 6)}···${freelancerWallet.slice(-4)}` : '0x0000···0000'],
                ['DESCRIPTION', description || '—'],
                ['DUE', dueDate || '—'],
                ['NETWORK', 'Arbitrum Sepolia'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ opacity: 0.4, pointerEvents: 'none' }}>
              <div style={{
                width: '100%', height: 56, background: '#fff', color: '#000',
                borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 16,
              }}>
                Pay with USDC
              </div>
            </div>
          </div>

          {/* Verified badges */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Verified Smart Contract', color: '#10b981' },
              { label: 'Arbitrum Sepolia', color: '#28a0f0' },
              { label: 'USDC · Circle', color: '#2775CA' },
            ].map(b => (
              <div key={b.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: `${b.color}10`, color: b.color,
                border: `1px solid ${b.color}25`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.color }} />
                {b.label}
              </div>
            ))}
          </div>

          <p style={{ fontFamily: MONO, fontSize: 10, color: '#94A3B8', marginTop: 16, textAlign: 'center', letterSpacing: '0.05em' }}>
            Payment data is encoded in the URL · No database · No custody
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense } from 'react';
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { decodeInvoice, InvoicePayload } from '@/lib/invoice/invoiceCodec';
import { erc20Abi, reciboAbi } from '@/lib/invoice/abi';
import { ARBITRUM_SEPOLIA_CHAIN_ID, USDC_ADDRESS, CONTRACT_ADDRESS } from '@/lib/invoice/wagmiConfig';
import StepRow from '@/components/invoice/StepRow';
import { markPaid } from '@/lib/invoice/invoiceStore';
import Link from 'next/link';
import { ArrowRight, ExternalLink, CheckCircle2 } from 'lucide-react';

const MONO = '"Fira Code","JetBrains Mono",monospace';

type PaymentState =
  | 'idle'
  | 'wrong_network'
  | 'ready'
  | 'checking_balance'
  | 'insufficient_balance'
  | 'approving'
  | 'approve_confirming'
  | 'approve_done'
  | 'paying'
  | 'pay_confirming'
  | 'paid'
  | 'error';

function WhatNextPanel({ amountDisplay }: { amountDisplay: string }) {
  return (
    <div style={{
      marginTop: 32, padding: 24,
      background: 'rgba(200,255,0,0.03)',
      border: '1px solid rgba(200,255,0,0.12)',
      borderRadius: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <CheckCircle2 size={18} color="#C8FF00" />
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
          Payment received! What&apos;s next?
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          {
            title: 'Boost your Credit Score',
            desc: 'This payment adds to your on-chain history',
            btn: 'View Credit Passport',
            href: '/credit',
            color: '#06b6d4',
          },
          {
            title: 'Earn yield on your USDC',
            desc: 'Put your USDC to work automatically',
            btn: 'Open Yield Hub',
            href: '/treasury',
            color: '#10b981',
          },
          {
            title: 'Get instant liquidity',
            desc: 'Use your credit score to unlock a loan',
            btn: 'AI Lending',
            href: '/lend',
            color: '#f59e0b',
          },
        ].map(item => (
          <div key={item.href} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, padding: '14px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
            </div>
            <Link href={item.href} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: `${item.color}15`, color: item.color,
              border: `1px solid ${item.color}30`, textDecoration: 'none', flexShrink: 0,
            }}>
              {item.btn} <ArrowRight size={12} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<InvoicePayload | null>(null);
  const [decodeError, setDecodeError] = useState(false);

  useEffect(() => {
    const d = searchParams.get('d');
    if (!d) { setDecodeError(true); return; }
    const decoded = decodeInvoice(d);
    if (!decoded) { setDecodeError(true); return; }
    setInvoice(decoded);
  }, [searchParams]);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isCorrectChain = chainId === ARBITRUM_SEPOLIA_CHAIN_ID;

  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isCorrectChain },
  });

  const invoiceAmount = invoice ? BigInt(invoice.amount) : BigInt(0);
  const hasEnoughBalance = usdcBalance !== undefined && usdcBalance >= invoiceAmount;

  const { data: currentAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && CONTRACT_ADDRESS ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address && isCorrectChain && !!CONTRACT_ADDRESS },
  });

  const isAlreadyApproved = currentAllowance !== undefined && currentAllowance >= invoiceAmount;

  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: approveIsPending,
    error: approveWriteError,
    reset: resetApprove,
  } = useWriteContract();

  const {
    isLoading: approveIsConfirming,
    isSuccess: approveIsConfirmed,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const handleApprove = useCallback(() => {
    if (!invoice || !CONTRACT_ADDRESS) return;
    writeApprove({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, invoiceAmount],
    });
  }, [invoice, invoiceAmount, writeApprove]);

  const {
    writeContract: writePay,
    data: payTxHash,
    isPending: payIsPending,
    error: payWriteError,
    reset: resetPay,
  } = useWriteContract();

  const {
    isLoading: payIsConfirming,
    isSuccess: payIsConfirmed,
    error: payReceiptError,
  } = useWaitForTransactionReceipt({ hash: payTxHash });

  const handlePay = useCallback(() => {
    if (!invoice || !CONTRACT_ADDRESS) return;
    const invoiceIdBytes32 = `0x${invoice.id.replace(/-/g, '').slice(0, 32).padEnd(64, '0')}` as `0x${string}`;
    writePay({
      address: CONTRACT_ADDRESS,
      abi: reciboAbi,
      functionName: 'payInvoice',
      args: [invoiceIdBytes32, invoice.to as `0x${string}`, invoiceAmount],
    });
  }, [invoice, invoiceAmount, writePay]);

  useEffect(() => {
    if (payIsConfirmed && invoice && payTxHash) {
      markPaid(invoice.id, payTxHash, approveTxHash);
    }
  }, [payIsConfirmed, invoice, payTxHash, approveTxHash]);

  const paymentState: PaymentState = (() => {
    if (!isConnected) return 'idle';
    if (!isCorrectChain) return 'wrong_network';
    if (payIsConfirmed) return 'paid';
    if (payIsConfirming) return 'pay_confirming';
    if (payIsPending) return 'paying';
    if (approveIsConfirmed || isAlreadyApproved) return 'approve_done';
    if (approveIsConfirming) return 'approve_confirming';
    if (approveIsPending) return 'approving';
    if (usdcBalance === undefined) return 'checking_balance';
    if (!hasEnoughBalance) return 'insufficient_balance';
    return 'ready';
  })();

  const activeError = approveWriteError || approveReceiptError || payWriteError || payReceiptError;

  const getErrorMessage = (error: Error): string => {
    const msg = error.message.toLowerCase();
    if (msg.includes('user rejected') || msg.includes('denied')) return 'Transaction rejected in wallet.';
    if (msg.includes('insufficient funds')) return 'Insufficient gas funds.';
    return 'Transaction failed. Please try again.';
  };

  const buttonConfig = {
    idle: { label: 'Connect your wallet to continue', handler: undefined, disabled: true },
    wrong_network: { label: 'Switch to Arbitrum Sepolia', handler: () => switchChain({ chainId: ARBITRUM_SEPOLIA_CHAIN_ID }), disabled: false },
    ready: { label: 'Approve USDC →', handler: handleApprove, disabled: false },
    checking_balance: { label: 'Checking balance···', handler: undefined, disabled: true },
    insufficient_balance: { label: 'Insufficient USDC balance', handler: undefined, disabled: true },
    approving: { label: 'Waiting for wallet confirmation···', handler: undefined, disabled: true },
    approve_confirming: { label: 'Confirming approval···', handler: undefined, disabled: true },
    approve_done: { label: 'Confirm Payment →', handler: handlePay, disabled: false },
    paying: { label: 'Waiting for wallet confirmation···', handler: undefined, disabled: true },
    pay_confirming: { label: 'Processing on Arbitrum···', handler: undefined, disabled: true },
    paid: { label: 'Payment Confirmed ✓', handler: undefined, disabled: true },
    error: { label: 'Retry', handler: () => { resetApprove(); resetPay(); }, disabled: false },
  }[activeError ? 'error' : paymentState];

  const step1Status = (() => {
    if (['idle', 'wrong_network', 'ready', 'insufficient_balance', 'checking_balance'].includes(paymentState)) return 'pending';
    if (['approving', 'approve_confirming'].includes(paymentState)) return 'active';
    return 'complete';
  })() as 'pending' | 'active' | 'complete';

  const step2Status = (() => {
    if (['paid'].includes(paymentState)) return 'complete';
    if (['paying', 'pay_confirming'].includes(paymentState)) return 'active';
    return 'pending';
  })() as 'pending' | 'active' | 'complete';

  useEffect(() => {
    if (paymentState === 'paid') refetchBalance();
  }, [paymentState, refetchBalance]);

  if (decodeError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Invalid Link</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 400 }}>
          This payment link is invalid or expired. Ask the freelancer for a new one.
        </p>
        <Link href="/invoice" style={{
          marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 999, background: '#C8FF00', color: '#000',
          fontWeight: 700, fontSize: 14, textDecoration: 'none',
        }}>
          Create Invoice <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ fontFamily: MONO, color: '#C8FF00', fontSize: 13 }}>Loading invoice···</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px 80px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
          Make Payment
        </h1>
        <ConnectButton showBalance={false} />
      </div>

      {/* Wrong network banner */}
      {!isCorrectChain && isConnected && (
        <div style={{
          textAlign: 'center', padding: '12px 16px', marginBottom: 20,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, fontSize: 13, fontFamily: MONO, color: 'rgba(255,255,255,0.7)',
        }}>
          SWITCH TO ARBITRUM SEPOLIA ·{' '}
          <button
            onClick={() => switchChain({ chainId: ARBITRUM_SEPOLIA_CHAIN_ID })}
            style={{ color: '#C8FF00', background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 13 }}
          >
            SWITCH AUTOMATICALLY →
          </button>
        </div>
      )}

      {/* Invoice card */}
      <div style={{
        background: '#0D1017', borderRadius: 24, padding: 32,
        border: '1px solid rgba(255,255,255,0.05)', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Payment Request
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            INV-{invoice.id.split('-')[0]}
          </span>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {invoice.amountDisplay}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: '#C8FF00', marginTop: 8 }}>
            USDC · ARBITRUM SEPOLIA
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['TO', invoice.to],
            ['DESCRIPTION', invoice.desc],
            ['DUE', invoice.due || '—'],
            ['CONTRACT', `${CONTRACT_ADDRESS.slice(0, 6)}···${CONTRACT_ADDRESS.slice(-4)}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</span>
              <span style={{
                fontSize: 13, color: 'rgba(255,255,255,0.6)',
                textAlign: 'right', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: k === 'TO' || k === 'CONTRACT' ? MONO : undefined,
              }}>{v}</span>
            </div>
          ))}
          {isConnected && isCorrectChain && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>YOUR USDC</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: hasEnoughBalance ? '#C8FF00' : '#f87171' }}>
                {usdcBalance !== undefined ? `${(Number(usdcBalance) / 1_000_000).toFixed(2)} USDC` : '···'}
                {!hasEnoughBalance && usdcBalance !== undefined ? ' (INSUFFICIENT)' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Contract badge */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <a
          href={`https://sepolia.arbiscan.io/address/${CONTRACT_ADDRESS}`}
          target="_blank" rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
            borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#10b981',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            textDecoration: 'none', fontFamily: MONO,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          Verified Smart Contract <ExternalLink size={10} />
        </a>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
          borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#28a0f0',
          background: 'rgba(40,160,240,0.08)', border: '1px solid rgba(40,160,240,0.2)',
          fontFamily: MONO,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#28a0f0' }} />
          Arbitrum Sepolia
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <StepRow
          number="01"
          label="Approve USDC Spend"
          sublabel="Your wallet authorizes the exact amount. Standard Ethereum requirement — not an additional charge."
          status={step1Status}
        />
        <StepRow
          number="02"
          label="Confirm Payment"
          sublabel="USDC transfers directly to the freelancer's wallet. The contract emits a permanent on-chain receipt."
          status={step2Status}
          disabled={step1Status !== 'complete'}
        />
      </div>

      {/* Action button */}
      <button
        onClick={buttonConfig.handler ?? undefined}
        disabled={buttonConfig.disabled}
        style={{
          width: '100%', height: 56, borderRadius: 999, fontWeight: 700, fontSize: 15,
          cursor: buttonConfig.disabled ? 'not-allowed' : 'pointer',
          background: paymentState === 'paid'
            ? '#C8FF00'
            : activeError
              ? 'rgba(239,68,68,0.15)'
              : buttonConfig.disabled
                ? '#141820'
                : '#fff',
          color: paymentState === 'paid' ? '#000' : activeError ? '#f87171' : buttonConfig.disabled ? 'rgba(255,255,255,0.25)' : '#000',
          border: activeError ? '1px solid rgba(239,68,68,0.3)' : buttonConfig.disabled && paymentState !== 'paid' ? '1px solid rgba(255,255,255,0.06)' : 'none',
        } as React.CSSProperties}
      >
        {buttonConfig.label}
      </button>

      {activeError && (
        <p style={{ marginTop: 10, textAlign: 'center', fontFamily: MONO, fontSize: 11, color: '#f87171', letterSpacing: '0.05em' }}>
          ERROR · {getErrorMessage(activeError)}
        </p>
      )}

      {/* Tx hashes */}
      {(approveTxHash || payTxHash) && (
        <div style={{ marginTop: 16, padding: 16, background: '#0D1017', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {approveTxHash && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Approve TX</span>
              <a href={`https://sepolia.arbiscan.io/tx/${approveTxHash}`} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, color: '#C8FF00', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}>
                {approveTxHash.slice(0, 10)}···{approveTxHash.slice(-8)} <ExternalLink size={10} />
              </a>
            </div>
          )}
          {payTxHash && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Payment TX</span>
              <a href={`https://sepolia.arbiscan.io/tx/${payTxHash}`} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, color: '#C8FF00', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}>
                {payTxHash.slice(0, 10)}···{payTxHash.slice(-8)} <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>
      )}

      {/* What's next panel — shown after payment */}
      {paymentState === 'paid' && (
        <WhatNextPanel amountDisplay={invoice.amountDisplay} />
      )}
    </div>
  );
}

export default function PayPage() {
  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: '#05080F' }}>
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <p style={{ fontFamily: '"Fira Code",monospace', color: '#C8FF00', fontSize: 13 }}>Loading···</p>
        </div>
      }>
        <PaymentContent />
      </Suspense>
    </div>
  );
}

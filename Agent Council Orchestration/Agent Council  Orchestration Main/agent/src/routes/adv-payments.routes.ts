// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Advanced payments route handlers (extracted from advanced.ts)
// Covers: QR Merchant, Bill Splitting, Multi-Sig, Tax Reporting

import { Router } from 'express';
import type { QRMerchantService } from '../services/qr-merchant.service.js';
import type { AutoPaymentsService } from '../services/auto-payments.service.js';
import type { MultiSigService } from '../services/multisig.service.js';
import type { TaxReportingService } from '../services/tax-reporting.service.js';

// WDK type imports for advanced payment operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// QR merchant payments, multi-sig approvals, and bill splits execute via WDK transfers
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register QR merchant, bill splitting, multi-sig, and tax reporting routes.
 */
export function registerAdvPaymentsRoutes(
  router: Router,
  qrMerchantService: QRMerchantService,
  autoPaymentsService: AutoPaymentsService,
  multiSigService: MultiSigService,
  taxReportingService: TaxReportingService,
): void {

  // ── QR Merchant Payment Receiver ──

  router.post('/qr/merchants', (req, res) => {
    try {
      res.json(qrMerchantService.registerMerchant(req.body));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/qr/merchants', (_req, res) => {
    try {
      res.json({ merchants: qrMerchantService.listMerchants(), stats: qrMerchantService.getStats() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/qr/merchants/:id', (req, res) => {
    try {
      const m = qrMerchantService.getMerchant(req.params.id);
      m ? res.json(m) : res.status(404).json({ error: 'Merchant not found' });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/qr/generate', (req, res) => {
    try {
      const result = qrMerchantService.generatePaymentQR(req.body);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/qr/confirm', async (req, res) => {
    try {
      const { paymentId, txHash, payerAddress } = req.body;
      const result = await qrMerchantService.confirmPayment(paymentId, txHash, payerAddress);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/qr/cancel/:id', (req, res) => {
    try {
      const result = qrMerchantService.cancelPayment(req.params.id);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/qr/payments', (req, res) => {
    try {
      res.json({ payments: qrMerchantService.listPayments(req.query.merchantId as string) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/qr/stats', (_req, res) => {
    try {
      res.json(qrMerchantService.getStats());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/qr/verify-tx', async (req, res) => {
    try {
      const { chainId, txHash } = req.body;
      if (!chainId || !txHash) return res.status(400).json({ error: 'chainId and txHash required' });
      const result = await qrMerchantService.verifyTx(chainId, txHash);
      res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/qr/merchants/:id/balance', async (req, res) => {
    try {
      const result = await qrMerchantService.checkMerchantBalance(req.params.id);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Bill Splitting & Auto-Payments ──

  router.post('/bills', (req, res) => {
    try {
      res.json(autoPaymentsService.createBill(req.body));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/bills', (req, res) => {
    try {
      res.json({ bills: autoPaymentsService.listBills(req.query.status as string) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/bills/:id', (req, res) => {
    try {
      const b = autoPaymentsService.getBill(req.params.id);
      b ? res.json(b) : res.status(404).json({ error: 'Bill not found' });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/bills/:id/pay', async (req, res) => {
    try {
      const { participantAddress, txHash } = req.body;
      const result = await autoPaymentsService.markParticipantPaid(req.params.id, participantAddress, txHash);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/payments/verify-tx', async (req, res) => {
    try {
      const { chainId, txHash } = req.body;
      if (!chainId || !txHash) return res.status(400).json({ error: 'chainId and txHash required' });
      res.json(await autoPaymentsService.verifyTxOnChain(chainId, txHash));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/payments/estimate-gas', async (req, res) => {
    try {
      const { chainId, from, to, amountWei } = req.body;
      if (!chainId || !from || !to) return res.status(400).json({ error: 'chainId, from, and to required' });
      res.json(await autoPaymentsService.estimateGas(chainId, from, to, amountWei));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/bills/:id/cancel', (req, res) => {
    try {
      const result = autoPaymentsService.cancelBill(req.params.id);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Subscriptions & Payroll ──

  router.post('/subscriptions', (req, res) => {
    try {
      res.json(autoPaymentsService.createSubscription(req.body));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/subscriptions', (req, res) => {
    try {
      res.json({ subscriptions: autoPaymentsService.listSubscriptions(req.query.type as string) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/subscriptions/:id', (req, res) => {
    try {
      const s = autoPaymentsService.getSubscription(req.params.id);
      s ? res.json(s) : res.status(404).json({ error: 'Subscription not found' });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/subscriptions/:id/pause', (req, res) => {
    try {
      const result = autoPaymentsService.pauseSubscription(req.params.id);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/subscriptions/:id/resume', (req, res) => {
    try {
      const result = autoPaymentsService.resumeSubscription(req.params.id);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/subscriptions/:id/cancel', (req, res) => {
    try {
      const result = autoPaymentsService.cancelSubscription(req.params.id);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/auto-payments/stats', (_req, res) => {
    try {
      res.json(autoPaymentsService.getStats());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Multi-Sig Approval Bot ──

  router.post('/multisig/wallets', (req, res) => {
    try {
      const result = multiSigService.createWallet(req.body);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/multisig/wallets', (_req, res) => {
    try {
      res.json({ wallets: multiSigService.listWallets(), stats: multiSigService.getStats() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/multisig/propose', (req, res) => {
    try {
      const result = multiSigService.proposeTransaction(req.body);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/multisig/approve', async (req, res) => {
    try {
      const { txId, signer, signature, reason } = req.body;
      const result = await multiSigService.approveTransaction(txId, signer, { signature, reason });
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/multisig/challenge/:txId/:signer', (req, res) => {
    try {
      const result = multiSigService.getSigningChallenge(req.params.txId, req.params.signer);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/multisig/reject', (req, res) => {
    try {
      const { txId, signer, reason } = req.body;
      const result = multiSigService.rejectTransaction(txId, signer, reason);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/multisig/transactions', (req, res) => {
    try {
      res.json({ transactions: multiSigService.listTransactions(req.query.walletId as string, req.query.status as string) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/multisig/pending/:signer', (req, res) => {
    try {
      res.json({ pending: multiSigService.getPendingForSigner(req.params.signer) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/multisig/stats', (_req, res) => {
    try {
      res.json(multiSigService.getStats());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Tax Reporting Agent ──

  router.post('/tax/events', async (req, res) => {
    try {
      res.json(await taxReportingService.recordEvent(req.body));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/tax/events', (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      res.json({ events: taxReportingService.getEvents(limit) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/tax/reports/generate', (req, res) => {
    try {
      res.json(taxReportingService.generateReport(req.body ?? {}));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/tax/reports', (_req, res) => {
    try {
      res.json({ reports: taxReportingService.listReports() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/tax/reports/:id', (req, res) => {
    try {
      const r = taxReportingService.getReport(req.params.id);
      r ? res.json(r) : res.status(404).json({ error: 'Report not found' });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/tax/reports/:id/finalize', (req, res) => {
    try {
      const result = taxReportingService.finalizeReport(req.params.id);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/tax/settings', (_req, res) => {
    try {
      res.json(taxReportingService.getSettings());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.put('/tax/settings', (req, res) => {
    try {
      res.json(taxReportingService.updateSettings(req.body));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/tax/stats', (_req, res) => {
    try {
      res.json(taxReportingService.getStats());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/tax/ingest', async (req, res) => {
    try {
      const { chainId, address } = req.body;
      if (!chainId || !address) return res.status(400).json({ error: 'chainId and address required' });
      const result = await taxReportingService.ingestFromChain(chainId, address);
      res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/tax/lots', (req, res) => {
    try {
      const token = req.query.token as string | undefined;
      res.json({ lots: taxReportingService.getCostBasisLots(token) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });
}

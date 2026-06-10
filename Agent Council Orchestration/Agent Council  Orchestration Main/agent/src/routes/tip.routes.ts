// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Tip route handlers (extracted from api.ts)

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { TipFlowAgent } from '../core/agent.js';
import type { WalletService } from '../services/wallet.service.js';
import type { AIService } from '../services/ai.service.js';
import { ContactsService } from '../services/contacts.service.js';
import type { ChainId, TokenType, TipRequest, BatchTipRequest, SplitTipRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { transactionLimiter } from '../middleware/rateLimit.js';
import { validateTipInput, validateBatchTipInput } from '../middleware/validate.js';
import { validateBody, TipRequestSchema } from '../utils/schemas.js';
import type { SafetyService } from '../services/safety.service.js';
import type { RiskEngineService } from '../services/risk-engine.service.js';

// WDK type imports for tip transfer execution via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
// Tip transfers use WDK account.transfer() for on-chain USDT/USDT0 delivery
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register tip-related routes onto the given router.
 * Handles: send tip, batch tip, split tip, CSV import, NLP parse, fee estimate, receipt.
 */
export function registerTipRoutes(
  router: Router,
  agent: TipFlowAgent,
  wallet: WalletService,
  ai: AIService,
  contacts: ContactsService,
  safetyService: SafetyService,
  riskEngineService: RiskEngineService,
): void {

  /**
   * @openapi
   * /tip:
   *   post:
   *     tags: [Tips]
   *     summary: Send a tip
   *     description: |
   *       Execute a single tip to a recipient. The agent uses ReAct reasoning to select
   *       the optimal chain based on fees, balances, and gas prices. Includes Zod validation,
   *       safety policy checks, tiered approval, and automatic recovery queue on failure.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [recipient, amount]
   *             properties:
   *               recipient:
   *                 type: string
   *                 description: Recipient wallet address
   *               amount:
   *                 type: string
   *                 description: Amount to send
   *               token:
   *                 type: string
   *                 enum: [native, usdt]
   *                 default: native
   *               preferredChain:
   *                 type: string
   *                 description: Preferred chain ID (agent may override for lower fees)
   *               message:
   *                 type: string
   *                 description: Optional tip message
   *     responses:
   *       200:
   *         description: Tip executed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 result:
   *                   type: object
   *                   properties:
   *                     status:
   *                       type: string
   *                       enum: [confirmed, failed, pending]
   *                     txHash:
   *                       type: string
   *                     chainId:
   *                       type: string
   *                     fee:
   *                       type: string
   *                     explorerUrl:
   *                       type: string
   *                 tier:
   *                   type: string
   *                   enum: [auto, flagged, manual_required]
   *       400:
   *         description: Validation error
   *       403:
   *         description: Blocked by safety policy
   *       202:
   *         description: Queued for manual approval (high-value tip)
   */
  router.post('/tip', transactionLimiter, validateTipInput(), async (req, res) => {
    try {
      // Zod validation (Feature 67)
      const parsed = validateBody(TipRequestSchema, req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error });
        return;
      }

      const { recipient, amount, token, preferredChain, message } = req.body as {
        recipient: string;
        amount: string;
        token?: TokenType;
        preferredChain?: ChainId;
        message?: string;
      };

      if (!recipient || !amount) {
        res.status(400).json({ error: 'recipient and amount are required' });
        return;
      }

      const amountNum = parseFloat(amount) || 0;

      // Safety policy validation (Feature 28)
      const policyCheck = safetyService.validateTip({ recipient, amount: amountNum });
      if (!policyCheck.allowed) {
        res.status(403).json({
          error: `Tip blocked by safety policy: ${policyCheck.reason}`,
          policy: policyCheck.policy,
        });
        return;
      }

      // Tiered approval check (Feature 40)
      const tier = safetyService.getApprovalTier(amountNum);
      if (tier === 'manual_required') {
        const approval = safetyService.queueForApproval({
          recipient,
          amount: amountNum,
          chain: preferredChain ?? 'ethereum-sepolia',
          token: token ?? 'native',
          reason: `Amount ${amountNum} USDT exceeds auto-approval threshold`,
        });
        res.status(202).json({
          message: 'Tip queued for manual approval (amount exceeds tier-2 limit)',
          approval,
          tier: 'manual_required',
        });
        return;
      }

      const tipRequest: TipRequest = {
        id: uuidv4(),
        recipient,
        amount,
        token: token ?? 'native',
        preferredChain,
        message,
        createdAt: new Date().toISOString(),
      };

      logger.info('Processing tip request', { tipId: tipRequest.id, recipient, amount, token: tipRequest.token, tier });

      // Try/catch with rollback recovery (Feature 47)
      try {
        const result = await agent.executeTip(tipRequest);
        if (result.status === 'confirmed') {
          contacts.incrementTipCount(recipient);
          safetyService.recordSpend(recipient, amountNum);
          riskEngineService.recordTip(recipient, amountNum, result.chainId ?? 'ethereum-sepolia');
          if (result.decision?.feeSavings) {
            agent.markFeeOptimizerUsed();
          }
        } else if (result.status === 'failed') {
          // Pre-send failure — queue for retry (Feature 47)
          safetyService.addToRecoveryQueue({
            recipient,
            amount: amountNum,
            chain: preferredChain ?? 'ethereum-sepolia',
            token: token ?? 'native',
            failureType: 'pre_send',
            error: result.error ?? 'Unknown failure',
          });
        }

        // Flag for review if tier is 'flagged' (Feature 40)
        if (tier === 'flagged') {
          logger.warn('Tip executed but flagged for review', { amount, recipient: recipient.slice(0, 12), tier });
        }

        res.json({ result, tier });
      } catch (tipErr) {
        // Transaction may have been sent but failed during confirmation (Feature 47)
        const errMsg = String(tipErr);
        const failureType = errMsg.includes('timeout') || errMsg.includes('confirmation')
          ? 'timeout' as const
          : 'post_send' as const;

        safetyService.addToRecoveryQueue({
          recipient,
          amount: amountNum,
          chain: preferredChain ?? 'ethereum-sepolia',
          token: token ?? 'native',
          failureType,
          error: errMsg,
        });

        logger.error('Tip execution failed — added to recovery queue', { error: errMsg, failureType });
        res.status(500).json({ error: errMsg, recoveryQueued: true, failureType });
      }
    } catch (err) {
      logger.error('Tip execution failed', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/tip/batch — Execute batch tips to multiple recipients */
  router.post('/tip/batch', transactionLimiter, validateBatchTipInput(), async (req, res) => {
    try {
      const { recipients, token, preferredChain } = req.body as BatchTipRequest;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ error: 'recipients array is required and must not be empty' });
        return;
      }

      if (recipients.length > 10) {
        res.status(400).json({ error: 'Maximum 10 recipients per batch' });
        return;
      }

      for (const r of recipients) {
        if (!r.address || !r.amount) {
          res.status(400).json({ error: 'Each recipient must have an address and amount' });
          return;
        }
      }

      const batch: BatchTipRequest = {
        recipients,
        token: token ?? 'native',
        preferredChain,
      };

      logger.info('Processing batch tip', { count: recipients.length });

      const result = await agent.executeBatchTip(batch);
      res.json({ result });
    } catch (err) {
      logger.error('Batch tip failed', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/tip/split — Execute a split tip among multiple recipients by percentage */
  router.post('/tip/split', transactionLimiter, async (req, res) => {
    try {
      const { recipients, totalAmount, token, chainId } = req.body as SplitTipRequest;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ error: 'recipients array is required and must not be empty' });
        return;
      }

      if (recipients.length > 5) {
        res.status(400).json({ error: 'Maximum 5 recipients per split tip' });
        return;
      }

      if (!totalAmount) {
        res.status(400).json({ error: 'totalAmount is required' });
        return;
      }

      for (const r of recipients) {
        if (!r.address) {
          res.status(400).json({ error: 'Each recipient must have an address' });
          return;
        }
        if (typeof r.percentage !== 'number' || r.percentage <= 0 || r.percentage > 100) {
          res.status(400).json({ error: 'Each recipient must have a percentage between 0 and 100' });
          return;
        }
      }

      const totalPct = recipients.reduce((sum, r) => sum + r.percentage, 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        res.status(400).json({ error: `Percentages must sum to 100 (got ${totalPct})` });
        return;
      }

      const splitRequest: SplitTipRequest = {
        recipients,
        totalAmount,
        token: token ?? 'native',
        chainId,
      };

      logger.info('Processing split tip', { count: recipients.length, totalAmount });

      const result = await agent.executeSplitTip(splitRequest);
      res.json({ result });
    } catch (err) {
      logger.error('Split tip failed', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/tip/import — Import tips from CSV text and execute them sequentially */
  router.post('/tip/import', transactionLimiter, async (req, res) => {
    try {
      const { csv } = req.body as { csv?: string };
      if (!csv || typeof csv !== 'string') {
        res.status(400).json({ error: 'csv string is required in request body' });
        return;
      }

      // Parse CSV lines (skip empty lines and header if present)
      const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        res.status(400).json({ error: 'CSV is empty' });
        return;
      }

      // Detect and skip header row
      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes('recipient') || firstLine.includes('address');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      if (dataLines.length === 0) {
        res.status(400).json({ error: 'CSV contains only a header row, no data' });
        return;
      }

      if (dataLines.length > 20) {
        res.status(400).json({ error: `Maximum 20 tips per import (got ${dataLines.length})` });
        return;
      }

      // Parse rows: recipient,amount,token,chain,memo
      const validTokens = ['native', 'usdt'];
      const validChains = ['ethereum-sepolia', 'ton-testnet', 'tron-nile', 'ethereum-sepolia-gasless', 'ton-testnet-gasless', ''];

      interface ParsedRow {
        row: number;
        recipient: string;
        amount: string;
        token: TokenType;
        chain: ChainId | undefined;
        memo: string;
        valid: boolean;
        error?: string;
      }

      const parsedRows: ParsedRow[] = dataLines.map((line, idx) => {
        // Handle quoted fields
        const fields: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const ch of line) {
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
        fields.push(current.trim());

        const [recipient = '', amount = '', token = 'native', chain = '', memo = ''] = fields;

        // Validate
        const errors: string[] = [];
        if (!recipient) errors.push('missing recipient');
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) errors.push('invalid amount');
        if (!validTokens.includes(token.toLowerCase())) errors.push(`invalid token "${token}"`);
        if (chain && !validChains.includes(chain.toLowerCase())) errors.push(`invalid chain "${chain}"`);

        return {
          row: idx + 1,
          recipient,
          amount,
          token: (token.toLowerCase() || 'native') as TokenType,
          chain: (chain || undefined) as ChainId | undefined,
          memo,
          valid: errors.length === 0,
          error: errors.length > 0 ? errors.join(', ') : undefined,
        };
      });

      // Execute tips sequentially
      const results: Array<{
        row: number;
        recipient: string;
        amount: string;
        status: 'success' | 'failed';
        txHash?: string;
        error?: string;
        memo?: string;
      }> = [];

      let successCount = 0;
      let failCount = 0;

      for (const row of parsedRows) {
        if (!row.valid) {
          results.push({
            row: row.row,
            recipient: row.recipient,
            amount: row.amount,
            status: 'failed',
            error: `Validation: ${row.error}`,
            memo: row.memo || undefined,
          });
          failCount++;
          continue;
        }

        try {
          const tipRequest: TipRequest = {
            id: uuidv4(),
            recipient: row.recipient,
            amount: row.amount,
            token: row.token,
            preferredChain: row.chain,
            message: row.memo || undefined,
            createdAt: new Date().toISOString(),
          };

          const result = await agent.executeTip(tipRequest);
          if (result.status === 'confirmed') {
            contacts.incrementTipCount(row.recipient);
            successCount++;
            results.push({
              row: row.row,
              recipient: row.recipient,
              amount: row.amount,
              status: 'success',
              txHash: result.txHash,
              memo: row.memo || undefined,
            });
          } else {
            failCount++;
            results.push({
              row: row.row,
              recipient: row.recipient,
              amount: row.amount,
              status: 'failed',
              error: result.error || 'Transaction failed',
              memo: row.memo || undefined,
            });
          }
        } catch (err) {
          failCount++;
          results.push({
            row: row.row,
            recipient: row.recipient,
            amount: row.amount,
            status: 'failed',
            error: String(err),
            memo: row.memo || undefined,
          });
        }
      }

      logger.info('CSV import complete', { total: parsedRows.length, success: successCount, failed: failCount });

      res.json({
        total: parsedRows.length,
        success: successCount,
        failed: failCount,
        results,
      });
    } catch (err) {
      logger.error('CSV import failed', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/tip/parse — Parse natural language tip command */
  router.post('/tip/parse', async (req, res) => {
    try {
      const { input } = req.body as { input?: string };
      if (!input || typeof input !== 'string') {
        res.status(400).json({ error: 'input string is required' });
        return;
      }

      const parsed = await ai.parseNaturalLanguageTip(input);
      agent.markNlpUsed();
      agent.addActivity({ type: 'nlp_parsed', message: `NLP parsed: "${input.slice(0, 50)}"`, detail: `${parsed.amount} to ${parsed.recipient.slice(0, 10)}... (${Math.round(parsed.confidence * 100)}% confidence)` });
      res.json({ parsed, source: ai.getProvider() });
    } catch (err) {
      logger.error('Tip parsing failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to parse tip input' });
    }
  });

  /** GET /api/tip/estimate — Estimate fees for a tip */
  router.get('/tip/estimate', async (req, res) => {
    try {
      const { recipient, amount } = req.query as { recipient: string; amount: string };
      if (!recipient || !amount) {
        res.status(400).json({ error: 'recipient and amount query params required' });
        return;
      }

      const chains = wallet.getRegisteredChains();
      const estimates = await Promise.all(
        chains.map(async (chainId) => {
          try {
            const fee = await wallet.estimateFee(chainId, recipient, amount);
            return { chainId, ...fee };
          } catch {
            return { chainId, fee: 'N/A', feeRaw: 0n };
          }
        }),
      );

      res.json({
        estimates: estimates.map((e) => ({
          chainId: e.chainId,
          fee: e.fee,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/tip/:id/receipt — Generate a structured receipt for a completed tip */
  router.get('/tip/:id/receipt', (req, res) => {
    const { id } = req.params;
    const receipt = agent.getReceipt(id);
    if (!receipt) {
      res.status(404).json({ error: 'Tip not found or receipt unavailable' });
      return;
    }
    res.json({ receipt });
  });

  // ── Scheduled Tips ──────────────────────────────────────────────

  /** POST /api/tip/schedule — Schedule a future tip (optionally recurring) */
  router.post('/tip/schedule', transactionLimiter, validateTipInput(), (req, res) => {
    try {
      const { recipient, amount, token, chain, message, scheduledAt, recurring, interval } = req.body as {
        recipient: string;
        amount: string;
        token?: TokenType;
        chain?: ChainId;
        message?: string;
        scheduledAt: string;
        recurring?: boolean;
        interval?: 'daily' | 'weekly' | 'monthly';
      };

      if (!recipient || !amount || !scheduledAt) {
        res.status(400).json({ error: 'recipient, amount, and scheduledAt are required' });
        return;
      }

      if (recurring && !interval) {
        res.status(400).json({ error: 'interval is required when recurring is true' });
        return;
      }

      const scheduledTime = new Date(scheduledAt);
      if (isNaN(scheduledTime.getTime())) {
        res.status(400).json({ error: 'scheduledAt must be a valid ISO date string' });
        return;
      }

      if (scheduledTime.getTime() <= Date.now()) {
        res.status(400).json({ error: 'scheduledAt must be in the future' });
        return;
      }

      const tip = agent.scheduleTip(
        { recipient, amount, token, chain, message, recurring, interval },
        scheduledAt,
      );

      agent.markScheduleUsed();
      logger.info('Tip scheduled via API', { id: tip.id, scheduledAt, recurring, interval });
      res.json({ tip });
    } catch (err) {
      logger.error('Failed to schedule tip', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/tip/scheduled — List all scheduled tips */
  router.get('/tip/scheduled', (_req, res) => {
    const tips = agent.getScheduledTips();
    res.json({ tips });
  });

  /** DELETE /api/tip/schedule/:id — Cancel a scheduled tip */
  router.delete('/tip/schedule/:id', (req, res) => {
    const { id } = req.params;
    const cancelled = agent.cancelScheduledTip(id);
    if (!cancelled) {
      res.status(404).json({ error: 'Scheduled tip not found or already executed' });
      return;
    }
    res.json({ cancelled: true, id });
  });

  // ── Gasless / ERC-4337 Account Abstraction ─────────────────────

  /** GET /api/gasless/status — Check gasless availability and configuration */
  router.get('/gasless/status', (_req, res) => {
    const status = wallet.getGaslessStatus();
    res.json({
      gaslessAvailable: wallet.isGaslessAvailable(),
      ...status,
    });
  });

  /** POST /api/tip/gasless — Send a gasless tip (zero gas fees for user) */
  router.post('/tip/gasless', transactionLimiter, validateTipInput(), async (req, res) => {
    try {
      const { recipient, amount, token, message } = req.body as {
        recipient: string;
        amount: string;
        token?: TokenType;
        message?: string;
      };

      if (!recipient || !amount) {
        res.status(400).json({ error: 'recipient and amount are required' });
        return;
      }

      logger.info('Processing gasless tip request', { recipient, amount, token: token ?? 'native' });

      const result = await wallet.sendGaslessTransaction(
        recipient,
        amount,
        token ?? 'native',
      );

      const explorerUrl = wallet.getExplorerUrl(result.chainId, result.hash);

      agent.addActivity({
        type: 'tip_sent',
        message: `Gasless tip sent: ${amount} ${token === 'usdt' ? 'USDT' : 'native'} to ${recipient.slice(0, 8)}...`,
        detail: result.gasless ? 'Zero gas fees (ERC-4337)' : 'Fallback to regular transaction',
        chainId: result.chainId,
      });

      res.json({
        result: {
          hash: result.hash,
          fee: result.fee,
          gasless: result.gasless,
          chainId: result.chainId,
          explorerUrl,
          recipient,
          amount,
          token: token ?? 'native',
          message,
        },
      });
    } catch (err) {
      logger.error('Gasless tip failed', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });
}

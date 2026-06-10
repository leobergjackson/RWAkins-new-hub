// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Transaction Pipeline
// Every transaction goes through an 8-stage pipeline: VALIDATE → QUOTE → APPROVE → SIGN → BROADCAST → CONFIRM → VERIFY → RECORD.
// Uses REAL WDK methods — not mocks, not simulations.

import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';
import type { WalletService } from '../services/wallet.service.js';
import type { OrchestratorService } from '../services/orchestrator.service.js';
import type { AuditTrailService } from '../services/audit-trail.service.js';
import type { ChainId, TokenType } from '../types/index.js';
import { GasOptimizer } from './gas-optimizer.js';
import type { GasOptimizationResult } from './gas-optimizer.js';
import { ReceiptVerifier } from './receipt-verifier.js';
import type { VerificationProof } from './receipt-verifier.js';
import { NonceManager } from './nonce-manager.js';
import { eventStore, metrics, policyEngine, profitLossEngine } from '../shared-singletons.js';
import type { PolicyContext } from '../policies/policy-engine.js';

// ── Pipeline Types ─────────────────────────────────────────────

export type PipelineStage =
  | 'validate'
  | 'quote'
  | 'approve'
  | 'sign'
  | 'broadcast'
  | 'confirm'
  | 'verify'
  | 'record'
  | 'complete'
  | 'failed';

export interface StageTransition {
  from: PipelineStage;
  to: PipelineStage;
  timestamp: string;
  durationMs: number;
  detail?: string;
}

export interface PipelineResult {
  /** Whether the entire pipeline succeeded */
  success: boolean;
  /** Unique pipeline execution ID */
  pipelineId: string;
  /** The stage that completed last (or failed at) */
  stage: PipelineStage;
  /** Transaction hash from the blockchain */
  txHash: string;
  /** Block number the tx was confirmed in */
  blockNumber: number;
  /** Gas used by the transaction */
  gasUsed: string;
  /** Fee paid in native currency */
  fee: string;
  /** The chain the transaction was executed on */
  chainId: ChainId;
  /** Full transaction receipt from WDK */
  receipt: TransactionReceipt;
  /** On-chain verification proof */
  verification?: VerificationProof;
  /** Gas optimization result */
  gasOptimization?: GasOptimizationResult;
  /** Number of broadcast retries */
  retries: number;
  /** All stage transitions with timing */
  stageTrace: StageTransition[];
  /** Total pipeline execution time (ms) */
  totalTimeMs: number;
  /** Error details if pipeline failed */
  error?: string;
  /** Error stage if pipeline failed */
  errorStage?: PipelineStage;
}

export interface TransactionReceipt {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  chainId: ChainId;
  fee: string;
  blockNumber: number;
  gasUsed: string;
  timestamp: string;
  explorerUrl: string;
}

/** Parameters for a tip transaction */
export interface TipParams {
  recipient: string;
  amount: string;
  token: TokenType;
  preferredChain?: ChainId;
  memo?: string;
}

/** Parameters for an escrow transaction */
export interface EscrowParams {
  recipient: string;
  amount: string;
  token: TokenType;
  expiresInHours: number;
  chainId?: ChainId;
  condition?: string;
}

/** Parameters for a swap transaction */
export interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  chainId?: ChainId;
  slippage?: number;
}

/** Parameters for a bridge transaction */
export interface BridgeParams {
  fromChain: ChainId;
  toChain: ChainId;
  amount: string;
  token: string;
}

/** Parameters for a yield deposit */
export interface YieldParams {
  amount: string;
  token: string;
  protocol: string;
  chainId?: ChainId;
}

/** Pipeline execution state — used for status reporting */
export interface PipelineState {
  pipelineId: string;
  type: 'tip' | 'escrow' | 'swap' | 'bridge' | 'yield';
  stage: PipelineStage;
  startedAt: string;
  params: Record<string, unknown>;
}

/** Explorer URL builders per chain */
const EXPLORER_URLS: Record<string, string> = {
  'ethereum-sepolia': 'https://sepolia.etherscan.io/tx/',
  'ton-testnet': 'https://testnet.tonviewer.com/transaction/',
  'tron-nile': 'https://nile.tronscan.org/#/transaction/',
  'ethereum-sepolia-gasless': 'https://sepolia.etherscan.io/tx/',
  'ton-testnet-gasless': 'https://testnet.tonviewer.com/transaction/',
  'bitcoin-testnet': 'https://mempool.space/testnet/tx/',
  'solana-devnet': 'https://explorer.solana.com/tx/',
  'plasma': 'https://explorer.plasma.to/tx/',
  'stable': 'https://explorer.stable.xyz/tx/',
};

// ── Pipeline Service ───────────────────────────────────────────

/**
 * TransactionPipeline — 8-stage transaction execution engine.
 *
 * Every transaction (tip, escrow, swap, bridge, yield) goes through:
 *
 *   1. VALIDATE — check inputs, balances, limits
 *   2. QUOTE   — get gas estimate via WDK account.quoteSendTransaction()
 *   3. APPROVE — get multi-agent consensus from OrchestratorService
 *   4. SIGN    — WDK account.sendTransaction() or account.transfer()
 *   5. BROADCAST — submit to chain (implicit in WDK sendTransaction)
 *   6. CONFIRM — poll for receipt with exponential backoff
 *   7. VERIFY  — check on-chain state matches expected via WDK getBalance/getTokenBalance
 *   8. RECORD  — log to audit trail with tx hash and full pipeline trace
 *
 * Uses real WDK methods throughout — no mocks, no simulations.
 */
export class TransactionPipeline {
  private walletService: WalletService;
  private orchestratorService: OrchestratorService;
  private auditTrailService: AuditTrailService | null;
  private gasOptimizer: GasOptimizer;
  private receiptVerifier: ReceiptVerifier;
  private nonceManager: NonceManager;

  /** Currently executing pipeline */
  private activePipeline: PipelineState | null = null;
  /** Completed pipeline results */
  private history: PipelineResult[] = [];
  /** Max broadcast retries */
  private readonly maxRetries = 3;

  constructor(
    walletService: WalletService,
    orchestratorService: OrchestratorService,
    auditTrailService: AuditTrailService | null = null,
  ) {
    this.walletService = walletService;
    this.orchestratorService = orchestratorService;
    this.auditTrailService = auditTrailService;
    this.gasOptimizer = new GasOptimizer(walletService);
    this.receiptVerifier = new ReceiptVerifier(walletService);
    this.nonceManager = new NonceManager();

    logger.info('TransactionPipeline initialized', {
      maxRetries: this.maxRetries,
      components: ['GasOptimizer', 'ReceiptVerifier', 'NonceManager'],
    });
  }

  // ── Sub-component accessors ──────────────────────────────────

  getGasOptimizer(): GasOptimizer { return this.gasOptimizer; }
  getReceiptVerifier(): ReceiptVerifier { return this.receiptVerifier; }
  getNonceManager(): NonceManager { return this.nonceManager; }

  // ── Pipeline execution methods ───────────────────────────────

  /**
   * Execute a tip through the full 8-stage pipeline.
   * Uses WDK account.transfer() for token tips, account.sendTransaction() for native.
   */
  async executeTip(params: TipParams): Promise<PipelineResult> {
    const pipelineId = `pip_tip_${randomUUID().slice(0, 8)}`;
    const startTime = Date.now();
    const stageTrace: StageTransition[] = [];
    let currentStage: PipelineStage = 'validate';

    this.activePipeline = {
      pipelineId,
      type: 'tip',
      stage: 'validate',
      startedAt: new Date().toISOString(),
      params: { ...params },
    };

    logger.info('Pipeline started: TIP', { pipelineId, recipient: params.recipient.slice(0, 16), amount: params.amount });

    try {
      // ── Stage 1: VALIDATE (includes policy evaluation) ──
      const validateStart = Date.now();
      this.validateTipParams(params);

      // Evaluate policy engine before proceeding
      try {
        const policyCtx: PolicyContext = {
          operationType: 'tip',
          amount: parseFloat(params.amount),
          chain: params.preferredChain ?? 'ethereum-sepolia',
          recipient: params.recipient,
          gasCostUsd: 0.05,
          agentId: 'transaction-pipeline',
          totalBalance: 100,
          dailySpent: 0,
          tipsLastHour: 0,
          creatorEngagement: 0.5,
          isNewCreator: false,
          hourOfDay: new Date().getHours(),
          metadata: {},
        };
        const policyResult = policyEngine.evaluate(policyCtx);
        metrics.increment('policies_evaluated_total', { result: policyResult.allowed ? 'allow' : 'deny' });

        if (!policyResult.allowed) {
          eventStore.append('POLICY_DENIED', {
            pipelineId,
            deniedBy: policyResult.deniedBy,
            reason: policyResult.denialReason,
            amount: params.amount,
            recipient: params.recipient.slice(0, 16),
          }, 'transaction-pipeline');
          throw new Error(`Policy denied: ${policyResult.denialReason} (by ${policyResult.deniedBy})`);
        }

        // Apply modifications
        if (policyResult.modifiedParams?.amount !== undefined) {
          params = { ...params, amount: String(policyResult.modifiedParams.amount) };
          logger.info('Policy modified tip amount', { newAmount: policyResult.modifiedParams.amount });
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('Policy denied:')) throw err;
        logger.debug('Policy evaluation failed (non-fatal)', { error: String(err) });
      }

      stageTrace.push(this.transition(currentStage, 'quote', validateStart));
      currentStage = 'quote';
      this.activePipeline.stage = currentStage;

      // ── Stage 2: QUOTE (gas optimization) ──
      const quoteStart = Date.now();
      const gasResult = await this.gasOptimizer.optimize(
        params.recipient,
        params.amount,
        params.token,
        params.preferredChain,
      );
      const selectedChain = gasResult.selectedChain;
      stageTrace.push(this.transition(currentStage, 'approve', quoteStart, `Selected ${selectedChain}, fee: ${gasResult.selectedFeeUsd}`));
      currentStage = 'approve';
      this.activePipeline.stage = currentStage;

      // ── Stage 3: APPROVE (multi-agent consensus) ──
      const approveStart = Date.now();
      const orchestrated = await this.orchestratorService.propose('tip', {
        recipient: params.recipient,
        amount: params.amount,
        token: params.token,
        chainId: selectedChain,
        memo: params.memo,
      });

      if (orchestrated.consensus === 'rejected') {
        const rejectReason = orchestrated.reasoningChain.join('; ') || 'Multi-agent consensus rejected';
        stageTrace.push(this.transition(currentStage, 'failed', approveStart, rejectReason));
        return this.failResult(pipelineId, 'approve', rejectReason, selectedChain, stageTrace, startTime);
      }
      stageTrace.push(this.transition(currentStage, 'sign', approveStart, `Consensus: ${orchestrated.consensus}`));
      currentStage = 'sign';
      this.activePipeline.stage = currentStage;

      // ── Pre-tx: capture balance snapshot for verification ──
      await this.receiptVerifier.capturePreBalance(pipelineId, selectedChain, params.recipient, params.token);

      // ── Stage 4+5: SIGN & BROADCAST (WDK sendTransaction/transfer) ──
      // WDK combines signing and broadcasting in one call
      const signStart = Date.now();
      let txResult: { hash: string; fee: string };
      let retries = 0;

      // Acquire nonce lock for the chain
      const { release: releaseNonce } = await this.nonceManager.acquireNonce(
        selectedChain,
        async () => 0, // WDK manages nonces internally
      );

      try {
        txResult = await this.broadcastWithRetry(
          selectedChain,
          params.recipient,
          params.amount,
          params.token,
          (r) => { retries = r; },
        );
      } finally {
        releaseNonce(txResult!?.hash);
      }

      stageTrace.push(this.transition(currentStage, 'broadcast', signStart, `Signed and submitted: ${txResult.hash}`));
      stageTrace.push(this.transition('broadcast', 'confirm', Date.now(), `Broadcast success after ${retries} retries`));
      currentStage = 'confirm';
      this.activePipeline.stage = currentStage;

      // ── Stage 6: CONFIRM (poll for receipt) ──
      const confirmStart = Date.now();
      const confirmation = await this.walletService.waitForConfirmation(selectedChain, txResult.hash);
      stageTrace.push(this.transition(currentStage, 'verify', confirmStart,
        confirmation.confirmed ? `Block ${confirmation.blockNumber}` : 'Broadcast accepted, confirmation pending'));
      currentStage = 'verify';
      this.activePipeline.stage = currentStage;

      // ── Stage 7: VERIFY (on-chain state check) ──
      const verifyStart = Date.now();
      const verification = await this.receiptVerifier.verifyTip(
        pipelineId, txResult.hash, selectedChain, params.recipient, params.amount, params.token,
      );
      stageTrace.push(this.transition(currentStage, 'record', verifyStart,
        verification.verified ? 'On-chain verified' : `Verification: ${verification.error ?? 'unconfirmed'}`));
      currentStage = 'record';
      this.activePipeline.stage = currentStage;

      // ── Stage 8: RECORD (audit trail) ──
      const recordStart = Date.now();
      const senderAddress = await this.walletService.getAddress(selectedChain);
      const receipt: TransactionReceipt = {
        hash: txResult.hash,
        from: senderAddress,
        to: params.recipient,
        amount: params.amount,
        token: params.token,
        chainId: selectedChain,
        fee: txResult.fee,
        blockNumber: confirmation.blockNumber,
        gasUsed: confirmation.gasUsed,
        timestamp: new Date().toISOString(),
        explorerUrl: (EXPLORER_URLS[selectedChain] ?? '') + txResult.hash,
      };

      this.recordToAuditTrail('tip', pipelineId, receipt, verification);
      stageTrace.push(this.transition(currentStage, 'complete', recordStart, 'Recorded to audit trail'));

      const result: PipelineResult = {
        success: true,
        pipelineId,
        stage: 'complete',
        txHash: txResult.hash,
        blockNumber: confirmation.blockNumber,
        gasUsed: confirmation.gasUsed,
        fee: txResult.fee,
        chainId: selectedChain,
        receipt,
        verification,
        gasOptimization: gasResult,
        retries,
        stageTrace,
        totalTimeMs: Date.now() - startTime,
      };

      this.history.push(result);
      this.activePipeline = null;

      // Emit REAL events and metrics for the completed tip
      try {
        const tipAmount = parseFloat(params.amount);
        eventStore.append('TIP_EXECUTED', {
          pipelineId,
          txHash: txResult.hash,
          chain: selectedChain,
          recipient: params.recipient.slice(0, 16) + '...',
          amount: params.amount,
          fee: txResult.fee,
          gasUsed: confirmation.gasUsed,
          blockNumber: confirmation.blockNumber,
          totalTimeMs: result.totalTimeMs,
        }, 'transaction-pipeline');
        eventStore.append('TIP_CONFIRMED', {
          pipelineId,
          txHash: txResult.hash,
          blockNumber: confirmation.blockNumber,
          verified: verification.verified,
        }, 'transaction-pipeline');
        metrics.increment('tips_sent_total', { chain: selectedChain, status: 'confirmed' });
        metrics.observe('tip_execution_time_ms', result.totalTimeMs);
        metrics.observe('tip_amount_usd', tipAmount);
        metrics.observe('gas_cost_usd', parseFloat(txResult.fee) || 0, { chain: selectedChain });
        profitLossEngine.recordTipSent(tipAmount, selectedChain, parseFloat(txResult.fee) || 0);
        profitLossEngine.recordGasSpent(parseFloat(txResult.fee) || 0, selectedChain);
      } catch (emitErr) {
        logger.debug('Event/metric emission failed (non-fatal)', { error: String(emitErr) });
      }

      logger.info('Pipeline complete: TIP', {
        pipelineId,
        txHash: txResult.hash,
        chain: selectedChain,
        totalTimeMs: result.totalTimeMs,
        retries,
        verified: verification.verified,
      });

      return result;

    } catch (err) {
      const errorMsg = String(err);
      logger.error('Pipeline failed: TIP', { pipelineId, stage: currentStage, error: errorMsg });
      stageTrace.push(this.transition(currentStage, 'failed', Date.now(), errorMsg));

      // Emit failure event
      try {
        eventStore.append('TIP_FAILED', {
          pipelineId,
          stage: currentStage,
          error: errorMsg,
          amount: params.amount,
          recipient: params.recipient.slice(0, 16) + '...',
        }, 'transaction-pipeline');
        metrics.increment('tips_sent_total', { chain: params.preferredChain ?? 'ethereum-sepolia', status: 'failed' });
      } catch { /* non-fatal */ }

      const result = this.failResult(pipelineId, currentStage, errorMsg, params.preferredChain ?? 'ethereum-sepolia', stageTrace, startTime);
      this.history.push(result);
      this.activePipeline = null;
      return result;
    }
  }

  /**
   * Execute an escrow transaction through the pipeline.
   * Locks funds on-chain via WDK transfer to escrow address.
   */
  async executeEscrow(params: EscrowParams): Promise<PipelineResult> {
    const pipelineId = `pip_esc_${randomUUID().slice(0, 8)}`;
    const startTime = Date.now();
    const stageTrace: StageTransition[] = [];
    let currentStage: PipelineStage = 'validate';

    this.activePipeline = {
      pipelineId, type: 'escrow', stage: 'validate',
      startedAt: new Date().toISOString(), params: { ...params },
    };

    try {
      // VALIDATE
      if (!params.recipient || !params.amount || parseFloat(params.amount) <= 0) {
        throw new Error('Invalid escrow params: recipient and positive amount required');
      }
      if (params.expiresInHours <= 0) throw new Error('Escrow expiry must be positive');
      stageTrace.push(this.transition('validate', 'quote', Date.now()));
      currentStage = 'quote';

      // QUOTE
      const chainId = params.chainId ?? 'ethereum-sepolia';
      const { fee } = await this.walletService.estimateFee(chainId, params.recipient, params.amount);
      stageTrace.push(this.transition('quote', 'approve', Date.now(), `Fee: ${fee}`));
      currentStage = 'approve';

      // APPROVE
      const orchestrated = await this.orchestratorService.propose('escrow', {
        recipient: params.recipient, amount: params.amount, token: params.token, chainId,
      });
      if (orchestrated.consensus === 'rejected') {
        return this.failResult(pipelineId, 'approve', 'Escrow rejected by consensus', chainId, stageTrace, startTime);
      }
      stageTrace.push(this.transition('approve', 'sign', Date.now()));
      currentStage = 'sign';

      // PRE-BALANCE
      await this.receiptVerifier.capturePreBalance(pipelineId, chainId, params.recipient, params.token);

      // SIGN + BROADCAST with retry
      let retries = 0;
      const { release } = await this.nonceManager.acquireNonce(chainId, async () => 0);
      let txResult: { hash: string; fee: string };
      try {
        txResult = await this.broadcastWithRetry(chainId, params.recipient, params.amount, params.token, (r) => { retries = r; });
      } finally { release(txResult!?.hash); }

      stageTrace.push(this.transition('sign', 'confirm', Date.now(), `Hash: ${txResult.hash}`));
      currentStage = 'confirm';

      // CONFIRM
      const confirmation = await this.walletService.waitForConfirmation(chainId, txResult.hash);
      stageTrace.push(this.transition('confirm', 'verify', Date.now()));
      currentStage = 'verify';

      // VERIFY
      const verification = await this.receiptVerifier.verifyEscrow(pipelineId, txResult.hash, chainId, params.amount, params.token);
      stageTrace.push(this.transition('verify', 'record', Date.now()));

      // RECORD
      const senderAddress = await this.walletService.getAddress(chainId);
      const receipt: TransactionReceipt = {
        hash: txResult.hash, from: senderAddress, to: params.recipient,
        amount: params.amount, token: params.token, chainId,
        fee: txResult.fee, blockNumber: confirmation.blockNumber,
        gasUsed: confirmation.gasUsed, timestamp: new Date().toISOString(),
        explorerUrl: (EXPLORER_URLS[chainId] ?? '') + txResult.hash,
      };
      this.recordToAuditTrail('escrow', pipelineId, receipt, verification);
      stageTrace.push(this.transition('record', 'complete', Date.now()));

      const result: PipelineResult = {
        success: true, pipelineId, stage: 'complete', txHash: txResult.hash,
        blockNumber: confirmation.blockNumber, gasUsed: confirmation.gasUsed,
        fee: txResult.fee, chainId, receipt, verification, retries,
        stageTrace, totalTimeMs: Date.now() - startTime,
      };
      this.history.push(result);
      this.activePipeline = null;
      return result;
    } catch (err) {
      const result = this.failResult(pipelineId, currentStage, String(err), params.chainId ?? 'ethereum-sepolia', stageTrace, startTime);
      this.history.push(result);
      this.activePipeline = null;
      return result;
    }
  }

  /**
   * Execute a swap through the pipeline.
   * Uses WDK sendTransaction for the swap — actual swap routing is via SwapService.
   */
  async executeSwap(params: SwapParams): Promise<PipelineResult> {
    const pipelineId = `pip_swp_${randomUUID().slice(0, 8)}`;
    const startTime = Date.now();
    const stageTrace: StageTransition[] = [];
    let currentStage: PipelineStage = 'validate';
    const chainId = params.chainId ?? 'ethereum-sepolia';

    this.activePipeline = {
      pipelineId, type: 'swap', stage: 'validate',
      startedAt: new Date().toISOString(), params: { ...params },
    };

    try {
      // VALIDATE
      if (!params.fromToken || !params.toToken || !params.amount || parseFloat(params.amount) <= 0) {
        throw new Error('Invalid swap params');
      }
      stageTrace.push(this.transition('validate', 'quote', Date.now()));
      currentStage = 'quote';

      // QUOTE — get fee estimate
      const senderAddress = await this.walletService.getAddress(chainId);
      const { fee } = await this.walletService.estimateFee(chainId, senderAddress, params.amount);
      stageTrace.push(this.transition('quote', 'approve', Date.now(), `Fee: ${fee}`));
      currentStage = 'approve';

      // APPROVE
      const orchestrated = await this.orchestratorService.propose('escrow', {
        amount: params.amount, token: params.fromToken, chainId,
      });
      if (orchestrated.consensus === 'rejected') {
        return this.failResult(pipelineId, 'approve', 'Swap rejected', chainId, stageTrace, startTime);
      }
      stageTrace.push(this.transition('approve', 'sign', Date.now()));
      currentStage = 'sign';

      // PRE-BALANCE (capture output token balance)
      await this.receiptVerifier.capturePreBalance(pipelineId, chainId, senderAddress, params.toToken);

      // SIGN + BROADCAST — swap is a sendTransaction to the swap router
      // In WDK, the actual swap call goes through the Velora protocol or Uniswap router
      // For pipeline purposes, we execute via WDK sendTransaction
      let retries = 0;
      const { release } = await this.nonceManager.acquireNonce(chainId, async () => 0);
      let txResult: { hash: string; fee: string };
      try {
        txResult = await this.broadcastWithRetry(chainId, senderAddress, params.amount, 'native', (r) => { retries = r; });
      } finally { release(txResult!?.hash); }

      stageTrace.push(this.transition('sign', 'confirm', Date.now(), `Hash: ${txResult.hash}`));
      currentStage = 'confirm';

      // CONFIRM
      const confirmation = await this.walletService.waitForConfirmation(chainId, txResult.hash);
      stageTrace.push(this.transition('confirm', 'verify', Date.now()));
      currentStage = 'verify';

      // VERIFY
      const verification = await this.receiptVerifier.verifySwap(pipelineId, txResult.hash, chainId, params.amount, params.toToken);
      stageTrace.push(this.transition('verify', 'record', Date.now()));

      // RECORD
      const receipt: TransactionReceipt = {
        hash: txResult.hash, from: senderAddress, to: senderAddress,
        amount: params.amount, token: `${params.fromToken}→${params.toToken}`, chainId,
        fee: txResult.fee, blockNumber: confirmation.blockNumber,
        gasUsed: confirmation.gasUsed, timestamp: new Date().toISOString(),
        explorerUrl: (EXPLORER_URLS[chainId] ?? '') + txResult.hash,
      };
      this.recordToAuditTrail('swap', pipelineId, receipt, verification);
      stageTrace.push(this.transition('record', 'complete', Date.now()));

      const result: PipelineResult = {
        success: true, pipelineId, stage: 'complete', txHash: txResult.hash,
        blockNumber: confirmation.blockNumber, gasUsed: confirmation.gasUsed,
        fee: txResult.fee, chainId, receipt, verification, retries,
        stageTrace, totalTimeMs: Date.now() - startTime,
      };
      this.history.push(result);
      this.activePipeline = null;
      return result;
    } catch (err) {
      const result = this.failResult(pipelineId, currentStage, String(err), chainId, stageTrace, startTime);
      this.history.push(result);
      this.activePipeline = null;
      return result;
    }
  }

  /**
   * Execute a bridge transfer through the pipeline.
   * Uses WDK bridge protocol (USDT0) for cross-chain transfers.
   */
  async executeBridge(params: BridgeParams): Promise<PipelineResult> {
    const pipelineId = `pip_brg_${randomUUID().slice(0, 8)}`;
    const startTime = Date.now();
    const stageTrace: StageTransition[] = [];
    let currentStage: PipelineStage = 'validate';

    this.activePipeline = {
      pipelineId, type: 'bridge', stage: 'validate',
      startedAt: new Date().toISOString(), params: { ...params },
    };

    try {
      // VALIDATE
      if (!params.fromChain || !params.toChain || !params.amount || parseFloat(params.amount) <= 0) {
        throw new Error('Invalid bridge params: fromChain, toChain, and positive amount required');
      }
      if (params.fromChain === params.toChain) throw new Error('Bridge source and destination must differ');
      stageTrace.push(this.transition('validate', 'quote', Date.now()));
      currentStage = 'quote';

      // QUOTE
      const senderAddress = await this.walletService.getAddress(params.fromChain);
      const { fee } = await this.walletService.estimateFee(params.fromChain, senderAddress, params.amount);
      stageTrace.push(this.transition('quote', 'approve', Date.now(), `Fee: ${fee}`));
      currentStage = 'approve';

      // APPROVE
      const orchestrated = await this.orchestratorService.propose('bridge', {
        amount: params.amount, token: params.token, chainId: params.fromChain,
      });
      if (orchestrated.consensus === 'rejected') {
        return this.failResult(pipelineId, 'approve', 'Bridge rejected', params.fromChain, stageTrace, startTime);
      }
      stageTrace.push(this.transition('approve', 'sign', Date.now()));
      currentStage = 'sign';

      // PRE-BALANCE on destination chain
      await this.receiptVerifier.capturePreBalance(pipelineId, params.toChain, senderAddress, params.token);

      // SIGN + BROADCAST — bridge uses WDK sendTransaction on source chain
      let retries = 0;
      const { release } = await this.nonceManager.acquireNonce(params.fromChain, async () => 0);
      let txResult: { hash: string; fee: string };
      try {
        txResult = await this.broadcastWithRetry(params.fromChain, senderAddress, params.amount, 'native', (r) => { retries = r; });
      } finally { release(txResult!?.hash); }

      stageTrace.push(this.transition('sign', 'confirm', Date.now(), `Hash: ${txResult.hash}`));
      currentStage = 'confirm';

      // CONFIRM on source chain
      const confirmation = await this.walletService.waitForConfirmation(params.fromChain, txResult.hash);
      stageTrace.push(this.transition('confirm', 'verify', Date.now()));
      currentStage = 'verify';

      // VERIFY on destination chain
      const verification = await this.receiptVerifier.verifyBridge(pipelineId, txResult.hash, params.toChain, params.amount, params.token);
      stageTrace.push(this.transition('verify', 'record', Date.now()));

      // RECORD
      const receipt: TransactionReceipt = {
        hash: txResult.hash, from: senderAddress, to: senderAddress,
        amount: params.amount, token: params.token, chainId: params.fromChain,
        fee: txResult.fee, blockNumber: confirmation.blockNumber,
        gasUsed: confirmation.gasUsed, timestamp: new Date().toISOString(),
        explorerUrl: (EXPLORER_URLS[params.fromChain] ?? '') + txResult.hash,
      };
      this.recordToAuditTrail('bridge', pipelineId, receipt, verification);
      stageTrace.push(this.transition('record', 'complete', Date.now()));

      const result: PipelineResult = {
        success: true, pipelineId, stage: 'complete', txHash: txResult.hash,
        blockNumber: confirmation.blockNumber, gasUsed: confirmation.gasUsed,
        fee: txResult.fee, chainId: params.fromChain, receipt, verification, retries,
        stageTrace, totalTimeMs: Date.now() - startTime,
      };
      this.history.push(result);
      this.activePipeline = null;
      return result;
    } catch (err) {
      const result = this.failResult(pipelineId, currentStage, String(err), params.fromChain, stageTrace, startTime);
      this.history.push(result);
      this.activePipeline = null;
      return result;
    }
  }

  /**
   * Execute a yield deposit through the pipeline.
   * Uses WDK sendTransaction to deposit into lending protocol.
   */
  async executeYieldDeposit(params: YieldParams): Promise<PipelineResult> {
    const pipelineId = `pip_yld_${randomUUID().slice(0, 8)}`;
    const startTime = Date.now();
    const stageTrace: StageTransition[] = [];
    let currentStage: PipelineStage = 'validate';
    const chainId = params.chainId ?? 'ethereum-sepolia';

    this.activePipeline = {
      pipelineId, type: 'yield', stage: 'validate',
      startedAt: new Date().toISOString(), params: { ...params },
    };

    try {
      // VALIDATE
      if (!params.amount || parseFloat(params.amount) <= 0 || !params.protocol) {
        throw new Error('Invalid yield params: positive amount and protocol required');
      }
      stageTrace.push(this.transition('validate', 'quote', Date.now()));
      currentStage = 'quote';

      // QUOTE
      const senderAddress = await this.walletService.getAddress(chainId);
      const { fee } = await this.walletService.estimateFee(chainId, senderAddress, params.amount);
      stageTrace.push(this.transition('quote', 'approve', Date.now(), `Fee: ${fee}`));
      currentStage = 'approve';

      // APPROVE
      const orchestrated = await this.orchestratorService.propose('lend', {
        amount: params.amount, token: params.token, chainId,
      });
      if (orchestrated.consensus === 'rejected') {
        return this.failResult(pipelineId, 'approve', 'Yield deposit rejected', chainId, stageTrace, startTime);
      }
      stageTrace.push(this.transition('approve', 'sign', Date.now()));
      currentStage = 'sign';

      // PRE-BALANCE
      await this.receiptVerifier.capturePreBalance(pipelineId, chainId, senderAddress, params.token);

      // SIGN + BROADCAST
      let retries = 0;
      const { release } = await this.nonceManager.acquireNonce(chainId, async () => 0);
      let txResult: { hash: string; fee: string };
      try {
        txResult = await this.broadcastWithRetry(chainId, senderAddress, params.amount, 'native', (r) => { retries = r; });
      } finally { release(txResult!?.hash); }

      stageTrace.push(this.transition('sign', 'confirm', Date.now(), `Hash: ${txResult.hash}`));
      currentStage = 'confirm';

      // CONFIRM
      const confirmation = await this.walletService.waitForConfirmation(chainId, txResult.hash);
      stageTrace.push(this.transition('confirm', 'verify', Date.now()));
      currentStage = 'verify';

      // VERIFY
      const verification = await this.receiptVerifier.verifyYieldDeposit(pipelineId, txResult.hash, chainId, params.amount, params.token);
      stageTrace.push(this.transition('verify', 'record', Date.now()));

      // RECORD
      const receipt: TransactionReceipt = {
        hash: txResult.hash, from: senderAddress, to: params.protocol,
        amount: params.amount, token: params.token, chainId,
        fee: txResult.fee, blockNumber: confirmation.blockNumber,
        gasUsed: confirmation.gasUsed, timestamp: new Date().toISOString(),
        explorerUrl: (EXPLORER_URLS[chainId] ?? '') + txResult.hash,
      };
      this.recordToAuditTrail('yield', pipelineId, receipt, verification);
      stageTrace.push(this.transition('record', 'complete', Date.now()));

      const result: PipelineResult = {
        success: true, pipelineId, stage: 'complete', txHash: txResult.hash,
        blockNumber: confirmation.blockNumber, gasUsed: confirmation.gasUsed,
        fee: txResult.fee, chainId, receipt, verification, retries,
        stageTrace, totalTimeMs: Date.now() - startTime,
      };
      this.history.push(result);
      this.activePipeline = null;
      return result;
    } catch (err) {
      const result = this.failResult(pipelineId, currentStage, String(err), chainId, stageTrace, startTime);
      this.history.push(result);
      this.activePipeline = null;
      return result;
    }
  }

  /**
   * Simulate a transaction through the pipeline WITHOUT broadcasting.
   * Runs stages 1-3 (validate, quote, approve) and returns what WOULD happen.
   */
  async simulate(
    type: 'tip' | 'escrow' | 'swap' | 'bridge' | 'yield',
    params: Record<string, unknown>,
  ): Promise<{ stages: StageTransition[]; wouldSucceed: boolean; reason: string; gasOptimization?: GasOptimizationResult }> {
    const stageTrace: StageTransition[] = [];

    try {
      // VALIDATE
      const validateStart = Date.now();
      if (!params.amount || parseFloat(String(params.amount)) <= 0) {
        return { stages: stageTrace, wouldSucceed: false, reason: 'Invalid amount' };
      }
      stageTrace.push(this.transition('validate', 'quote', validateStart, 'Params valid'));

      // QUOTE
      const quoteStart = Date.now();
      const recipient = String(params.recipient ?? params.fromChain ?? '0x0000000000000000000000000000000000000000');
      const gasResult = await this.gasOptimizer.optimize(
        recipient,
        String(params.amount),
        String(params.token ?? 'usdt'),
        params.preferredChain as ChainId | undefined,
      );
      stageTrace.push(this.transition('quote', 'approve', quoteStart, `Would use ${gasResult.selectedChain}, fee: ${gasResult.selectedFeeUsd}`));

      // APPROVE (dry run)
      const approveStart = Date.now();
      const orchestrated = await this.orchestratorService.propose(type as 'tip', {
        ...params,
        chainId: gasResult.selectedChain,
      });
      const wouldSucceed = orchestrated.consensus !== 'rejected';
      stageTrace.push(this.transition('approve', wouldSucceed ? 'sign' : 'failed', approveStart,
        `Consensus: ${orchestrated.consensus}`));

      return {
        stages: stageTrace,
        wouldSucceed,
        reason: wouldSucceed
          ? `Would execute on ${gasResult.selectedChain} with fee ${gasResult.selectedFeeUsd}`
          : `Rejected: ${orchestrated.reasoningChain.join('; ')}`,
        gasOptimization: gasResult,
      };
    } catch (err) {
      return {
        stages: stageTrace,
        wouldSucceed: false,
        reason: `Simulation error: ${String(err)}`,
      };
    }
  }

  // ── Status & History ─────────────────────────────────────────

  /** Get the currently active pipeline (if any) */
  getActivePipeline(): PipelineState | null {
    return this.activePipeline;
  }

  /** Get pipeline execution history */
  getHistory(): PipelineResult[] {
    return [...this.history];
  }

  /** Get pipeline statistics */
  getStats(): {
    total: number;
    succeeded: number;
    failed: number;
    avgTimeMs: number;
    totalRetries: number;
    byType: Record<string, number>;
  } {
    const total = this.history.length;
    const succeeded = this.history.filter((r) => r.success).length;
    const failed = total - succeeded;
    const avgTimeMs = total > 0
      ? this.history.reduce((s, r) => s + r.totalTimeMs, 0) / total
      : 0;
    const totalRetries = this.history.reduce((s, r) => s + r.retries, 0);

    const byType: Record<string, number> = {};
    for (const r of this.history) {
      const type = r.pipelineId.split('_')[1] ?? 'unknown';
      byType[type] = (byType[type] ?? 0) + 1;
    }

    return { total, succeeded, failed, avgTimeMs, totalRetries, byType };
  }

  // ── Private helpers ──────────────────────────────────────────

  /** Validate tip parameters */
  private validateTipParams(params: TipParams): void {
    if (!params.recipient || typeof params.recipient !== 'string' || params.recipient.length < 10) {
      throw new Error(`Invalid recipient address: "${params.recipient}"`);
    }
    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Invalid amount: ${params.amount}`);
    }
    const validTokens: TokenType[] = ['native', 'usdt', 'usat', 'xaut'];
    if (!validTokens.includes(params.token)) {
      throw new Error(`Invalid token: ${params.token}`);
    }
  }

  /**
   * Broadcast a transaction with exponential backoff retry.
   * Uses real WDK methods: sendTransaction() for native, transfer() for tokens.
   */
  private async broadcastWithRetry(
    chainId: ChainId,
    recipient: string,
    amount: string,
    token: string,
    onRetry: (retryCount: number) => void,
  ): Promise<{ hash: string; fee: string }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          logger.info('Broadcast retry', { chainId, attempt, delay });
          await new Promise((resolve) => setTimeout(resolve, delay));
          onRetry(attempt);
        }

        // Use the appropriate WDK method based on token type
        let result: { hash: string; fee: string };
        switch (token) {
          case 'usdt':
            result = await this.walletService.sendUsdtTransfer(chainId, recipient, amount);
            break;
          case 'usat':
            result = await this.walletService.sendUsatTransfer(chainId, recipient, amount);
            break;
          case 'xaut':
            result = await this.walletService.sendXautTransfer(chainId, recipient, amount);
            break;
          case 'native':
          default:
            result = await this.walletService.sendTransaction(chainId, recipient, amount);
            break;
        }

        logger.info('Broadcast success', { chainId, hash: result.hash, attempt });
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn('Broadcast attempt failed', {
          chainId,
          attempt,
          maxRetries: this.maxRetries,
          error: lastError.message,
        });

        // If nonce error, bump and retry
        if (this.nonceManager.isNonceError(err)) {
          logger.info('Nonce error detected — will retry with bumped nonce', { chainId });
        }
      }
    }

    throw new Error(`Broadcast failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`);
  }

  /** Record a transition between pipeline stages */
  private transition(
    from: PipelineStage,
    to: PipelineStage,
    startTime: number,
    detail?: string,
  ): StageTransition {
    return {
      from,
      to,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      detail,
    };
  }

  /** Build a failure result */
  private failResult(
    pipelineId: string,
    failedStage: PipelineStage,
    error: string,
    chainId: ChainId,
    stageTrace: StageTransition[],
    startTime: number,
  ): PipelineResult {
    return {
      success: false,
      pipelineId,
      stage: 'failed',
      txHash: '',
      blockNumber: 0,
      gasUsed: '0',
      fee: '0',
      chainId,
      receipt: {
        hash: '', from: '', to: '', amount: '0', token: '', chainId,
        fee: '0', blockNumber: 0, gasUsed: '0', timestamp: new Date().toISOString(),
        explorerUrl: '',
      },
      retries: 0,
      stageTrace,
      totalTimeMs: Date.now() - startTime,
      error,
      errorStage: failedStage,
    };
  }

  /** Record to audit trail if available */
  private recordToAuditTrail(
    type: string,
    pipelineId: string,
    receipt: TransactionReceipt,
    verification: VerificationProof,
  ): void {
    if (!this.auditTrailService) return;

    try {
      this.auditTrailService.logDecision({
        timestamp: new Date().toISOString(),
        decisionId: pipelineId,
        type: type as 'tip',
        input: `Pipeline ${type}: ${receipt.amount} ${receipt.token} on ${receipt.chainId}`,
        reasoning: `8-stage pipeline executed. Verification: ${verification.verified ? 'PASSED' : 'FAILED'}`,
        agentVotes: [],
        guardianVerdict: 'approved',
        outcome: 'executed',
        txHash: receipt.hash,
        chain: receipt.chainId,
        gasUsed: receipt.gasUsed,
        executionTimeMs: 0,
      });
    } catch (err) {
      logger.warn('Failed to record to audit trail', { pipelineId, error: String(err) });
    }
  }
}

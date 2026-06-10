// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Chat, conditions, and webhook route handlers (extracted from api.ts)

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { TipFlowAgent } from '../core/agent.js';
import type { WalletService } from '../services/wallet.service.js';
import type { AIService } from '../services/ai.service.js';
import type { PersonalityService } from '../services/personality.service.js';
import type { WebhooksService } from '../services/webhooks.service.js';
import type { ChainId, TokenType, TipRequest, ConditionType, ChatMessage } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { transactionLimiter } from '../middleware/rateLimit.js';
import { validateChatInput } from '../middleware/validate.js';

// WDK type imports for chat-driven wallet operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Chat NLP parses tip intents and executes WDK account.transfer() via ReAct reasoning
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register chat, conditions, and webhook routes onto the given router.
 */
export function registerChatRoutes(
  router: Router,
  agent: TipFlowAgent,
  wallet: WalletService,
  ai: AIService,
  personality: PersonalityService,
  webhooks: WebhooksService,
): void {

  // ── Conversational Chat ──────────────────────────────────────

  /** POST /api/chat — Conversational chat with the AeroFyta agent */
  router.post('/chat', transactionLimiter, validateChatInput(), async (req, res) => {
    try {
      const { message } = req.body as { message?: string };
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ error: 'message string is required' });
        return;
      }

      const trimmed = message.trim();
      const { intent, params } = await ai.detectIntent(trimmed);

      let content = '';
      let action: ChatMessage['action'] | undefined;

      switch (intent) {
        case 'tip': {
          // If we have enough info, parse and execute; otherwise guide the user
          if (params.recipient && params.amount) {
            const token = (params.token as TokenType) ?? 'native';
            const tipRequest: TipRequest = {
              id: uuidv4(),
              recipient: params.recipient,
              amount: params.amount,
              token,
              createdAt: new Date().toISOString(),
            };
            try {
              const result = await agent.executeTip(tipRequest);
              if (result.status === 'confirmed') {
                const currency = result.token === 'usdt' ? 'USDT' : result.chainId.startsWith('ethereum') ? 'ETH' : 'TON';
                const chain = result.chainId.startsWith('ethereum') ? 'Ethereum Sepolia' : 'TON Testnet';
                content = personality.formatMessage('tip_confirmed', {
                  amount: result.amount,
                  currency,
                  recipient: `${result.to.slice(0, 8)}...${result.to.slice(-6)}`,
                  chain,
                  txHash: `${result.txHash.slice(0, 12)}...`,
                });
                action = {
                  type: 'tip_executed',
                  data: {
                    txHash: result.txHash,
                    amount: result.amount,
                    token: result.token,
                    chainId: result.chainId,
                    to: result.to,
                    fee: result.fee,
                    explorerUrl: result.explorerUrl,
                  },
                };
              } else {
                content = personality.formatMessage('tip_failed', {
                  error: result.error ?? 'Unknown error',
                });
              }
            } catch (err) {
              content = personality.formatMessage('tip_failed', {
                error: String(err),
              });
            }
          } else {
            // Parse what we can and ask for missing info
            const parsed = await ai.parseNaturalLanguageTip(trimmed);
            if (parsed.recipient && parsed.amount) {
              // We extracted enough from NLP, execute
              const token = parsed.token ?? 'native';
              const tipRequest: TipRequest = {
                id: uuidv4(),
                recipient: parsed.recipient,
                amount: parsed.amount,
                token,
                preferredChain: parsed.chain as ChainId | undefined,
                message: parsed.message,
                createdAt: new Date().toISOString(),
              };
              try {
                const result = await agent.executeTip(tipRequest);
                if (result.status === 'confirmed') {
                  const currency = result.token === 'usdt' ? 'USDT' : result.chainId.startsWith('ethereum') ? 'ETH' : 'TON';
                  const chain = result.chainId.startsWith('ethereum') ? 'Ethereum Sepolia' : 'TON Testnet';
                  content = personality.formatMessage('tip_confirmed', {
                    amount: result.amount,
                    currency,
                    recipient: `${result.to.slice(0, 8)}...${result.to.slice(-6)}`,
                    chain,
                    txHash: `${result.txHash.slice(0, 12)}...`,
                  });
                  action = {
                    type: 'tip_executed',
                    data: {
                      txHash: result.txHash,
                      amount: result.amount,
                      token: result.token,
                      chainId: result.chainId,
                      to: result.to,
                      fee: result.fee,
                      explorerUrl: result.explorerUrl,
                    },
                  };
                } else {
                  content = personality.formatMessage('tip_failed', { error: result.error ?? 'Unknown error' });
                }
              } catch (err) {
                content = personality.formatMessage('tip_failed', { error: String(err) });
              }
            } else {
              const missing: string[] = [];
              if (!parsed.recipient) missing.push('a recipient address (0x... or UQ...)');
              if (!parsed.amount) missing.push('an amount');
              content = `I'd like to help you send a tip! I still need ${missing.join(' and ')}. Try something like: "send 0.01 ETH to 0x1234..."`;
            }
          }
          break;
        }

        case 'check_balance':
        case 'balance': {
          try {
            const balances = await wallet.getAllBalances();
            const lines = balances.map((b) => {
              const chain = b.chainId.startsWith('ethereum') ? 'Ethereum Sepolia' : 'TON Testnet';
              return `${chain}: ${b.nativeBalance} ${b.nativeCurrency}${parseFloat(b.usdtBalance) > 0 ? ` + ${b.usdtBalance} USDT` : ''}`;
            });
            content = personality.formatMessage('balance_report', { balances: lines.join('\n') });
            action = {
              type: 'balance_check',
              data: { balances: balances.map((b) => ({ chainId: b.chainId, native: b.nativeBalance, usdt: b.usdtBalance, currency: b.nativeCurrency })) },
            };
          } catch (err) {
            content = `I couldn't fetch your balances: ${String(err)}`;
          }
          break;
        }

        case 'fees': {
          try {
            // Use a dummy address for fee comparison
            const dummyRecipient = '0x0000000000000000000000000000000000000001';
            const comparison = await wallet.estimateAllFees(dummyRecipient, '0.01');
            if (comparison.length === 0) {
              content = 'No fee data available right now. Try again in a moment.';
            } else {
              const lines = comparison.map((c) =>
                `${c.chainName}: ~$${c.estimatedFeeUsd} (${c.estimatedFee})`
              );
              const cheapest = comparison[0];
              content = personality.formatMessage('fee_comparison', {
                amount: '0.01',
                fees: lines.join('\n'),
                cheapest: cheapest.chainName,
                cheapestFee: cheapest.estimatedFeeUsd,
              });
              action = {
                type: 'fee_estimate',
                data: { comparison },
              };
            }
          } catch (err) {
            content = `Couldn't fetch fee estimates: ${String(err)}`;
          }
          break;
        }

        case 'address': {
          try {
            const addresses = await wallet.getAllAddresses();
            const lines = Object.entries(addresses).map(([chainId, addr]) => {
              const chain = chainId.startsWith('ethereum') ? 'Ethereum Sepolia' : 'TON Testnet';
              return `${chain}: ${addr}`;
            });
            content = `Your wallet addresses:\n\n${lines.join('\n')}\n\nYou can share these to receive funds.`;
            action = {
              type: 'address_lookup',
              data: { addresses },
            };
          } catch (err) {
            content = `Couldn't fetch addresses: ${String(err)}`;
          }
          break;
        }

        case 'view_history':
        case 'history': {
          const history = agent.getHistory();
          if (history.length === 0) {
            content = 'No tips sent yet. Try sending your first tip!';
          } else {
            const recent = history.slice(0, 5);
            const lines = recent.map((h) => {
              const chain = h.chainId.startsWith('ethereum') ? 'ETH' : 'TON';
              const status = h.status === 'confirmed' ? 'Confirmed' : 'Failed';
              return `${h.amount} ${h.token === 'usdt' ? 'USDT' : chain} to ${h.recipient.slice(0, 8)}... - ${status}`;
            });
            content = `Your recent tips (${history.length} total):\n\n${lines.join('\n')}${history.length > 5 ? `\n\n...and ${history.length - 5} more` : ''}`;
          }
          break;
        }

        case 'help': {
          content = personality.formatMessage('help');
          break;
        }

        default: {
          content = personality.formatMessage('unknown_intent');
          break;
        }
      }

      const response: ChatMessage = {
        id: uuidv4(),
        role: 'agent',
        content,
        timestamp: new Date().toISOString(),
        action,
      };

      res.json({ message: response });
    } catch (err) {
      logger.error('Chat processing failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  });

  // ── Conditional Tips ──────────────────────────────────────────

  /** GET /api/conditions — List all conditions */
  router.get('/conditions', (_req, res) => {
    res.json({ conditions: agent.getConditions() });
  });

  /** POST /api/conditions — Create a new condition */
  router.post('/conditions', (req, res) => {
    try {
      const { type, params: condParams, tip } = req.body as {
        type?: ConditionType;
        params?: { threshold?: string; currency?: string; timeStart?: string; timeEnd?: string };
        tip?: { recipient: string; amount: string; token?: 'native' | 'usdt'; chainId?: string };
      };

      if (!type || !tip?.recipient || !tip?.amount) {
        res.status(400).json({ error: 'type, tip.recipient, and tip.amount are required' });
        return;
      }

      const validTypes: ConditionType[] = ['gas_below', 'balance_above', 'time_of_day'];
      if (!validTypes.includes(type)) {
        res.status(400).json({ error: `Invalid condition type. Must be one of: ${validTypes.join(', ')}` });
        return;
      }

      const condition = agent.addCondition({
        type,
        params: condParams ?? {},
        tip: {
          recipient: tip.recipient,
          amount: tip.amount,
          token: tip.token ?? 'native',
          chainId: tip.chainId,
        },
      });

      logger.info('Condition created via API', { id: condition.id, type });
      res.json({ condition });
    } catch (err) {
      logger.error('Failed to create condition', { error: String(err) });
      res.status(500).json({ error: 'Failed to create condition' });
    }
  });

  /** DELETE /api/conditions/:id — Cancel a condition */
  router.delete('/conditions/:id', (req, res) => {
    const { id } = req.params;
    const cancelled = agent.cancelCondition(id);
    if (!cancelled) {
      res.status(404).json({ error: 'Condition not found or not active' });
      return;
    }
    res.json({ cancelled: true, id });
  });

  // ── Webhooks ──────────────────────────────────────────────────

  /** GET /api/webhooks — List registered webhooks */
  router.get('/webhooks', (_req, res) => {
    res.json({ webhooks: webhooks.getWebhooks() });
  });

  /** POST /api/webhooks — Register a new webhook */
  router.post('/webhooks', (req, res) => {
    try {
      const { url, events } = req.body as { url?: string; events?: string[] };

      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'url is required and must be a string' });
        return;
      }

      if (!events || !Array.isArray(events) || events.length === 0) {
        res.status(400).json({ error: 'events array is required and must not be empty' });
        return;
      }

      const validEvents = ['tip.sent', 'tip.failed', 'tip.scheduled', 'condition.triggered'];
      const invalid = events.filter((e) => !validEvents.includes(e));
      if (invalid.length > 0) {
        res.status(400).json({ error: `Invalid events: ${invalid.join(', ')}. Valid: ${validEvents.join(', ')}` });
        return;
      }

      const webhook = webhooks.registerWebhook(url, events);
      res.json({ webhook });
    } catch (err) {
      logger.error('Failed to register webhook', { error: String(err) });
      res.status(500).json({ error: 'Failed to register webhook' });
    }
  });

  /** DELETE /api/webhooks/:id — Unregister a webhook */
  router.delete('/webhooks/:id', (req, res) => {
    const { id } = req.params;
    const removed = webhooks.unregisterWebhook(id);
    if (!removed) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }
    res.json({ deleted: true, id });
  });

  /** POST /api/webhooks/test — Send a test event to all webhooks */
  router.post('/webhooks/test', async (_req, res) => {
    try {
      await webhooks.fireWebhook('test', {
        message: 'This is a test webhook event from AeroFyta',
        timestamp: new Date().toISOString(),
      });
      res.json({ sent: true, webhookCount: webhooks.getWebhooks().length });
    } catch (err) {
      logger.error('Webhook test failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to send test webhook' });
    }
  });
}

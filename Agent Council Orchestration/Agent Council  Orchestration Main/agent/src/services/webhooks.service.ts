import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { WebhookConfig } from '../types/index.js';

/** Webhook delivery timeout in milliseconds */
const WEBHOOK_TIMEOUT = 5000;

/** Maximum retries on failure */
const MAX_RETRIES = 1;

/**
 * WebhooksService — in-memory webhook registry and delivery system.
 *
 * External services can register URLs to receive POST notifications
 * when tip events occur (tip.sent, tip.failed, tip.scheduled, condition.triggered).
 */
export class WebhooksService {
  private webhooks: WebhookConfig[] = [];

  /** Register a new webhook URL to receive events */
  registerWebhook(url: string, events: string[]): WebhookConfig {
    const webhook: WebhookConfig = {
      id: uuidv4(),
      url,
      events,
      createdAt: new Date().toISOString(),
      failCount: 0,
    };
    this.webhooks.push(webhook);
    logger.info('Webhook registered', { id: webhook.id, url, events });
    return webhook;
  }

  /** Unregister a webhook by ID */
  unregisterWebhook(id: string): boolean {
    const index = this.webhooks.findIndex((w) => w.id === id);
    if (index === -1) return false;
    this.webhooks.splice(index, 1);
    logger.info('Webhook unregistered', { id });
    return true;
  }

  /** Get all registered webhooks */
  getWebhooks(): WebhookConfig[] {
    return [...this.webhooks];
  }

  /**
   * Fire a webhook event to all registered URLs that subscribe to this event type.
   * Includes one retry on failure. Each call has a 5-second timeout.
   */
  async fireWebhook(event: string, data: object): Promise<void> {
    const matching = this.webhooks.filter((w) => w.events.includes(event));
    if (matching.length === 0) return;

    const payload = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data,
    });

    const deliveries = matching.map((webhook) =>
      this.deliverWebhook(webhook, payload, event),
    );

    await Promise.allSettled(deliveries);
  }

  /** Deliver a webhook payload to a single URL with retry logic */
  private async deliverWebhook(
    webhook: WebhookConfig,
    payload: string,
    event: string,
  ): Promise<void> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          webhook.lastTriggered = new Date().toISOString();
          logger.info('Webhook delivered', {
            id: webhook.id,
            url: webhook.url,
            event,
            status: response.status,
          });
          return;
        }

        logger.warn('Webhook delivery failed', {
          id: webhook.id,
          url: webhook.url,
          event,
          status: response.status,
          attempt: attempt + 1,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn('Webhook delivery error', {
          id: webhook.id,
          url: webhook.url,
          event,
          error: errMsg,
          attempt: attempt + 1,
        });
      }
    }

    // All retries exhausted
    webhook.failCount++;
    logger.error('Webhook delivery failed after retries', {
      id: webhook.id,
      url: webhook.url,
      event,
      failCount: webhook.failCount,
    });
  }
}

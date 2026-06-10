// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Zod Schema Validation on MCP Inputs (Feature 67)
//
// Validates ALL API request bodies with Zod schemas.
// Returns 400 with clear error messages on validation failure.

import { z } from 'zod';

// ── Chain and Token enums ────────────────────────────────────────

const ChainIdSchema = z.enum([
  'ethereum-sepolia',
  'ton-testnet',
  'tron-nile',
  'ethereum-sepolia-gasless',
  'ton-testnet-gasless',
  'bitcoin-testnet',
  'solana-devnet',
  'plasma',
  'stable',
]);

const TokenTypeSchema = z.enum(['native', 'usdt', 'usat', 'xaut']);

// ── Core Tip Schemas ─────────────────────────────────────────────

/** Tip request — the most common input */
export const TipRequestSchema = z.object({
  recipient: z.string().min(1, 'Recipient address is required'),
  amount: z.union([
    z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a numeric string'),
    z.number().positive('Amount must be positive'),
  ]),
  token: TokenTypeSchema.optional().default('native'),
  preferredChain: ChainIdSchema.optional(),
  message: z.string().max(500).optional(),
});

/** Batch tip request */
export const BatchTipRequestSchema = z.object({
  recipients: z.array(z.object({
    address: z.string().min(1, 'Recipient address is required'),
    amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a numeric string'),
    message: z.string().max(500).optional(),
  })).min(1, 'At least one recipient is required').max(50, 'Maximum 50 recipients per batch'),
  token: TokenTypeSchema.optional().default('native'),
  preferredChain: ChainIdSchema.optional(),
});

/** Split tip request */
export const SplitTipRequestSchema = z.object({
  totalAmount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a numeric string'),
  recipients: z.array(z.object({
    address: z.string().min(1),
    percentage: z.number().min(0).max(100),
    message: z.string().max(500).optional(),
  })).min(2, 'At least 2 recipients required for split'),
  token: TokenTypeSchema.optional().default('native'),
  preferredChain: ChainIdSchema.optional(),
});

// ── Budget / Safety Schemas ──────────────────────────────────────

/** Budget limits configuration */
export const BudgetSchema = z.object({
  dailyLimit: z.number().positive('Daily limit must be positive').optional(),
  hourlyLimit: z.number().positive('Hourly limit must be positive').optional(),
  maxSingleTip: z.number().positive('Max single tip must be positive').optional(),
  minTipAmount: z.number().positive('Min tip amount must be positive').optional(),
});

/** Routing analysis request */
export const RoutingSchema = z.object({
  amount: z.union([
    z.string().regex(/^\d+(\.\d+)?$/),
    z.number().positive(),
  ]),
  token: z.string().min(1).optional().default('usdt'),
});

// ── Chat Schema ──────────────────────────────────────────────────

export const ChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  context: z.object({
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional(),
  }).optional(),
});

// ── Other API Schemas ────────────────────────────────────────────

export const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1),
  chainId: ChainIdSchema.optional(),
  notes: z.string().max(500).optional(),
});

export const TemplateSchema = z.object({
  name: z.string().min(1).max(100),
  recipient: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  token: TokenTypeSchema.optional().default('native'),
  message: z.string().max(500).optional(),
});

export const PolicySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['recurring', 'budget', 'recipient_limit', 'custom']),
  enabled: z.boolean().optional().default(true),
  rules: z.object({
    maxPerTip: z.number().positive().optional(),
    maxDailyTotal: z.number().positive().optional(),
    allowedRecipients: z.array(z.string()).optional(),
    blockedRecipients: z.array(z.string()).optional(),
    preferredChain: z.string().optional(),
    requireConfirmationAbove: z.number().positive().optional(),
  }).optional().default({}),
});

export const EscrowSchema = z.object({
  depositor: z.string().min(1),
  recipient: z.string().min(1),
  amount: z.number().positive(),
  condition: z.string().min(1).max(500),
  expiresInHours: z.number().positive().optional().default(24),
  chainId: ChainIdSchema.optional(),
});

export const StreamSchema = z.object({
  recipient: z.string().min(1),
  totalAmount: z.number().positive(),
  durationSeconds: z.number().positive().min(10),
  intervalMs: z.number().positive().min(100).optional().default(1000),
  token: TokenTypeSchema.optional().default('usdt'),
  chainId: ChainIdSchema.optional(),
});

export const DcaSchema = z.object({
  recipient: z.string().min(1),
  totalAmount: z.number().positive(),
  installments: z.number().int().positive().min(2).max(100),
  intervalHours: z.number().positive(),
  token: TokenTypeSchema.optional().default('usdt'),
  chainId: ChainIdSchema.optional(),
});

export const MemorySchema = z.object({
  type: z.enum(['preference', 'context', 'fact']),
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(1000),
  source: z.string().optional(),
});

// ── Validation helper ────────────────────────────────────────────

/**
 * Validate a request body against a Zod schema.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format Zod errors into a readable string
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  ).join('; ');

  return { success: false, error: `Validation failed: ${errors}` };
}

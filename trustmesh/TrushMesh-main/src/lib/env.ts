// Built by vsrupeshkumar
import "dotenv/config";
import { z } from "zod";

const inferredFrontendUrl =
  process.env.FRONTEND_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ??
  "http://localhost:5173";

const optionalUrl = (fallback: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : fallback))
    .pipe(z.string().url());

const optionalString = (fallback: string, minLen = 0) =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.length >= minLen ? v : fallback));

const envSchema = z.object({
  DATABASE_URL: optionalUrl("postgresql://localhost:5432/trustmesh"),
  REDIS_URL: optionalUrl("redis://localhost:6379"),
  JWT_SECRET: optionalString(
    "dev-secret-not-for-production-please-rotate-32c",
    32
  ),
  ETHANA_RPC_URL: optionalUrl("https://api.devnet.arbitrum-sepolia.com"),
  ANCHOR_PROGRAM_ID: optionalString(
    "66DXeSqBccWxWWw9S21vxe2Mvvqqkmw5KsK5jqA42quz",
    32
  ),
  SNS_PROGRAM_ID: optionalString(
    "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX",
    32
  ),
  FRONTEND_URL: z.string().url().default(inferredFrontendUrl),
  PORT: z.coerce.number().int().positive().default(3002),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development")
});

export const env = envSchema.parse(process.env);

export type Env = typeof env;

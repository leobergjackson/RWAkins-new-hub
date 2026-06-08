// Built by vsrupeshkumar
import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables');
  }
  return result.data;
}

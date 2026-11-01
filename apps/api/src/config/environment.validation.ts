import { z } from 'zod';

const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/)
    .default('15m'),
  REFRESH_TOKEN_HMAC_SECRET: z.string().min(32),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Number of reverse proxies in front of the API whose X-Forwarded-For entries are trusted.
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(configuration: Record<string, unknown>): Environment {
  // Treat empty values (e.g. `SMTP_FROM=` or unset compose variables) as not configured.
  const provided = Object.fromEntries(
    Object.entries(configuration).filter(([, value]) => value !== ''),
  );
  const result = environmentSchema.safeParse(provided);

  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${result.error.message}`);
  }

  return result.data;
}

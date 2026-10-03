import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
      message: 'PORT must be a valid port number (1-65535)',
    }),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z
    .string({
      required_error: 'DATABASE_URL is required for database connectivity',
    })
    .min(1, 'DATABASE_URL cannot be empty'),
  JWT_SECRET: z
    .string({
      required_error: 'JWT_SECRET is required for authentication security',
    })
    .min(16, 'JWT_SECRET must be at least 16 characters for security'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  APP_BASE_URL: z.string().default('http://localhost:5000'),
  DYNAMIC_QR_BASE_URL: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('900000')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z
    .string()
    .default('300')
    .transform((val) => parseInt(val, 10)),
  TRUST_PROXY: z
    .string()
    .default('1')
    .transform((val) => parseInt(val, 10)),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('QR Manager <onboarding@resend.dev>'),
  GOOGLE_CLIENT_ID: z.string().optional(),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ FATAL: Invalid or missing environment configuration:');
    result.error.issues.forEach((issue) => {
      console.error(`  - [${issue.path.join('.')}]: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type EnvConfig = typeof env;

/**
 * Returns the public base URL for dynamic QR shortlinks without trailing slash.
 * Prioritizes DYNAMIC_QR_BASE_URL if explicitly set, otherwise falls back to APP_BASE_URL.
 */
export const getDynamicQrBaseUrl = (): string => {
  const raw = env.DYNAMIC_QR_BASE_URL || env.APP_BASE_URL;
  return raw.replace(/\/+$/, '');
};

/**
 * Returns an array of allowed CORS origins, parsing comma-separated strings and optional frontend URLs.
 */
export const getAllowedCorsOrigins = (): string[] => {
  const rawList: string[] = [];

  if (env.CORS_ORIGIN) {
    rawList.push(...env.CORS_ORIGIN.split(','));
  }
  if (env.FRONTEND_URL) {
    rawList.push(...env.FRONTEND_URL.split(','));
  }

  // Include standard local development origins only in non-production environments
  if (env.NODE_ENV !== 'production') {
    rawList.push('http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000');
  }

  const sanitized = rawList
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0);

  return Array.from(new Set(sanitized));
};

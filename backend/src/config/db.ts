import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Checks connection to the PostgreSQL database (Neon)
 */
export const checkDatabaseConnection = async (): Promise<{ connected: boolean; latencyMs?: number; error?: string }> => {
  const start = Date.now();
  try {
    // Run a lightweight test query
    await prisma.$queryRaw`SELECT 1 as health_check`;
    const latencyMs = Date.now() - start;
    return { connected: true, latencyMs };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    logger.error('Database connection check failed', { error: message });
    return { connected: false, error: message };
  }
};

import { checkDatabaseConnection } from '../config/db.js';
import { env } from '../config/env.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  database: {
    connected: boolean;
    provider: string;
    latencyMs?: number;
    error?: string;
  };
  system: {
    nodeVersion: string;
    memoryUsageMB: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
}

export const getHealthStatus = async (): Promise<HealthCheckResult> => {
  const mem = process.memoryUsage();
  const dbHealth = await checkDatabaseConnection();

  const isHealthy = dbHealth.connected;

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'QR Code Generator & Management Platform API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      connected: dbHealth.connected,
      provider: 'PostgreSQL (Neon)',
      latencyMs: dbHealth.latencyMs,
      error: dbHealth.error,
    },
    system: {
      nodeVersion: process.version,
      memoryUsageMB: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      },
    },
  };
};

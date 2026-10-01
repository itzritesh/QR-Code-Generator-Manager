import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { checkDatabaseConnection, prisma } from './config/db.js';

const startServer = async () => {
  try {
    logger.info(`Starting QR Code Platform API in [${env.NODE_ENV}] mode...`);

    // Verify database connectivity
    logger.info('Verifying database connectivity to PostgreSQL (Neon)...');
    const dbStatus = await checkDatabaseConnection();

    if (dbStatus.connected) {
      logger.info(`Database connected successfully (latency: ${dbStatus.latencyMs}ms)`);
    } else {
      logger.warn(`Database connection warning: ${dbStatus.error}`);
    }

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT} [Mode: ${env.NODE_ENV}]`);
      logger.info(`Public Base URL: ${env.APP_BASE_URL}`);
      logger.info(`Health check endpoint: ${env.APP_BASE_URL}/api/health`);
    });

    // Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await prisma.$disconnect();
          logger.info('Database connections closed.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during database disconnect', err);
          process.exit(1);
        }
      });

      // Force exit if not closed within 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Fatal error during server startup', error);
    process.exit(1);
  }
};

startServer();

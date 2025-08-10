import { Pool } from 'pg';
import ServiceCleanup from '../services/ServiceCleanup';
import { logger } from './logger';

export function setupGracefulShutdown(pool: Pool, serviceCleanup: ServiceCleanup): void {
  process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    
    // Stop ServiceCleanup first
    logger.info('Stopping ServiceCleanup...');
    await serviceCleanup.stop();
    
    // Then close database pool
    logger.info('Closing database connection pool...');
    await pool.end();
    
    logger.info('Shutdown complete');
    process.exit(0);
  });
}
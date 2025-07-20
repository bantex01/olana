import { Pool } from 'pg';
import ServiceCleanup from '../services/ServiceCleanup';

export function setupGracefulShutdown(pool: Pool, serviceCleanup: ServiceCleanup): void {
  process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    
    // Stop ServiceCleanup first
    console.log('Stopping ServiceCleanup...');
    await serviceCleanup.stop();
    
    // Then close database pool
    console.log('Closing database connection pool...');
    await pool.end();
    
    console.log('Shutdown complete');
    process.exit(0);
  });
}
import { Pool } from 'pg';

export function createDatabasePool(): Pool {
  // Use connection string for Supabase to avoid IPv6 issues
  if (process.env.DB_HOST && (process.env.DB_HOST.includes('supabase.com') || process.env.DB_HOST.includes('pooler.supabase.com'))) {
    const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    
    return new Pool({
      connectionString,
      max: parseInt(process.env.DB_POOL_MAX || '12'), // Reduced from 15 to leave buffer
      min: parseInt(process.env.DB_POOL_MIN || '2'), // Maintain minimum connections
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'), // Increased for Render
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000'), // Increased
      // acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '15000'), // Not supported in pg
      ssl: false
    });
  }

  // Fallback to individual parameters for local development
  return new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'alert_hub',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    max: parseInt(process.env.DB_POOL_MAX || '10'), // Lower for local dev
    min: parseInt(process.env.DB_POOL_MIN || '1'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000'),
    // acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000'), // Not supported in pg
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
}
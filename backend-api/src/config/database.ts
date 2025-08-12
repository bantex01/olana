import { Pool } from 'pg';

export function createDatabasePool(): Pool {
  // Use connection string for Supabase to avoid IPv6 issues
  if (process.env.DB_HOST && (process.env.DB_HOST.includes('supabase.com') || process.env.DB_HOST.includes('pooler.supabase.com'))) {
    const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    
    return new Pool({
      connectionString,
      max: parseInt(process.env.DB_POOL_MAX || '15'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
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
    max: parseInt(process.env.DB_POOL_MAX || '15'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
}
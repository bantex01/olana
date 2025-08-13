#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Parse command line arguments
const args = process.argv.slice(2);
const environment = args[0] || 'local';

console.log(`🔧 Using environment: ${environment}`);

// Load environment-specific .env file
const envFile = path.join(__dirname, `../../.env.migration.${environment}`);

if (fs.existsSync(envFile)) {
  console.log(`📂 Loading config from: .env.migration.${environment}`);
  require('dotenv').config({ path: envFile });
} else {
  console.log(`⚠️  Environment file not found: .env.migration.${environment}`);
  console.log(`💡 Create this file with your ${environment} database settings`);
  console.log(`📝 Example content:`);
  console.log(`   DB_HOST=your_host`);
  console.log(`   DB_PORT=5432`);
  console.log(`   DB_NAME=your_database`);
  console.log(`   DB_USER=your_user`);
  console.log(`   DB_PASSWORD=your_password`);
  console.log(`   DB_SSL=false`);
  process.exit(1);
}

// Database connection from loaded environment
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alert_hub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true'
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migrations...');
    
    // Get migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    // Get already applied migrations
    let appliedMigrations = [];
    try {
      const result = await client.query('SELECT migration_number FROM schema_migrations ORDER BY migration_number');
      appliedMigrations = result.rows.map(row => row.migration_number);
    } catch (error) {
      // Table doesn't exist yet, which is fine for first run
      console.log('⚠️  Migration tracking table not found - will be created');
    }
    
    let migrationsRun = 0;
    
    for (const file of migrationFiles) {
      const migrationNumber = file.split('_')[0];
      const migrationName = file.replace('.sql', '').substring(4); // Remove number and extension
      
      if (appliedMigrations.includes(migrationNumber)) {
        console.log(`✅ Migration ${migrationNumber} (${migrationName}) already applied`);
        continue;
      }
      
      console.log(`🚀 Running migration ${migrationNumber}: ${migrationName}`);
      
      // Read and execute migration
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      const checksum = crypto.createHash('md5').update(migrationSQL).digest('hex');
      
      await client.query('BEGIN');
      
      try {
        // Execute migration
        await client.query(migrationSQL);
        
        // Record migration (only if not the tracker migration itself)
        if (migrationNumber !== '000') {
          await client.query(`
            INSERT INTO schema_migrations (migration_number, migration_name, checksum) 
            VALUES ($1, $2, $3)
          `, [migrationNumber, migrationName, checksum]);
        }
        
        await client.query('COMMIT');
        console.log(`✅ Migration ${migrationNumber} completed successfully`);
        migrationsRun++;
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration ${migrationNumber} failed:`, error.message);
        throw error;
      }
    }
    
    if (migrationsRun === 0) {
      console.log('✨ Database is up to date - no migrations needed');
    } else {
      console.log(`🎉 Successfully applied ${migrationsRun} migration(s)`);
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
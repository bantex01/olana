-- Migration tracking table
-- This table keeps track of which migrations have been applied

CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_number VARCHAR(10) NOT NULL UNIQUE,
    migration_name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    checksum VARCHAR(64) -- For integrity checking
);

-- Insert this initial migration
INSERT INTO schema_migrations (migration_number, migration_name, checksum) 
VALUES ('000', 'migration_tracker', 'initial') 
ON CONFLICT (migration_number) DO NOTHING;
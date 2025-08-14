# Database Operations Guide

## Overview
This document covers database migration and maintenance operations for the Service Dependency Tool. The system uses a custom migration framework with environment-specific configurations.

## Migration System

### Environment Configuration Files

**Local Development:**
```bash
# .env.migration.local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alert_hub
DB_USER=postgres
DB_PASSWORD=your_local_password
DB_SSL=false
```

**Production (Supabase):**
```bash
# .env.migration.prod
DB_HOST=aws-0-us-west-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.naldokzudjmaewjknufs
DB_PASSWORD=""
DB_SSL=false
```

### Migration Commands

**Local Database:**
```bash
cd backend-api
npm run db:migrate:local
```

**Production Database:**
```bash
cd backend-api
npm run db:migrate:prod
```

**Generic (defaults to local):**
```bash
cd backend-api
npm run db:migrate
```

## Migration File Structure

Migration files are located in `backend-api/migrations/` and follow the naming convention:
```
000_migration_tracker.sql       # Creates migration tracking table
001_performance_indexes.sql     # Adds database indexes
002_services_overview_optimization.sql # Materialized view caching
```

## Current Database Optimizations

### Performance Indexes (Migration 001)
- `idx_services_last_seen` - Service activity queries
- `idx_services_created_at` - Service discovery queries  
- `idx_services_environment` - Environment filtering
- `idx_services_namespace` - Namespace filtering
- `idx_services_team` - Team filtering
- `idx_services_tags_gin` - Tag search (GIN index)
- `idx_services_namespace_name` - Service lookups
- `idx_service_deps_from/to` - Dependency traversal
- `idx_alert_incidents_*` - Alert correlation queries

### Caching Infrastructure (Migration 002)
- `services_overview_cache` - Materialized view for dashboard aggregations
- `refresh_services_overview_cache()` - Function to refresh cache

## Cache Management

### Manual Cache Refresh
```bash
# Via API endpoint
curl -X POST https://otelia.onrender.com/performance/refresh-cache

# Direct SQL
SELECT refresh_services_overview_cache();
```

### Using Fast Mode
```bash
# API endpoint with caching
curl "https://otelia.onrender.com/services/overview?fast=true"
```

## Monitoring & Troubleshooting

### Performance Monitoring Endpoints
```bash
# Query performance metrics
curl https://otelia.onrender.com/performance/queries

# Connection pool status
curl https://otelia.onrender.com/performance/pool

# Health check
curl -X POST https://otelia.onrender.com/performance/health-check

# Performance recommendations  
curl https://otelia.onrender.com/performance/recommendations
```

### Database Connection Verification

**Check Migration Status:**
```sql
SELECT * FROM schema_migrations ORDER BY migration_number;
```

**Verify Indexes:**
```sql
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%' 
ORDER BY tablename;
```

**Check Materialized View:**
```sql
SELECT * FROM services_overview_cache;
```

## Adding New Migrations

### Step 1: Create Migration File
```bash
# Create new numbered migration
# backend-api/migrations/003_your_migration_name.sql

-- Your migration content here
CREATE INDEX IF NOT EXISTS idx_new_feature 
ON your_table (column_name);
```

### Step 2: Test Locally
```bash
cd backend-api
npm run db:migrate:local
```

### Step 3: Apply to Production
```bash
cd backend-api
npm run db:migrate:prod
```

### Step 4: Deploy Code Changes
```bash
git add .
git commit -m "Add migration 003: description"
git push
```

## Connection Pool Configuration

### Current Settings (Optimized for Render + Supabase)
- **Max Connections:** 12 (Supabase free tier limit is 15)
- **Min Connections:** 2 (maintain baseline)
- **Idle Timeout:** 60 seconds (Render persistent containers)
- **Connection Timeout:** 10 seconds
- **Retry Logic:** 3 attempts with exponential backoff

### Environment Variables
```bash
DB_POOL_MAX=12
DB_POOL_MIN=2
DB_IDLE_TIMEOUT=60000
DB_CONNECT_TIMEOUT=10000
DB_MAX_RETRIES=3
DB_RETRY_BASE_DELAY=1000
DB_RETRY_MAX_DELAY=10000
```

## Troubleshooting Common Issues

### Migration Fails with "already exists" Error
- Migration system uses `IF NOT EXISTS` clauses
- Check `schema_migrations` table for tracking issues
- Manually mark migration as applied if needed

### Connection Pool Exhaustion
- Monitor `/performance/pool` endpoint
- Check for connection leaks in application code
- Consider increasing `DB_POOL_MAX` if consistently high usage

### Slow Query Performance
- Use `/performance/queries` to identify bottlenecks
- Check `/performance/recommendations` for suggestions
- Consider adding additional indexes based on query patterns

### Cache Inconsistency
- Manually refresh materialized view: `SELECT refresh_services_overview_cache();`
- Consider automated refresh schedule for high-traffic scenarios

## Security Notes

- Migration environment files (`.env.migration.*`) are excluded from git
- Production credentials should only exist in secure environment configs
- Always test migrations on local/staging before production application
- Use connection pooling to prevent credential exposure in logs

## Backup Recommendations

- Supabase provides automatic backups
- Consider manual backups before major migrations
- Test restore procedures periodically
- Document rollback procedures for critical migrations

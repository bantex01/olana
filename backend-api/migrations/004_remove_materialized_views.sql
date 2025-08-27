-- Migration 004: Remove materialized views and switch to direct queries
-- Removes alert_analytics_hourly materialized view and associated index
-- All analytics endpoints now use direct queries on alert_incidents table

BEGIN;

-- Check if migration has already been applied
DO $$ 
DECLARE 
    migration_exists BOOLEAN := FALSE;
BEGIN 
    SELECT EXISTS(
        SELECT 1 FROM schema_migrations 
        WHERE migration_number = '004'
    ) INTO migration_exists;
    
    IF migration_exists THEN 
        RAISE NOTICE 'Migration 004 already applied, skipping';
        RETURN; 
    END IF;

    -- Drop the materialized view index first
    DROP INDEX IF EXISTS idx_alert_analytics_hourly_unique;
    RAISE NOTICE 'Dropped index idx_alert_analytics_hourly_unique';

    -- Drop the materialized view
    DROP MATERIALIZED VIEW IF EXISTS alert_analytics_hourly;
    RAISE NOTICE 'Dropped materialized view alert_analytics_hourly';

    -- Log this migration
    INSERT INTO schema_migrations (migration_number, migration_name, applied_at) 
    VALUES ('004', 'remove_materialized_views', NOW());
    
    RAISE NOTICE 'Migration 004 completed successfully';
END $$;

COMMIT;
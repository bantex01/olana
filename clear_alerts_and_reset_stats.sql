-- Clear All Alerting Data and Reset Service Statistics
-- This script will remove all alert data and reset MTTA/MTTR statistics to start fresh
-- Run this script with caution - all alerting history will be lost!

BEGIN;

-- 1. Clear all alert events (this will cascade due to foreign key constraints)
DELETE FROM alert_events;
COMMIT;

BEGIN;
-- 2. Clear all alert incidents
DELETE FROM alert_incidents;
COMMIT;

BEGIN;
-- 3. Reset the auto-increment sequences to start from 1 again
ALTER SEQUENCE alert_events_id_seq RESTART WITH 1;
ALTER SEQUENCE alert_incidents_id_seq RESTART WITH 1;
COMMIT;

BEGIN;
-- 4. Clear any temporary count tables (if they exist and contain alert-related data)
DELETE FROM active_count;
DELETE FROM event_count;
COMMIT;

BEGIN;
-- 5. Refresh the materialized view to update all statistics
-- This will recalculate all service metrics without the alert data
REFRESH MATERIALIZED VIEW CONCURRENTLY services_overview_cache;
COMMIT;

-- Verification queries - run these to confirm the reset was successful
SELECT 'Alert Events Count' as table_name, COUNT(*) as count FROM alert_events
UNION ALL
SELECT 'Alert Incidents Count' as table_name, COUNT(*) as count FROM alert_incidents
UNION ALL
SELECT 'Services with Active Alerts' as metric_name, COUNT(DISTINCT service_namespace || '::' || service_name) as count
FROM alert_incidents WHERE status = 'firing'
UNION ALL
SELECT 'Total Services' as metric_name, total_services::bigint as count FROM services_overview_cache LIMIT 1;

-- Show that sequences have been reset
SELECT 'alert_events_id_seq' as sequence_name, last_value FROM alert_events_id_seq
UNION ALL
SELECT 'alert_incidents_id_seq' as sequence_name, last_value FROM alert_incidents_id_seq;

COMMIT;
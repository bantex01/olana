-- Optimized queries and materialized view for services overview
-- This creates a more efficient approach to the complex services overview endpoint

-- Create a materialized view for expensive aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS services_overview_cache AS
WITH service_stats AS (
    SELECT 
        COUNT(*) as total_services,
        COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '24 hours') as active_services,
        COUNT(*) FILTER (WHERE last_seen < NOW() - INTERVAL '7 days') as stale_services,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recently_discovered,
        COUNT(*) FILTER (WHERE team = 'unknown' OR environment = 'unknown') as missing_metadata,
        COUNT(DISTINCT service_namespace) as total_namespaces,
        COUNT(DISTINCT environment) as total_environments
    FROM services
),
dependency_stats AS (
    SELECT 
        COUNT(*) as total_dependencies,
        COUNT(DISTINCT from_service_namespace || '::' || from_service_name) as services_with_deps,
        MAX(dep_count) as max_dependencies
    FROM (
        SELECT 
            from_service_namespace,
            from_service_name,
            COUNT(*) as dep_count
        FROM service_dependencies
        GROUP BY from_service_namespace, from_service_name
    ) dep_counts
),
enrichment_stats AS (
    SELECT 
        COUNT(*) FILTER (WHERE external_calls != '[]'::jsonb) as services_with_external_calls,
        COUNT(*) FILTER (WHERE database_calls != '[]'::jsonb) as services_with_db_calls,
        COUNT(*) FILTER (WHERE rpc_calls != '[]'::jsonb) as services_with_rpc_calls,
        COUNT(*) as total_services
    FROM services
),
alert_stats AS (
    SELECT 
        COUNT(DISTINCT service_namespace || '::' || service_name) as services_with_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'warning') as warning_alerts,
        COUNT(*) FILTER (WHERE severity = 'fatal') as fatal_alerts
    FROM alert_incidents
    WHERE status = 'firing'
),
tag_stats AS (
    SELECT 
        COUNT(*) FILTER (WHERE array_length(tags, 1) > 0) as services_with_tags,
        COUNT(*) FILTER (WHERE 'alertmanager-created' = ANY(tags)) as alertmanager_created,
        COUNT(*) as total_services
    FROM services
)
SELECT 
    -- Service discovery stats
    ss.total_services,
    ss.active_services,
    ss.stale_services,
    ss.recently_discovered,
    ss.missing_metadata,
    ss.total_namespaces,
    ss.total_environments,
    
    -- Dependency stats
    ds.total_dependencies,
    ds.services_with_deps,
    ds.max_dependencies,
    (ss.total_services - ds.services_with_deps) as isolated_services,
    
    -- Enrichment stats
    es.services_with_external_calls,
    es.services_with_db_calls,
    es.services_with_rpc_calls,
    
    -- Alert stats
    als.services_with_alerts,
    als.critical_alerts,
    als.warning_alerts,
    als.fatal_alerts,
    
    -- Tag stats
    ts.services_with_tags,
    ts.alertmanager_created,
    
    -- Calculated fields
    CASE 
        WHEN ss.total_services > 0 THEN 
            ROUND((ds.services_with_deps::decimal / ss.total_services) * 100) 
        ELSE 0 
    END as dependency_coverage,
    
    CASE 
        WHEN ts.total_services > 0 THEN 
            ROUND((ts.services_with_tags::decimal / ts.total_services) * 100) 
        ELSE 0 
    END as tag_coverage,
    
    NOW() as last_updated
    
FROM service_stats ss, dependency_stats ds, enrichment_stats es, alert_stats als, tag_stats ts;

-- Create unique index for materialized view refresh
CREATE UNIQUE INDEX IF NOT EXISTS services_overview_cache_unique ON services_overview_cache (last_updated);

-- Function to refresh the cache
CREATE OR REPLACE FUNCTION refresh_services_overview_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY services_overview_cache;
END;
$$;

-- Initial refresh
SELECT refresh_services_overview_cache();
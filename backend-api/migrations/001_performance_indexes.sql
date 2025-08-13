-- Performance optimization indexes for Session 4
-- These indexes target the most common query patterns in services overview
-- Note: Using CREATE INDEX (without CONCURRENTLY) for migration compatibility

-- Services table indexes for filtering and aggregation
CREATE INDEX IF NOT EXISTS idx_services_last_seen 
ON services (last_seen);

CREATE INDEX IF NOT EXISTS idx_services_created_at 
ON services (created_at);

CREATE INDEX IF NOT EXISTS idx_services_environment 
ON services (environment);

CREATE INDEX IF NOT EXISTS idx_services_namespace 
ON services (service_namespace);

CREATE INDEX IF NOT EXISTS idx_services_team 
ON services (team);

CREATE INDEX IF NOT EXISTS idx_services_tags_gin 
ON services USING GIN (tags);

-- Composite index for common service lookups
CREATE INDEX IF NOT EXISTS idx_services_namespace_name 
ON services (service_namespace, service_name);

-- Service dependencies indexes
CREATE INDEX IF NOT EXISTS idx_service_deps_from 
ON service_dependencies (from_service_namespace, from_service_name);

CREATE INDEX IF NOT EXISTS idx_service_deps_to 
ON service_dependencies (to_service_namespace, to_service_name);

-- Alert incidents indexes for correlation queries
CREATE INDEX IF NOT EXISTS idx_alert_incidents_service 
ON alert_incidents (service_namespace, service_name);

CREATE INDEX IF NOT EXISTS idx_alert_incidents_status 
ON alert_incidents (status);

CREATE INDEX IF NOT EXISTS idx_alert_incidents_severity 
ON alert_incidents (severity);

CREATE INDEX IF NOT EXISTS idx_alert_incidents_start 
ON alert_incidents (incident_start);

-- Composite index for active alerts
CREATE INDEX IF NOT EXISTS idx_alert_incidents_active 
ON alert_incidents (status, severity) WHERE status = 'firing';
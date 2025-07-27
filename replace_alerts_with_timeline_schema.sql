-- Replace alerts table with timeline-based schema
-- Clean version without migration system dependencies

BEGIN;

-- First, drop existing alerts table and related constraints/indexes
DROP TABLE IF EXISTS alerts CASCADE;

-- Alert Incidents: Logical grouping of related alerts with lifecycle tracking
CREATE TABLE alert_incidents (
    id SERIAL PRIMARY KEY,
    service_namespace VARCHAR(255) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    instance_id VARCHAR(255) DEFAULT '',
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('fatal', 'critical', 'warning', 'none')),
    message TEXT NOT NULL,
    alert_fingerprint VARCHAR(64) NOT NULL, -- SHA256 hash (first 64 chars)
    
    -- Incident lifecycle
    incident_start TIMESTAMP NOT NULL,
    incident_end TIMESTAMP NULL,
    status VARCHAR(20) DEFAULT 'firing' CHECK (status IN ('firing', 'resolved')),
    
    -- Metadata
    alert_source VARCHAR(100) DEFAULT 'manual',
    external_alert_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Allow multiple incidents for same alert fingerprint over time
    -- This enables the same alert to fire → resolve → fire again
    UNIQUE (alert_fingerprint, incident_start)
);

-- Alert Events: Every fire/resolve/update action
CREATE TABLE alert_events (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES alert_incidents(id) ON DELETE CASCADE,
    
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('fired', 'resolved', 'updated')),
    event_time TIMESTAMP NOT NULL,
    event_data JSONB DEFAULT '{}', -- Store raw webhook data, counts, etc.
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes for common query patterns
CREATE INDEX idx_alert_incidents_service ON alert_incidents(service_namespace, service_name);
CREATE INDEX idx_alert_incidents_fingerprint ON alert_incidents(alert_fingerprint);
CREATE INDEX idx_alert_incidents_time_range ON alert_incidents(incident_start, incident_end);
CREATE INDEX idx_alert_incidents_status ON alert_incidents(status);
CREATE INDEX idx_alert_incidents_severity ON alert_incidents(severity);
CREATE INDEX idx_alert_incidents_source ON alert_incidents(alert_source);

-- Indexes for alert events
CREATE INDEX idx_alert_events_incident ON alert_events(incident_id, event_time);
CREATE INDEX idx_alert_events_type_time ON alert_events(event_type, event_time);
CREATE INDEX idx_alert_events_time_desc ON alert_events(event_time DESC);

-- Composite indexes for common filtering scenarios
CREATE INDEX idx_alert_incidents_service_status ON alert_incidents(service_namespace, service_name, status);
CREATE INDEX idx_alert_incidents_service_severity ON alert_incidents(service_namespace, service_name, severity);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_alert_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alert_incidents_updated_at
    BEFORE UPDATE ON alert_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_alert_incidents_updated_at();

-- Add table comments for documentation
COMMENT ON TABLE alert_incidents IS 'Logical grouping of related alert events with complete lifecycle tracking';
COMMENT ON TABLE alert_events IS 'Individual fire/resolve/update events for each incident - enables timeline reconstruction';

COMMENT ON COLUMN alert_incidents.alert_fingerprint IS 'SHA256 hash of service+instance+severity+message for grouping identical alerts';
COMMENT ON COLUMN alert_incidents.incident_start IS 'When this specific incident began (first fire event)';
COMMENT ON COLUMN alert_incidents.incident_end IS 'When this specific incident was resolved (NULL if still firing)';
COMMENT ON COLUMN alert_incidents.status IS 'Current status: firing (active) or resolved (closed)';

COMMENT ON COLUMN alert_events.event_type IS 'Type of event: fired (alert started), resolved (alert ended), updated (alert modified)';
COMMENT ON COLUMN alert_events.event_time IS 'Exact timestamp when this event occurred';
COMMENT ON COLUMN alert_events.event_data IS 'Additional event context: webhook payload, counts, external IDs, etc.';

-- Create a view that mimics the old alerts table structure for backward compatibility
-- This will be useful during the transition period
CREATE VIEW alerts_legacy_view AS
SELECT 
    i.id,
    i.service_namespace,
    i.service_name,
    i.instance_id,
    i.severity,
    i.message,
    i.status,
    -- Calculate count from events (number of fire events for this incident)
    (SELECT COUNT(*) FROM alert_events e WHERE e.incident_id = i.id AND e.event_type = 'fired') as count,
    i.incident_start as first_seen,
    COALESCE(i.incident_end, i.updated_at) as last_seen,
    i.created_at,
    i.incident_end as resolved_at,
    i.alert_source,
    i.external_alert_id
FROM alert_incidents i
ORDER BY i.incident_start DESC;

COMMENT ON VIEW alerts_legacy_view IS 'Backward compatibility view that presents incidents in old alerts table format';

-- Verify the new schema
DO $$
DECLARE
    incidents_table_exists BOOLEAN;
    events_table_exists BOOLEAN;
    legacy_view_exists BOOLEAN;
BEGIN
    -- Check tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'alert_incidents'
    ) INTO incidents_table_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'alert_events'
    ) INTO events_table_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_name = 'alerts_legacy_view'
    ) INTO legacy_view_exists;
    
    IF NOT incidents_table_exists THEN
        RAISE EXCEPTION 'alert_incidents table was not created successfully';
    END IF;
    
    IF NOT events_table_exists THEN
        RAISE EXCEPTION 'alert_events table was not created successfully';
    END IF;
    
    IF NOT legacy_view_exists THEN
        RAISE EXCEPTION 'alerts_legacy_view was not created successfully';
    END IF;
    
    RAISE NOTICE 'Schema verification passed:';
    RAISE NOTICE '✅ alert_incidents table created';
    RAISE NOTICE '✅ alert_events table created';
    RAISE NOTICE '✅ alerts_legacy_view created';
    RAISE NOTICE '✅ All indexes and triggers applied';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for timeline-based alert processing!';
END $$;

COMMIT;
-- Performance optimizations for incident-based alert system (Fixed version)

-- Add additional indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_alert_incidents_service_time 
  ON alert_incidents(service_namespace, service_name, incident_start DESC);

CREATE INDEX IF NOT EXISTS idx_alert_incidents_fingerprint_time 
  ON alert_incidents(alert_fingerprint, incident_start DESC);

-- Partial index for active incidents (most queried)
CREATE INDEX IF NOT EXISTS idx_alert_incidents_active 
  ON alert_incidents(service_namespace, service_name, severity, incident_start DESC) 
  WHERE status = 'firing';

-- Index for timeline queries
CREATE INDEX IF NOT EXISTS idx_alert_events_incident_time 
  ON alert_events(incident_id, event_time DESC);

-- Update table statistics for better query planning
ANALYZE alert_incidents;
ANALYZE alert_events;

-- Add table constraints for data integrity
DO $$ 
BEGIN
  -- Add constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_incident_end_after_start'
  ) THEN
    ALTER TABLE alert_incidents 
      ADD CONSTRAINT check_incident_end_after_start 
      CHECK (incident_end IS NULL OR incident_end >= incident_start);
  END IF;
END $$;

-- Create a view for current active incidents (frequently used)
CREATE OR REPLACE VIEW active_incidents AS
SELECT 
  i.id,
  i.service_namespace,
  i.service_name,
  i.instance_id,
  i.severity,
  i.message,
  i.incident_start,
  i.alert_source,
  EXTRACT(EPOCH FROM (NOW() - i.incident_start)) / 3600 as hours_active,
  -- Count of events for this incident
  (SELECT COUNT(*) FROM alert_events e WHERE e.incident_id = i.id) as event_count,
  -- Most recent event
  (SELECT MAX(e.event_time) FROM alert_events e WHERE e.incident_id = i.id) as last_event_time
FROM alert_incidents i
WHERE i.status = 'firing'
ORDER BY i.incident_start DESC;

-- Create a cleanup function for old events
CREATE OR REPLACE FUNCTION cleanup_old_alert_events(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete events older than specified days for resolved incidents
  DELETE FROM alert_events 
  WHERE event_time < NOW() - (days_old || ' days')::INTERVAL
    AND incident_id IN (
      SELECT id FROM alert_incidents 
      WHERE status = 'resolved' 
        AND incident_end < NOW() - (days_old || ' days')::INTERVAL
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Display completion message
SELECT 
  'Optimization complete!' as status,
  COUNT(*) as total_incidents,
  COUNT(*) FILTER (WHERE status = 'firing') as active_incidents
FROM alert_incidents;
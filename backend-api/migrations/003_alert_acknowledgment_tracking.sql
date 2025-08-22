-- Migration 003: Alert Acknowledgment Tracking
-- Adds acknowledgment functionality to alert incidents and events

BEGIN;

-- Add acknowledgment fields to alert_incidents table
ALTER TABLE alert_incidents 
ADD COLUMN acknowledged_at TIMESTAMP NULL,
ADD COLUMN acknowledged_by VARCHAR(255) NULL;

-- Create index for acknowledgment queries
CREATE INDEX idx_alert_incidents_acknowledged_at ON alert_incidents(acknowledged_at);
CREATE INDEX idx_alert_incidents_acknowledged_by ON alert_incidents(acknowledged_by);

-- Add acknowledgment event type to alert_events
-- First drop the existing constraint
ALTER TABLE alert_events DROP CONSTRAINT alert_events_event_type_check;

-- Add the new constraint with acknowledgment support
ALTER TABLE alert_events ADD CONSTRAINT alert_events_event_type_check 
  CHECK (event_type IN ('fired', 'resolved', 'updated', 'acknowledged'));

-- Add comments for documentation
COMMENT ON COLUMN alert_incidents.acknowledged_at IS 'Timestamp when the incident was acknowledged by a user';
COMMENT ON COLUMN alert_incidents.acknowledged_by IS 'User who acknowledged the incident (default_user for now)';

-- Update the materialized view to include acknowledgment data
DROP MATERIALIZED VIEW IF EXISTS alert_analytics_hourly;

CREATE MATERIALIZED VIEW alert_analytics_hourly AS
 SELECT date_trunc('hour'::text, incident_start) AS hour,
    service_namespace,
    service_name,
    severity,
    count(*) AS incident_count,
    count(*) FILTER (WHERE ((status)::text = 'resolved'::text)) AS resolved_count,
    count(*) FILTER (WHERE (acknowledged_at IS NOT NULL)) AS acknowledged_count,
    avg((EXTRACT(epoch FROM (incident_end - incident_start)) / (60)::numeric)) FILTER (WHERE (incident_end IS NOT NULL)) AS avg_duration_minutes,
    avg((EXTRACT(epoch FROM (acknowledged_at - incident_start)) / (60)::numeric)) FILTER (WHERE (acknowledged_at IS NOT NULL)) AS avg_acknowledgment_minutes
   FROM alert_incidents
  WHERE (incident_start >= (now() - '30 days'::interval))
  GROUP BY (date_trunc('hour'::text, incident_start)), service_namespace, service_name, severity
  ORDER BY (date_trunc('hour'::text, incident_start)) DESC
  WITH NO DATA;

-- Recreate the unique index
CREATE UNIQUE INDEX idx_alert_analytics_hourly_unique ON alert_analytics_hourly USING btree (hour, service_namespace, service_name, severity);

-- Set ownership
ALTER MATERIALIZED VIEW alert_analytics_hourly OWNER TO adalton;

COMMIT;
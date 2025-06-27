-- Quick fix: Recreate alerts table with proper deduplication support

-- Drop existing alerts table (since you said you cleared it anyway)
DROP TABLE IF EXISTS alerts;

-- Recreate with simplified deduplication approach
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  instance_id VARCHAR(255) DEFAULT '', -- Use empty string instead of NULL for consistency
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('fatal', 'critical', 'warning', 'none')),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'firing' CHECK (status IN ('firing', 'resolved')),
  count INTEGER DEFAULT 1, -- Track how many times this alert has occurred
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP NULL,
  alert_source VARCHAR(100) DEFAULT 'manual',
  external_alert_id VARCHAR(255),
  -- Simple unique constraint for deduplication
  UNIQUE(service_id, instance_id, severity, message)
);

-- Recreate indexes
CREATE INDEX idx_alerts_active ON alerts(status, created_at) WHERE status = 'firing';
CREATE INDEX idx_alerts_service ON alerts(service_id, status);
CREATE INDEX idx_alerts_severity ON alerts(severity, status);

-- Recreate trigger
CREATE OR REPLACE FUNCTION update_alert_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alerts_last_seen
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_last_seen();
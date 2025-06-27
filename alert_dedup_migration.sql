-- Migration: Add alert deduplication support
-- Run this if you already have an existing alerts table

-- Add new columns for deduplication
ALTER TABLE alerts 
ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW();

-- Update existing records to set first_seen and last_seen
UPDATE alerts 
SET 
  first_seen = created_at,
  last_seen = created_at
WHERE first_seen IS NULL OR last_seen IS NULL;

-- Create the unique constraint for deduplication
-- Note: This will fail if you have existing duplicates, so clean those up first
ALTER TABLE alerts 
ADD CONSTRAINT alerts_unique_dedup 
UNIQUE(service_id, COALESCE(instance_id, ''), severity, message);

-- Create trigger for alert last_seen updates
CREATE OR REPLACE FUNCTION update_alert_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_alerts_last_seen
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_last_seen();

-- Optional: Clean up existing duplicates before applying constraint
-- Uncomment and run if you have duplicates:

/*
-- Find and merge duplicate alerts
WITH duplicate_groups AS (
  SELECT 
    service_id, 
    COALESCE(instance_id, '') as norm_instance_id,
    severity, 
    message,
    COUNT(*) as dup_count,
    MIN(id) as keep_id,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
  FROM alerts 
  WHERE status = 'firing'
  GROUP BY service_id, COALESCE(instance_id, ''), severity, message
  HAVING COUNT(*) > 1
)
UPDATE alerts 
SET 
  count = dg.dup_count,
  first_seen = dg.first_seen,
  last_seen = dg.last_seen
FROM duplicate_groups dg
WHERE alerts.id = dg.keep_id;

-- Remove the duplicate rows (keep only the first one)
DELETE FROM alerts 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM alerts 
  GROUP BY service_id, COALESCE(instance_id, ''), severity, message
) AND status = 'firing';
*/
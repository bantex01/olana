-- Alert Hub Database Schema
-- Phase 1: Service-level topology with PostgreSQL storage

-- Enable UUID extension for future use
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core service registry (no instances table)
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  service_namespace VARCHAR(255) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  environment VARCHAR(100),
  team VARCHAR(100),
  component_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  UNIQUE(service_namespace, service_name)
);

-- Service dependencies (only between services)
CREATE TABLE service_dependencies (
  id SERIAL PRIMARY KEY,
  from_service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  to_service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_service_id, to_service_id)
);

-- Alerts attributed to services (instance_id for context only)
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  instance_id VARCHAR(255), -- Optional context, no FK constraint
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('fatal', 'critical', 'warning', 'none')),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'firing' CHECK (status IN ('firing', 'resolved')),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP NULL,
  alert_source VARCHAR(100) DEFAULT 'manual',
  external_alert_id VARCHAR(255)
);

-- Performance indexes
CREATE INDEX idx_services_lookup ON services(service_namespace, service_name);
CREATE INDEX idx_services_last_seen ON services(last_seen);
CREATE INDEX idx_alerts_active ON alerts(status, created_at) WHERE status = 'firing';
CREATE INDEX idx_alerts_service ON alerts(service_id, status);
CREATE INDEX idx_dependencies_from ON service_dependencies(from_service_id);
CREATE INDEX idx_dependencies_to ON service_dependencies(to_service_id);
CREATE INDEX idx_alerts_severity ON alerts(severity, status);

-- Function to automatically update last_seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_seen on service updates
CREATE TRIGGER update_services_last_seen
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

-- Trigger to update last_seen on dependency updates  
CREATE TRIGGER update_dependencies_last_seen
  BEFORE UPDATE ON service_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

-- Sample queries for development/testing
-- Get all services with alert counts
-- SELECT 
--   s.service_namespace,
--   s.service_name,
--   s.environment,
--   s.team,
--   COUNT(a.id) FILTER (WHERE a.status = 'firing') as active_alerts,
--   MAX(CASE 
--     WHEN a.severity = 'fatal' THEN 1
--     WHEN a.severity = 'critical' THEN 2  
--     WHEN a.severity = 'warning' THEN 3
--     ELSE 4
--   END) as highest_severity_rank
-- FROM services s
-- LEFT JOIN alerts a ON s.id = a.service_id
-- GROUP BY s.id, s.service_namespace, s.service_name, s.environment, s.team;

-- Get service dependency graph
-- SELECT 
--   fs.service_namespace || '::' || fs.service_name as from_service,
--   ts.service_namespace || '::' || ts.service_name as to_service
-- FROM service_dependencies sd
-- JOIN services fs ON sd.from_service_id = fs.id
-- JOIN services ts ON sd.to_service_id = ts.id;
